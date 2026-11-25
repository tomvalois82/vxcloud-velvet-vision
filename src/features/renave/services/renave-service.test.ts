/// <reference types="bun" />
import { beforeEach, expect, mock, test } from 'bun:test';

const invoke = mock();
mock.module('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));
const { executarAcaoRenave, montarPayloadCrvSaida, montarPayloadEntrada } = await import('./renave-service');

const base = { id_pessoa_proprietario_crv: 'p', data_entrada: '2026-11-01', valor_entrada: 1000, km_entrada: 10, data_medicao_hodometro: null, email_vendedor: null, tipo_crv: 'DIGITAL', numero_crv: '123456789012', motivo: 'Venda financiada' };

beforeEach(() => {
  invoke.mockReset();
});

test('código de segurança só é enviado quando o usuário digitou algo', () => {
  expect('codigo_seguranca_crv' in montarPayloadEntrada({ ...base, codigo_seguranca_crv: '' })).toBe(false);
  expect(montarPayloadEntrada({ ...base, codigo_seguranca_crv: '12345678901' })).toMatchObject({ codigo_seguranca_crv: '12345678901' });
});

test('CRV novo envia código somente quando digitado e tipo de CRV usa valor do banco', () => {
  expect(base.tipo_crv).toBe('DIGITAL');
  expect('codigo_seguranca_crv_saida' in montarPayloadCrvSaida({ numero_crv_saida: '123456789012', codigo_seguranca_crv_saida: '' })).toBe(false);
  expect(montarPayloadCrvSaida({ numero_crv_saida: '123456789012', codigo_seguranca_crv_saida: '123.456.789-01' }))
    .toEqual({ numero_crv_saida: '123456789012', codigo_seguranca_crv_saida: '12345678901' });
});

test('operação devolve sucesso e envia ação e dados à Edge Function', async () => {
  invoke.mockResolvedValue({ data: { ok: true, mensagem: 'Situação atualizada' }, error: null });
  const resposta = await executarAcaoRenave('sincronizar', { id_processo: 'processo-1' });
  expect(resposta.mensagem).toBe('Situação atualizada');
  expect(invoke).toHaveBeenCalledWith('renave', { body: { acao: 'sincronizar', id_processo: 'processo-1' } });
});

test('erro de negócio HTTP 200 é lançado com a mensagem original', async () => {
  invoke.mockResolvedValue({ data: { ok: false, erro: 'Preencha o número do CRV.' }, error: null });
  await expect(executarAcaoRenave('entrada', { id_processo: 'processo-1' })).rejects.toThrow('Preencha o número do CRV.');
});

test('erro HTTP da função usa o campo erro do corpo de resposta', async () => {
  invoke.mockResolvedValue({
    data: null,
    error: { context: { json: async () => ({ ok: false, erro: 'Apenas Gerente pode cancelar.' }) } },
  });
  await expect(executarAcaoRenave('cancelar_entrada', { id_processo: 'processo-1' })).rejects.toThrow('Apenas Gerente pode cancelar.');
});
