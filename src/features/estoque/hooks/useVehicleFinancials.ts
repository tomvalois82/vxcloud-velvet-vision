import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VehicleFinancials {
  custos: number;
  valorVenda: number | null;
  valorAquisicao: number;
  margem: number | null;
  loading: boolean;
}

export function useVehicleFinancials(vehicleId: number | undefined, valorAquisicao: number | null): VehicleFinancials {
  const [custos, setCustos] = useState(0);
  const [valorVenda, setValorVenda] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFinancials = useCallback(async () => {
    if (!vehicleId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Buscar custos do veículo (despesas/pagar)
      const { data: movimentos, error: movimentosError } = await supabase
        .from('vx_fin_movimento')
        .select('valor_bruto, valor_liquido, desconto, acrescimo, status')
        .eq('id_estoque', vehicleId)
        .eq('tipo_movimento', 'Pagar');

      if (movimentosError) throw movimentosError;

      // Calcular custos: se pago usa valor_liquido, senão usa valor_bruto
      const totalCustos = (movimentos || []).reduce((acc, mov) => {
        if (mov.status === 'Pago') {
          // Valor pago = valor_bruto - desconto + acrescimo
          const valorPago = Number(mov.valor_bruto) - Number(mov.desconto || 0) + Number(mov.acrescimo || 0);
          return acc + valorPago;
        }
        // Valor original para títulos não pagos
        return acc + Number(mov.valor_bruto);
      }, 0);

      setCustos(totalCustos);

      // Buscar valor de venda do veículo
      const { data: venda, error: vendaError } = await supabase
        .from('vx_vendas')
        .select('valor_total_venda')
        .eq('id_veiculo_vendido', vehicleId)
        .maybeSingle();

      if (vendaError) throw vendaError;

      setValorVenda(venda?.valor_total_venda ? Number(venda.valor_total_venda) : null);
    } catch (error) {
      console.error('Error fetching vehicle financials:', error);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchFinancials();

    if (!vehicleId) return;

    // Realtime subscription para movimentos financeiros
    const movimentosChannel = supabase
      .channel(`vehicle-financials-${vehicleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vx_fin_movimento',
          filter: `id_estoque=eq.${vehicleId}`
        },
        () => fetchFinancials()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vx_vendas',
          filter: `id_veiculo_vendido=eq.${vehicleId}`
        },
        () => fetchFinancials()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(movimentosChannel);
    };
  }, [vehicleId, fetchFinancials]);

  // Calcular margem: Valor de Venda - Valor de Aquisição - Custos
  const aquisicao = Number(valorAquisicao) || 0;
  const margem = valorVenda !== null ? valorVenda - aquisicao - custos : null;

  return {
    custos,
    valorVenda,
    valorAquisicao: aquisicao,
    margem,
    loading
  };
}
