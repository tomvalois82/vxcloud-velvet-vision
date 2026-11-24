// Pendências do RENAVE calculadas no front. Apenas informativas: nunca bloqueiam o salvamento.

export interface PessoaRenave {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  estado: string | null;
}

export interface DadosEntradaPendencias {
  proprietario: PessoaRenave | null;
  renavam: string | null;
  chassi: string | null;
  tipoCrv: string;
  temCodigoSeguranca: boolean;
  km: string;
  dataMedicao: string;
  valor: number | null;
  data: string;
  emailEstabelecimento: string | null;
}

const temDocumento = (pessoa: PessoaRenave | null) =>
  !!pessoa && (pessoa.cpf_cnpj || '').replace(/\D/g, '').length > 0;

export function pendenciasEntrada(d: DadosEntradaPendencias): string[] {
  const lista: string[] = [];
  if (!temDocumento(d.proprietario)) lista.push('Proprietário no CRV sem CPF/CNPJ');
  if (!d.renavam) lista.push('RENAVAM do veículo faltando');
  if (!d.chassi) lista.push('Chassi do veículo faltando');
  if (!d.tipoCrv) lista.push('Tipo de CRV faltando');
  if (!d.temCodigoSeguranca) lista.push('Código de segurança do CRV não informado');
  if (!d.km) lista.push('KM faltando');
  if (!d.dataMedicao) lista.push('Data/hora da medição do hodômetro faltando');
  if (!d.valor) lista.push('Valor da entrada faltando');
  if (!d.data) lista.push('Data da entrada faltando');
  if (!d.emailEstabelecimento) lista.push('E-mail do estabelecimento não configurado (Configurações → Empresa)');
  return lista;
}

export const LIMITE_NOME_RENAVE = 40;

export function pendenciasSaida(comprador: PessoaRenave | null): string[] {
  if (!comprador) return ['Comprador não informado'];
  const lista: string[] = [];
  if (!temDocumento(comprador)) lista.push('Comprador sem CPF/CNPJ');
  if (!comprador.email) lista.push('Comprador sem e-mail');
  const enderecoCompleto = [comprador.cep, comprador.logradouro, comprador.numero, comprador.bairro, comprador.municipio, comprador.estado]
    .every((parte) => !!parte && parte.trim() !== '');
  if (!enderecoCompleto) lista.push('Endereço do comprador incompleto');
  if (comprador.nome.length > LIMITE_NOME_RENAVE) {
    lista.push(`Nome do comprador com mais de ${LIMITE_NOME_RENAVE} caracteres: o RENAVE aceita no máximo ${LIMITE_NOME_RENAVE} caracteres; será abreviado`);
  }
  return lista;
}

// Situação da validade do certificado: vencido, a vencer (< 30 dias) ou ok.
export function situacaoCertificado(validade: string | null, hoje: Date = new Date()): 'vencido' | 'a_vencer' | 'ok' | null {
  if (!validade) return null;
  const data = new Date(`${validade.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(data.getTime())) return null;
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((data.getTime() - inicioHoje.getTime()) / 86_400_000);
  if (dias < 0) return 'vencido';
  if (dias < 30) return 'a_vencer';
  return 'ok';
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Aviso exibido depois de fechar a venda (nunca bloqueia o fechamento).
export type AvisoRenaveVenda = 'lembrar_saida' | 'sugerir_inicio' | null;

export function avisoRenaveAposVenda(situacao: { noRenave: boolean; financiada: boolean }): AvisoRenaveVenda {
  if (situacao.noRenave) return 'lembrar_saida';
  if (situacao.financiada) return 'sugerir_inicio';
  return null;
}
