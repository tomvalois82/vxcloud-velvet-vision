import { supabase } from "@/integrations/supabase/client";

/**
 * Atualiza o saldo da conta após baixa de título
 * @param contaId - ID da conta
 * @param valor - Valor a ser creditado/debitado
 * @param tipoMovimento - "Receber" ou "Pagar"
 * @param isEstorno - Se true, inverte a operação (para estornos)
 */
export async function atualizarSaldoConta(
  contaId: string,
  valor: number,
  tipoMovimento: "Receber" | "Pagar",
  isEstorno: boolean = false
): Promise<void> {
  // Buscar saldo atual da conta
  const { data: conta, error: fetchError } = await supabase
    .from("vx_fin_conta")
    .select("saldo")
    .eq("id", contaId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Erro ao buscar saldo da conta: ${fetchError.message}`);
  }

  if (!conta) {
    throw new Error("Conta não encontrada");
  }

  const saldoAtual = Number(conta.saldo) || 0;
  let novoSaldo: number;

  // Regra de atualização:
  // Receber (receita): credita na conta (adiciona)
  // Pagar (despesa): debita da conta (subtrai)
  // Se for estorno, inverte a operação
  if (tipoMovimento === "Receber") {
    novoSaldo = isEstorno ? saldoAtual - valor : saldoAtual + valor;
  } else {
    novoSaldo = isEstorno ? saldoAtual + valor : saldoAtual - valor;
  }

  // Atualizar saldo no banco
  const { error: updateError } = await supabase
    .from("vx_fin_conta")
    .update({ saldo: novoSaldo })
    .eq("id", contaId);

  if (updateError) {
    throw new Error(`Erro ao atualizar saldo: ${updateError.message}`);
  }
}

/**
 * Calcula o valor final da baixa considerando desconto e acréscimo
 */
export function calcularValorFinal(
  valorOriginal: number,
  desconto: number = 0,
  acrescimo: number = 0
): number {
  return valorOriginal - desconto + acrescimo;
}
