import { supabase } from '@/integrations/supabase/client';
import type { VeiculoResumo } from '../utils/veiculo-selecao';

export async function buscarCiclosFinanceiro(idEmpresa: string): Promise<VeiculoResumo[]> {
  const { data: ciclos, error: erroCiclos } = await supabase.from('vw_estoque_ciclos')
    .select('id_estoque, titulo, descricao_ciclo, placa_normalizada, ciclo, total_ciclos, sugerido, ordem_exibicao, ativo, id_venda, venda_fechada, modelo, placa, ano, status')
    .eq('id_empresa', idEmpresa)
    .order('placa_normalizada')
    .order('ordem_exibicao');
  if (erroCiclos) throw erroCiclos;
  const ciclosValidos = (ciclos || []).filter(
    (ciclo): ciclo is typeof ciclo & { id_estoque: number } => ciclo.id_estoque !== null,
  );
  if (ciclosValidos.length === 0) return [];
  const { data: veiculos, error: erroVeiculos } = await supabase.from('estoque')
    .select('id, fabricante')
    .eq('id_empresa', idEmpresa)
    .in('id', ciclosValidos.map(ciclo => ciclo.id_estoque));
  if (erroVeiculos) throw erroVeiculos;
  const fabricantes = new Map((veiculos || []).map(veiculo => [veiculo.id, veiculo.fabricante]));
  return ciclosValidos.map(ciclo => ({
    ...ciclo,
    id: ciclo.id_estoque,
    fabricante: fabricantes.get(ciclo.id_estoque) ?? null,
  }));
}