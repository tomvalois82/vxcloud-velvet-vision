/// <reference types="node" />
import { it as test } from "node:test";
import { strictEqual } from "node:assert";
import { mensagemErroBanco } from "./dbErrors.ts";

test("traduz ux_vendas_veiculo", () => {
  strictEqual(
    mensagemErroBanco({ code: "23505", message: 'duplicate key value violates unique constraint "ux_vendas_veiculo"' }, "x"),
    "Este veículo já possui uma venda registrada. Edite a venda existente em vez de criar outra.",
  );
});

test("traduz ux_estoque_placa_ativa", () => {
  strictEqual(mensagemErroBanco({ code: "23505", message: "ux_estoque_placa_ativa" }, "x"), "Já existe um veículo com esta placa no estoque atual.");
});

test("usa fallback para outros códigos", () => {
  strictEqual(mensagemErroBanco({ code: "23503", message: "ux_vendas_veiculo" }, "Falha"), "Falha");
});
