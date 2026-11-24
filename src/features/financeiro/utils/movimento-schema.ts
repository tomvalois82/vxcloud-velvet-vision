import { z } from "zod";

// Regras de validação do dialog "Novo Lançamento", usado em /financeiro/pagar
// e /financeiro/receber.
// A conta é opcional: o lançamento pode ser gravado sem vínculo com conta
// bancária, e a coluna id_conta aceita nulo no banco.
export const movimentoFormSchema = z.object({
  tipo_movimento: z.enum(["Pagar", "Receber"]),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  valor_bruto: z.string().min(1, "Valor é obrigatório"),
  data_vencimento: z.date({ required_error: "Data de vencimento é obrigatória" }),
  competencia: z.string().optional(),
  id_conta: z.string().optional(),
  id_categoria: z.string().min(1, "Categoria é obrigatória"),
  id_forma_pagamento: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.string().default("Pendente"),
});

export type MovimentoFormData = z.infer<typeof movimentoFormSchema>;
