import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { mensagemErroBanco } from '@/lib/dbErrors';
import type { PessoaRenave } from '../utils/pendencias';

export type ProcessoRenave = Database['public']['Views']['vw_renave_estoque']['Row'];

// Converte erros do banco em mensagem amigável, priorizando a mensagem do próprio banco.
export function mensagemErroRenave(error: unknown, fallback: string): string {
  const amigavel = mensagemErroBanco(error, '');
  if (amigavel) return amigavel;
  if (typeof error === 'object' && error !== null) {
    const mensagem = (error as { message?: unknown }).message;
    if (typeof mensagem === 'string' && mensagem.trim()) return mensagem;
  }
  return fallback;
}

export async function buscarRenaveHabilitado(): Promise<{ habilitado: boolean; email: string | null }> {
  const { data: idEmpresa, error: erroEmpresa } = await supabase.rpc('fn_empresa_usuario');
  if (erroEmpresa) throw erroEmpresa;
  if (!idEmpresa) return { habilitado: false, email: null };
  const { data, error } = await supabase.from('empresa')
    .select('renave_habilitado, renave_email').eq('id', idEmpresa).maybeSingle();
  if (error) throw error;
  return { habilitado: data?.renave_habilitado === true, email: data?.renave_email ?? null };
}

export async function buscarProcesso(idEstoque: number): Promise<ProcessoRenave | null> {
  const { data, error } = await supabase.from('vw_renave_estoque')
    .select('*')
    .eq('id_estoque', idEstoque)
    .or('estado.is.null,estado.neq.CANCELADO')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function iniciarProcesso(idEstoque: number, motivo: string): Promise<string> {
  const { data, error } = await supabase.rpc('fn_renave_iniciar', { p_id_estoque: idEstoque, p_motivo: motivo });
  if (error) throw error;
  return data;
}

export interface DadosEntradaRenave {
  id_pessoa_proprietario_crv: string | null;
  data_entrada: string | null;
  valor_entrada: number | null;
  km_entrada: number | null;
  data_medicao_hodometro: string | null;
  email_vendedor: string | null;
  tipo_crv: string | null;
  numero_crv: string | null;
  codigo_seguranca_crv?: string;
  motivo: string | null;
}

// Monta o payload da entrada com apenas as colunas permitidas; o código de segurança
// só é enviado quando o usuário digitou algo.
export function montarPayloadEntrada(dados: DadosEntradaRenave) {
  const { codigo_seguranca_crv, ...resto } = dados;
  const codigo = (codigo_seguranca_crv || '').replace(/\D/g, '');
  return codigo ? { ...resto, codigo_seguranca_crv: codigo } : resto;
}

export async function salvarEntrada(id: string, dados: DadosEntradaRenave): Promise<void> {
  // Sem .select(): o usuário não pode ler codigo_seguranca_crv.
  const { error } = await supabase.from('renave_estoque').update(montarPayloadEntrada(dados)).eq('id', id);
  if (error) throw error;
}

export interface DadosSaidaRenave {
  id_pessoa_comprador: string | null;
  data_saida: string | null;
  valor_saida: number | null;
  id_venda: string | null;
}

export async function salvarSaida(id: string, dados: DadosSaidaRenave): Promise<void> {
  const { error } = await supabase.from('renave_estoque').update(dados).eq('id', id);
  if (error) throw error;
}

export async function excluirProcesso(id: string): Promise<void> {
  const { error } = await supabase.from('renave_estoque').delete().eq('id', id);
  if (error) throw error;
}

// Etapas RENAVE em lote para os veículos da página (uma única consulta).
export async function buscarEtapasRenave(ids: number[]): Promise<Map<number, string | null>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from('vw_estoque_ciclos')
    .select('id_estoque, renave_etapa').in('id_estoque', ids);
  if (error) throw error;
  const mapa = new Map<number, string | null>();
  (data || []).forEach((linha) => {
    if (linha.id_estoque !== null) mapa.set(linha.id_estoque, linha.renave_etapa);
  });
  return mapa;
}

export async function buscarPessoasRenave(): Promise<PessoaRenave[]> {
  const { data, error } = await supabase.from('vx_pessoa')
    .select('id, nome, cpf_cnpj, email, cep, logradouro, numero, bairro, municipio, estado')
    .order('nome');
  if (error) throw error;
  return data || [];
}

export interface VeiculoRenave {
  placa: string | null;
  renavam: string | null;
  chassi: string | null;
  modelo: string | null;
  fabricante: string | null;
}

export async function buscarVeiculoRenave(idEstoque: number): Promise<VeiculoRenave | null> {
  const { data, error } = await supabase.from('estoque')
    .select('placa, renavam, renavan, chassi, modelo, fabricante').eq('id', idEstoque).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    placa: data.placa,
    renavam: data.renavam ?? (data.renavan ? String(data.renavan).padStart(11, '0') : null),
    chassi: data.chassi,
    modelo: data.modelo,
    fabricante: data.fabricante,
  };
}

// Venda do ciclo para pré-preencher a saída quando o processo ainda não tem comprador.
export async function buscarVendaDoCiclo(idEstoque: number) {
  const { data, error } = await supabase.from('vx_vendas')
    .select('id, id_cliente, data_venda, valor_total_venda')
    .eq('id_veiculo_vendido', idEstoque).maybeSingle();
  if (error) throw error;
  return data;
}

// Situação após fechar a venda: processo RENAVE ativo e existência de financiamento.
export async function buscarSituacaoRenaveVenda(idEstoque: number, idVenda: string) {
  const [ciclo, financiamento] = await Promise.all([
    supabase.from('vw_estoque_ciclos').select('renave_id').eq('id_estoque', idEstoque).maybeSingle(),
    supabase.from('vx_vendas_financiamento').select('id', { count: 'exact', head: true }).eq('id_venda', idVenda),
  ]);
  if (ciclo.error) throw ciclo.error;
  if (financiamento.error) throw financiamento.error;
  return { noRenave: !!ciclo.data?.renave_id, financiada: (financiamento.count ?? 0) > 0 };
}
