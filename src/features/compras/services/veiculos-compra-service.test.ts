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
const { buscarVeiculosCompra } = await import('./veiculos-compra-service');
import type { PurchaseVehicle } from '../types';

beforeEach(() => { chamadas.length = 0; respostas.length = 0; });

const cicloDisponivel = { id_estoque: 1, id_venda: null, id_compra: null };
const veiculoCompra: PurchaseVehicle = {
  id: 1, modelo: 'Oroch', fabricante: 'Renault', ano: '2018', valor: '89900',
  km: '60000', cor: 'Prata', foto: null, placa: 'PDB2J73', status: 'Em estoque',
};

test('nova compra exclui ciclos recebidos em troca', async () => {
  respostas.push([cicloDisponivel], [veiculoCompra]);
  expect(await buscarVeiculosCompra()).toEqual([veiculoCompra]);
  expect(chamadas).toContainEqual({ metodo: 'is', argumentos: ['id_venda_troca', null] });
});

test('edição da compra também exclui ciclos recebidos em troca', async () => {
  respostas.push([cicloDisponivel], [veiculoCompra]);
  expect(await buscarVeiculosCompra('compra-atual')).toEqual([veiculoCompra]);
  expect(chamadas).toContainEqual({ metodo: 'is', argumentos: ['id_venda_troca', null] });
  expect(chamadas).toContainEqual({
    metodo: 'or',
    argumentos: ['id_compra.is.null,id_compra.eq.compra-atual'],
  });
});
