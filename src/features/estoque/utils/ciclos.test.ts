/// <reference types="node" />
import { it as test } from 'node:test';
import { strictEqual } from 'node:assert';
import { correspondeBuscaEstoque } from './ciclos';

test('busca placa normalizada encontra ciclos com placas com e sem hífen', () => {
  for (const placa of ['PDB-2J73', 'PDB2J73']) {
    for (const busca of ['pdb2j73', 'pdb-2j73', 'PDB-2J73']) {
      strictEqual(correspondeBuscaEstoque({ placa, modelo: 'Oroch' }, busca), true);
    }
  }
});
test('preserva busca por modelo e busca vazia sem casar placas diferentes', () => {
  const veiculo = { placa: 'PDB-2J73', modelo: 'Oroch' };
  strictEqual(correspondeBuscaEstoque(veiculo, 'OROCH'), true);
  strictEqual(correspondeBuscaEstoque(veiculo, ''), true);
  strictEqual(correspondeBuscaEstoque(veiculo, 'ABC1234'), false);
  strictEqual(correspondeBuscaEstoque(veiculo, '---'), false);
});