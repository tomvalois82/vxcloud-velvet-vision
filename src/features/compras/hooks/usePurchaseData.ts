import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type {
  PurchaseData,
  PurchaseVehicle,
  PurchasePerson,
  PurchasePaymentEntry,
  FormaPagamentoCompra,
  ContaCompra,
} from '../types';

const initialPurchaseData: PurchaseData = {
  id_fornecedor: null,
  id_comprador: null,
  fornecedor: null,
  comprador: null,
  veiculo: null,
  valor_compra: 0,
  pagamentos: [],
  data_compra: new Date(),
  observacoes: '',
};

const VEHICLE_FIELDS = 'id, modelo, fabricante, ano, valor, km, cor, foto, placa';

export function usePurchaseData(purchaseId?: string | null) {
  const [purchaseData, setPurchaseData] = useState<PurchaseData>(initialPurchaseData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fornecedores, setFornecedores] = useState<PurchasePerson[]>([]);
  const [colaboradores, setColaboradores] = useState<PurchasePerson[]>([]);
  const [veiculosEstoque, setVeiculosEstoque] = useState<PurchaseVehicle[]>([]);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamentoCompra[]>([]);
  const [contas, setContas] = useState<ContaCompra[]>([]);

  const refreshPessoas = useCallback(async () => {
    // Fornecedores: quem vende o veículo (fornecedor ou cliente)
    const { data: fornecedoresData } = await supabase
      .from('vx_pessoa')
      .select('id, nome, cpf_cnpj, telefone, email')
      .or('eh_fornecedor.eq.true,eh_cliente.eq.true')
      .order('nome');
    setFornecedores((fornecedoresData || []) as PurchasePerson[]);

    const { data: colaboradoresData } = await supabase
      .from('vx_pessoa')
      .select('id, nome, cpf_cnpj, telefone, email')
      .eq('eh_colaborador', true)
      .order('nome');
    setColaboradores((colaboradoresData || []) as PurchasePerson[]);
  }, []);

  const refreshVeiculosEstoque = useCallback(async (): Promise<PurchaseVehicle[]> => {
    const { data } = await supabase
      .from('estoque')
      .select(VEHICLE_FIELDS)
      .order('created_at', { ascending: false });
    const list = (data || []) as PurchaseVehicle[];
    setVeiculosEstoque(list);
    return list;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([refreshPessoas(), refreshVeiculosEstoque()]);

        const { data: formasData } = await supabase
          .from('vx_forma_pagamento')
          .select('*')
          .eq('ativa', true)
          .order('descricao');
        setFormasPagamento((formasData || []) as FormaPagamentoCompra[]);

        const { data: contasData } = await supabase
          .from('vx_fin_conta')
          .select('*')
          .order('banco');
        setContas((contasData || []) as ContaCompra[]);

        // Modo edição: carrega a compra existente
        if (purchaseId) {
          const { data: compra, error: compraError } = await supabase
            .from('vx_compras')
            .select('*')
            .eq('id', purchaseId)
            .single();

          if (compraError) throw compraError;

          const [{ data: veiculo }, { data: acertos }] = await Promise.all([
            supabase.from('estoque').select(VEHICLE_FIELDS).eq('id', compra.id_veiculo_comprado).maybeSingle(),
            supabase.from('vx_compras_acerto').select('*').eq('id_compra', purchaseId).order('data_lancamento'),
          ]);

          const pessoaIds = [compra.id_fornecedor, compra.id_comprador].filter(Boolean) as string[];
          const { data: pessoas } = await supabase
            .from('vx_pessoa')
            .select('id, nome, cpf_cnpj, telefone, email')
            .in('id', pessoaIds.length ? pessoaIds : ['00000000-0000-0000-0000-000000000000']);

          const findPessoa = (id: string | null) =>
            (pessoas || []).find(p => p.id === id) as PurchasePerson | undefined;

          setPurchaseData({
            id_fornecedor: compra.id_fornecedor,
            id_comprador: compra.id_comprador,
            fornecedor: findPessoa(compra.id_fornecedor) || null,
            comprador: findPessoa(compra.id_comprador) || null,
            veiculo: (veiculo as PurchaseVehicle) || null,
            valor_compra: Number(compra.valor_total_compra) || 0,
            pagamentos: (acertos || []).map(a => ({
              id: a.id,
              id_forma_pagamento: a.id_forma_pagamento,
              id_conta: a.id_conta || '',
              valor: Number(a.valor),
              data_lancamento: a.data_lancamento,
              data_pagamento: a.data_pagamento,
              numero: a.numero || '1',
              observacao: a.observacao,
              forma_descricao: (formasData || []).find(f => f.id === a.id_forma_pagamento)?.descricao,
              conta_descricao: (contasData || []).find(c => c.id === a.id_conta)?.banco,
            })),
            data_compra: new Date(compra.data_compra),
            observacoes: compra.observacoes || '',
          });
        }
      } catch (error) {
        console.error('Erro ao carregar dados da compra:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao carregar dados da compra',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [purchaseId, refreshPessoas, refreshVeiculosEstoque]);

  const updatePurchaseData = useCallback((updates: Partial<PurchaseData>) => {
    setPurchaseData(prev => ({ ...prev, ...updates }));
  }, []);

  const setFornecedor = useCallback((fornecedor: PurchasePerson | null) => {
    setPurchaseData(prev => ({
      ...prev,
      id_fornecedor: fornecedor?.id || null,
      fornecedor,
    }));
  }, []);

  const setComprador = useCallback((comprador: PurchasePerson | null) => {
    setPurchaseData(prev => ({
      ...prev,
      id_comprador: comprador?.id || null,
      comprador,
    }));
  }, []);

  const setVeiculo = useCallback((veiculo: PurchaseVehicle | null) => {
    setPurchaseData(prev => ({
      ...prev,
      veiculo,
      valor_compra: prev.valor_compra || (veiculo?.valor ? Number(veiculo.valor) : 0),
    }));
  }, []);

  const addPayment = useCallback((payment: Omit<PurchasePaymentEntry, 'id'>) => {
    setPurchaseData(prev => ({
      ...prev,
      pagamentos: [...prev.pagamentos, { ...payment, id: crypto.randomUUID() }],
    }));
  }, []);

  const removePayment = useCallback((id: string) => {
    setPurchaseData(prev => ({
      ...prev,
      pagamentos: prev.pagamentos.filter(p => p.id !== id),
    }));
  }, []);

  const totalPagamentos = purchaseData.pagamentos.reduce((sum, p) => sum + p.valor, 0);
  const saldoPendente = purchaseData.valor_compra - totalPagamentos;

  const savePurchase = useCallback(
    async (fecharCompra: boolean = false) => {
      const { veiculo, id_fornecedor, valor_compra, pagamentos } = purchaseData;

      if (!veiculo || !id_fornecedor) {
        toast({
          title: 'Erro',
          description: 'Veículo e vendedor são obrigatórios',
          variant: 'destructive',
        });
        return null;
      }

      if (!valor_compra || valor_compra <= 0) {
        toast({
          title: 'Erro',
          description: 'Informe o valor da compra',
          variant: 'destructive',
        });
        return null;
      }

      const totalAcertos = pagamentos.reduce((sum, p) => sum + p.valor, 0);
      if (fecharCompra && Math.abs(valor_compra - totalAcertos) > 0.01) {
        toast({
          title: 'Erro ao fechar compra',
          description: 'Não é possível fechar a compra. O saldo final deve ser zero.',
          variant: 'destructive',
        });
        return null;
      }

      setSaving(true);
      try {
        const { data: veiculoData } = await supabase
          .from('estoque')
          .select('id_empresa')
          .eq('id', veiculo.id)
          .single();

        if (!veiculoData?.id_empresa) {
          throw new Error('Empresa não encontrada');
        }

        const payload = {
          id_empresa: veiculoData.id_empresa,
          id_fornecedor,
          id_comprador: purchaseData.id_comprador,
          id_veiculo_comprado: veiculo.id,
          valor_total_compra: valor_compra,
          data_compra: purchaseData.data_compra.toISOString(),
          observacoes: purchaseData.observacoes || null,
          fechada: fecharCompra,
        };

        let compraId = purchaseId || null;

        if (compraId) {
          const { error: updateError } = await supabase
            .from('vx_compras')
            .update(payload)
            .eq('id', compraId);
          if (updateError) throw updateError;

          // Reescreve os acertos
          await supabase.from('vx_compras_acerto').delete().eq('id_compra', compraId);
        } else {
          const { data: compraInserida, error: insertError } = await supabase
            .from('vx_compras')
            .insert(payload)
            .select()
            .single();
          if (insertError) throw insertError;
          compraId = compraInserida.id;
        }

        if (pagamentos.length > 0) {
          const acertosInsert = pagamentos.map(pag => ({
            id_compra: compraId as string,
            id_forma_pagamento: pag.id_forma_pagamento,
            id_conta: pag.id_conta || null,
            valor: pag.valor,
            data_lancamento: pag.data_lancamento,
            data_pagamento: pag.data_pagamento,
            numero: pag.numero || null,
            observacao: pag.observacao,
          }));

          const { error: acertosError } = await supabase
            .from('vx_compras_acerto')
            .insert(acertosInsert);
          if (acertosError) throw acertosError;
        }

        // Os lançamentos financeiros (vx_fin_movimento) e o id_movimento_gerado
        // são criados automaticamente pela trigger do banco ao fechar a compra

        toast({
          title: 'Sucesso',
          description: fecharCompra ? 'Compra finalizada com sucesso!' : 'Compra salva com sucesso!',
        });

        return { id: compraId };
      } catch (error) {
        console.error('Erro ao salvar compra:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao salvar a compra',
          variant: 'destructive',
        });
        return null;
      } finally {
        setSaving(false);
      }
    },
    [purchaseData, purchaseId]
  );

  return {
    purchaseData,
    loading,
    saving,
    fornecedores,
    colaboradores,
    veiculosEstoque,
    formasPagamento,
    contas,
    updatePurchaseData,
    setFornecedor,
    setComprador,
    setVeiculo,
    addPayment,
    removePayment,
    refreshPessoas,
    refreshVeiculosEstoque,
    savePurchase,
    totals: {
      valorCompra: purchaseData.valor_compra,
      totalPagamentos,
      saldoPendente,
    },
  };
}
