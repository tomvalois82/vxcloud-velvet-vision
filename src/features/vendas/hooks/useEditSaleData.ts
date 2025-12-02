import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [originalVehicleId, setOriginalVehicleId] = useState<number | null>(null);

  // Ref para manter referência atualizada do saleData (evita stale closure)
  const saleDataRef = useRef<SaleData>(saleData);
  
  // Manter a ref sempre sincronizada com o estado
  useEffect(() => {
    saleDataRef.current = saleData;
    console.log('saleDataRef atualizada:', saleDataRef.current.financiamento);
  }, [saleData]);

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

            const valorNum = Number(pag.valor);
            // Determina tipo_lancamento pelo sinal do valor
            const tipoLancamento = valorNum < 0 ? 'pagamento' : 'recebimento';

            return {
              id: pag.id,
              id_forma_pagamento: pag.id_forma_pagamento,
              id_conta: pag.id_conta,
              valor: valorNum,
              data_lancamento: pag.data_lancamento,
              data_pagamento: pag.data_pagamento,
              numero: pag.numero,
              observacao: pag.observacao,
              forma_descricao: formaData?.descricao,
              conta_descricao: contaData?.banco,
              tipo_lancamento: tipoLancamento as 'recebimento' | 'pagamento',
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
          servicosProdutos: [], // Será carregado separadamente
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

        // Load categorias (para produtos/serviços)
        const { data: categoriasData } = await supabase
          .from('vx_fin_categoria')
          .select('id, categoria, operacao, ativo')
          .eq('ativo', true)
          .eq('operacao', 'Receber')
          .order('categoria');
        
        setCategorias(categoriasData || []);

        // Load servicosProdutos existentes
        const { data: servicosProdutosData } = await supabase
          .from('vx_vendas_servico_produto')
          .select('*')
          .eq('id_venda', saleId);

        if (servicosProdutosData) {
          const servicosComCategoria: ServicoProdutoEntry[] = await Promise.all(
            servicosProdutosData.map(async (sp) => {
              const { data: catData } = await supabase
                .from('vx_fin_categoria')
                .select('categoria')
                .eq('id', sp.id_categoria)
                .single();
              
              return {
                id: sp.id,
                descricao: sp.descricao,
                valor: Number(sp.valor),
                id_categoria: sp.id_categoria,
                id_veiculo: sp.id_veiculo,
                categoria_nome: catData?.categoria,
              };
            })
          );

          setSaleData(prev => ({
            ...prev,
            servicosProdutos: servicosComCategoria,
          }));
        }

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
    console.log('=== setFinanciamento no HOOK chamado ===');
    console.log('Dados recebidos:', financiamento);
    
    if (financiamento) {
      const newFinanciamento: FinanciamentoEntry = {
        ...financiamento,
        id: crypto.randomUUID(),
      };
      console.log('Novo financiamento criado com ID:', newFinanciamento);
      setSaleData(prev => {
        console.log('Estado anterior do financiamento:', prev.financiamento);
        const newState = {
          ...prev,
          financiamento: newFinanciamento,
        };
        console.log('Novo estado do financiamento:', newState.financiamento);
        return newState;
      });
    } else {
      setSaleData(prev => ({
        ...prev,
        financiamento: null,
      }));
    }
  }, []);

  const removeFinanciamento = useCallback(() => {
    console.log('=== removeFinanciamento chamado ===');
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

  // Função para salvar a venda (sem fechar)
  const saveSale = useCallback(async (fecharVenda: boolean = false) => {
    const currentSaleData = saleDataRef.current;
    
    if (!saleId || !currentSaleData.veiculo || !currentSaleData.id_cliente) {
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
          id_cliente: currentSaleData.id_cliente,
          valor_total_venda: currentSaleData.valor_venda,
          data_venda: currentSaleData.data_venda.toISOString(),
          id_vendedor: currentSaleData.id_vendedor,
          observacoes: currentSaleData.observacoes || null,
          fechada: fecharVenda,
        })
        .eq('id', saleId);

      if (vendaError) throw vendaError;

      // Delete existing trade-ins and recreate
      await supabase
        .from('vx_vendas_troca')
        .delete()
        .eq('id_venda', saleId);

      if (currentSaleData.trocas.length > 0) {
        const trocasInsert = currentSaleData.trocas.map(troca => ({
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

      if (currentSaleData.pagamentos.length > 0) {
        const pagamentosInsert = currentSaleData.pagamentos.map(pag => ({
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

      if (currentSaleData.financiamento) {
        const financiamentoInsert = {
          id_venda: saleId,
          id_veiculo: currentSaleData.veiculo!.id,
          id_financeira: currentSaleData.financiamento.id_financeira,
          id_conta_destino: currentSaleData.financiamento.id_conta_destino,
          valor: currentSaleData.financiamento.valor,
          valor_r: currentSaleData.financiamento.valor_r,
          plus: currentSaleData.financiamento.plus,
          tac: currentSaleData.financiamento.tac,
          valor_tac: currentSaleData.financiamento.valor_tac,
          numero_contrato: currentSaleData.financiamento.numero_contrato,
          numero_prestacao: currentSaleData.financiamento.numero_prestacao,
          valor_prestacao: currentSaleData.financiamento.valor_prestacao,
          dados_financiamento: currentSaleData.financiamento.dados_financiamento,
          data_vencimento_inicial: currentSaleData.financiamento.data_vencimento_inicial,
        };
        
        const { error: financiamentoError } = await supabase
          .from('vx_vendas_financiamento')
          .insert(financiamentoInsert);

        if (financiamentoError) throw financiamentoError;
      }

      // Delete existing servicosProdutos and recreate
      await supabase
        .from('vx_vendas_servico_produto')
        .delete()
        .eq('id_venda', saleId);

      if (currentSaleData.servicosProdutos.length > 0) {
        const servicosInsert = currentSaleData.servicosProdutos.map(sp => ({
          id_venda: saleId,
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

      // Se for fechar a venda, precisa validar e criar lançamentos financeiros
      if (fecharVenda) {
        const closureResult = await performSaleClosure(currentSaleData, saleId);
        if (!closureResult.success) {
          // Reverter o fechamento da venda
          await supabase
            .from('vx_vendas')
            .update({ fechada: false })
            .eq('id', saleId);
          
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
  }, [saleId]);

  // Função auxiliar para realizar o fechamento da venda (validações e lançamentos financeiros)
  const performSaleClosure = async (currentSaleData: SaleData, saleId: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Calcular saldo final para validação
    const totalTrocasCalc = currentSaleData.trocas.reduce((sum, t) => sum + t.valor_troca, 0);
    const totalServicosProdutosCalc = currentSaleData.servicosProdutos.reduce((sum, s) => sum + s.valor, 0);
    const totalRecebimentosCalc = currentSaleData.pagamentos
      .filter(p => p.valor > 0)
      .reduce((sum, p) => sum + p.valor, 0);
    const totalPagamentosSaidaCalc = currentSaleData.pagamentos
      .filter(p => p.valor < 0)
      .reduce((sum, p) => sum + Math.abs(p.valor), 0);
    const totalFinanciamentoCalc = currentSaleData.financiamento?.valor || 0;
    
    // Diferença a receber = valor veículo + serviços/produtos - trocas
    const diferencaAReceber = currentSaleData.valor_venda + totalServicosProdutosCalc - totalTrocasCalc;
    // Total recebido = recebimentos + financiamento - pagamentos saída
    const totalRecebido = totalRecebimentosCalc + totalFinanciamentoCalc - totalPagamentosSaidaCalc;
    // Saldo final
    const saldoFinal = diferencaAReceber - totalRecebido;

    // 2. Validar saldo final = 0
    if (Math.abs(saldoFinal) > 0.01) { // Tolerância para arredondamento
      return { 
        success: false, 
        error: 'Não é possível fechar a venda. O saldo final deve ser zero.' 
      };
    }

    // 3. Obter id_empresa do veículo
    const { data: veiculoData, error: veiculoError } = await supabase
      .from('estoque')
      .select('id_empresa')
      .eq('id', currentSaleData.veiculo!.id)
      .single();

    if (veiculoError || !veiculoData?.id_empresa) {
      return { success: false, error: 'Erro ao obter dados da empresa.' };
    }

    const idEmpresa = veiculoData.id_empresa;

    // 4. Buscar categorias padrão para vendas
    const { data: categoriasData } = await supabase
      .from('vx_fin_categoria')
      .select('id, categoria, operacao')
      .eq('ativo', true);

    // Encontrar categorias padrão
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

    const veiculoDesc = `${currentSaleData.veiculo?.fabricante || ''} ${currentSaleData.veiculo?.modelo || ''}`.trim();
    
    // 5a. Lançamentos de pagamentos do acerto
    for (const pagamento of currentSaleData.pagamentos) {
      const isRecebimento = pagamento.valor > 0;
      const valorAbsoluto = Math.abs(pagamento.valor);
      const status = pagamento.data_pagamento ? 'Pago' : 'Pendente';

      movimentosParaInserir.push({
        tipo_movimento: isRecebimento ? 'Receber' : 'Pagar',
        id_empresa: idEmpresa,
        status,
        id_conta: pagamento.id_conta,
        id_categoria: isRecebimento ? categoriaReceber.id : categoriaPagar.id,
        descricao: `Venda ${veiculoDesc} - ${pagamento.forma_descricao || 'Pagamento'} ${pagamento.numero}`,
        valor_bruto: valorAbsoluto,
        valor_liquido: valorAbsoluto,
        data_vencimento: pagamento.data_lancamento,
        data_pagamento: pagamento.data_pagamento,
        id_pessoa: currentSaleData.id_cliente,
        id_estoque: currentSaleData.veiculo!.id,
        observacoes: pagamento.observacao,
      });
    }

    // 5b. Lançamento de financiamento (se existir)
    if (currentSaleData.financiamento && currentSaleData.financiamento.valor > 0) {
      movimentosParaInserir.push({
        tipo_movimento: 'Receber',
        id_empresa: idEmpresa,
        status: 'Pendente',
        id_conta: currentSaleData.financiamento.id_conta_destino,
        id_categoria: categoriaReceber.id,
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
      });
    }

    // 5c. Lançamentos de produtos/serviços (se não estiverem já incluídos nos pagamentos)
    // Os produtos/serviços são adicionados ao valor total da venda, então já estarão cobertos pelos pagamentos
    // Não precisa criar lançamentos separados para eles

    // 6. Inserir todos os movimentos financeiros
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

    // 7. Atualizar status do veículo para 'Vendido'
    if (originalVehicleId) {
      const { error: updateError } = await supabase
        .from('estoque')
        .update({ status: 'Vendido' })
        .eq('id', originalVehicleId);

      if (updateError) {
        console.error('Erro ao atualizar status do veículo:', updateError);
        // Não é crítico, continua o fechamento
      }
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
