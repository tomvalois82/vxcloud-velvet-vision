import { supabase } from '@/integrations/supabase/client';
import type { PurchaseVehicle } from '../types';
import { selecionarIdsCompra } from '../utils/veiculos-compra';

export const VEHICLE_FIELDS = 'id, modelo, fabricante, ano, valor, km, cor, foto, placa, status';

export async function buscarVeiculosCompra(idCompra?: string | null): Promise<PurchaseVehicle[]> {
  const consulta = supabase.from('vw_estoque_ciclos')
    .select('id_estoque, id_venda, id_compra')
    .is('id_venda', null)
    // Ciclo recebido em troca já entrou no estoque pela venda; vincular uma compra
    // a ele geraria custo e financeiro em dobro no mesmo ciclo.
    .is('id_venda_troca', null);
  const { data: ciclos, error: erroCiclos } = await (idCompra
    ? consulta.or(`id_compra.is.null,id_compra.eq.${idCompra}`)
    : consulta.is('id_compra', null));
  if (erroCiclos) throw erroCiclos;
  const ids = selecionarIdsCompra(ciclos || [], idCompra);
  if (ids.length === 0) return [];

  const { data: veiculos, error: erroVeiculos } = await supabase.from('estoque')
    .select(VEHICLE_FIELDS)
    .in('id', ids)
    .order('created_at', { ascending: false });
  if (erroVeiculos) throw erroVeiculos;
  return veiculos || [];
}

export async function buscarUltimoCicloEncerrado(placa: string): Promise<{ descricao_ciclo: string | null } | null> {
  const { data: ciclo, error: erro } = await supabase.from('vw_estoque_ciclos')
    .select('descricao_ciclo')
    .eq('placa_normalizada', placa)
    .eq('ativo', false)
    .order('ciclo', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (erro) throw erro;
  return ciclo;
}