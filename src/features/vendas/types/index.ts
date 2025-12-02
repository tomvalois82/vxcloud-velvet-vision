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
  valor: number;
  data_lancamento: string;
  data_pagamento: string | null;
  numero: string;
  observacao: string | null;
  forma_descricao?: string;
  conta_descricao?: string;
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

export const SALE_STEPS = [
  { id: 1, label: 'Pessoa', description: 'Cliente e Vendedor' },
  { id: 2, label: 'Veículo', description: 'Dados do veículo' },
  { id: 3, label: 'Troca', description: 'Veículos de troca' },
  { id: 4, label: 'Acerto', description: 'Acerto financeiro' },
  { id: 5, label: 'Conclusão', description: 'Finalizar venda' },
] as const;
