/// <reference types="node" />
import { describe, it as test } from "node:test";
import { strictEqual } from "node:assert";
import { movimentoFormSchema } from "./movimento-schema";

// Base de um lançamento válido em /financeiro/pagar
const lancamentoValido = () => ({
  tipo_movimento: "Pagar" as const,
  descricao: "Aluguel do galpão",
  valor_bruto: "1.500,00",
  data_vencimento: new Date(2026, 10, 30),
  competencia: "11/2026",
  id_categoria: "categoria-1",
  id_forma_pagamento: "",
  observacoes: "",
  status: "Pendente",
});

describe("movimentoFormSchema", () => {
  test("aceita lançamento sem conta informada", () => {
    const semCampo = movimentoFormSchema.safeParse(lancamentoValido());
    strictEqual(semCampo.success, true);

    const campoVazio = movimentoFormSchema.safeParse({
      ...lancamentoValido(),
      id_conta: "",
    });
    strictEqual(campoVazio.success, true);
    strictEqual(campoVazio.success ? campoVazio.data.id_conta : undefined, "");
  });

  test("mantém a conta quando ela é informada", () => {
    const resultado = movimentoFormSchema.safeParse({
      ...lancamentoValido(),
      id_conta: "conta-1",
    });
    strictEqual(resultado.success, true);
    strictEqual(
      resultado.success ? resultado.data.id_conta : undefined,
      "conta-1"
    );
  });

  test("continua exigindo categoria, descrição, valor e vencimento", () => {
    strictEqual(
      movimentoFormSchema.safeParse({ ...lancamentoValido(), id_categoria: "" })
        .success,
      false
    );
    strictEqual(
      movimentoFormSchema.safeParse({ ...lancamentoValido(), descricao: "" })
        .success,
      false
    );
    strictEqual(
      movimentoFormSchema.safeParse({ ...lancamentoValido(), valor_bruto: "" })
        .success,
      false
    );
    strictEqual(
      movimentoFormSchema.safeParse({
        ...lancamentoValido(),
        data_vencimento: undefined,
      }).success,
      false
    );
  });
});
