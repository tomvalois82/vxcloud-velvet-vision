import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Movimento financeiro pago atrelado à compra (exibido no diálogo de cancelamento)
export interface PaidMovement {
  id: string;
  descricao: string | null;
  valor_liquido: number;
  data_vencimento: string;
  data_pagamento: string | null;
}

export interface PurchaseListItem {
  id: string;
  data_compra: string;
  fechada: boolean | null;
  cancelada: boolean | null;
  valor_total_compra: number;
  observacoes: string | null;
  id_fornecedor: string;
  id_comprador: string | null;
  id_veiculo_comprado: number;
  fornecedor: { id: string; nome: string; cpf_cnpj: string } | null;
  comprador: { id: string; nome: string } | null;
  veiculo: {
    id: number;
    modelo: string | null;
    fabricante: string | null;
    ano: string | null;
    placa: string | null;
  } | null;
}

interface PurchaseFilters {
  search: string;
  status: 'all' | 'open' | 'closed';
  compradorId: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
}

export function usePurchasesList() {
  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [colaboradores, setColaboradores] = useState<{ id: string; nome: string }[]>([]);
  const [filters, setFilters] = useState<PurchaseFilters>({
    search: '',
    status: 'all',
    compradorId: null,
    dataInicio: null,
    dataFim: null,
  });

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('vx_compras')
        .select(
          'id, data_compra, fechada, cancelada, valor_total_compra, observacoes, id_fornecedor, id_comprador, id_veiculo_comprado'
        )
        .order('data_compra', { ascending: false });

      if (filters.status === 'open') query = query.eq('fechada', false);
      if (filters.status === 'closed') query = query.eq('fechada', true);
      if (filters.compradorId) query = query.eq('id_comprador', filters.compradorId);
      if (filters.dataInicio) query = query.gte('data_compra', filters.dataInicio.toISOString());
      if (filters.dataFim) {
        const fim = new Date(filters.dataFim);
        fim.setHours(23, 59, 59, 999);
        query = query.lte('data_compra', fim.toISOString());
      }

      const { data: comprasData, error } = await query;
      if (error) throw error;

      const compras = comprasData || [];
      const pessoaIds = Array.from(
        new Set(
          compras.flatMap(c => [c.id_fornecedor, c.id_comprador]).filter(Boolean) as string[]
        )
      );
      const veiculoIds = Array.from(new Set(compras.map(c => c.id_veiculo_comprado)));

      const [{ data: pessoas }, { data: veiculos }] = await Promise.all([
        pessoaIds.length
          ? supabase.from('vx_pessoa').select('id, nome, cpf_cnpj').in('id', pessoaIds)
          : Promise.resolve({ data: [] }),
        veiculoIds.length
          ? supabase.from('estoque').select('id, modelo, fabricante, ano, placa').in('id', veiculoIds)
          : Promise.resolve({ data: [] }),
      ]);

      const termo = filters.search.trim().toLowerCase();

      const lista: PurchaseListItem[] = compras.map(compra => {
        const fornecedor = (pessoas || []).find(p => p.id === compra.id_fornecedor) || null;
        const comprador = (pessoas || []).find(p => p.id === compra.id_comprador) || null;
        const veiculo = (veiculos || []).find(v => v.id === compra.id_veiculo_comprado) || null;
        return {
          ...compra,
          valor_total_compra: Number(compra.valor_total_compra),
          fornecedor,
          comprador: comprador ? { id: comprador.id, nome: comprador.nome } : null,
          veiculo,
        };
      });

      const listaFiltrada = termo
        ? lista.filter(
            item =>
              (item.fornecedor?.nome || '').toLowerCase().includes(termo) ||
              (item.veiculo?.placa || '').toLowerCase().includes(termo) ||
              (item.veiculo?.modelo || '').toLowerCase().includes(termo) ||
              item.id.toLowerCase().includes(termo)
          )
        : lista;

      setPurchases(listaFiltrada);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar as compras',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  useEffect(() => {
    const loadColaboradores = async () => {
      const { data } = await supabase
        .from('vx_pessoa')
        .select('id, nome')
        .eq('eh_colaborador', true)
        .order('nome');
      setColaboradores(data || []);
    };
    loadColaboradores();
  }, []);

  const reopenPurchase = useCallback(
    async (purchaseId: string) => {
      setActionLoading(purchaseId);
      try {
        // Verifica títulos gerados pela compra antes de reabrir
        const { data: movimentos, error: erroMov } = await supabase
          .from('vx_fin_movimento')
          .select('id, status')
          .eq('id_compra', purchaseId);
        if (erroMov) throw erroMov;

        const temPago = (movimentos || []).some(m => m.status === 'Pago');
        const temPendente = (movimentos || []).some(m => m.status === 'Pendente');

        if (temPago) {
          toast({
            title: 'Não foi possível reabrir a compra',
            description: 'Já existe(m) título(s) lançado(s) e pago(s) para esta compra.',
            variant: 'destructive',
          });
          return;
        }

        const { error } = await supabase
          .from('vx_compras')
          .update({ fechada: false })
          .eq('id', purchaseId);
        if (error) throw error;

        if (temPendente) {
          toast({
            title: 'Compra reaberta com aviso',
            description: 'Existe(m) título(s) já lançado(s), porém ainda pendente(s).',
          });
        } else {
          toast({ title: 'Sucesso', description: 'Compra reaberta para edição' });
        }
        await fetchPurchases();
      } catch (error) {
        console.error('Erro ao reabrir compra:', error);
        toast({ title: 'Erro', description: 'Falha ao reabrir compra', variant: 'destructive' });
      } finally {
        setActionLoading(null);
      }
    },
    [fetchPurchases]
  );

  const updateFilters = useCallback((novos: Partial<PurchaseFilters>) => {
    setFilters(prev => ({ ...prev, ...novos }));
  }, []);

  // Busca os movimentos financeiros pagos atrelados à compra
  const fetchPaidMovements = useCallback(async (purchaseId: string): Promise<PaidMovement[]> => {
    const { data, error } = await supabase
      .from('vx_fin_movimento')
      .select('id, descricao, valor_liquido, data_vencimento, data_pagamento')
      .eq('id_compra', purchaseId)
      .eq('status', 'Pago');
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao verificar títulos da compra', variant: 'destructive' });
      return [];
    }
    return (data || []).map(m => ({
      id: m.id,
      descricao: m.descricao,
      valor_liquido: Number(m.valor_liquido),
      data_vencimento: m.data_vencimento,
      data_pagamento: m.data_pagamento,
    }));
  }, []);

  // Cancela a compra — a trigger do banco cuida dos movimentos financeiros
  const cancelPurchase = useCallback(
    async (purchaseId: string) => {
      setActionLoading(purchaseId);
      try {
        const { error } = await supabase
          .from('vx_compras')
          .update({ cancelada: true })
          .eq('id', purchaseId);
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Compra cancelada' });
        await fetchPurchases();
      } catch (error) {
        console.error('Erro ao cancelar compra:', error);
        toast({ title: 'Erro', description: 'Falha ao cancelar compra', variant: 'destructive' });
      } finally {
        setActionLoading(null);
      }
    },
    [fetchPurchases]
  );

  return {
    purchases,
    loading,
    actionLoading,
    filters,
    colaboradores,
    updateFilters,
    reopenPurchase,
    refetch: fetchPurchases,
  };
}
