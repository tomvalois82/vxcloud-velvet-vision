import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { 
  SaleData, 
  SaleVehicle, 
  SalePerson, 
  TradeInVehicle, 
  PaymentEntry,
  FormaPagamento,
  ContaFinanceira
} from '../types';

const initialSaleData: SaleData = {
  id_cliente: null,
  id_vendedor: null,
  cliente: null,
  vendedor: null,
  veiculo: null,
  valor_venda: 0,
  km_venda: '',
  observacoes_veiculo: '',
  trocas: [],
  pagamentos: [],
  data_venda: new Date(),
  observacoes: '',
};

export function useSaleData(vehicleId: number | null) {
  const [saleData, setSaleData] = useState<SaleData>(initialSaleData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<SalePerson[]>([]);
  const [colaboradores, setColaboradores] = useState<SalePerson[]>([]);
  const [veiculosEstoque, setVeiculosEstoque] = useState<SaleVehicle[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [contas, setContas] = useState<ContaFinanceira[]>([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load vehicle data
        if (vehicleId) {
          const { data: vehicleData, error: vehicleError } = await supabase
            .from('estoque')
            .select('id, modelo, fabricante, ano, valor, km, cor, foto, placa')
            .eq('id', vehicleId)
            .single();

          if (vehicleError) throw vehicleError;
          
          setSaleData(prev => ({
            ...prev,
            veiculo: vehicleData as SaleVehicle,
            valor_venda: vehicleData?.valor ? Number(vehicleData.valor) : 0,
            km_venda: vehicleData?.km || '',
          }));
        }

        // Load clientes
        const { data: clientesData } = await supabase
          .from('vx_pessoa')
          .select('id, nome, cpf_cnpj, telefone, email')
          .eq('eh_cliente', true)
          .order('nome');
        
        setClientes(clientesData || []);

        // Load colaboradores
        const { data: colaboradoresData } = await supabase
          .from('vx_pessoa')
          .select('id, nome, cpf_cnpj, telefone, email')
          .eq('eh_colaborador', true)
          .order('nome');
        
        setColaboradores(colaboradoresData || []);

        // Load estoque for trade-ins
        const { data: estoqueData } = await supabase
          .from('estoque')
          .select('id, modelo, fabricante, ano, valor, km, cor, foto, placa')
          .neq('id', vehicleId || 0)
          .order('created_at', { ascending: false });
        
        setVeiculosEstoque(estoqueData || []);

        // Load formas de pagamento
        const { data: formasData } = await supabase
          .from('vx_forma_pagamento')
          .select('*')
          .eq('ativa', true)
          .order('descricao');
        
        setFormasPagamento(formasData || []);

        // Load contas
        const { data: contasData } = await supabase
          .from('vx_fin_conta')
          .select('*')
          .order('banco');
        
        setContas(contasData || []);

      } catch (error) {
        console.error('Error loading sale data:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao carregar dados da venda',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [vehicleId]);

  const updateSaleData = useCallback((updates: Partial<SaleData>) => {
    setSaleData(prev => ({ ...prev, ...updates }));
  }, []);

  const setCliente = useCallback((cliente: SalePerson | null) => {
    setSaleData(prev => ({
      ...prev,
      id_cliente: cliente?.id || null,
      cliente,
    }));
  }, []);

  const setVendedor = useCallback((vendedor: SalePerson | null) => {
    setSaleData(prev => ({
      ...prev,
      id_vendedor: vendedor?.id || null,
      vendedor,
    }));
  }, []);

  const addTradeIn = useCallback((vehicle: SaleVehicle, valor_troca: number) => {
    const tradeIn: TradeInVehicle = {
      id: crypto.randomUUID(),
      vehicle,
      valor_troca,
    };
    setSaleData(prev => ({
      ...prev,
      trocas: [...prev.trocas, tradeIn],
    }));
  }, []);

  const removeTradeIn = useCallback((id: string) => {
    setSaleData(prev => ({
      ...prev,
      trocas: prev.trocas.filter(t => t.id !== id),
    }));
  }, []);

  const updateTradeInValue = useCallback((id: string, valor_troca: number) => {
    setSaleData(prev => ({
      ...prev,
      trocas: prev.trocas.map(t => 
        t.id === id ? { ...t, valor_troca } : t
      ),
    }));
  }, []);

  const addPayment = useCallback((payment: Omit<PaymentEntry, 'id'>) => {
    const newPayment: PaymentEntry = {
      ...payment,
      id: crypto.randomUUID(),
    };
    setSaleData(prev => ({
      ...prev,
      pagamentos: [...prev.pagamentos, newPayment],
    }));
  }, []);

  const removePayment = useCallback((id: string) => {
    setSaleData(prev => ({
      ...prev,
      pagamentos: prev.pagamentos.filter(p => p.id !== id),
    }));
  }, []);

  const saveSale = useCallback(async (fecharVenda: boolean = false) => {
    if (!saleData.veiculo || !saleData.id_cliente) {
      toast({
        title: 'Erro',
        description: 'Veículo e cliente são obrigatórios',
        variant: 'destructive',
      });
      return null;
    }

    setSaving(true);
    try {
      // Get empresa id (using first one for now)
      const { data: empresaData } = await supabase
        .from('empresa')
        .select('id')
        .limit(1)
        .single();

      if (!empresaData) {
        throw new Error('Empresa não encontrada');
      }

      // Create sale record
      const { data: vendaData, error: vendaError } = await supabase
        .from('vx_vendas')
        .insert({
          id_empresa: empresaData.id,
          id_cliente: saleData.id_cliente,
          id_veiculo_vendido: saleData.veiculo.id,
          valor_total_venda: saleData.valor_venda,
          data_venda: saleData.data_venda.toISOString(),
          id_vendedor: saleData.id_vendedor,
          observacoes: saleData.observacoes || null,
          fechada: fecharVenda,
        })
        .select()
        .single();

      if (vendaError) throw vendaError;

      // Create trade-in records
      if (saleData.trocas.length > 0) {
        const trocasInsert = saleData.trocas.map(troca => ({
          id_venda: vendaData.id,
          id_veiculo_troca: troca.vehicle.id,
          valor_troca: troca.valor_troca,
        }));

        const { error: trocasError } = await supabase
          .from('vx_vendas_troca')
          .insert(trocasInsert);

        if (trocasError) throw trocasError;
      }

      // Create payment records
      if (saleData.pagamentos.length > 0) {
        const pagamentosInsert = saleData.pagamentos.map(pag => ({
          id_venda: vendaData.id,
          id_forma_pagamento: pag.id_forma_pagamento,
          id_conta: pag.id_conta,
          valor: pag.valor,
          data_lancamento: pag.data_lancamento,
          data_pagamento: pag.data_pagamento,
          numero: pag.numero,
          observacao: pag.observacao,
        }));

        const { error: pagamentosError } = await supabase
          .from('vx_vendas_acerto')
          .insert(pagamentosInsert);

        if (pagamentosError) throw pagamentosError;
      }

      // Update vehicle status if closing sale
      if (fecharVenda) {
        const { error: updateError } = await supabase
          .from('estoque')
          .update({ status: 'Vendido' })
          .eq('id', saleData.veiculo.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Sucesso',
        description: fecharVenda ? 'Venda finalizada com sucesso!' : 'Venda salva com sucesso!',
      });

      return vendaData;
    } catch (error) {
      console.error('Error saving sale:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar a venda',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [saleData]);

  // Calculate totals
  const totalTrocas = saleData.trocas.reduce((sum, t) => sum + t.valor_troca, 0);
  const totalPagamentos = saleData.pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const valorAReceber = saleData.valor_venda - totalTrocas;
  const saldoPendente = valorAReceber - totalPagamentos;

  return {
    saleData,
    loading,
    saving,
    clientes,
    colaboradores,
    veiculosEstoque,
    formasPagamento,
    contas,
    updateSaleData,
    setCliente,
    setVendedor,
    addTradeIn,
    removeTradeIn,
    updateTradeInValue,
    addPayment,
    removePayment,
    saveSale,
    totals: {
      valorVeiculo: saleData.valor_venda,
      totalTrocas,
      valorAReceber,
      totalPagamentos,
      saldoPendente,
    },
  };
}
