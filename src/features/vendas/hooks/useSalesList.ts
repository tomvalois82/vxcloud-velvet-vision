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
      // Update sale status
      const { error: saleError } = await supabase
        .from('vx_vendas')
        .update({ fechada: true })
        .eq('id', saleId);

      if (saleError) throw saleError;

      // Update vehicle status
      const { error: vehicleError } = await supabase
        .from('estoque')
        .update({ status: 'Vendido' })
        .eq('id', vehicleId);

      if (vehicleError) throw vehicleError;

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
  }, [fetchSales]);

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
