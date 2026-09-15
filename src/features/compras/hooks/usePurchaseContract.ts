import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Dados necessários para montar o contrato de compra
export interface PurchaseContractData {
  id: string;
  data_compra: string;
  fechada: boolean;
  cancelada: boolean;
  valor_total_compra: number;
  observacoes: string | null;

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

  // Pessoa que vendeu o veículo para a loja
  fornecedor: {
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

  // Colaborador responsável pela compra
  comprador: {
    id: string;
    nome: string;
    cpf_cnpj: string;
  } | null;

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

  pagamentos: Array<{
    id: string;
    valor: number;
    data_lancamento: string;
    data_pagamento: string | null;
    numero: string | null;
    observacao: string | null;
    forma_pagamento: {
      descricao: string;
    } | null;
  }>;

  totais: {
    valorCompra: number;
    totalPagamentos: number;
    totalPago: number;
    saldoFinal: number;
  };
}

export function usePurchaseContract() {
  const [loading, setLoading] = useState(false);
  const [contractData, setContractData] = useState<PurchaseContractData | null>(null);

  const fetchContractData = useCallback(
    async (purchaseId: string): Promise<PurchaseContractData | null> => {
      setLoading(true);
      try {
        const { data: compraData, error: compraError } = await supabase
          .from('vx_compras')
          .select('*')
          .eq('id', purchaseId)
          .single();

        if (compraError || !compraData) {
          throw new Error('Compra não encontrada');
        }

        const { data: veiculoData } = await supabase
          .from('estoque')
          .select(
            'id, modelo, fabricante, ano, ano_fabricacao, placa, chassi, renavan, cor, km, motor, valor'
          )
          .eq('id', compraData.id_veiculo_comprado)
          .maybeSingle();

        const { data: empresaData } = await supabase
          .from('empresa')
          .select(
            'nome_fantasia, razao_social, cnpj, telefone, email, logradouro, numero, bairro, municipio, estado, cep, site, foto_url'
          )
          .eq('id', compraData.id_empresa)
          .maybeSingle();

        const { data: fornecedorData } = await supabase
          .from('vx_pessoa')
          .select('id, nome, cpf_cnpj, telefone, email, logradouro, numero, bairro, municipio, estado, cep')
          .eq('id', compraData.id_fornecedor)
          .maybeSingle();

        let compradorData: PurchaseContractData['comprador'] = null;
        if (compraData.id_comprador) {
          const { data } = await supabase
            .from('vx_pessoa')
            .select('id, nome, cpf_cnpj')
            .eq('id', compraData.id_comprador)
            .maybeSingle();
          compradorData = data;
        }

        const { data: acertosData } = await supabase
          .from('vx_compras_acerto')
          .select('id, valor, data_lancamento, data_pagamento, numero, observacao, id_forma_pagamento')
          .eq('id_compra', purchaseId)
          .order('data_lancamento');

        const pagamentos = await Promise.all(
          (acertosData || []).map(async acerto => {
            const { data: formaData } = await supabase
              .from('vx_forma_pagamento')
              .select('descricao')
              .eq('id', acerto.id_forma_pagamento)
              .maybeSingle();
            return { ...acerto, forma_pagamento: formaData };
          })
        );

        const valorCompra = Number(compraData.valor_total_compra);
        const totalPagamentos = pagamentos.reduce((soma, p) => soma + Number(p.valor), 0);
        const totalPago = pagamentos
          .filter(p => Boolean(p.data_pagamento))
          .reduce((soma, p) => soma + Number(p.valor), 0);

        const result: PurchaseContractData = {
          id: compraData.id,
          data_compra: compraData.data_compra,
          fechada: Boolean(compraData.fechada),
          cancelada: Boolean(compraData.cancelada),
          valor_total_compra: valorCompra,
          observacoes: compraData.observacoes,
          empresa: empresaData,
          fornecedor: fornecedorData,
          comprador: compradorData,
          veiculo: veiculoData,
          pagamentos,
          totais: {
            valorCompra,
            totalPagamentos,
            totalPago,
            saldoFinal: valorCompra - totalPago,
          },
        };

        setContractData(result);
        return result;
      } catch {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar dados do contrato de compra',
          variant: 'destructive',
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, contractData, fetchContractData };
}
