/// <reference types="bun" />
import { beforeEach, expect, mock, test } from 'bun:test';

const chamadas: { metodo: string; argumentos: unknown[] }[] = [];
const respostas: unknown[] = [];
mock.module('@/integrations/supabase/client', () => ({ supabase: {
  from() {
    const promessa = Promise.resolve({ data: respostas.shift(), error: null });
    const consulta: object = new Proxy({}, { get(_alvo, metodo: string) {
      if (metodo === 'then') return promessa.then.bind(promessa);
      return (...argumentos: unknown[]) => {
        chamadas.push({ metodo, argumentos });
        return metodo === 'maybeSingle' ? promessa : consulta;
      };
    } });
    return consulta;
  },
} }));
const { buscarHistoricoVeiculo, buscarMetadadosCiclos } = await import('./historico-ciclos-service');
beforeEach(() => { chamadas.length = 0; respostas.length = 0; });

test('histórico aparece somente quando total de ciclos é maior que um', async () => {
  respostas.push({ placa_normalizada: 'PDB2J73', id_empresa: 'empresa', total_ciclos: 1 });
  expect(await buscarHistoricoVeiculo(42)).toEqual([]);
  expect(chamadas.filter(chamada => chamada.metodo === 'select')).toHaveLength(1);
});
test('histórico usa a mesma empresa e placa e ordena ciclos do mais recente para o mais antigo', async () => {
  const ciclos = [
    { id_estoque: 42, ciclo: 2, total_ciclos: 2, descricao_ciclo: 'Ciclo atual', status: 'Em estoque' },
    { id_estoque: 10, ciclo: 1, total_ciclos: 2, descricao_ciclo: 'Ciclo encerrado', status: 'Vendido' },
  ];
  respostas.push({ placa_normalizada: 'PDB2J73', id_empresa: 'empresa', total_ciclos: 2 }, ciclos);
  expect(await buscarHistoricoVeiculo(42)).toEqual(ciclos);
  expect(chamadas).toContainEqual({ metodo: 'eq', argumentos: ['placa_normalizada', 'PDB2J73'] });
  expect(chamadas).toContainEqual({ metodo: 'eq', argumentos: ['id_empresa', 'empresa'] });
  expect(chamadas).toContainEqual({ metodo: 'order', argumentos: ['ciclo', { ascending: false }] });
});
test('metadados consultam apenas os IDs carregados', async () => {
  expect(await buscarMetadadosCiclos([])).toEqual([]);
  expect(chamadas).toHaveLength(0);
  respostas.push([{ id_estoque: 42, ciclo: 2, total_ciclos: 2 }]);
  expect((await buscarMetadadosCiclos([42])).length).toBe(1);
  expect(chamadas).toContainEqual({ metodo: 'in', argumentos: ['id_estoque', [42]] });
});