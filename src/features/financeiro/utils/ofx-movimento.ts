import type { LinhaImportacao } from "../services/ofx-draft-service";

export function prepararMovimentoOfx(linha: LinhaImportacao, empresaId: string, contaId: string) {
  return {
    id_empresa: empresaId,
    id_conta: contaId,
    tipo_movimento: linha.tipo,
    descricao: linha.descricao || linha.nome || "Importado via OFX",
    valor_bruto: linha.valor,
    valor_liquido: linha.valor,
    data_compra: linha.data,
    data_vencimento: linha.data,
    data_pagamento: linha.data,
    status: "Pago",
    id_categoria: linha.id_categoria,
    id_forma_pagamento: linha.id_forma_pagamento,
    id_pessoa: linha.id_pessoa,
    id_estoque: linha.id_estoque,
  };
}