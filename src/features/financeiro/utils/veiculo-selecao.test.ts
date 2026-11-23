/// <reference types="node" />
import { describe, it as test } from "node:test";
import { deepStrictEqual, strictEqual } from "node:assert";
import {
  filtrarVeiculosParaSelecao,
  formatarVeiculoParaSelecao,
  type VeiculoResumo,
} from "./veiculo-selecao";

const veiculos: VeiculoResumo[] = [
  { id: 1, fabricante: "Volkswagen", modelo: "Gol", ano: "2024", placa: "ABC1D23", status: "Vendido" },
  { id: 2, fabricante: "Chevrolet", modelo: "Ônix", ano: "2023", placa: "XYZ9A87", status: "Fora de Estoque" },
];

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
