import { supabase } from '@/integrations/supabase/client';

// Colunas legíveis pelo front (vault_* são proibidas; nunca usar select('*'))
export const COLUNAS_CERTIFICADO = 'id, ativo, cnpj, titular, emissor, numero_serie, valido_de, valido_ate, enviado_por_nome, enviado_em';
export const CHAVE_CERTIFICADO = ['renave-certificado'] as const;
export const CHAVE_PODE_GERENCIAR = ['renave-pode-gerenciar'] as const;
export const TAMANHO_MAX_PFX = 75 * 1024;

export interface CertificadoAtivo {
  id: string; ativo: boolean; cnpj: string; titular: string | null; emissor: string | null;
  numero_serie: string; valido_de: string; valido_ate: string; enviado_por_nome: string | null; enviado_em: string;
}
export interface RespostaEnvio { ok: boolean; erro?: string; avisos?: string[] }
export interface ResultadoTeste {
  usou_certificado: boolean; http_status: number; ok: boolean; mensagem: string;
  cnpj_confere: boolean | null; duracao_ms: number;
}
export interface RespostaTeste { ok: boolean; erro?: string; ambiente?: string; tem_certificado?: boolean; resultados?: ResultadoTeste[]; observacao?: string | null }

export async function buscarCertificadoAtivo(): Promise<CertificadoAtivo | null> {
  const { data, error } = await supabase.from('renave_certificado').select(COLUNAS_CERTIFICADO).eq('ativo', true).maybeSingle();
  if (error) throw error;
  return (data as CertificadoAtivo | null) ?? null;
}

export async function podeGerenciarCertificado(): Promise<boolean> {
  const { data, error } = await supabase.rpc('fn_renave_pode_gerenciar_certificado');
  if (error) throw error;
  return data === true;
}

// Extrai a mensagem de erro de respostas 401/403/500 da função
export async function lerErroFuncao(error: unknown): Promise<string> {
  try {
    const contexto = (error as { context?: { json?: () => Promise<unknown> } })?.context;
    const corpo = await contexto?.json?.();
    if (corpo && typeof corpo === 'object' && 'erro' in corpo && typeof (corpo as { erro: unknown }).erro === 'string') {
      return (corpo as { erro: string }).erro;
    }
  } catch { /* corpo ilegível */ }
  return 'Não foi possível falar com o servidor. Tente novamente.';
}

async function invocar<T extends { ok: boolean; erro?: string }>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('renave-certificado', { body });
  if (error) return { ok: false, erro: await lerErroFuncao(error) } as T;
  return data as T;
}

export function validarArquivoCertificado(arquivo: File): string | null {
  if (!/\.(pfx|p12)$/i.test(arquivo.name)) return 'Selecione um arquivo .pfx ou .p12.';
  if (arquivo.size > TAMANHO_MAX_PFX) return 'Arquivo grande demais para um certificado A1 (máximo 75 KB).';
  return null;
}

function lerComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(arquivo);
  });
}

export async function enviarCertificado(arquivo: File, senha: string): Promise<RespostaEnvio> {
  const invalido = validarArquivoCertificado(arquivo);
  if (invalido) return { ok: false, erro: invalido };
  const pfx_base64 = await lerComoDataUrl(arquivo);
  return invocar<RespostaEnvio>({ acao: 'enviar', pfx_base64, senha });
}

export const removerCertificado = () => invocar<{ ok: boolean; erro?: string; removido?: boolean }>({ acao: 'remover' });
export const testarConexao = () => invocar<RespostaTeste>({ acao: 'testar' });
