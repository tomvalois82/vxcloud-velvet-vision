/// <reference types="node" />
import { it as test } from 'node:test';
import { deepStrictEqual, strictEqual } from 'node:assert';
import { selecionarIdsCompra, correspondeBuscaVeiculo, placaParaConsultarCiclos } from './veiculos-compra.ts';

const ciclos = [
  { id_estoque: 1, id_venda: null, id_compra: null },
  { id_estoque: 2, id_venda: 'venda', id_compra: null },
  { id_estoque: 3, id_venda: null, id_compra: 'compra-atual' },
  { id_estoque: 4, id_venda: null, id_compra: 'outra-compra' },
  { id_estoque: 5, id_venda: 'venda', id_compra: 'compra-atual' },
  { id_estoque: null, id_venda: null, id_compra: null },
];

test('nova compra lista somente ciclos sem venda e sem compra', () => {
  deepStrictEqual(selecionarIdsCompra(ciclos), [1]);
});
test('edição permite a compra atual, mas exclui outras compras e veículos vendidos', () => {
  deepStrictEqual(selecionarIdsCompra(ciclos, 'compra-atual'), [1, 3]);
});
test('busca placa com ou sem hífen e preserva busca por fabricante, modelo e ano', () => {
  const veiculo = { placa: 'PDB-2J73', fabricante: 'Renault', modelo: 'Oroch', ano: '2018' };
  for (const busca of ['pdb2j73', 'PDB-2J73', 'renault', 'oroch', '2018']) {
    strictEqual(correspondeBuscaVeiculo(veiculo, busca), true);
  }
  strictEqual(correspondeBuscaVeiculo(veiculo, 'ABC1234'), false);
  strictEqual(correspondeBuscaVeiculo(veiculo, '---'), false);
});
test('consulta histórico somente a partir de sete caracteres normalizados', () => {
  strictEqual(placaParaConsultarCiclos('pdb-2j73'), 'PDB2J73');
  strictEqual(placaParaConsultarCiclos('pdb-2j7'), null);
});