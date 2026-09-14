import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  Loader2,
  Lock,
  Save,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { maskCurrency } from '@/features/estoque/utils/masks';
import { cn } from '@/lib/utils';
import type { PurchaseData } from '../../types';

interface StepConclusaoCompraProps {
  purchaseData: PurchaseData;
  updatePurchaseData: (updates: Partial<PurchaseData>) => void;
  saving: boolean;
  totals: {
    valorCompra: number;
    totalPagamentos: number;
    saldoPendente: number;
  };
  onSave: () => void;
  onSaveAndClose: () => void;
}

export function StepConclusaoCompra({
  purchaseData,
  updatePurchaseData,
  saving,
  totals,
  onSave,
  onSaveAndClose,
}: StepConclusaoCompraProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const canSave = Boolean(
    purchaseData.id_fornecedor && purchaseData.id_comprador && purchaseData.veiculo
  );

  const saldoStatus =
    Math.abs(totals.saldoPendente) <= 0.01
      ? 'ok'
      : totals.saldoPendente > 0
        ? 'pendente'
        : 'excesso';

  const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;

    const novaData = new Date(purchaseData.data_compra);
    if (type === 'hours' && numValue >= 0 && numValue <= 23) {
      novaData.setHours(numValue);
      updatePurchaseData({ data_compra: novaData });
    } else if (type === 'minutes' && numValue >= 0 && numValue <= 59) {
      novaData.setMinutes(numValue);
      updatePurchaseData({ data_compra: novaData });
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo da compra */}
      <div className="glass rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-accent" />
          Resumo da compra
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="w-4 h-4" />
              <span className="text-sm">Veículo</span>
            </div>
            <p className="font-semibold text-foreground">
              {purchaseData.veiculo?.fabricante} {purchaseData.veiculo?.modelo}
            </p>
            <p className="text-sm text-muted-foreground">
              {purchaseData.veiculo?.ano}
              {purchaseData.veiculo?.placa && ` • ${purchaseData.veiculo.placa}`}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="text-sm">Cliente vendedor</span>
            </div>
            <p className="font-semibold text-foreground">
              {purchaseData.fornecedor?.nome || 'Não selecionado'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">Funcionário comprador</span>
            </div>
            <p className="font-semibold text-foreground">
              {purchaseData.comprador?.nome || 'Não selecionado'}
            </p>
          </div>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="glass rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent" />
          Resumo financeiro
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">Valor da compra</span>
            <span className="font-semibold text-foreground">
              {maskCurrency(totals.valorCompra)}
            </span>
          </div>

          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">
              Pagamentos ({purchaseData.pagamentos.length})
            </span>
            <span className="font-semibold text-orange-500">
              - {maskCurrency(totals.totalPagamentos)}
            </span>
          </div>

          <div className="border-t-2 border-border my-3" />

          <div
            className={cn(
              'flex justify-between items-center py-3 px-4 -mx-4 rounded-lg',
              saldoStatus === 'ok' && 'bg-green-500/10 border border-green-500/30',
              saldoStatus === 'pendente' && 'bg-yellow-500/10 border border-yellow-500/30',
              saldoStatus === 'excesso' && 'bg-red-500/10 border border-red-500/30'
            )}
          >
            <div className="flex items-center gap-2">
              {saldoStatus === 'ok' ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle
                  className={cn(
                    'w-5 h-5',
                    saldoStatus === 'pendente' ? 'text-yellow-500' : 'text-red-500'
                  )}
                />
              )}
              <div>
                <span className="font-semibold text-foreground">SALDO FINAL</span>
                <p
                  className={cn(
                    'text-xs',
                    saldoStatus === 'ok' && 'text-green-500',
                    saldoStatus === 'pendente' && 'text-yellow-500',
                    saldoStatus === 'excesso' && 'text-red-500'
                  )}
                >
                  {saldoStatus === 'ok' && 'Compra quitada'}
                  {saldoStatus === 'pendente' && 'Falta pagar ao vendedor'}
                  {saldoStatus === 'excesso' && 'Valor pago a mais'}
                </p>
              </div>
            </div>
            <span
              className={cn(
                'text-xl font-bold',
                saldoStatus === 'ok' && 'text-green-500',
                saldoStatus === 'pendente' && 'text-yellow-500',
                saldoStatus === 'excesso' && 'text-red-500'
              )}
            >
              {maskCurrency(Math.abs(totals.saldoPendente))}
            </span>
          </div>
        </div>
      </div>

      {/* Data e observações */}
      <div className="glass rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data e hora da compra
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  {format(purchaseData.data_compra, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={purchaseData.data_compra}
                  onSelect={date => {
                    if (date) {
                      const novaData = new Date(date);
                      novaData.setHours(purchaseData.data_compra.getHours());
                      novaData.setMinutes(purchaseData.data_compra.getMinutes());
                      updatePurchaseData({ data_compra: novaData });
                    }
                  }}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
                <div className="border-t border-border p-3 flex items-center gap-2 justify-center">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={purchaseData.data_compra.getHours().toString().padStart(2, '0')}
                    onChange={e => handleTimeChange('hours', e.target.value)}
                    className="w-14 text-center"
                  />
                  <span className="text-lg font-bold text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={purchaseData.data_compra.getMinutes().toString().padStart(2, '0')}
                    onChange={e => handleTimeChange('minutes', e.target.value)}
                    className="w-14 text-center"
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={purchaseData.observacoes}
              onChange={e => updatePurchaseData({ observacoes: e.target.value })}
              placeholder="Observações gerais sobre a compra..."
              rows={4}
            />
          </div>
        </div>
      </div>

      {canSave && Math.abs(totals.saldoPendente) > 0.01 && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/50 flex items-start gap-3">
          <Lock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-500">Saldo pendente detectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Não é possível fechar a compra enquanto o saldo final for diferente de zero. Ajuste os
              pagamentos ou o valor da compra.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="outline" onClick={onSave} disabled={!canSave || saving} className="flex-1">
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>

        <Button
          onClick={() => setConfirmDialogOpen(true)}
          disabled={!canSave || saving || Math.abs(totals.saldoPendente) > 0.01}
          className="flex-1 bg-accent hover:bg-accent/90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Salvar e fechar compra
        </Button>
      </div>

      {!canSave && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50">
          <p className="text-sm text-destructive">
            Complete os passos anteriores (pessoas e veículo) para salvar a compra.
          </p>
        </div>
      )}

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-accent" />
              Confirmar fechamento da compra?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ao fechar a compra, os lançamentos financeiros de despesa serão criados
              automaticamente. Após fechar, a compra não poderá mais ser editada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDialogOpen(false);
                onSaveAndClose();
              }}
              disabled={saving}
              className="bg-accent hover:bg-accent/90"
            >
              Confirmar e fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
