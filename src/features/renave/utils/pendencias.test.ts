/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { avisoRenaveAposVenda, pendenciasEntrada, pendenciasSaida, situacaoCertificado, type PessoaRenave } from './pendencias';
import { infoEtapa, passoAtual } from './etapas';
import { normalizarRenavam } from '@/features/estoque/utils/masks';

const pessoa: PessoaRenave = { id: '1', nome: 'Maria Souza', cpf_cnpj: '12345678901', email: 'maria@ex.com', cep: '50000000', logradouro: 'Rua A', numero: '10', bairro: 'Centro', municipio: 'Recife', estado: 'PE' };

test('RENAVAM com 9 ou 10 dígitos recebe zeros à esquerda até 11', () => {
  expect(normalizarRenavam('123456789')).toBe('00123456789');
  expect(normalizarRenavam('1234567890')).toBe('01234567890');
  expect(normalizarRenavam('012.345.678-90')).toBe('01234567890');
});

test('RENAVAM vazio vira null e tamanho inválido é rejeitado', () => {
  expect(normalizarRenavam('')).toBeNull();
  expect(normalizarRenavam('12345678')).toBeNull();
  expect(normalizarRenavam('123456789012')).toBeNull();
});

test('etapa nula é Fora do RENAVE e etapas mapeiam rótulo e passo', () => {
  expect(infoEtapa(null).rotulo).toBe('Fora do RENAVE');
  expect(infoEtapa('AGUARDANDO_ENTRADA').rotulo).toBe('RENAVE: preencher/comunicar entrada');
  expect(passoAtual('AGUARDANDO_DETRAN')).toBe(3);
  expect(passoAtual('CONCLUIDO')).toBe(7);
});

test('pendências da entrada listam o que falta', () => {
  const lista = pendenciasEntrada({ proprietario: { ...pessoa, cpf_cnpj: null }, renavam: null, chassi: 'X', tipoCrv: '', numeroCrv: '123', temCodigoSeguranca: false, km: '', dataMedicao: '', valor: null, data: '', emailEstabelecimento: null });
  expect(lista).toContain('Proprietário no CRV sem CPF/CNPJ');
  expect(lista).toContain('RENAVAM do veículo faltando');
  expect(lista).toContain('Código de segurança do CRV não informado');
  expect(lista).toContain('Número do CRV (12 dígitos)');
  expect(lista).not.toContain('Chassi do veículo faltando');
});

test('comprador completo não tem pendências; nome acima de 40 caracteres gera aviso', () => {
  expect(pendenciasSaida(pessoa, { data: '2026-11-25', valor: 50000 })).toEqual([]);
  const longo = pendenciasSaida({ ...pessoa, nome: 'A'.repeat(41) });
  expect(longo.some((p) => p.includes('40 caracteres'))).toBe(true);
});

test('saída exige cidade e UF do comprador e dados da venda', () => {
  const lista = pendenciasSaida({ ...pessoa, municipio: '', estado: '' }, { data: '', valor: null });
  expect(lista).toContain('Endereço do comprador: UF e cidade');
  expect(lista).toContain('Data da venda faltando');
  expect(lista).toContain('Valor da venda faltando');
});

test('certificado vencido, a vencer em menos de 30 dias ou ok', () => {
  const hoje = new Date(2026, 10, 24);
  expect(situacaoCertificado('2026-11-23', hoje)).toBe('vencido');
  expect(situacaoCertificado('2026-12-20', hoje)).toBe('a_vencer');
  expect(situacaoCertificado('2027-01-30', hoje)).toBe('ok');
});

test('aviso após fechar venda: no RENAVE lembra saída; financiada fora sugere; à vista fora não avisa', () => {
  expect(avisoRenaveAposVenda({ noRenave: true, financiada: false })).toBe('lembrar_saida');
  expect(avisoRenaveAposVenda({ noRenave: false, financiada: true })).toBe('sugerir_inicio');
  expect(avisoRenaveAposVenda({ noRenave: false, financiada: false })).toBeNull();
});
