import { useState } from 'react';
import { Plus, Trash2, CreditCard, Wallet, Calendar } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';
import { toast } from 'sonner';
import type { SaleData, PaymentEntry, FormaPagamento, ContaFinanceira, Financeira, FinanciamentoEntry } from '../../types';

interface StepAcertoProps {
  saleData: SaleData;
  formasPagamento: FormaPagamento[];
  contas: ContaFinanceira[];
  financeiras: Financeira[];
  addPayment: (payment: Omit<PaymentEntry, 'id'>) => void;
  removePayment: (id: string) => void;
  setFinanciamento: (financiamento: Omit<FinanciamentoEntry, 'id'> | null) => void;
  removeFinanciamento: () => void;
  totals: {
    valorVeiculo: number;
    totalTrocas: number;
    valorAReceber: number;
    totalPagamentos: number;
    totalFinanciamento: number;
    saldoPendente: number;
  };
}

export function StepAcerto({
  saleData,
  formasPagamento,
  contas,
  financeiras,
  addPayment,
  removePayment,
  setFinanciamento,
  removeFinanciamento,
  totals,
}: StepAcertoProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'recebimento' | 'parcelamento' | 'financiamento' | 'pagamento'>('recebimento');
  
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
    // Reset financiamento
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

  const handleAddFinanciamento = () => {
    const valorNum = unmaskCurrency(valorFinanciado);
    if (!valorNum || !idContaDestino) {
      toast.error('Preencha valor e conta destino');
      return;
    }

    const financeira = financeiras.find(f => f.id === idFinanceira);
    const conta = contas.find(c => c.id === idContaDestino);

    setFinanciamento({
      id_financeira: idFinanceira || null,
      id_conta_destino: idContaDestino,
      valor: valorNum,
      valor_r: valorR ? unmaskCurrency(valorR) : null,
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
    });

    toast.success('Financiamento adicionado com sucesso');
    resetForm();
    setDialogOpen(false);
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

    addPayment({
      id_forma_pagamento: idFormaPagamento,
      id_conta: idConta,
      valor: unmaskCurrency(valor),
      data_lancamento: format(dataLancamento, 'yyyy-MM-dd'),
      data_pagamento: recebido ? format(dataPagamento, 'yyyy-MM-dd') : null,
      numero: numero || '1',
      observacao: observacao || null,
      forma_descricao: forma?.descricao,
      conta_descricao: conta ? getContaDisplayName(conta) : undefined,
    });

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

    // Gerar cada parcela a partir da data selecionada
    for (let i = 0; i < parcelas; i++) {
      const dataVencimento = addDays(dataInicioParcelamento, intervalo * i);
      
      addPayment({
        id_forma_pagamento: idFormaPagamento,
        id_conta: idConta,
        valor: valorNum,
        data_lancamento: format(dataVencimento, 'yyyy-MM-dd'),
        data_pagamento: null,
        numero: `${i + 1}/${parcelas}`,
        observacao: observacao || null,
        forma_descricao: forma?.descricao,
        conta_descricao: conta ? getContaDisplayName(conta) : undefined,
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
            <span className="text-muted-foreground">Total líquido em troca(s)</span>
            <span className="text-foreground font-medium">
              {maskCurrency(totals.totalTrocas)}
            </span>
          </div>

          <div className={cn(
            "flex items-center justify-between py-3 px-4 rounded-lg",
            totals.valorAReceber >= 0 ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30"
          )}>
            <span className={totals.valorAReceber >= 0 ? "text-green-500" : "text-destructive"}>
              Total a receber do cliente
            </span>
            <span className={cn(
              "font-bold text-lg",
              totals.valorAReceber >= 0 ? "text-green-500" : "text-destructive"
            )}>
              {maskCurrency(Math.abs(totals.valorAReceber))}
            </span>
          </div>
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
            {saleData.pagamentos.map(payment => (
              <div
                key={payment.id}
                className="glass rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {payment.forma_descricao || 'Pagamento'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {payment.conta_descricao} • {format(new Date(payment.data_lancamento), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-accent">
                    {maskCurrency(payment.valor)}
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
            ))}
          </div>
        )}

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
      </div>

      {/* Add Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Pagamento</DialogTitle>
          </DialogHeader>

          {/* Summary in Dialog */}
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-muted-foreground">Venda + Outros</p>
              <p className="font-bold text-green-500">{maskCurrency(totals.valorVeiculo)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Recebimentos</p>
              <p className="font-bold text-green-500">{maskCurrency(totals.totalPagamentos)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total a receber</p>
              <p className="font-bold text-green-500">{maskCurrency(totals.valorAReceber)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Líquido Compra</p>
              <p className="font-bold text-destructive">R$ 0,00</p>
            </div>
            <div>
              <p className="text-muted-foreground">Troca Cliente</p>
              <p className="font-bold text-destructive">{maskCurrency(totals.totalTrocas)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Falta receber</p>
              <p className={cn("font-bold", getSaldoColor())}>
                {maskCurrency(Math.abs(totals.saldoPendente))}
              </p>
            </div>
          </div>

          {/* Payment Type Tabs */}
          <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as typeof paymentType)}>
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="recebimento">Recebimento</TabsTrigger>
              <TabsTrigger value="parcelamento">Parcelamento</TabsTrigger>
              <TabsTrigger value="financiamento">Financiamento</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
            </TabsList>

            {/* Tab Recebimento e Pagamento - mesmo formulário */}
            {(paymentType === 'recebimento' || paymentType === 'pagamento') && (
              <div className="space-y-4 mt-4">
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
                    Recebido
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

            {/* Tab Financiamento */}
            {paymentType === 'financiamento' && (
              <div className="space-y-4 mt-4">
                <div className="glass rounded-lg p-4 border border-accent/30 animate-fade-in">
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
                      <Input value={valorR} onChange={(e) => setValorR(maskCurrency(unmaskCurrency(e.target.value)))} placeholder="R$ 0,00" />
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
            )}

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
            ) : paymentType === 'financiamento' ? (
              <Button 
                onClick={handleAddFinanciamento}
                disabled={!valorFinanciado || !idContaDestino}
                className="bg-accent hover:bg-accent/90"
              >
                Adicionar Financiamento
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
    </div>
  );
}
