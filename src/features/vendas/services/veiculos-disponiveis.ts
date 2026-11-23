import { supabase } from '@/integrations/supabase/client';
import type { SaleVehicle } from '../types';

const CAMPOS_VEICULO = 'id, modelo, fabricante, ano, valor, km, cor, foto, placa';

// Busca veículos ativos e sem venda no ciclo (aptos para troca), excluindo o veículo da venda
export async function buscarVeiculosDisponiveisTroca(idExcluir: number | null): Promise<SaleVehicle[]> {
  const { data: ciclos } = await supabase
    .from('vw_estoque_ciclos')
    .select('id_estoque')
    .eq('ativo', true)
    .is('id_venda', null);
  const ids = (ciclos || [])
    .map((c) => c.id_estoque)
    .filter((id): id is number => id !== null && id !== idExcluir);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('estoque')
    .select(CAMPOS_VEICULO)
    .in('id', ids)
    .order('created_at', { ascending: false });
  return (data || []) as SaleVehicle[];
}

// Verifica se o veículo pode ser vendido; retorna a mensagem de bloqueio ou null
export async function verificarVeiculoVendavel(idEstoque: number): Promise<string | null> {
  const { data } = await supabase
    .from('vw_estoque_ciclos')
    .select('ativo, id_venda, status')
    .eq('id_estoque', idEstoque)
    .maybeSingle();
  if (!data) return null;
  if (data.ativo === false || data.id_venda !== null) {
    const motivo = data.id_venda !== null ? 'já possui venda' : `status ${data.status ?? '—'}`;
    return `Este veículo não está disponível para venda (${motivo}).`;
  }
  return null;
}
