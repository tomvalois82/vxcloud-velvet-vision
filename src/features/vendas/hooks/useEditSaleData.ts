import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { 
  SaleData, 
  SaleVehicle, 
  SalePerson, 
  TradeInVehicle, 
  PaymentEntry,
  FinanciamentoEntry,
  FormaPagamento,
  ContaFinanceira,
  Financeira
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
  financiamento: null,
  data_venda: new Date(),
  observacoes: '',
};

export function useEditSaleData(saleId: string | null) {
  const [saleData, setSaleData] = useState<SaleData>(initialSaleData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<SalePerson[]>([]);
  const [colaboradores, setColaboradores] = useState<SalePerson[]>([]);
  const [veiculosEstoque, setVeiculosEstoque] = useState<SaleVehicle[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>([]);
  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [financeiras, setFinanceiras] = useState<Financeira[]>([]);
  const [originalVehicleId, setOriginalVehicleId] = useState<number | null>(null);

  // Load existing sale data
  useEffect(() => {
    const loadData = async () => {
      if (!saleId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Load sale data
        const { data: vendaData, error: vendaError } = await supabase
          .from('vx_vendas')
          .select('*')
          .eq('id', saleId)
          .single();

        if (vendaError) throw vendaError;

        setOriginalVehicleId(vendaData.id_veiculo_vendido);

        // Load vehicle data
        const { data: vehicleData } = await supabase
          .from('estoque')
          .select('id, modelo, fabricante, ano, valor, km, cor, foto, placa')
          .eq('id', vendaData.id_veiculo_vendido)
          .single();

        // Load cliente data
        let clienteData: SalePerson | null = null;
        if (vendaData.id_cliente) {
          const { data } = await supabase
            .from('vx_pessoa')
            .select('id, nome, cpf_cnpj, telefone, email')
            .eq('id', vendaData.id_cliente)
            .single();
          clienteData = data;
        }

        // Load vendedor data
        let vendedorData: SalePerson | null = null;
        if (vendaData.id_vendedor) {
          const { data } = await supabase
            .from('vx_pessoa')
            .select('id, nome, cpf_cnpj, telefone, email')
            .eq('id', vendaData.id_vendedor)
            .single();
          vendedorData = data;
        }

        // Load trocas
        const { data: trocasData } = await supabase
          .from('vx_vendas_troca')
          .select('id, id_veiculo_troca, valor_troca')
          .eq('id_venda', saleId);

        const trocas: TradeInVehicle[] = await Promise.all(
          (trocasData || []).map(async (troca) => {
            const { data: veiculoTroca } = await supabase
              .from('estoque')
              .select('id, modelo, fabricante, ano, valor, km, cor, foto, placa')
              .eq('id', troca.id_veiculo_troca)
              .single();

            return {
              id: troca.id,
              vehicle: veiculoTroca as SaleVehicle,
              valor_troca: Number(troca.valor_troca),
            };
          })
        );

        // Load pagamentos/acertos
        const { data: pagamentosData } = await supabase
          .from('vx_vendas_acerto')
          .select('*')
          .eq('id_venda', saleId);

        const pagamentos: PaymentEntry[] = await Promise.all(
          (pagamentosData || []).map(async (pag) => {
            const { data: formaData } = await supabase
              .from('vx_forma_pagamento')
              .select('descricao')
              .eq('id', pag.id_forma_pagamento)
              .single();

            const { data: contaData } = await supabase
              .from('vx_fin_conta')
              .select('banco')
              .eq('id', pag.id_conta)
              .single();

            return {
              id: pag.id,
              id_forma_pagamento: pag.id_forma_pagamento,
              id_conta: pag.id_conta,
              valor: Number(pag.valor),
              data_lancamento: pag.data_lancamento,
              data_pagamento: pag.data_pagamento,
              numero: pag.numero,
              observacao: pag.observacao,
              forma_descricao: formaData?.descricao,
              conta_descricao: contaData?.banco,
            };
          })
        );

        setSaleData({
          id_cliente: vendaData.id_cliente,
          id_vendedor: vendaData.id_vendedor,
          cliente: clienteData,
          vendedor: vendedorData,
          veiculo: vehicleData as SaleVehicle,
          valor_venda: Number(vendaData.valor_total_venda),
          km_venda: vehicleData?.km || '',
          observacoes_veiculo: '',
          trocas,
          pagamentos,
          financiamento: null, // Será carregado separadamente
          data_venda: new Date(vendaData.data_venda),
          observacoes: vendaData.observacoes || '',
        });

        // Load financiamento existente
        const { data: financiamentoData } = await supabase
          .from('vx_vendas_financiamento')
          .select('*')
          .eq('id_venda', saleId)
          .maybeSingle();

        if (financiamentoData) {
          const { data: financeiraData } = await supabase
            .from('vx_financeiras')
            .select('nome')
            .eq('id', financiamentoData.id_financeira || '')
            .maybeSingle();

          const { data: contaDestinoData } = await supabase
            .from('vx_fin_conta')
            .select('banco, descricao')
            .eq('id', financiamentoData.id_conta_destino)
            .maybeSingle();

          setSaleData(prev => ({
            ...prev,
            financiamento: {
              id: financiamentoData.id,
              id_financeira: financiamentoData.id_financeira,
              id_conta_destino: financiamentoData.id_conta_destino,
              valor: Number(financiamentoData.valor),
              valor_r: financiamentoData.valor_r ? Number(financiamentoData.valor_r) : null,
              plus: financiamentoData.plus ? Number(financiamentoData.plus) : null,
              tac: financiamentoData.tac ? Number(financiamentoData.tac) : null,
              valor_tac: financiamentoData.valor_tac ? Number(financiamentoData.valor_tac) : null,
              numero_contrato: financiamentoData.numero_contrato,
              numero_prestacao: financiamentoData.numero_prestacao,
              valor_prestacao: financiamentoData.valor_prestacao ? Number(financiamentoData.valor_prestacao) : null,
              dados_financiamento: financiamentoData.dados_financiamento,
              data_vencimento_inicial: financiamentoData.data_vencimento_inicial,
              financeira_nome: financeiraData?.nome,
              conta_descricao: contaDestinoData ? (contaDestinoData.descricao ? `${contaDestinoData.banco} - ${contaDestinoData.descricao}` : contaDestinoData.banco) : undefined,
            }
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

        // Load estoque for trade-ins (exclude the sold vehicle)
        const { data: estoqueData } = await supabase
          .from('estoque')
          .select('id, modelo, fabricante, ano, valor, km, cor, foto, placa')
          .neq('id', vendaData.id_veiculo_vendido)
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

        // Load financeiras
        const { data: financeirasData } = await supabase
          .from('vx_financeiras')
          .select('*')
          .eq('ativa', true)
          .order('nome');
        
        setFinanceiras(financeirasData || []);

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
  }, [saleId]);

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

  const setFinanciamento = useCallback((financiamento: Omit<FinanciamentoEntry, 'id'> | null) => {
    if (financiamento) {
      const newFinanciamento: FinanciamentoEntry = {
        ...financiamento,
        id: crypto.randomUUID(),
      };
      setSaleData(prev => ({
        ...prev,
        financiamento: newFinanciamento,
      }));
    } else {
      setSaleData(prev => ({
        ...prev,
        financiamento: null,
      }));
    }
  }, []);

  const removeFinanciamento = useCallback(() => {
    setSaleData(prev => ({
      ...prev,
      financiamento: null,
    }));
  }, []);

  const saveSale = useCallback(async (fecharVenda: boolean = false) => {
    if (!saleId || !saleData.veiculo || !saleData.id_cliente) {
      toast({
        title: 'Erro',
        description: 'Veículo e cliente são obrigatórios',
        variant: 'destructive',
      });
      return null;
    }

    setSaving(true);
    try {
      // Update sale record
      const { error: vendaError } = await supabase
        .from('vx_vendas')
        .update({
          id_cliente: saleData.id_cliente,
          valor_total_venda: saleData.valor_venda,
          data_venda: saleData.data_venda.toISOString(),
          id_vendedor: saleData.id_vendedor,
          observacoes: saleData.observacoes || null,
          fechada: fecharVenda,
        })
        .eq('id', saleId);

      if (vendaError) throw vendaError;

      // Delete existing trade-ins and recreate
      await supabase
        .from('vx_vendas_troca')
        .delete()
        .eq('id_venda', saleId);

      if (saleData.trocas.length > 0) {
        const trocasInsert = saleData.trocas.map(troca => ({
          id_venda: saleId,
          id_veiculo_troca: troca.vehicle.id,
          valor_troca: troca.valor_troca,
        }));

        const { error: trocasError } = await supabase
          .from('vx_vendas_troca')
          .insert(trocasInsert);

        if (trocasError) throw trocasError;
      }

      // Delete existing payments and recreate
      await supabase
        .from('vx_vendas_acerto')
        .delete()
        .eq('id_venda', saleId);

      if (saleData.pagamentos.length > 0) {
        const pagamentosInsert = saleData.pagamentos.map(pag => ({
          id_venda: saleId,
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

      // Delete existing financiamento and recreate
      await supabase
        .from('vx_vendas_financiamento')
        .delete()
        .eq('id_venda', saleId);

      if (saleData.financiamento) {
        const { error: financiamentoError } = await supabase
          .from('vx_vendas_financiamento')
          .insert({
            id_venda: saleId,
            id_veiculo: saleData.veiculo!.id,
            id_financeira: saleData.financiamento.id_financeira,
            id_conta_destino: saleData.financiamento.id_conta_destino,
            valor: saleData.financiamento.valor,
            valor_r: saleData.financiamento.valor_r,
            plus: saleData.financiamento.plus,
            tac: saleData.financiamento.tac,
            valor_tac: saleData.financiamento.valor_tac,
            numero_contrato: saleData.financiamento.numero_contrato,
            numero_prestacao: saleData.financiamento.numero_prestacao,
            valor_prestacao: saleData.financiamento.valor_prestacao,
            dados_financiamento: saleData.financiamento.dados_financiamento,
            data_vencimento_inicial: saleData.financiamento.data_vencimento_inicial,
          });

        if (financiamentoError) throw financiamentoError;
      }

      // Update vehicle status if closing sale
      if (fecharVenda && originalVehicleId) {
        const { error: updateError } = await supabase
          .from('estoque')
          .update({ status: 'Vendido' })
          .eq('id', originalVehicleId);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Sucesso',
        description: fecharVenda ? 'Venda finalizada com sucesso!' : 'Venda atualizada com sucesso!',
      });

      return { id: saleId };
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
  }, [saleId, saleData, originalVehicleId]);

  // Calculate totals
  const totalTrocas = saleData.trocas.reduce((sum, t) => sum + t.valor_troca, 0);
  const totalPagamentos = saleData.pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const totalFinanciamento = saleData.financiamento?.valor || 0;
  const valorAReceber = saleData.valor_venda - totalTrocas;
  const saldoPendente = valorAReceber - totalPagamentos - totalFinanciamento;

  return {
    saleData,
    loading,
    saving,
    clientes,
    colaboradores,
    veiculosEstoque,
    formasPagamento,
    contas,
    financeiras,
    updateSaleData,
    setCliente,
    setVendedor,
    addTradeIn,
    removeTradeIn,
    updateTradeInValue,
    addPayment,
    removePayment,
    setFinanciamento,
    removeFinanciamento,
    saveSale,
    totals: {
      valorVeiculo: saleData.valor_venda,
      totalTrocas,
      valorAReceber,
      totalPagamentos,
      totalFinanciamento,
      saldoPendente,
    },
  };
}
