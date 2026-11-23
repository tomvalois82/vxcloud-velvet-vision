/// <reference types="node" />
import { describe, it as test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import {
  filtrarVeiculosParaSelecao,
  formatarVeiculoParaSelecao,
  formatarCicloParaSelecao,
  type VeiculoResumo,
} from "./veiculo-selecao";

const veiculos: VeiculoResumo[] = [
  { id: 1, fabricante: "Volkswagen", modelo: "Gol", ano: "2024", placa: "ABC1D23", status: "Vendido" },
  { id: 2, fabricante: "Chevrolet", modelo: "Ônix", ano: "2023", placa: "XYZ9A87", status: "Fora de Estoque" },
].map(veiculo => ({
  ...veiculo, titulo: null, descricao_ciclo: null, placa_normalizada: null,
  ciclo: 1, total_ciclos: 1, sugerido: false, ordem_exibicao: 1,
  ativo: false, id_venda: null, venda_fechada: false,
}));

const ciclos: VeiculoResumo[] = [
  { ...veiculos[0], id: 3, placa: 'PDB-2J73', placa_normalizada: 'PDB2J73', ciclo: 1,
    total_ciclos: 2, sugerido: false, ordem_exibicao: 2, venda_fechada: true },
  { ...veiculos[0], id: 4, placa: 'PDB-2J73', placa_normalizada: 'PDB2J73', ciclo: 2,
    total_ciclos: 2, sugerido: true, ativo: true, status: 'Em estoque', ordem_exibicao: 1 },
];

test('placa com ou sem hífen e minúscula encontra ambos os ciclos, ativo sugerido primeiro', () => {
  for (const busca of ['PDB-2J73', 'PDB2J73', 'pdb-2j73', 'pdb2j73']) {
    deepStrictEqual(filtrarVeiculosParaSelecao(ciclos, busca).map(ciclo => ciclo.id), [4, 3]);
  }
});

test('mantém ciclos da mesma placa juntos e ordena pela prioridade da view sem mudar a entrada', () => {
  const entrada = [ciclos[0], veiculos[1], ciclos[1], veiculos[0]];
  deepStrictEqual(filtrarVeiculosParaSelecao(entrada, '').map(ciclo => ciclo.id), [1, 4, 3, 2]);
  deepStrictEqual(entrada.map(ciclo => ciclo.id), [3, 2, 4, 1]);
  deepStrictEqual(filtrarVeiculosParaSelecao(ciclos.map(ciclo => ({ ...ciclo, sugerido: false })), '')
    .map(ciclo => ciclo.id), [4, 3]);
});

test('formata o título e a descrição prontos do ciclo selecionado', () => {
  deepStrictEqual(formatarCicloParaSelecao({ ...ciclos[0], titulo: 'PDB-2J73 · OROCH 2018',
    descricao_ciclo: 'Vendido — ciclo 1 de 2' }),
  { titulo: 'PDB-2J73 · OROCH 2018', descricao: 'Vendido — ciclo 1 de 2' });
  strictEqual(formatarCicloParaSelecao(ciclos[0]).descricao, 'Ciclo 1 de 2');
});

describe("Seleção de veículo no lançamento financeiro", () => {
  test("Exibe marca, modelo, ano, placa e qualquer status no formato solicitado", () => {
    strictEqual(
      formatarVeiculoParaSelecao(veiculos[0]),
      "Volkswagen Gol 2024 | ABC1D23 [Vendido]",
    );
    strictEqual(
      formatarVeiculoParaSelecao(veiculos[1]),
      "Chevrolet Ônix 2023 | XYZ9A87 [Fora de Estoque]",
    );
  });

  test("Mantém veículos de todos os status quando a busca está vazia", () => {
    deepStrictEqual(filtrarVeiculosParaSelecao(veiculos, ""), veiculos);
  });

  test("Busca por placa, fabricante ou modelo sem diferenciar acentos e maiúsculas", () => {
    deepStrictEqual(filtrarVeiculosParaSelecao(veiculos, "abc1d23"), [veiculos[0]]);
    deepStrictEqual(filtrarVeiculosParaSelecao(veiculos, "CHEVROLET"), [veiculos[1]]);
    deepStrictEqual(filtrarVeiculosParaSelecao(veiculos, "onix"), [veiculos[1]]);
  });
});
