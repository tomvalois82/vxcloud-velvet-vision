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

      // 4. Buscar categorias financeiras
      const { data: categoriasData } = await supabase
        .from('vx_fin_categoria')
        .select('id, categoria, operacao')
        .eq('ativo', true);

      const categoriaReceber = categoriasData?.find(c => 
        c.operacao === 'Receber' && c.categoria.toUpperCase().includes('VENDAS')
      ) || categoriasData?.find(c => 
        c.operacao === 'Receber' && c.categoria.toUpperCase().includes('OUTRAS RECEITAS')
      ) || categoriasData?.find(c => c.operacao === 'Receber');

      const categoriaPagar = categoriasData?.find(c => 
        c.operacao === 'Pagar' && c.categoria.toUpperCase().includes('OUTRAS DESPESAS')
      ) || categoriasData?.find(c => c.operacao === 'Pagar');

      if (!categoriaReceber || !categoriaPagar) {
        throw new Error('Categorias financeiras não encontradas');
      }

      // 5. Criar lançamentos financeiros
      const movimentosParaInserir: Array<{
        tipo_movimento: string;
        id_empresa: string;
        status: string;
        id_conta: string;
        id_categoria: string;
        descricao: string;
        valor_bruto: number;
        valor_liquido: number;
        data_vencimento: string;
        data_pagamento: string | null;
        id_pessoa: string | null;
        id_estoque: number | null;
        observacoes: string | null;
      }> = [];

      // Carregar informações adicionais para descrições
      const sale = sales.find(s => s.id === saleId);
      const veiculoDesc = sale?.veiculo 
        ? `${sale.veiculo.fabricante || ''} ${sale.veiculo.modelo || ''}`.trim() 
        : 'Veículo';

      // Lançamentos de pagamentos
      if (pagamentosData && pagamentosData.length > 0) {
        for (const pagamento of pagamentosData) {
          const valorNum = Number(pagamento.valor);
          const isRecebimento = valorNum > 0;
          const valorAbsoluto = Math.abs(valorNum);
          const status = pagamento.data_pagamento ? 'Pago' : 'Pendente';

          // Buscar nome da forma de pagamento
          const { data: formaData } = await supabase
            .from('vx_forma_pagamento')
            .select('descricao')
            .eq('id', pagamento.id_forma_pagamento)
            .single();

          movimentosParaInserir.push({
            tipo_movimento: isRecebimento ? 'Receber' : 'Pagar',
            id_empresa: veiculoData.id_empresa,
            status,
            id_conta: pagamento.id_conta,
            id_categoria: isRecebimento ? categoriaReceber.id : categoriaPagar.id,
            descricao: `Venda ${veiculoDesc} - ${formaData?.descricao || 'Pagamento'} ${pagamento.numero}`,
            valor_bruto: valorAbsoluto,
            valor_liquido: valorAbsoluto,
            data_vencimento: pagamento.data_lancamento,
            data_pagamento: pagamento.data_pagamento,
            id_pessoa: vendaData.id_cliente,
            id_estoque: vehicleId,
            observacoes: pagamento.observacao,
          });
        }
      }

      // Lançamento de financiamento
      if (financiamentoData && financiamentoData.valor > 0) {
        const { data: financeiraData } = await supabase
          .from('vx_financeiras')
          .select('nome')
          .eq('id', financiamentoData.id_financeira || '')
          .maybeSingle();

        movimentosParaInserir.push({
          tipo_movimento: 'Receber',
          id_empresa: veiculoData.id_empresa,
          status: 'Pendente',
          id_conta: financiamentoData.id_conta_destino,
          id_categoria: categoriaReceber.id,
          descricao: `Venda ${veiculoDesc} - Financiamento ${financeiraData?.nome || ''}`,
          valor_bruto: Number(financiamentoData.valor),
          valor_liquido: Number(financiamentoData.valor),
          data_vencimento: financiamentoData.data_vencimento_inicial || vendaData.data_venda.split('T')[0],
          data_pagamento: null,
          id_pessoa: vendaData.id_cliente,
          id_estoque: vehicleId,
          observacoes: financiamentoData.numero_contrato 
            ? `Contrato: ${financiamentoData.numero_contrato}` 
            : null,
        });
      }

      // 6. Inserir lançamentos financeiros
      if (movimentosParaInserir.length > 0) {
        const { error: movimentoError } = await supabase
          .from('vx_fin_movimento')
          .insert(movimentosParaInserir);

        if (movimentoError) {
          console.error('Erro ao criar lançamentos financeiros:', movimentoError);
          toast({
            title: 'Erro',
            description: 'Erro ao fechar a venda. Nenhum lançamento financeiro foi registrado.',
            variant: 'destructive',
          });
          setActionLoading(null);
          return;
        }
      }

      // 7. Update sale status
      const { error: saleError } = await supabase
        .from('vx_vendas')
        .update({ fechada: true })
        .eq('id', saleId);

      if (saleError) throw saleError;

      // 8. Update vehicle status
      const { error: vehicleError } = await supabase
        .from('estoque')
        .update({ status: 'Vendido' })
        .eq('id', vehicleId);

      if (vehicleError) {
        console.error('Erro ao atualizar status do veículo:', vehicleError);
      }

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
