// Tipos do módulo de Compras

export interface PurchaseVehicle {
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

export interface PurchasePerson {
  id: string;
  nome: string;
  cpf_cnpj: string;
  telefone: string | null;
  email: string | null;
}

export interface PurchasePaymentEntry {
  id: string;
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

export interface PurchaseData {
  // Etapa 1 - Pessoa
  id_fornecedor: string | null;
  id_comprador: string | null;
  fornecedor?: PurchasePerson | null;
  comprador?: PurchasePerson | null;

  // Etapa 2 - Veículo
  veiculo: PurchaseVehicle | null;
  valor_compra: number;

  // Etapa 3 - Acerto financeiro
  pagamentos: PurchasePaymentEntry[];

  // Etapa 4 - Conclusão
  data_compra: Date;
  observacoes: string;
}

export interface FormaPagamentoCompra {
  id: string;
  descricao: string;
  ativa: boolean;
  id_conta_padrao: string | null;
}

export interface ContaCompra {
  id: string;
  banco: string;
  descricao: string | null;
}

export const PURCHASE_STEPS = [
  { id: 1, label: 'Pessoa', description: 'Vendedor e comprador' },
  { id: 2, label: 'Veículo', description: 'Veículo comprado' },
  { id: 3, label: 'Acerto', description: 'Acerto financeiro' },
  { id: 4, label: 'Conclusão', description: 'Finalizar compra' },
] as const;
