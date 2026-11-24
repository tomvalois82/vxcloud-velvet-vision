/// <reference types="bun" />
import { expect, mock, test } from 'bun:test';

mock.module('@/integrations/supabase/client', () => ({ supabase: {} }));
const { montarPayloadEntrada } = await import('./renave-service');

const base = { id_pessoa_proprietario_crv: 'p', data_entrada: '2026-11-01', valor_entrada: 1000, km_entrada: 10, data_medicao_hodometro: null, email_vendedor: null, tipo_crv: 'Azul', numero_crv: null, motivo: 'Venda financiada' };

test('código de segurança só é enviado quando o usuário digitou algo', () => {
  expect('codigo_seguranca_crv' in montarPayloadEntrada({ ...base, codigo_seguranca_crv: '' })).toBe(false);
  expect(montarPayloadEntrada({ ...base, codigo_seguranca_crv: '12345678901' })).toMatchObject({ codigo_seguranca_crv: '12345678901' });
});
