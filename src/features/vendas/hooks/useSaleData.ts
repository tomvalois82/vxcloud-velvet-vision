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
  ServicoProdutoEntry,
  FormaPagamento,
  ContaFinanceira,
  Financeira,
  CategoriaFinanceira
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
  servicosProdutos: [],
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
  const [financeiras, setFinanceiras] = useState<Financeira[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);

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

        // Load financeiras
        const { data: financeirasData } = await supabase
          .from('vx_financeiras')
          .select('*')
          .eq('ativa', true)
          .order('nome');
        
        setFinanceiras(financeirasData || []);

        // Load categorias (apenas Receber para produtos/serviços)
        const { data: categoriasData } = await supabase
          .from('vx_fin_categoria')
          .select('id, categoria, operacao, ativo, id_categoria_pai')
          .eq('ativo', true)
          .eq('operacao', 'Receber')
          .order('categoria');
        
        setCategorias(categoriasData || []);

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

  // Funções para Produtos/Serviços
  const addServicoProduto = useCallback((item: Omit<ServicoProdutoEntry, 'id'>) => {
    const newItem: ServicoProdutoEntry = {
      ...item,
      id: crypto.randomUUID(),
    };
    setSaleData(prev => ({
      ...prev,
      servicosProdutos: [...prev.servicosProdutos, newItem],
    }));
  }, []);

  const removeServicoProduto = useCallback((id: string) => {
    setSaleData(prev => ({
      ...prev,
      servicosProdutos: prev.servicosProdutos.filter(s => s.id !== id),
    }));
  }, []);

  const updateServicoProduto = useCallback((id: string, item: Omit<ServicoProdutoEntry, 'id'>) => {
    setSaleData(prev => ({
      ...prev,
      servicosProdutos: prev.servicosProdutos.map(s => 
        s.id === id ? { ...item, id } : s
      ),
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

    // Se for fechar, validar saldo zero
    if (fecharVenda) {
      const totalTrocasCalc = saleData.trocas.reduce((sum, t) => sum + t.valor_troca, 0);
      const totalServicosProdutosCalc = saleData.servicosProdutos.reduce((sum, s) => sum + s.valor, 0);
      const totalRecebimentosCalc = saleData.pagamentos
        .filter(p => p.valor > 0)
        .reduce((sum, p) => sum + p.valor, 0);
      const totalPagamentosSaidaCalc = saleData.pagamentos
        .filter(p => p.valor < 0)
        .reduce((sum, p) => sum + Math.abs(p.valor), 0);
      const totalFinanciamentoCalc = saleData.financiamento?.valor || 0;
      
      const diferencaAReceber = saleData.valor_venda + totalServicosProdutosCalc - totalTrocasCalc;
      const totalRecebido = totalRecebimentosCalc + totalFinanciamentoCalc - totalPagamentosSaidaCalc;
      const saldoFinal = diferencaAReceber - totalRecebido;

      if (Math.abs(saldoFinal) > 0.01) {
        toast({
          title: 'Erro ao fechar venda',
          description: 'Não é possível fechar a venda. O saldo final deve ser zero.',
          variant: 'destructive',
        });
        return null;
      }
    }

    setSaving(true);
    try {
      // Get empresa id from vehicle
      const { data: veiculoData } = await supabase
        .from('estoque')
        .select('id_empresa')
        .eq('id', saleData.veiculo.id)
        .single();

      if (!veiculoData?.id_empresa) {
        throw new Error('Empresa não encontrada');
      }

      const idEmpresa = veiculoData.id_empresa;

      // Create sale record
      const { data: vendaData, error: vendaError } = await supabase
        .from('vx_vendas')
        .insert({
          id_empresa: idEmpresa,
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

      // Create financiamento record
      if (saleData.financiamento) {
        const { error: financiamentoError } = await supabase
          .from('vx_vendas_financiamento')
          .insert({
            id_venda: vendaData.id,
            id_veiculo: saleData.veiculo.id,
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

      // Create servicos/produtos records
      if (saleData.servicosProdutos.length > 0) {
        const servicosInsert = saleData.servicosProdutos.map(sp => ({
          id_venda: vendaData.id,
          descricao: sp.descricao,
          valor: sp.valor,
          id_categoria: sp.id_categoria,
          id_veiculo: sp.id_veiculo,
        }));

        const { error: servicosError } = await supabase
          .from('vx_vendas_servico_produto')
          .insert(servicosInsert);

        if (servicosError) throw servicosError;
      }

      // Se for fechar a venda, criar lançamentos financeiros
      if (fecharVenda) {
        const closureResult = await performNewSaleClosure(saleData, vendaData.id, idEmpresa);
        if (!closureResult.success) {
          // Reverter o fechamento
          await supabase
            .from('vx_vendas')
            .update({ fechada: false })
            .eq('id', vendaData.id);
          
          toast({
            title: 'Erro ao fechar venda',
            description: closureResult.error,
            variant: 'destructive',
          });
          return null;
        }
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

  // Função auxiliar para realizar o fechamento da venda (lançamentos financeiros)
  const performNewSaleClosure = async (
    currentSaleData: SaleData, 
    saleId: string, 
    idEmpresa: string
  ): Promise<{ success: boolean; error?: string }> => {
    // Buscar categorias padrão para vendas
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
      return { success: false, error: 'Erro: Categorias financeiras não encontradas.' };
    }

    const movimentosParaInserir: Array<{
      tipo_movimento: string;
      id_empresa: string;
      status: string;
      id_conta: string;
      id_categoria: string;
      id_forma_pagamento: string | null;
      descricao: string;
      valor_bruto: number;
      valor_liquido: number;
      data_vencimento: string;
      data_pagamento: string | null;
      id_pessoa: string | null;
      id_estoque: number | null;
      observacoes: string | null;
      desconto: number;
      acrescimo: number;
    }> = [];

    const veiculoDesc = `${currentSaleData.veiculo?.fabricante || ''} ${currentSaleData.veiculo?.modelo || ''}`.trim();
    
    // Lançamentos de pagamentos do acerto
    for (const pagamento of currentSaleData.pagamentos) {
      const isRecebimento = pagamento.valor > 0;
      const valorAbsoluto = Math.abs(pagamento.valor);
      const isPago = !!pagamento.data_pagamento;
      const status = isPago ? 'Pago' : 'Pendente';

      movimentosParaInserir.push({
        tipo_movimento: isRecebimento ? 'Receber' : 'Pagar',
        id_empresa: idEmpresa,
        status,
        id_conta: pagamento.id_conta,
        id_categoria: isRecebimento ? categoriaReceber.id : categoriaPagar.id,
        id_forma_pagamento: pagamento.id_forma_pagamento,
        descricao: `Venda ${veiculoDesc} - ${pagamento.forma_descricao || 'Pagamento'} ${pagamento.numero}`,
        valor_bruto: valorAbsoluto,
        valor_liquido: valorAbsoluto,
        data_vencimento: pagamento.data_lancamento,
        data_pagamento: isPago ? pagamento.data_pagamento : null,
        id_pessoa: currentSaleData.id_cliente,
        id_estoque: currentSaleData.veiculo!.id,
        observacoes: pagamento.observacao,
        desconto: 0,
        acrescimo: 0,
      });
    }

    // Lançamento de financiamento
    if (currentSaleData.financiamento && currentSaleData.financiamento.valor > 0) {
      movimentosParaInserir.push({
        tipo_movimento: 'Receber',
        id_empresa: idEmpresa,
        status: 'Pendente',
        id_conta: currentSaleData.financiamento.id_conta_destino,
        id_categoria: categoriaReceber.id,
        id_forma_pagamento: null,
        descricao: `Venda ${veiculoDesc} - Financiamento ${currentSaleData.financiamento.financeira_nome || ''}`,
        valor_bruto: currentSaleData.financiamento.valor,
        valor_liquido: currentSaleData.financiamento.valor,
        data_vencimento: currentSaleData.financiamento.data_vencimento_inicial || currentSaleData.data_venda.toISOString().split('T')[0],
        data_pagamento: null,
        id_pessoa: currentSaleData.id_cliente,
        id_estoque: currentSaleData.veiculo!.id,
        observacoes: currentSaleData.financiamento.numero_contrato 
          ? `Contrato: ${currentSaleData.financiamento.numero_contrato}` 
          : null,
        desconto: 0,
        acrescimo: 0,
      });
    }

    // Inserir movimentos financeiros
    if (movimentosParaInserir.length > 0) {
      const { error: movimentoError } = await supabase
        .from('vx_fin_movimento')
        .insert(movimentosParaInserir);

      if (movimentoError) {
        console.error('Erro ao criar lançamentos financeiros:', movimentoError);
        return { 
          success: false, 
          error: 'Erro ao fechar a venda. Nenhum lançamento financeiro foi registrado.' 
        };
      }
    }

    // Atualizar status do veículo para 'Vendido'
    const { error: updateError } = await supabase
      .from('estoque')
      .update({ status: 'Vendido' })
      .eq('id', currentSaleData.veiculo!.id);

    if (updateError) {
      console.error('Erro ao atualizar status do veículo:', updateError);
    }

    return { success: true };
  };

  // Calculate totals
  const totalTrocas = saleData.trocas.reduce((sum, t) => sum + t.valor_troca, 0);
  const totalServicosProdutos = saleData.servicosProdutos.reduce((sum, s) => sum + s.valor, 0);
  // Recebimentos são valores positivos (cliente paga loja)
  const totalRecebimentos = saleData.pagamentos
    .filter(p => p.valor > 0)
    .reduce((sum, p) => sum + p.valor, 0);
  // Pagamentos são valores negativos (loja paga cliente) - usamos valor absoluto
  const totalPagamentosSaida = saleData.pagamentos
    .filter(p => p.valor < 0)
    .reduce((sum, p) => sum + Math.abs(p.valor), 0);
  // Total líquido de pagamentos = recebimentos - pagamentos (saída)
  const totalPagamentos = totalRecebimentos - totalPagamentosSaida;
  const totalFinanciamento = saleData.financiamento?.valor || 0;
  // Total a receber do cliente = valor do veículo + serviços/produtos - trocas - financiamento
  const valorAReceber = saleData.valor_venda + totalServicosProdutos - totalTrocas - totalFinanciamento;
  // Saldo pendente = o que falta receber em pagamentos diretos
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
    financeiras,
    categorias,
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
    addServicoProduto,
    removeServicoProduto,
    updateServicoProduto,
    saveSale,
    totals: {
      valorVeiculo: saleData.valor_venda,
      totalTrocas,
      totalServicosProdutos,
      valorAReceber,
      totalPagamentos,
      totalRecebimentos,
      totalPagamentosSaida,
      totalFinanciamento,
      saldoPendente,
    },
  };
}
