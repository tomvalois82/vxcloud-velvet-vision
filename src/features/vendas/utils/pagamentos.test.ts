import { describe, expect, test } from 'bun:test';
import type { PaymentEntry } from '../types';
import { atualizarPagamento } from './pagamentos';

const pagamentoBase: PaymentEntry = {
  id: 'acerto-1',
  id_forma_pagamento: 'forma-1',
  id_conta: 'conta-1',
  valor: 1000,
  data_lancamento: '2026-11-24',
  data_pagamento: null,
  numero: '1',
  observacao: null,
  tipo_lancamento: 'recebimento',
};

describe('atualizarPagamento', () => {
  test('substitui os dados do acerto sem duplicá-lo e preserva seu id', () => {
    const resultado = atualizarPagamento([pagamentoBase], 'acerto-1', {
      ...pagamentoBase,
      valor: 750,
      numero: '2',
      observacao: 'Valor corrigido',
    });

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      id: 'acerto-1',
      valor: 750,
      numero: '2',
      observacao: 'Valor corrigido',
    });
  });

  test('permite transformar recebimento em pagamento sem alterar os demais acertos', () => {
    const outroPagamento = { ...pagamentoBase, id: 'acerto-2', valor: 300 };
    const resultado = atualizarPagamento([pagamentoBase, outroPagamento], 'acerto-1', {
      ...pagamentoBase,
      valor: -1000,
      tipo_lancamento: 'pagamento',
    });

    expect(resultado[0].valor).toBe(-1000);
    expect(resultado[0].tipo_lancamento).toBe('pagamento');
    expect(resultado[1]).toEqual(outroPagamento);
  });
});
