/// <reference types="node" />
import { it as test } from "node:test";
import { strictEqual } from "node:assert";
import { prepararMovimentoOfx } from "./ofx-movimento";

test("Importação envia a data OFX para o rateio de custos da carteira", () => {
  const movimento = prepararMovimentoOfx({
    uid: "20260901002", tipo: "Pagar", data: "2026-09-01",
    descricao: "PAGAMENTOS RECIFE RETIFICA DE RODAS LTDA", nome: "",
    valor: 450, id_categoria: "categoria", id_forma_pagamento: null,
    id_pessoa: "pessoa", id_estoque: 123,
  }, "empresa", "conta");

  strictEqual(movimento.data_compra, "2026-09-01");
  strictEqual(movimento.data_pagamento, "2026-09-01");
  strictEqual(movimento.data_vencimento, "2026-09-01");
  strictEqual(movimento.status, "Pago");
  strictEqual(movimento.id_estoque, 123);
  strictEqual(movimento.valor_liquido, 450);
});