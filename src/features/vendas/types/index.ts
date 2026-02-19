// Types for the Sales Module

export interface SaleVehicle {
  id: number;
  modelo: string | null;
  fabricante: string | null;
  ano: string | null;
  valor: string | null;
  km: string | null;
  cor: string | null;
  foto: string | null;
  placa: string | null;
}

export interface SalePerson {
  id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string | null;
  email: string | null;
}

export interface TradeInVehicle {
  id: string; // Unique ID for the trade-in entry
  vehicle: SaleVehicle;
  valor_troca: number;
}

export interface PaymentEntry {
  id: string; // Unique ID for the payment entry
  id_forma_pagamento: string;
  id_conta: string;
  valor: number; // Positivo = recebimento (entrada), Negativo = pagamento (saída)
  data_lancamento: string;
  data_pagamento: string | null;
  numero: string;
  observacao: string | null;
  forma_descricao?: string;
  conta_descricao?: string;
  tipo_lancamento: 'recebimento' | 'pagamento'; // recebimento = cliente paga loja, pagamento = loja paga cliente
}

export interface SaleData {
  // Step 1 - Pessoa
  id_cliente: string | null;
  id_vendedor: string | null;
  cliente?: SalePerson | null;
  vendedor?: SalePerson | null;
  
  // Step 2 - Veículo
  veiculo: SaleVehicle | null;
  valor_venda: number;
  km_venda: string;
  observacoes_veiculo: string;
  
  // Step 3 - Troca
  trocas: TradeInVehicle[];
  
  // Step 4 - Acerto
  pagamentos: PaymentEntry[];
  financiamento: FinanciamentoEntry | null;
  servicosProdutos: ServicoProdutoEntry[];
  
  // Step 5 - Conclusão
  data_venda: Date;
  observacoes: string;
}

export interface FormaPagamento {
  id: string;
  descricao: string;
  ativa: boolean;
  id_conta_padrao: string | null;
}

export interface ContaFinanceira {
  id: string;
  banco: string;
  descricao: string | null;
}

export interface Financeira {
  id: string;
  nome: string;
  ativa: boolean;
  logo_url: string | null;
}

export interface FinanciamentoEntry {
  id: string;
  id_financeira: string | null;
  id_conta_destino: string;
  valor: number;
  valor_r: number | null;
  plus: number | null;
  tac: number | null;
  valor_tac: number | null;
  numero_contrato: string | null;
  numero_prestacao: number | null;
  valor_prestacao: number | null;
  dados_financiamento: string | null;
  data_vencimento_inicial: string | null;
  financeira_nome?: string;
  conta_descricao?: string;
}

export interface ServicoProdutoEntry {
  id: string;
  descricao: string;
  valor: number;
  id_categoria: string;
  id_veiculo: number | null;
  categoria_nome?: string;
}

export interface CategoriaFinanceira {
  id: string;
  categoria: string;
  operacao: string;
  ativo: boolean;
  id_categoria_pai: string | null;
  tipo_conta?: string | null;
}

export const SALE_STEPS = [
  { id: 1, label: 'Pessoa', description: 'Cliente e Vendedor' },
  { id: 2, label: 'Veículo', description: 'Dados do veículo' },
  { id: 3, label: 'Troca', description: 'Veículos de troca' },
  { id: 4, label: 'Acerto', description: 'Acerto financeiro' },
  { id: 5, label: 'Conclusão', description: 'Finalizar venda' },
] as const;
