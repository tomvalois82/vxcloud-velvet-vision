import { supabase } from '@/integrations/supabase/client';

export interface CicloHistorico {
  id_estoque: number | null;
  ciclo: number | null;
  total_ciclos: number | null;
  descricao_ciclo: string | null;
  status: string | null;
  origem: string | null;
}

export async function buscarMetadadosCiclos(ids: number[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('vw_estoque_ciclos')
    .select('id_estoque, ciclo, total_ciclos, origem').in('id_estoque', ids);
  if (error) throw error;
  return data || [];
}

export async function buscarHistoricoVeiculo(idVeiculo: number): Promise<CicloHistorico[]> {
  const { data: atual, error: erroAtual } = await supabase.from('vw_estoque_ciclos')
    .select('placa_normalizada, total_ciclos, id_empresa').eq('id_estoque', idVeiculo).maybeSingle();
  if (erroAtual) throw erroAtual;
  if (!atual?.placa_normalizada || !atual.id_empresa || (atual.total_ciclos ?? 0) <= 1) return [];
  const { data, error } = await supabase.from('vw_estoque_ciclos')
    .select('id_estoque, ciclo, total_ciclos, descricao_ciclo, status, origem')
    .eq('id_empresa', atual.id_empresa).eq('placa_normalizada', atual.placa_normalizada)
    .order('ciclo', { ascending: false });
  if (error) throw error;
  return data || [];
}