import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DashboardData {
  totalDespesas: number;
  faturamentoVendas: number;
  custoVenda: number;
  lucroVendas: number;
  balanco: number;
  quantidadeVendas: number;
  loading: boolean;
}

export const PERIOD_OPTIONS = [
  { value: 'mes-atual', label: 'Mês atual' },
  { value: 'mes-anterior', label: 'Mês anterior' },
  { value: '3-meses', label: 'Últimos 3 meses' },
  { value: '6-meses', label: 'Últimos 6 meses' },
  { value: '12-meses', label: 'Últimos 12 meses' },
] as const;

export type PeriodOption = typeof PERIOD_OPTIONS[number]['value'];

export function getDateRangeFromPeriod(period: PeriodOption): DateRange {
  const now = new Date();
  
  switch (period) {
    case 'mes-atual':
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
    case 'mes-anterior':
      const lastMonth = subMonths(now, 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    case '3-meses':
      return {
        from: startOfMonth(subMonths(now, 2)),
        to: endOfMonth(now),
      };
    case '6-meses':
      return {
        from: startOfMonth(subMonths(now, 5)),
        to: endOfMonth(now),
      };
    case '12-meses':
      return {
        from: startOfMonth(subMonths(now, 11)),
        to: endOfMonth(now),
      };
    default:
      return {
        from: startOfMonth(now),
        to: endOfMonth(now),
      };
  }
}

export function useDashboardData(dateRange: DateRange) {
  const [data, setData] = useState<DashboardData>({
    totalDespesas: 0,
    faturamentoVendas: 0,
    custoVenda: 0,
    lucroVendas: 0,
    balanco: 0,
    quantidadeVendas: 0,
    loading: true,
  });

  useEffect(() => {
    async function fetchData() {
      setData(prev => ({ ...prev, loading: true }));
      
      try {
        const fromStr = format(dateRange.from, 'yyyy-MM-dd');
        const toStr = format(dateRange.to, 'yyyy-MM-dd');
        
        // Buscar empresa do usuário
        const { data: empresaData } = await supabase
          .from('empresa')
          .select('id')
          .single();
        
        if (!empresaData) {
          setData(prev => ({ ...prev, loading: false }));
          return;
        }
        
        const empresaId = empresaData.id;
        
        // 1. Buscar todas as despesas do período (movimentos de saída pagos)
        const { data: despesas } = await supabase
          .from('vx_fin_movimento')
          .select('valor_liquido, id_categoria, tipo_movimento')
          .eq('id_empresa', empresaId)
          .eq('tipo_movimento', 'Saída')
          .eq('status', 'Pago')
          .gte('data_pagamento', fromStr)
          .lte('data_pagamento', toStr)
          .is('id_estoque', null); // Despesas não vinculadas a veículos
        
        const totalDespesas = despesas?.reduce((sum, d) => sum + Number(d.valor_liquido || 0), 0) || 0;
        
        // 2. Buscar vendas do período
        const { data: vendas } = await supabase
          .from('vx_vendas')
          .select(`
            id,
            valor_total_venda,
            id_veiculo_vendido,
            data_venda
          `)
          .eq('id_empresa', empresaId)
          .gte('data_venda', fromStr)
          .lte('data_venda', toStr);
        
        const quantidadeVendas = vendas?.length || 0;
        const faturamentoVendas = vendas?.reduce((sum, v) => sum + Number(v.valor_total_venda || 0), 0) || 0;
        
        // 3. Buscar custos dos veículos vendidos (valor_aquisicao + custos vinculados)
        let custoVenda = 0;
        
        if (vendas && vendas.length > 0) {
          const veiculoIds = vendas.map(v => v.id_veiculo_vendido);
          
          // Valor de aquisição dos veículos vendidos
          const { data: veiculos } = await supabase
            .from('estoque')
            .select('id, valor_aquisicao')
            .in('id', veiculoIds);
          
          const valorAquisicao = veiculos?.reduce((sum, v) => sum + Number(v.valor_aquisicao || 0), 0) || 0;
          
          // Custos vinculados aos veículos vendidos
          const { data: custosVeiculos } = await supabase
            .from('vx_fin_movimento')
            .select('valor_liquido')
            .eq('id_empresa', empresaId)
            .eq('tipo_movimento', 'Saída')
            .eq('status', 'Pago')
            .in('id_estoque', veiculoIds);
          
          const custoVinculado = custosVeiculos?.reduce((sum, c) => sum + Number(c.valor_liquido || 0), 0) || 0;
          
          custoVenda = valorAquisicao + custoVinculado;
        }
        
        const lucroVendas = faturamentoVendas - custoVenda;
        const balanco = lucroVendas - totalDespesas;
        
        setData({
          totalDespesas,
          faturamentoVendas,
          custoVenda,
          lucroVendas,
          balanco,
          quantidadeVendas,
          loading: false,
        });
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        setData(prev => ({ ...prev, loading: false }));
      }
    }
    
    fetchData();
  }, [dateRange.from.getTime(), dateRange.to.getTime()]);
  
  return data;
}
