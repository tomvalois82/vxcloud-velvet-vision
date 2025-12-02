import { useState } from 'react';
import { Plus, Trash2, CreditCard, Wallet, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { SaleData, PaymentEntry, FormaPagamento, ContaFinanceira } from '../../types';

interface StepAcertoProps {
  saleData: SaleData;
  formasPagamento: FormaPagamento[];
  contas: ContaFinanceira[];
  addPayment: (payment: Omit<PaymentEntry, 'id'>) => void;
  removePayment: (id: string) => void;
  totals: {
    valorVeiculo: number;
    totalTrocas: number;
    valorAReceber: number;
    totalPagamentos: number;
    saldoPendente: number;
  };
}

export function StepAcerto({
  saleData,
  formasPagamento,
  contas,
  addPayment,
  removePayment,
  totals,
}: StepAcertoProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'recebimento' | 'parcelamento' | 'pagamento'>('recebimento');
  const [valor, setValor] = useState('');
  const [idFormaPagamento, setIdFormaPagamento] = useState('');
  const [idConta, setIdConta] = useState('');
  const [numero, setNumero] = useState('');
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [observacao, setObservacao] = useState('');

  const resetForm = () => {
    setValor('');
    setIdFormaPagamento('');
    setIdConta('');
    setNumero('');
    setDataLancamento(new Date());
    setObservacao('');
  };

  const getContaDisplayName = (conta: ContaFinanceira) => {
    if (conta.descricao) {
      return `${conta.banco} - ${conta.descricao}`;
    }
    return conta.banco;
  };

  const handleAddPayment = () => {
    if (!valor || !idFormaPagamento || !idConta) return;

    const forma = formasPagamento.find(f => f.id === idFormaPagamento);
    const conta = contas.find(c => c.id === idConta);

    addPayment({
      id_forma_pagamento: idFormaPagamento,
      id_conta: idConta,
      valor: unmaskCurrency(valor),
      data_lancamento: format(dataLancamento, 'yyyy-MM-dd'),
      data_pagamento: null,
      numero: numero || '1',
      observacao: observacao || null,
      forma_descricao: forma?.descricao,
      conta_descricao: conta ? getContaDisplayName(conta) : undefined,
    });

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
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="recebimento">Recebimento</TabsTrigger>
              <TabsTrigger value="parcelamento">Parcelamento</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
            </TabsList>

            <TabsContent value={paymentType} className="space-y-4 mt-4">
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

              <div className="space-y-2">
                <Label>Descrição da forma</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observações..."
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddPayment}
              disabled={!valor || !idFormaPagamento || !idConta}
              className="bg-accent hover:bg-accent/90"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
