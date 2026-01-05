import { useState } from 'react';
import { Plus, Trash2, CreditCard, Wallet, Calendar, Landmark, Edit2, ArrowDownCircle, ArrowUpCircle, Package } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';

// Máscara para número decimal com 1 casa (ex: 3,6; 2,8; 4,0)
function maskDecimal(value: string | number): string {
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  // Remove tudo exceto dígitos e vírgula
  let clean = value.replace(/[^\d,]/g, '');
  // Garante apenas uma vírgula
  const parts = clean.split(',');
  if (parts.length > 2) {
    clean = parts[0] + ',' + parts.slice(1).join('');
  }
  // Limita a 1 casa decimal
  if (parts.length === 2 && parts[1].length > 1) {
    clean = parts[0] + ',' + parts[1].slice(0, 1);
  }
  return clean;
}

function parseDecimal(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

// Converte string de data (YYYY-MM-DD) para Date local (evita -1 dia por fuso)
function parseDateOnlyAsLocal(dateString: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(`${dateString}T00:00:00`);
  }
  return new Date(dateString);
}
import { toast } from 'sonner';
import type { SaleData, PaymentEntry, FormaPagamento, ContaFinanceira, Financeira, FinanciamentoEntry, ServicoProdutoEntry, CategoriaFinanceira } from '../../types';
import { ServicoProdutoDialog } from '../ServicoProdutoDialog';

interface StepAcertoProps {
  saleData: SaleData;
  formasPagamento: FormaPagamento[];
  contas: ContaFinanceira[];
  financeiras: Financeira[];
  categorias: CategoriaFinanceira[];
  addPayment: (payment: Omit<PaymentEntry, 'id'>) => void;
  removePayment: (id: string) => void;
  setFinanciamento: (financiamento: Omit<FinanciamentoEntry, 'id'> | null) => void;
  removeFinanciamento: () => void;
  addServicoProduto: (item: Omit<ServicoProdutoEntry, 'id'>) => void;
  removeServicoProduto: (id: string) => void;
  updateServicoProduto: (id: string, item: Omit<ServicoProdutoEntry, 'id'>) => void;
  totals: {
    valorVeiculo: number;
    totalTrocas: number;
    totalServicosProdutos: number;
    valorAReceber: number;
    totalPagamentos: number;
    totalRecebimentos: number;
    totalPagamentosSaida: number;
    totalFinanciamento: number;
    saldoPendente: number;
  };
}

export function StepAcerto({
  saleData,
  formasPagamento,
  contas,
  financeiras,
  categorias,
  addPayment,
  removePayment,
  setFinanciamento,
  removeFinanciamento,
  addServicoProduto,
  removeServicoProduto,
  updateServicoProduto,
  totals,
}: StepAcertoProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [financiamentoDialogOpen, setFinanciamentoDialogOpen] = useState(false);
  const [servicoProdutoDialogOpen, setServicoProdutoDialogOpen] = useState(false);
  const [editingServicoProduto, setEditingServicoProduto] = useState<ServicoProdutoEntry | null>(null);
  const [paymentType, setPaymentType] = useState<'recebimento' | 'parcelamento' | 'pagamento'>('recebimento');
  
  // Estados para recebimento/pagamento simples
  const [valor, setValor] = useState('');
  const [idFormaPagamento, setIdFormaPagamento] = useState('');
  const [idConta, setIdConta] = useState('');
  const [numero, setNumero] = useState('');
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [observacao, setObservacao] = useState('');
  const [recebido, setRecebido] = useState(false);
  const [dataPagamento, setDataPagamento] = useState<Date>(new Date());

  // Estados para parcelamento
  const [numeroParcelas, setNumeroParcelas] = useState('');
  const [intervaloDias, setIntervaloDias] = useState('30');
  const [valorParcela, setValorParcela] = useState('');
  const [dataInicioParcelamento, setDataInicioParcelamento] = useState<Date>(new Date());

  // Estados para financiamento
  const [idFinanceira, setIdFinanceira] = useState('');
  const [idContaDestino, setIdContaDestino] = useState('');
  const [valorFinanciado, setValorFinanciado] = useState('');
  const [valorR, setValorR] = useState('');
  const [plus, setPlus] = useState('');
  const [tac, setTac] = useState('');
  const [valorTac, setValorTac] = useState('');
  const [numeroContrato, setNumeroContrato] = useState('');
  const [numeroPrestacao, setNumeroPrestacao] = useState('');
  const [valorPrestacao, setValorPrestacao] = useState('');
  const [dadosFinanciamento, setDadosFinanciamento] = useState('');
  const [dataVencimentoInicial, setDataVencimentoInicial] = useState<Date>(new Date());

  const resetForm = () => {
    setValor('');
    setIdFormaPagamento('');
    setIdConta('');
    setNumero('');
    setDataLancamento(new Date());
    setObservacao('');
    setRecebido(false);
    setDataPagamento(new Date());
    // Reset parcelamento
    setNumeroParcelas('');
    setIntervaloDias('30');
    setValorParcela('');
    setDataInicioParcelamento(new Date());
  };

  const resetFinanciamentoForm = () => {
    setIdFinanceira('');
    setIdContaDestino('');
    setValorFinanciado('');
    setValorR('');
    setPlus('');
    setTac('');
    setValorTac('');
    setNumeroContrato('');
    setNumeroPrestacao('');
    setValorPrestacao('');
    setDadosFinanciamento('');
    setDataVencimentoInicial(new Date());
  };

  // Preencher form de financiamento para edição
  const loadFinanciamentoForEdit = () => {
    if (saleData.financiamento) {
      const fin = saleData.financiamento;
      setIdFinanceira(fin.id_financeira || '');
      setIdContaDestino(fin.id_conta_destino || '');
      setValorFinanciado(maskCurrency(fin.valor || 0));
      setValorR(fin.valor_r ? maskDecimal(fin.valor_r) : '');
      setPlus(fin.plus ? maskCurrency(fin.plus) : '');
      setTac(fin.tac ? String(fin.tac) : '');
      setValorTac(fin.valor_tac ? maskCurrency(fin.valor_tac) : '');
      setNumeroContrato(fin.numero_contrato || '');
      setNumeroPrestacao(fin.numero_prestacao ? String(fin.numero_prestacao) : '');
      setValorPrestacao(fin.valor_prestacao ? maskCurrency(fin.valor_prestacao) : '');
      setDadosFinanciamento(fin.dados_financiamento || '');
      setDataVencimentoInicial(fin.data_vencimento_inicial ? new Date(fin.data_vencimento_inicial) : new Date());
    }
  };

  const handleAddFinanciamento = () => {
    console.log('=== handleAddFinanciamento CHAMADO ===');
    const valorNum = unmaskCurrency(valorFinanciado);
    console.log('valorFinanciado raw:', valorFinanciado);
    console.log('valorNum (parsed):', valorNum);
    console.log('idContaDestino:', idContaDestino);
    
    if (!valorNum || !idContaDestino) {
      console.log('VALIDAÇÃO FALHOU - valor ou conta destino vazio');
      toast.error('Preencha valor e conta destino');
      return;
    }

    const financeira = financeiras.find(f => f.id === idFinanceira);
    const conta = contas.find(c => c.id === idContaDestino);

    const financiamentoData = {
      id_financeira: idFinanceira || null,
      id_conta_destino: idContaDestino,
      valor: valorNum,
      valor_r: valorR ? parseDecimal(valorR) : null,
      plus: plus ? unmaskCurrency(plus) : null,
      tac: tac ? Number(tac) : null,
      valor_tac: valorTac ? unmaskCurrency(valorTac) : null,
      numero_contrato: numeroContrato || null,
      numero_prestacao: numeroPrestacao ? Number(numeroPrestacao) : null,
      valor_prestacao: valorPrestacao ? unmaskCurrency(valorPrestacao) : null,
      dados_financiamento: dadosFinanciamento || null,
      data_vencimento_inicial: format(dataVencimentoInicial, 'yyyy-MM-dd'),
      financeira_nome: financeira?.nome,
      conta_descricao: conta ? getContaDisplayName(conta) : undefined,
    };
    
    console.log('Dados do financiamento a enviar:', financiamentoData);
    
    setFinanciamento(financiamentoData);
    console.log('setFinanciamento foi chamado');

    toast.success('Financiamento adicionado com sucesso');
    resetFinanciamentoForm();
    setFinanciamentoDialogOpen(false);
  };

  const handleRemoveFinanciamento = () => {
    removeFinanciamento();
    toast.success('Financiamento removido');
  };

  const handleEditFinanciamento = () => {
    loadFinanciamentoForEdit();
    setFinanciamentoDialogOpen(true);
  };

  const handleRecebidoChange = (checked: boolean) => {
    setRecebido(checked);
    if (checked) {
      setDataPagamento(dataLancamento);
    }
  };

  const getContaDisplayName = (conta: ContaFinanceira) => {
    if (conta.descricao) {
      return `${conta.banco} - ${conta.descricao}`;
    }
    return conta.banco;
  };

  // Cálculo do total de parcelamento
  const totalParcelamento = (() => {
    const parcelas = parseInt(numeroParcelas) || 0;
    const valorNum = unmaskCurrency(valorParcela);
    return parcelas * valorNum;
  })();

  const handleAddPayment = () => {
    if (!valor || !idFormaPagamento || !idConta) return;

    const forma = formasPagamento.find(f => f.id === idFormaPagamento);
    const conta = contas.find(c => c.id === idConta);
    
    // Se tipo é "pagamento", valor é negativo (loja paga ao cliente)
    const valorNum = unmaskCurrency(valor);
    const valorFinal = paymentType === 'pagamento' ? -Math.abs(valorNum) : Math.abs(valorNum);

    // Usa toISOString local para evitar problemas de fuso horário
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    addPayment({
      id_forma_pagamento: idFormaPagamento,
      id_conta: idConta,
      valor: valorFinal,
      data_lancamento: formatLocalDate(dataLancamento),
      data_pagamento: recebido ? formatLocalDate(dataPagamento) : null,
      numero: numero || '1',
      observacao: observacao || null,
      forma_descricao: forma?.descricao,
      conta_descricao: conta ? getContaDisplayName(conta) : undefined,
      tipo_lancamento: paymentType === 'pagamento' ? 'pagamento' : 'recebimento',
    });

    toast.success(paymentType === 'pagamento' 
      ? 'Pagamento (saída) adicionado com sucesso' 
      : 'Recebimento adicionado com sucesso'
    );
    resetForm();
    setDialogOpen(false);
  };

  const handleAddParcelamento = () => {
    const parcelas = parseInt(numeroParcelas);
    const intervalo = parseInt(intervaloDias);
    const valorNum = unmaskCurrency(valorParcela);

    if (!parcelas || parcelas < 1 || !intervalo || !valorNum || !idFormaPagamento || !idConta) {
      toast.error('Preencha todos os campos do parcelamento');
      return;
    }

    const forma = formasPagamento.find(f => f.id === idFormaPagamento);
    const conta = contas.find(c => c.id === idConta);

    // Usa toISOString local para evitar problemas de fuso horário
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Gerar cada parcela a partir da data selecionada
    for (let i = 0; i < parcelas; i++) {
      const dataVencimento = addDays(dataInicioParcelamento, intervalo * i);
      
      addPayment({
        id_forma_pagamento: idFormaPagamento,
        id_conta: idConta,
        valor: valorNum, // Parcelamento é sempre recebimento (positivo)
        data_lancamento: formatLocalDate(dataVencimento),
        data_pagamento: null,
        numero: `${i + 1}/${parcelas}`,
        observacao: observacao || null,
        forma_descricao: forma?.descricao,
        conta_descricao: conta ? getContaDisplayName(conta) : undefined,
        tipo_lancamento: 'recebimento',
      });
    }

    toast.success(`Parcelamento adicionado com sucesso (${parcelas}x de ${maskCurrency(valorNum)})`);
    resetForm();
    setDialogOpen(false);
  };

  const getSaldoColor = () => {
    if (totals.saldoPendente > 0) return 'text-yellow-500';
    if (totals.saldoPendente < 0) return 'text-destructive';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary */}
      <div className="glass rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent" />
          Acerto Financeiro
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Como será realizado o acerto financeiro da negociação
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Total em veículo(s)</span>
            <span className="text-foreground font-medium">
              {maskCurrency(totals.valorVeiculo)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">(-) Total líquido em troca(s)</span>
            <span className="text-foreground font-medium">
              - {maskCurrency(totals.totalTrocas)}
            </span>
          </div>

          {totals.totalServicosProdutos > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-accent flex items-center gap-2">
                <Package className="w-4 h-4" />
                (+) Produtos e Serviços
              </span>
              <span className="text-accent font-medium">
                + {maskCurrency(totals.totalServicosProdutos)}
              </span>
            </div>
          )}

          {totals.totalFinanciamento > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">(-) Financiamento</span>
              <span className="text-accent font-medium">
                - {maskCurrency(totals.totalFinanciamento)}
              </span>
            </div>
          )}

          <div className={cn(
            "flex items-center justify-between py-3 px-4 rounded-lg",
            totals.valorAReceber >= 0 ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"
          )}>
            <span className={totals.valorAReceber >= 0 ? "text-green-500" : "text-destructive"}>
              {totals.valorAReceber >= 0 ? "Total a receber do cliente" : "Total a pagar ao cliente"}
            </span>
            <span className={cn(
              "font-bold text-lg",
              totals.valorAReceber >= 0 ? "text-green-500" : "text-destructive"
            )}>
              {maskCurrency(Math.abs(totals.valorAReceber))}
            </span>
          </div>

          {/* Recebimentos */}
          {totals.totalRecebimentos > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-green-500 flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4" />
                (+) Recebimentos (entradas)
              </span>
              <span className="text-green-500 font-medium">
                + {maskCurrency(totals.totalRecebimentos)}
              </span>
            </div>
          )}

          {/* Pagamentos (Saídas) */}
          {totals.totalPagamentosSaida > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-destructive flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4" />
                (-) Pagamentos (saídas)
              </span>
              <span className="text-destructive font-medium">
                - {maskCurrency(totals.totalPagamentosSaida)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-accent" />
            + RECEBIMENTOS OU PAGAMENTOS
          </h4>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            adicionar
          </Button>
        </div>

        {saleData.pagamentos.length === 0 ? (
          <div className="glass rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              Nenhum pagamento adicionado
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {saleData.pagamentos.map(payment => {
              const isPagamento = payment.tipo_lancamento === 'pagamento' || payment.valor < 0;
              return (
                <div
                  key={payment.id}
                  className={cn(
                    "glass rounded-lg p-4 flex items-center justify-between",
                    isPagamento ? "border border-destructive/30" : "border border-green-500/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isPagamento ? (
                      <ArrowDownCircle className="w-5 h-5 text-destructive" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {payment.forma_descricao || 'Pagamento'}
                        </p>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          isPagamento 
                            ? "bg-destructive/10 text-destructive" 
                            : "bg-green-500/10 text-green-500"
                        )}>
                          {isPagamento ? 'Saída' : 'Entrada'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.conta_descricao} • {format(parseDateOnlyAsLocal(payment.data_lancamento), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "font-bold",
                      isPagamento ? "text-destructive" : "text-green-500"
                    )}>
                      {isPagamento ? '- ' : '+ '}{maskCurrency(Math.abs(payment.valor))}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePayment(payment.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Financiamento Section - NOVO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Landmark className="w-4 h-4 text-accent" />
            FINANCIAMENTO
          </h4>
          {!saleData.financiamento && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                resetFinanciamentoForm();
                setFinanciamentoDialogOpen(true);
              }}
              className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Financiamento
            </Button>
          )}
        </div>

        {!saleData.financiamento ? (
          <div className="glass rounded-lg p-8 text-center border border-dashed border-accent/30">
            <Landmark className="w-10 h-10 text-accent/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhum financiamento adicionado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "Adicionar Financiamento" para incluir
            </p>
          </div>
        ) : (
          <div className="glass rounded-lg p-4 border border-accent/30 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Landmark className="w-5 h-5 text-accent" />
                  <span className="font-semibold text-accent">
                    {saleData.financiamento.financeira_nome || 'Financiamento'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Valor Financiado</p>
                    <p className="font-bold text-lg text-accent">{maskCurrency(saleData.financiamento.valor)}</p>
                  </div>
                  {saleData.financiamento.numero_prestacao && (
                    <div>
                      <p className="text-muted-foreground">Parcelas</p>
                      <p className="font-medium">{saleData.financiamento.numero_prestacao}x</p>
                    </div>
                  )}
                  {saleData.financiamento.valor_prestacao && (
                    <div>
                      <p className="text-muted-foreground">Valor Parcela</p>
                      <p className="font-medium">{maskCurrency(saleData.financiamento.valor_prestacao)}</p>
                    </div>
                  )}
                  {saleData.financiamento.data_vencimento_inicial && (
                    <div>
                      <p className="text-muted-foreground">1º Vencimento</p>
                      <p className="font-medium">{format(new Date(saleData.financiamento.data_vencimento_inicial), 'dd/MM/yyyy')}</p>
                    </div>
                  )}
                </div>
                {(saleData.financiamento.plus || saleData.financiamento.valor_r || saleData.financiamento.valor_tac) && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 text-sm">
                    {saleData.financiamento.valor_r && (
                      <div>
                        <span className="text-muted-foreground">Valor R: </span>
                        <span className="font-medium">{maskDecimal(saleData.financiamento.valor_r)}</span>
                      </div>
                    )}
                    {saleData.financiamento.plus && (
                      <div>
                        <span className="text-muted-foreground">Plus: </span>
                        <span className="font-medium">{maskCurrency(saleData.financiamento.plus)}</span>
                      </div>
                    )}
                    {saleData.financiamento.valor_tac && (
                      <div>
                        <span className="text-muted-foreground">TAC: </span>
                        <span className="font-medium">{maskCurrency(saleData.financiamento.valor_tac)}</span>
                      </div>
                    )}
                  </div>
                )}
                {saleData.financiamento.numero_contrato && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Contrato: {saleData.financiamento.numero_contrato}
                  </p>
                )}
                {saleData.financiamento.conta_descricao && (
                  <p className="text-xs text-muted-foreground">
                    Conta: {saleData.financiamento.conta_descricao}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEditFinanciamento}
                  className="text-accent hover:text-accent"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFinanciamento}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Produtos e Serviços Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 text-accent" />
            PRODUTOS E SERVIÇOS
          </h4>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setEditingServicoProduto(null);
              setServicoProdutoDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            adicionar
          </Button>
        </div>

        {saleData.servicosProdutos.length === 0 ? (
          <div className="glass rounded-lg p-8 text-center border border-dashed border-border">
            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Nenhum produto ou serviço adicionado
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "adicionar" para incluir taxas, acessórios, etc.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {saleData.servicosProdutos.map(item => (
              <div
                key={item.id}
                className="glass rounded-lg p-4 flex items-center justify-between border border-accent/20"
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium text-foreground">
                      {item.descricao}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {item.categoria_nome || 'Sem categoria'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-accent">
                    {maskCurrency(item.valor)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingServicoProduto(item);
                      setServicoProdutoDialogOpen(true);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeServicoProduto(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Balance Status */}
      <div className={cn(
        "rounded-lg p-4 text-center",
        totals.saldoPendente === 0 
          ? "bg-accent text-accent-foreground" 
          : "bg-muted"
      )}>
        <p className={cn("font-bold text-lg", getSaldoColor())}>
          {totals.saldoPendente === 0 
            ? 'Financeiro OK' 
            : `Saldo Pendente: ${maskCurrency(Math.abs(totals.saldoPendente))}`
          }
        </p>
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Pagamento</DialogTitle>
            <DialogDescription>
              Adicione recebimentos, parcelamentos ou pagamentos à venda
            </DialogDescription>
          </DialogHeader>

          {/* Summary in Dialog */}
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Venda + Outros</p>
              <p className="font-bold text-green-500">{maskCurrency(totals.valorVeiculo)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Recebimentos</p>
              <p className="font-bold text-green-500">{maskCurrency(totals.totalRecebimentos)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total a receber</p>
              <p className="font-bold text-green-500">{maskCurrency(Math.abs(totals.valorAReceber))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pagamentos (saída)</p>
              <p className="font-bold text-destructive">{maskCurrency(totals.totalPagamentosSaida)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Troca Cliente</p>
              <p className="font-bold text-destructive">{maskCurrency(totals.totalTrocas)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Saldo Pendente</p>
              <p className={cn("font-bold", getSaldoColor())}>
                {maskCurrency(Math.abs(totals.saldoPendente))}
              </p>
            </div>
          </div>

          {/* Payment Type Tabs - SEM financiamento */}
          <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="recebimento">Recebimento</TabsTrigger>
              <TabsTrigger value="parcelamento">Parcelamento</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
            </TabsList>

            {/* Tab Recebimento e Pagamento - mesmo formulário */}
            {(paymentType === 'recebimento' || paymentType === 'pagamento') && (
              <div className="space-y-4 mt-4">
                {/* Hint sobre o tipo */}
                {paymentType === 'pagamento' ? (
                  <div className="glass rounded-lg p-3 border border-destructive/30 bg-destructive/5">
                    <p className="text-sm text-destructive flex items-center gap-2">
                      <ArrowDownCircle className="w-4 h-4" />
                      <span><strong>Pagamento (Saída):</strong> Valor que a loja paga ao cliente (ex: troco, diferença de troca)</span>
                    </p>
                  </div>
                ) : (
                  <div className="glass rounded-lg p-3 border border-green-500/30 bg-green-500/5">
                    <p className="text-sm text-green-500 flex items-center gap-2">
                      <ArrowUpCircle className="w-4 h-4" />
                      <span><strong>Recebimento (Entrada):</strong> Valor que o cliente paga à loja</span>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={valor}
                    onChange={(e) => setValor(maskCurrency(unmaskCurrency(e.target.value)))}
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={idConta} onValueChange={setIdConta}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {getContaDisplayName(conta)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Forma</Label>
                  <Select value={idFormaPagamento} onValueChange={setIdFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma" />
                    </SelectTrigger>
                    <SelectContent>
                      {formasPagamento.map(forma => (
                        <SelectItem key={forma.id} value={forma.id}>
                          {forma.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número</Label>
                    <Input
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Previsão</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(dataLancamento, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dataLancamento}
                          onSelect={(date) => date && setDataLancamento(date)}
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Checkbox Recebido */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="recebido"
                    checked={recebido}
                    onCheckedChange={handleRecebidoChange}
                  />
                  <Label htmlFor="recebido" className="cursor-pointer">
                    {paymentType === 'pagamento' ? 'Pago' : 'Recebido'}
                  </Label>
                </div>

                {/* Date Picker para Data de Pagamento - só aparece quando recebido=true */}
                {recebido && (
                  <div className="space-y-2">
                    <Label>Data do Pagamento</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(dataPagamento, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dataPagamento}
                          onSelect={(date) => date && setDataPagamento(date)}
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Descrição da forma</Label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observações..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Tab Parcelamento - formulário específico */}
            {paymentType === 'parcelamento' && (
              <div className="space-y-4 mt-4">
                <div className="glass rounded-lg p-4 border border-accent/30 animate-fade-in">
                  <h4 className="text-sm font-medium text-accent mb-4">Configuração do Parcelamento</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nº de Parcelas</Label>
                      <Input
                        type="number"
                        min="1"
                        value={numeroParcelas}
                        onChange={(e) => setNumeroParcelas(e.target.value)}
                        placeholder="Ex: 12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Intervalo (dias)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={intervaloDias}
                        onChange={(e) => setIntervaloDias(e.target.value)}
                        placeholder="Ex: 30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>A partir de:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Calendar className="w-4 h-4 mr-2" />
                          {format(dataInicioParcelamento, 'dd/MM/yyyy')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={dataInicioParcelamento}
                          onSelect={(date) => date && setDataInicioParcelamento(date)}
                          locale={ptBR}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Valor da Parcela</Label>
                      <Input
                        value={valorParcela}
                        onChange={(e) => setValorParcela(maskCurrency(unmaskCurrency(e.target.value)))}
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total Calculado</Label>
                      <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/50 flex items-center">
                        <span className={cn(
                          "font-medium",
                          totalParcelamento > 0 ? "text-accent" : "text-muted-foreground"
                        )}>
                          {maskCurrency(totalParcelamento)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Preview das parcelas */}
                  {parseInt(numeroParcelas) > 0 && parseInt(intervaloDias) > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Prévia das datas:</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: Math.min(parseInt(numeroParcelas) || 0, 6) }).map((_, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded bg-accent/10 text-accent">
                            {i + 1}ª - {format(addDays(dataInicioParcelamento, (parseInt(intervaloDias) || 0) * i), 'dd/MM/yy')}
                          </span>
                        ))}
                        {(parseInt(numeroParcelas) || 0) > 6 && (
                          <span className="text-xs px-2 py-1 text-muted-foreground">
                            +{(parseInt(numeroParcelas) || 0) - 6} parcelas...
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Conta</Label>
                  <Select value={idConta} onValueChange={setIdConta}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {getContaDisplayName(conta)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={idFormaPagamento} onValueChange={setIdFormaPagamento}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a forma" />
                    </SelectTrigger>
                    <SelectContent>
                      {formasPagamento.map(forma => (
                        <SelectItem key={forma.id} value={forma.id}>
                          {forma.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Observações para todas as parcelas..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            {paymentType === 'parcelamento' ? (
              <Button 
                onClick={handleAddParcelamento}
                disabled={!numeroParcelas || !intervaloDias || !valorParcela || !idFormaPagamento || !idConta}
                className="bg-accent hover:bg-accent/90"
              >
                Adicionar Parcelas
              </Button>
            ) : (
              <Button 
                onClick={handleAddPayment}
                disabled={!valor || !idFormaPagamento || !idConta}
                className="bg-accent hover:bg-accent/90"
              >
                Adicionar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financiamento Dialog - EXCLUSIVO */}
      <Dialog open={financiamentoDialogOpen} onOpenChange={setFinanciamentoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-accent" />
              {saleData.financiamento ? 'Editar Financiamento' : 'Adicionar Financiamento'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do financiamento do veículo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="glass rounded-lg p-4 border border-accent/30">
              <h4 className="text-sm font-medium text-accent mb-4">Dados do Financiamento</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Financeira</Label>
                  <Select value={idFinanceira} onValueChange={setIdFinanceira}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a financeira" />
                    </SelectTrigger>
                    <SelectContent>
                      {financeiras.map(fin => (
                        <SelectItem key={fin.id} value={fin.id}>{fin.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta Destino *</Label>
                  <Select value={idContaDestino} onValueChange={setIdContaDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map(conta => (
                        <SelectItem key={conta.id} value={conta.id}>{getContaDisplayName(conta)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Valor Financiado *</Label>
                  <Input value={valorFinanciado} onChange={(e) => setValorFinanciado(maskCurrency(unmaskCurrency(e.target.value)))} placeholder="R$ 0,00" />
                </div>
                <div className="space-y-2">
                  <Label>Valor R</Label>
                  <Input value={valorR} onChange={(e) => setValorR(maskDecimal(e.target.value))} placeholder="0,0" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Plus</Label>
                  <Input value={plus} onChange={(e) => setPlus(maskCurrency(unmaskCurrency(e.target.value)))} placeholder="R$ 0,00" />
                </div>
                <div className="space-y-2">
                  <Label>TAC (%)</Label>
                  <Input type="number" value={tac} onChange={(e) => setTac(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Valor TAC</Label>
                  <Input value={valorTac} onChange={(e) => setValorTac(maskCurrency(unmaskCurrency(e.target.value)))} placeholder="R$ 0,00" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Nº Contrato</Label>
                  <Input value={numeroContrato} onChange={(e) => setNumeroContrato(e.target.value)} placeholder="Número" />
                </div>
                <div className="space-y-2">
                  <Label>Nº Prestações</Label>
                  <Input type="number" value={numeroPrestacao} onChange={(e) => setNumeroPrestacao(e.target.value)} placeholder="Ex: 48" />
                </div>
                <div className="space-y-2">
                  <Label>Valor Prestação</Label>
                  <Input value={valorPrestacao} onChange={(e) => setValorPrestacao(maskCurrency(unmaskCurrency(e.target.value)))} placeholder="R$ 0,00" />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>1º Vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="w-4 h-4 mr-2" />
                      {format(dataVencimentoInicial, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={dataVencimentoInicial} onSelect={(date) => date && setDataVencimentoInicial(date)} locale={ptBR} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 mt-4">
                <Label>Observações</Label>
                <Textarea value={dadosFinanciamento} onChange={(e) => setDadosFinanciamento(e.target.value)} placeholder="Dados adicionais do financiamento..." rows={2} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinanciamentoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddFinanciamento}
              disabled={!valorFinanciado || !idContaDestino}
              className="bg-accent hover:bg-accent/90"
            >
              {saleData.financiamento ? 'Atualizar Financiamento' : 'Adicionar Financiamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Produto/Serviço Dialog */}
      <ServicoProdutoDialog
        open={servicoProdutoDialogOpen}
        onOpenChange={setServicoProdutoDialogOpen}
        categorias={categorias}
        onAdd={addServicoProduto}
        onEdit={updateServicoProduto}
        editItem={editingServicoProduto}
      />
    </div>
  );
}