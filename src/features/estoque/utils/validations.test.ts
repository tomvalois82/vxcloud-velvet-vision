/// <reference types="bun" />
import { beforeEach, expect, mock, test } from 'bun:test';

interface Chamada { tabela: string; metodo: string; argumentos: unknown[] }
interface Resposta { data: unknown; error: unknown }
const chamadas: Chamada[] = [];
const respostas: Resposta[] = [];

mock.module('@/integrations/supabase/client', () => ({
  supabase: {
    from(tabela: string) {
      const resposta = respostas.shift() || { data: null, error: null };
      const promessa = Promise.resolve(resposta);
      const consulta: object = new Proxy({}, {
        get(_alvo, metodo: string) {
          if (metodo === 'then') return promessa.then.bind(promessa);
          return (...argumentos: unknown[]) => {
            chamadas.push({ tabela, metodo, argumentos });
            return metodo === 'maybeSingle' ? promessa : consulta;
          };
        },
      });
      return consulta;
    },
  },
}));

const { validatePlacaDuplicada, checkVeiculoVendidoParaCiclo } = await import('./validations');
const respondeu = (data: unknown) => respostas.push({ data, error: null });
const verificou = (tabela: string, metodo: string, ...argumentos: unknown[]) =>
  expect(chamadas).toContainEqual({ tabela, metodo, argumentos });

beforeEach(() => {
  chamadas.length = 0;
  respostas.length = 0;
});

test('duplicidade compara placa normalizada somente em ciclos ativos e exclui a edição', async () => {
  respondeu([]);
  expect(await validatePlacaDuplicada('pdb-2j73', 42)).toEqual({ valid: true });
  verificou('vw_estoque_ciclos', 'eq', 'placa_normalizada', 'PDB2J73');
  verificou('vw_estoque_ciclos', 'eq', 'ativo', true);
  verificou('vw_estoque_ciclos', 'neq', 'id_estoque', 42);
});

test('placa com ciclo ativo é duplicada', async () => {
  respondeu([{ id_estoque: 5 }]);
  expect((await validatePlacaDuplicada('PDB2J73')).valid).toBe(false);
});

test('placa incompleta não consulta o banco', async () => {
  expect(await validatePlacaDuplicada('PDB-2J7')).toEqual({ valid: true });
  expect(chamadas).toHaveLength(0);
});

test('placa procura Vendido e Fora de Estoque no servidor, selecionando último ID e total de ciclos', async () => {
  respondeu({ id_estoque: 42 });
  respondeu({ id: 42, placa: 'PDB-2J73' });
  respondeu({ total_ciclos: 3 });
  const veiculo = await checkVeiculoVendidoParaCiclo('pdb2j73');
  expect(veiculo?.id).toBe(42);
  expect(veiculo?.total_ciclos).toBe(3);
  verificou('vw_estoque_ciclos', 'eq', 'placa_normalizada', 'PDB2J73');
  verificou('vw_estoque_ciclos', 'in', 'status', ['Vendido', 'Fora de Estoque']);
  verificou('vw_estoque_ciclos', 'order', 'id_estoque', { ascending: false });
  verificou('estoque', 'eq', 'id', 42);
  verificou('estoque', 'order', 'id', { ascending: false });
});

test('renavam e chassi são filtrados no servidor e o mais recente prevalece', async () => {
  respondeu({ id: 20 });
  respondeu({ id: 30 });
  respondeu({ total_ciclos: 2 });
  const veiculo = await checkVeiculoVendidoParaCiclo(undefined, '123.456.789', ' abc123 ');
  expect(veiculo?.id).toBe(30);
  expect(veiculo?.total_ciclos).toBe(2);
  verificou('estoque', 'eq', 'renavam', '00123456789');
  verificou('estoque', 'ilike', 'chassi', 'ABC123');
  verificou('estoque', 'in', 'status', ['Vendido', 'Fora de Estoque']);
  verificou('estoque', 'order', 'id', { ascending: false });
  verificou('estoque', 'limit', 1);
});

test('identificadores vazios não consultam histórico e placa sem ciclo retorna null', async () => {
  expect(await checkVeiculoVendidoParaCiclo()).toBeNull();
  expect(chamadas).toHaveLength(0);
  respondeu(null);
  expect(await checkVeiculoVendidoParaCiclo('ABC1234')).toBeNull();
  expect(chamadas.every(chamada => chamada.tabela === 'vw_estoque_ciclos')).toBe(true);
});