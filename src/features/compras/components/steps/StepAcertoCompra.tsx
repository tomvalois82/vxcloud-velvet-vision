import { useState } from 'react';
import { Plus, Trash2, Wallet, CreditCard, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';
import type {
  PurchaseData,
  PurchasePaymentEntry,
  FormaPagamentoCompra,
  ContaCompra,
} from '../../types';

interface StepAcertoCompraProps {
  purchaseData: PurchaseData;
  formasPagamento: FormaPagamentoCompra[];
  contas: ContaCompra[];
  addPayment: (payment: Omit<PurchasePaymentEntry, 'id'>) => void;
  removePayment: (id: string) => void;
  totals: {
    valorCompra: number;
    totalPagamentos: number;
    saldoPendente: number;
  };
}

function formatLocalDate(date: Date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function parseDateOnlyAsLocal(dateString: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(`${dateString}T00:00:00`);
  }
  return new Date(dateString);
}

export function StepAcertoCompra({
  purchaseData,
  formasPagamento,
  contas,
  addPayment,
  removePayment,
  totals,
}: StepAcertoCompraProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipoAcerto, setTipoAcerto] = useState<'pagamento' | 'parcelamento'>('pagamento');

  const [valor, setValor] = useState('');
  const [idFormaPagamento, setIdFormaPagamento] = useState('');
  const [idConta, setIdConta] = useState('');
  const [numero, setNumero] = useState('');
  const [dataLancamento, setDataLancamento] = useState<Date>(new Date());
  const [pago, setPago] = useState(false);
  const [dataPagamento, setDataPagamento] = useState<Date>(new Date());
  const [observacao, setObservacao] = useState('');

  const [numeroParcelas, setNumeroParcelas] = useState('');
  const [intervaloDias, setIntervaloDias] = useState('30');
  const [valorParcela, setValorParcela] = useState('');
  const [dataInicioParcelamento, setDataInicioParcelamento] = useState<Date>(new Date());

  const getContaDisplayName = (conta: ContaCompra) =>
    conta.descricao ? `${conta.banco} - ${conta.descricao}` : conta.banco;

  const resetForm = () => {
    setValor('');
    setIdFormaPagamento('');
    setIdConta('');
    setNumero('');
    setDataLancamento(new Date());
    setPago(false);
    setDataPagamento(new Date());
    setObservacao('');
    setNumeroParcelas('');
    setIntervaloDias('30');
    setValorParcela('');
    setDataInicioParcelamento(new Date());
  };

  const handleAddPagamento = () => {
    const valorNum = unmaskCurrency(valor);
    if (!valorNum || !idFormaPagamento || !idConta) {
      toast.error('Preencha valor, forma de pagamento e conta');
      return;
    }

    const forma = formasPagamento.find(f => f.id === idFormaPagamento);
    const conta = contas.find(c => c.id === idConta);

    addPayment({
      id_forma_pagamento: idFormaPagamento,
      id_conta: idConta,
      valor: Math.abs(valorNum),
      data_lancamento: formatLocalDate(dataLancamento),
      data_pagamento: pago ? formatLocalDate(dataPagamento) : null,
      numero: numero || '1',
      observacao: observacao || null,
      forma_descricao: forma?.descricao,
      conta_descricao: conta ? getContaDisplayName(conta) : undefined,
    });

    toast.success('Pagamento adicionado com sucesso');
    resetForm();
    setDialogOpen(false);
  };

  const handleAddParcelamento = () => {
    const parcelas = parseInt(numeroParcelas, 10);
    const intervalo = parseInt(intervaloDias, 10);
    const valorNum = unmaskCurrency(valorParcela);

    if (!parcelas || parcelas < 1 || !intervalo || !valorNum || !idFormaPagamento || !idConta) {
      toast.error('Preencha todos os campos do parcelamento');
      return;
    }

    const forma = formasPagamento.find(f => f.id === idFormaPagamento);
    const conta = contas.find(c => c.id === idConta);

    for (let i = 0; i < parcelas; i++) {
      const vencimento = addDays(dataInicioParcelamento, intervalo * i);
      addPayment({
        id_forma_pagamento: idFormaPagamento,
        id_conta: idConta,
        valor: valorNum,
        data_lancamento: formatLocalDate(vencimento),
        data_pagamento: null,
        numero: `${i + 1}/${parcelas}`,
        observacao: observacao || null,
        forma_descricao: forma?.descricao,
        conta_descricao: conta ? getContaDisplayName(conta) : undefined,
      });
    }

    toast.success(`Parcelamento adicionado (${parcelas}x de ${maskCurrency(valorNum)})`);
    resetForm();
    setDialogOpen(false);
  };

  const totalParcelamento = (parseInt(numeroParcelas, 10) || 0) * unmaskCurrency(valorParcela);

  const saldoColor =
    Math.abs(totals.saldoPendente) <= 0.01
      ? 'text-green-500'
      : totals.saldoPendente > 0
        ? 'text-yellow-500'
        : 'text-destructive';

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="glass rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent" />
          Acerto financeiro
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Como será realizado o pagamento ao vendedor do veículo
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Valor da compra</span>
            <span className="text-foreground font-medium">{maskCurrency(totals.valorCompra)}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">(-) Total em pagamentos</span>
            <span className="text-foreground font-medium">
              - {maskCurrency(totals.totalPagamentos)}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-muted/30">
            <span className="font-medium text-foreground">Saldo pendente</span>
            <span className={cn('font-bold text-lg', saldoColor)}>
              {maskCurrency(Math.abs(totals.saldoPendente))}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de pagamentos */}
      <div className="glass rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">
            Pagamentos ({purchaseData.pagamentos.length})
          </h4>
          <Button
            size="sm"
            className="bg-accent hover:bg-accent/90"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {purchaseData.pagamentos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum pagamento adicionado</p>
        ) : (
          <div className="space-y-2">
            {purchaseData.pagamentos.map(pagamento => (
              <div
                key={pagamento.id}
                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {pagamento.forma_descricao || 'Forma não informada'} • {pagamento.numero}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseDateOnlyAsLocal(pagamento.data_lancamento), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                      {pagamento.conta_descricao && ` • ${pagamento.conta_descricao}`}
                      {pagamento.data_pagamento ? ' • Pago' : ' • Pendente'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">
                    {maskCurrency(pagamento.valor)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePayment(pagamento.id)}
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

      {/* Dialog de acerto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar acerto</DialogTitle>
            <DialogDescription>
              Informe como o valor da compra será pago ao vendedor.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={tipoAcerto}
            onValueChange={value => setTipoAcerto(value as 'pagamento' | 'parcelamento')}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
              <TabsTrigger value="parcelamento">Parcelamento</TabsTrigger>
            </TabsList>

            <TabsContent value="pagamento" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  value={valor}
                  onChange={e => setValor(maskCurrency(unmaskCurrency(e.target.value)))}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select value={idFormaPagamento} onValueChange={setIdFormaPagamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Conta</Label>
                <Select value={idConta} onValueChange={setIdConta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input
                    value={numero}
                    onChange={e => setNumero(e.target.value)}
                    placeholder="Ex: 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vencimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(dataLancamento, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dataLancamento}
                        onSelect={date => date && setDataLancamento(date)}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="pago"
                  checked={pago}
                  onCheckedChange={checked => {
                    const marcado = checked === true;
                    setPago(marcado);
                    if (marcado) setDataPagamento(dataLancamento);
                  }}
                />
                <Label htmlFor="pago">Já foi pago</Label>
              </div>

              {pago && (
                <div className="space-y-2">
                  <Label>Data do pagamento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {format(dataPagamento, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dataPagamento}
                        onSelect={date => date && setDataPagamento(date)}
                        locale={ptBR}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="parcelamento" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de parcelas</Label>
                  <Input
                    value={numeroParcelas}
                    onChange={e => setNumeroParcelas(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Intervalo (dias)</Label>
                  <Input
                    value={intervaloDias}
                    onChange={e => setIntervaloDias(e.target.value.replace(/\D/g, ''))}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor da parcela</Label>
                <Input
                  value={valorParcela}
                  onChange={e => setValorParcela(maskCurrency(unmaskCurrency(e.target.value)))}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Primeiro vencimento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(dataInicioParcelamento, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataInicioParcelamento}
                      onSelect={date => date && setDataInicioParcelamento(date)}
                      locale={ptBR}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select value={idFormaPagamento} onValueChange={setIdFormaPagamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Conta</Label>
                <Select value={idConta} onValueChange={setIdConta}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <Label>Observação</Label>
                <Textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  rows={2}
                />
              </div>

              {totalParcelamento > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total do parcelamento: {maskCurrency(totalParcelamento)}
                </p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-accent hover:bg-accent/90"
              onClick={tipoAcerto === 'pagamento' ? handleAddPagamento : handleAddParcelamento}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
