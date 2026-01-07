import { useState, useEffect, useCallback, useRef } from 'react';
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
  // Balanço Geral
  totalReceitas: number;
  totalDespesasGeral: number;
  balancoGeral: number;
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
    totalReceitas: 0,
    totalDespesasGeral: 0,
    balancoGeral: 0,
    loading: true,
  });

  // Use ref to store dateRange for stable reference in realtime callback
  const dateRangeRef = useRef(dateRange);
  dateRangeRef.current = dateRange;

  // Stable dependency values
  const fromTime = dateRange.from.getTime();
  const toTime = dateRange.to.getTime();

  const fetchData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true }));
    
    try {
      const fromStr = format(dateRangeRef.current.from, 'yyyy-MM-dd');
      const toStr = format(dateRangeRef.current.to, 'yyyy-MM-dd');
      
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
      
      // 1. Buscar categoria "Compras de veículos" para excluir do total de despesas
      const { data: categoriaCompras } = await supabase
        .from('vx_fin_categoria')
        .select('id')
        .eq('categoria', 'Compras de veículos')
        .eq('operacao', 'Pagar')
        .single();
      
      // 2. Buscar todas as despesas do período (tipo_movimento = 'Pagar' com data_vencimento no período)
      // Excluindo a categoria "Compras de veículos"
      let despesasQuery = supabase
        .from('vx_fin_movimento')
        .select('valor_liquido')
        .eq('id_empresa', empresaId)
        .eq('tipo_movimento', 'Pagar')
        .gte('data_vencimento', fromStr)
        .lte('data_vencimento', toStr);
      
      if (categoriaCompras?.id) {
        despesasQuery = despesasQuery.neq('id_categoria', categoriaCompras.id);
      }
      
      const { data: despesas } = await despesasQuery;
      
      const totalDespesas = despesas?.reduce((sum, d) => sum + Number(d.valor_liquido || 0), 0) || 0;
      
      // 3. Buscar TODAS as receitas do período (tipo_movimento = 'Receber')
      const { data: receitas } = await supabase
        .from('vx_fin_movimento')
        .select('valor_liquido')
        .eq('id_empresa', empresaId)
        .eq('tipo_movimento', 'Receber')
        .gte('data_vencimento', fromStr)
        .lte('data_vencimento', toStr);
      
      const totalReceitas = receitas?.reduce((sum, r) => sum + Number(r.valor_liquido || 0), 0) || 0;
      
      // 4. Buscar TODAS as despesas do período sem exceção (para Balanço Geral)
      const { data: despesasGeral } = await supabase
        .from('vx_fin_movimento')
        .select('valor_liquido')
        .eq('id_empresa', empresaId)
        .eq('tipo_movimento', 'Pagar')
        .gte('data_vencimento', fromStr)
        .lte('data_vencimento', toStr);
      
      const totalDespesasGeral = despesasGeral?.reduce((sum, d) => sum + Number(d.valor_liquido || 0), 0) || 0;
      const balancoGeral = totalReceitas - totalDespesasGeral;
      
      // 5. Buscar vendas do período
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
      
      // 6. Buscar produtos/serviços das vendas
      let totalServicosProdutos = 0;
      if (vendas && vendas.length > 0) {
        const vendaIds = vendas.map(v => v.id);
        
        const { data: servicosProdutos } = await supabase
          .from('vx_vendas_servico_produto')
          .select('valor')
          .in('id_venda', vendaIds);
        
        totalServicosProdutos = servicosProdutos?.reduce((sum, sp) => sum + Number(sp.valor || 0), 0) || 0;
      }
      
      // 7. Buscar custos dos veículos vendidos (custos vinculados ao id_estoque)
      let custoVenda = 0;
      
      if (vendas && vendas.length > 0) {
        const veiculoIds = vendas.map(v => v.id_veiculo_vendido);
        
        // Valor de aquisição dos veículos vendidos
        const { data: veiculos } = await supabase
          .from('estoque')
          .select('id, valor_aquisicao')
          .in('id', veiculoIds);
        
        const valorAquisicao = veiculos?.reduce((sum, v) => sum + Number(v.valor_aquisicao || 0), 0) || 0;
        
        // Custos vinculados aos veículos vendidos (movimentos com id_estoque)
        const { data: custosVeiculos } = await supabase
          .from('vx_fin_movimento')
          .select('valor_liquido')
          .eq('id_empresa', empresaId)
          .eq('tipo_movimento', 'Pagar')
          .in('id_estoque', veiculoIds);
        
        const custoVinculado = custosVeiculos?.reduce((sum, c) => sum + Number(c.valor_liquido || 0), 0) || 0;
        
        custoVenda = valorAquisicao + custoVinculado;
      }
      
      // Lucro = (valor_total_venda + serviços/produtos) - custos do veículo
      const lucroVendas = (faturamentoVendas + totalServicosProdutos) - custoVenda;
      const balanco = lucroVendas - totalDespesas;
      
      setData({
        totalDespesas,
        faturamentoVendas,
        custoVenda,
        lucroVendas,
        balanco,
        quantidadeVendas,
        totalReceitas,
        totalDespesasGeral,
        balancoGeral,
        loading: false,
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      setData(prev => ({ ...prev, loading: false }));
    }
  }, [fromTime, toTime]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to realtime changes on vx_fin_movimento table
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-movimento-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vx_fin_movimento',
        },
        () => {
          // Re-fetch data when any change occurs
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);
  
  return data;
}
