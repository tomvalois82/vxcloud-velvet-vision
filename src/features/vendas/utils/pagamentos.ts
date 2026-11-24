import type { PaymentEntry } from '../types';

// Atualiza somente o acerto escolhido, preservando seu identificador e a ordem da lista.
export function atualizarPagamento(
  pagamentos: PaymentEntry[],
  id: string,
  dados: Omit<PaymentEntry, 'id'>,
): PaymentEntry[] {
  return pagamentos.map((pagamento) =>
    pagamento.id === id ? { ...dados, id } : pagamento,
  );
}
