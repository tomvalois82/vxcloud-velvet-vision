import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SaleListItem {
  id: string;
  data_venda: string;
  fechada: boolean;
  valor_total_venda: number;
  observacoes: string | null;
  id_cliente: string;
  id_vendedor: string | null;
  id_veiculo_vendido: number;
  cliente: {
    id: string;
    nome: string;
    cpf_cnpj: string;
  } | null;
  vendedor: {
    id: string;
    nome: string;
  } | null;
  veiculo: {
    id: number;
    modelo: string | null;
    fabricante: string | null;
    ano: string | null;
    placa: string | null;
  } | null;
}

interface Filters {
  search: string;
  status: 'all' | 'open' | 'closed';
  vendedorId: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
}

export function useSalesList() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    vendedorId: null,
    dataInicio: null,
    dataFim: null,
  });
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('vx_vendas')
        .select(`
          id,
          data_venda,
          fechada,
          valor_total_venda,
          observacoes,
          id_cliente,
          id_vendedor,
          id_veiculo_vendido
        `)
        .order('data_venda', { ascending: false });

      // Apply status filter
      if (filters.status === 'open') {
        query = query.eq('fechada', false);
      } else if (filters.status === 'closed') {
        query = query.eq('fechada', true);
      }

      // Apply seller filter
      if (filters.vendedorId) {
        query = query.eq('id_vendedor', filters.vendedorId);
      }

      // Apply date filters
      if (filters.dataInicio) {
        query = query.gte('data_venda', filters.dataInicio.toISOString());
      }
      if (filters.dataFim) {
        const endDate = new Date(filters.dataFim);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('data_venda', endDate.toISOString());
      }

      const { data: salesData, error } = await query;

      if (error) throw error;

      // Fetch related data for each sale
      const salesWithRelations: SaleListItem[] = await Promise.all(
        (salesData || []).map(async (sale) => {
          // Fetch cliente
          const { data: clienteData } = await supabase
            .from('vx_pessoa')
            .select('id, nome, cpf_cnpj')
            .eq('id', sale.id_cliente)
            .single();

          // Fetch vendedor
          let vendedorData = null;
          if (sale.id_vendedor) {
            const { data } = await supabase
              .from('vx_pessoa')
              .select('id, nome')
              .eq('id', sale.id_vendedor)
              .single();
            vendedorData = data;
          }

          // Fetch veiculo
          const { data: veiculoData } = await supabase
            .from('estoque')
            .select('id, modelo, fabricante, ano, placa')
            .eq('id', sale.id_veiculo_vendido)
            .single();

          return {
            ...sale,
            cliente: clienteData,
            vendedor: vendedorData,
            veiculo: veiculoData,
          };
        })
      );

      // Apply search filter on client side (name, plate, ID)
      let filteredSales = salesWithRelations;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredSales = salesWithRelations.filter((sale) => {
          const clienteNome = sale.cliente?.nome?.toLowerCase() || '';
          const placa = sale.veiculo?.placa?.toLowerCase() || '';
          const saleId = sale.id.toLowerCase();
          return (
            clienteNome.includes(searchLower) ||
            placa.includes(searchLower) ||
            saleId.includes(searchLower)
          );
        });
      }

      setSales(filteredSales);
    } catch (error) {
      console.error('Error fetching sales:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar vendas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchColaboradores = useCallback(async () => {
    const { data } = await supabase
      .from('vx_pessoa')
      .select('id, nome')
      .eq('eh_colaborador', true)
      .order('nome');
    setColaboradores(data || []);
  }, []);

  useEffect(() => {
    fetchSales();
    fetchColaboradores();
  }, [fetchSales, fetchColaboradores]);

  const reopenSale = useCallback(async (saleId: string) => {
    setActionLoading(saleId);
    try {
      const { error } = await supabase
        .from('vx_vendas')
        .update({ fechada: false })
        .eq('id', saleId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Venda reaberta com sucesso',
      });

      await fetchSales();
    } catch (error) {
      console.error('Error reopening sale:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao reabrir venda',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  }, [fetchSales]);

  const closeSale = useCallback(async (saleId: string, vehicleId: number) => {
    setActionLoading(saleId);
    try {
      // 1. Carregar todos os dados da venda para calcular o saldo
      const { data: vendaData, error: vendaError } = await supabase
        .from('vx_vendas')
        .select('*')
        .eq('id', saleId)
        .single();

      if (vendaError || !vendaData) {
        throw new Error('Venda não encontrada');
      }

      // Carregar trocas
      const { data: trocasData } = await supabase
        .from('vx_vendas_troca')
        .select('valor_troca')
        .eq('id_venda', saleId);

      // Carregar pagamentos/acertos
      const { data: pagamentosData } = await supabase
        .from('vx_vendas_acerto')
        .select('*')
        .eq('id_venda', saleId);

      // Carregar financiamento
      const { data: financiamentoData } = await supabase
        .from('vx_vendas_financiamento')
        .select('*')
        .eq('id_venda', saleId)
        .maybeSingle();

      // Carregar serviços/produtos
      const { data: servicosData } = await supabase
        .from('vx_vendas_servico_produto')
        .select('valor')
        .eq('id_venda', saleId);

      // Carregar id_empresa do veículo
      const { data: veiculoData } = await supabase
        .from('estoque')
        .select('id_empresa')
        .eq('id', vehicleId)
        .single();

      if (!veiculoData?.id_empresa) {
        throw new Error('Empresa não encontrada');
      }

      // 2. Calcular saldo
      const totalTrocas = (trocasData || []).reduce((sum, t) => sum + Number(t.valor_troca), 0);
      const totalServicosProdutos = (servicosData || []).reduce((sum, s) => sum + Number(s.valor), 0);
      const totalRecebimentos = (pagamentosData || [])
        .filter(p => Number(p.valor) > 0)
        .reduce((sum, p) => sum + Number(p.valor), 0);
      const totalPagamentosSaida = (pagamentosData || [])
        .filter(p => Number(p.valor) < 0)
        .reduce((sum, p) => sum + Math.abs(Number(p.valor)), 0);
      const totalFinanciamento = financiamentoData?.valor ? Number(financiamentoData.valor) : 0;

      const valorVenda = Number(vendaData.valor_total_venda);
      const diferencaAReceber = valorVenda + totalServicosProdutos - totalTrocas;
      const totalRecebido = totalRecebimentos + totalFinanciamento - totalPagamentosSaida;
      const saldoFinal = diferencaAReceber - totalRecebido;

      // 3. Validar saldo = 0
      if (Math.abs(saldoFinal) > 0.01) {
        toast({
          title: 'Erro ao fechar venda',
          description: 'Não é possível fechar a venda. O saldo final deve ser zero. Edite a venda para ajustar os valores.',
          variant: 'destructive',
        });
        setActionLoading(null);
        return;
      }

      // 4. Fechar a venda - a trigger fn_gerar_financeiro_venda no banco
      // cria os lançamentos financeiros automaticamente
      const { error: saleError } = await supabase
        .from('vx_vendas')
        .update({ fechada: true })
        .eq('id', saleId);

      if (saleError) throw saleError;

      toast({
        title: 'Sucesso',
        description: 'Venda fechada com sucesso',
      });

      await fetchSales();
    } catch (error) {
      console.error('Error closing sale:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao fechar venda',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  }, [fetchSales, sales]);

  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    sales,
    loading,
    actionLoading,
    filters,
    colaboradores,
    updateFilters,
    reopenSale,
    closeSale,
    refetch: fetchSales,
  };
}
