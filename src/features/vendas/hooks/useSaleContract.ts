import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ContractData {
  // Venda
  id: string;
  data_venda: string;
  fechada: boolean;
  valor_total_venda: number;
  observacoes: string | null;

  // Empresa
  empresa: {
    nome_fantasia: string;
    razao_social: string;
    cnpj: string | null;
    telefone: string | null;
    email: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    estado: string;
    cep: string;
    site: string | null;
    foto_url: string | null;
  } | null;

  // Cliente
  cliente: {
    id: string;
    nome: string;
    cpf_cnpj: string;
    telefone: string | null;
    email: string | null;
    logradouro: string | null;
    numero: string | null;
    bairro: string | null;
    municipio: string | null;
    estado: string | null;
    cep: string | null;
  } | null;

  // Vendedor
  vendedor: {
    id: string;
    nome: string;
    cpf_cnpj: string;
  } | null;

  // Veículo vendido
  veiculo: {
    id: number;
    modelo: string | null;
    fabricante: string | null;
    ano: string | null;
    ano_fabricacao: string | null;
    placa: string | null;
    chassi: string | null;
    renavan: number | null;
    cor: string | null;
    km: string | null;
    motor: string | null;
    valor: string | null;
  } | null;

  // Trocas
  trocas: Array<{
    id: string;
    valor_troca: number;
    veiculo: {
      id: number;
      modelo: string | null;
      fabricante: string | null;
      ano: string | null;
      ano_fabricacao: string | null;
      placa: string | null;
      chassi: string | null;
      renavan: number | null;
      cor: string | null;
      km: string | null;
    } | null;
  }>;

  // Acertos/Pagamentos
  acertos: Array<{
    id: string;
    valor: number;
    data_lancamento: string;
    data_pagamento: string | null;
    numero: string;
    observacao: string | null;
    forma_pagamento: {
      descricao: string;
    } | null;
  }>;

  // Financiamento
  financiamento: {
    id: string;
    valor: number;
    numero_contrato: string | null;
    numero_prestacao: number | null;
    valor_prestacao: number | null;
    financeira: {
      nome: string;
    } | null;
  } | null;

  // Serviços/Produtos
  servicos_produtos: Array<{
    id: string;
    descricao: string;
    valor: number;
  }>;

  // Totais calculados
  totais: {
    valorVenda: number;
    totalServicosProdutos: number;
    totalTrocas: number;
    totalRecebimentos: number;
    totalPagamentos: number;
    totalFinanciamento: number;
    totalAPagar: number;
  };
}

export function useSaleContract() {
  const [loading, setLoading] = useState(false);
  const [contractData, setContractData] = useState<ContractData | null>(null);

  const fetchContractData = useCallback(async (saleId: string): Promise<ContractData | null> => {
    setLoading(true);
    try {
      // Buscar venda principal
      const { data: vendaData, error: vendaError } = await supabase
        .from('vx_vendas')
        .select('*')
        .eq('id', saleId)
        .single();

      if (vendaError || !vendaData) {
        throw new Error('Venda não encontrada');
      }

      // Buscar veículo
      const { data: veiculoData } = await supabase
        .from('estoque')
        .select('id, modelo, fabricante, ano, ano_fabricacao, placa, chassi, renavan, cor, km, motor, valor, id_empresa')
        .eq('id', vendaData.id_veiculo_vendido)
        .single();

      // Buscar empresa
      let empresaData = null;
      if (veiculoData?.id_empresa) {
        const { data } = await supabase
          .from('empresa')
          .select('nome_fantasia, razao_social, cnpj, telefone, email, logradouro, numero, bairro, municipio, estado, cep, site, foto_url')
          .eq('id', veiculoData.id_empresa)
          .single();
        empresaData = data;
      }

      // Buscar cliente
      const { data: clienteData } = await supabase
        .from('vx_pessoa')
        .select('id, nome, cpf_cnpj, telefone, email, logradouro, numero, bairro, municipio, estado, cep')
        .eq('id', vendaData.id_cliente)
        .single();

      // Buscar vendedor
      let vendedorData = null;
      if (vendaData.id_vendedor) {
        const { data } = await supabase
          .from('vx_pessoa')
          .select('id, nome, cpf_cnpj')
          .eq('id', vendaData.id_vendedor)
          .single();
        vendedorData = data;
      }

      // Buscar trocas
      const { data: trocasData } = await supabase
        .from('vx_vendas_troca')
        .select('id, valor_troca, id_veiculo_troca')
        .eq('id_venda', saleId);

      const trocas = await Promise.all(
        (trocasData || []).map(async (troca) => {
          const { data: veiculoTroca } = await supabase
            .from('estoque')
            .select('id, modelo, fabricante, ano, ano_fabricacao, placa, chassi, renavan, cor, km')
            .eq('id', troca.id_veiculo_troca)
            .single();
          return { ...troca, veiculo: veiculoTroca };
        })
      );

      // Buscar acertos
      const { data: acertosData } = await supabase
        .from('vx_vendas_acerto')
        .select('id, valor, data_lancamento, data_pagamento, numero, observacao, id_forma_pagamento')
        .eq('id_venda', saleId)
        .order('data_lancamento');

      const acertos = await Promise.all(
        (acertosData || []).map(async (acerto) => {
          const { data: formaData } = await supabase
            .from('vx_forma_pagamento')
            .select('descricao')
            .eq('id', acerto.id_forma_pagamento)
            .single();
          return { ...acerto, forma_pagamento: formaData };
        })
      );

      // Buscar financiamento
      const { data: financiamentoData } = await supabase
        .from('vx_vendas_financiamento')
        .select('id, valor, numero_contrato, numero_prestacao, valor_prestacao, id_financeira')
        .eq('id_venda', saleId)
        .maybeSingle();

      let financiamento = null;
      if (financiamentoData) {
        let financeiraData = null;
        if (financiamentoData.id_financeira) {
          const { data } = await supabase
            .from('vx_financeiras')
            .select('nome')
            .eq('id', financiamentoData.id_financeira)
            .single();
          financeiraData = data;
        }
        financiamento = { ...financiamentoData, financeira: financeiraData };
      }

      // Buscar serviços/produtos
      const { data: servicosData } = await supabase
        .from('vx_vendas_servico_produto')
        .select('id, descricao, valor')
        .eq('id_venda', saleId);

      // Calcular totais
      const valorVenda = Number(vendaData.valor_total_venda);
      const totalServicosProdutos = (servicosData || []).reduce((sum, s) => sum + Number(s.valor), 0);
      const totalTrocas = trocas.reduce((sum, t) => sum + Number(t.valor_troca), 0);
      const totalRecebimentos = acertos
        .filter(a => Number(a.valor) > 0)
        .reduce((sum, a) => sum + Number(a.valor), 0);
      const totalPagamentos = acertos
        .filter(a => Number(a.valor) < 0)
        .reduce((sum, a) => sum + Math.abs(Number(a.valor)), 0);
      const totalFinanciamento = financiamento?.valor ? Number(financiamento.valor) : 0;
      const totalAPagar = valorVenda + totalServicosProdutos - totalTrocas;

      const result: ContractData = {
        id: vendaData.id,
        data_venda: vendaData.data_venda,
        fechada: vendaData.fechada,
        valor_total_venda: valorVenda,
        observacoes: vendaData.observacoes,
        empresa: empresaData,
        cliente: clienteData,
        vendedor: vendedorData,
        veiculo: veiculoData,
        trocas,
        acertos,
        financiamento,
        servicos_produtos: servicosData || [],
        totais: {
          valorVenda,
          totalServicosProdutos,
          totalTrocas,
          totalRecebimentos,
          totalPagamentos,
          totalFinanciamento,
          totalAPagar,
        },
      };

      setContractData(result);
      return result;
    } catch (error) {
      console.error('Error fetching contract data:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados do contrato',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    contractData,
    fetchContractData,
  };
}
