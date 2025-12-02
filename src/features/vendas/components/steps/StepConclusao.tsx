import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  Save, 
  CheckCircle, 
  Loader2, 
  Car, 
  User, 
  Users, 
  ArrowLeftRight, 
  Wallet,
  AlertTriangle,
  Landmark,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Package,
  Plus,
  Lock
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
import type { SaleData } from '../../types';
import { cn } from '@/lib/utils';

interface StepConclusaoProps {
  saleData: SaleData;
  updateSaleData: (updates: Partial<SaleData>) => void;
  saving: boolean;
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
  onSave: () => void;
  onSaveAndClose: () => void;
}

export function StepConclusao({
  saleData,
  updateSaleData,
  saving,
  totals,
  onSave,
  onSaveAndClose,
}: StepConclusaoProps) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  
  const canSave = saleData.id_cliente && saleData.id_vendedor && saleData.veiculo;

  // Calcular diferença a receber (valor veículo + produtos/serviços - trocas)
  const diferencaAReceber = totals.valorVeiculo + totals.totalServicosProdutos - totals.totalTrocas;
  
  // Total recebido = recebimentos + financiamento - pagamentos saída
  const totalRecebido = totals.totalRecebimentos + totals.totalFinanciamento - totals.totalPagamentosSaida;
  
  // Saldo final = diferença a receber - total recebido
  const saldoFinal = diferencaAReceber - totalRecebido;

  // Determinar status do saldo (usando tolerância de 0.01 para arredondamento)
  const saldoStatus = Math.abs(saldoFinal) <= 0.01 ? 'ok' : saldoFinal > 0 ? 'pendente' : 'excesso';

  // Handler para atualizar hora/minuto preservando a data
  const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    const newDate = new Date(saleData.data_venda);
    if (type === 'hours' && numValue >= 0 && numValue <= 23) {
      newDate.setHours(numValue);
      updateSaleData({ data_venda: newDate });
    } else if (type === 'minutes' && numValue >= 0 && numValue <= 59) {
      newDate.setMinutes(numValue);
      updateSaleData({ data_venda: newDate });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sale Summary - Basic Info */}
      <div className="glass rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-accent" />
          Resumo da Venda
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vehicle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Car className="w-4 h-4" />
              <span className="text-sm">Veículo</span>
            </div>
            <p className="font-semibold text-foreground">
              {saleData.veiculo?.fabricante} {saleData.veiculo?.modelo}
            </p>
            <p className="text-sm text-muted-foreground">
              {saleData.veiculo?.ano} {saleData.veiculo?.placa && `• ${saleData.veiculo.placa}`}
            </p>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="text-sm">Cliente</span>
            </div>
            <p className="font-semibold text-foreground">
              {saleData.cliente?.nome || 'Não selecionado'}
            </p>
            {saleData.cliente?.telefone && (
              <p className="text-sm text-muted-foreground">{saleData.cliente.telefone}</p>
            )}
          </div>

          {/* Seller */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm">Vendedor</span>
            </div>
            <p className="font-semibold text-foreground">
              {saleData.vendedor?.nome || 'Não selecionado'}
            </p>
          </div>

          {/* Trade-ins */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="text-sm">Trocas ({saleData.trocas.length})</span>
            </div>
            <p className="font-semibold text-foreground">
              {maskCurrency(totals.totalTrocas)}
            </p>
          </div>

          {/* Products/Services */}
          {saleData.servicosProdutos && saleData.servicosProdutos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Package className="w-4 h-4" />
                <span className="text-sm">Produtos/Serviços ({saleData.servicosProdutos.length})</span>
              </div>
              <p className="font-semibold text-accent">
                {maskCurrency(totals.totalServicosProdutos)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary - Detailed */}
      <div className="glass rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent" />
          Resumo Financeiro
        </h3>

        <div className="space-y-3">
          {/* Valor do Veículo */}
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground">Valor do Veículo</span>
            <span className="font-semibold text-foreground">{maskCurrency(totals.valorVeiculo)}</span>
          </div>

          {/* Total em Trocas */}
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground flex items-center gap-2">
              <Minus className="w-4 h-4 text-orange-500" />
              Total em Trocas
            </span>
            <span className="font-semibold text-orange-500">- {maskCurrency(totals.totalTrocas)}</span>
          </div>

          {/* Total em Produtos/Serviços */}
          {totals.totalServicosProdutos > 0 && (
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" />
                Produtos e Serviços
              </span>
              <span className="font-semibold text-accent">+ {maskCurrency(totals.totalServicosProdutos)}</span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border my-2" />

          {/* Diferença a Receber */}
          <div className="flex justify-between items-center py-2 bg-muted/30 rounded-lg px-3 -mx-3">
            <span className="font-medium text-foreground">= Diferença a Receber</span>
            <span className="font-bold text-foreground">{maskCurrency(diferencaAReceber)}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-border my-2" />

          {/* Formas de Pagamento Header */}
          <p className="text-xs text-muted-foreground uppercase tracking-wider pt-2">Formas de Pagamento</p>

          {/* Recebimentos */}
          <div className="flex justify-between items-center py-2">
            <span className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Recebimentos (entradas)
            </span>
            <span className="font-semibold text-green-500">+ {maskCurrency(totals.totalRecebimentos)}</span>
          </div>

          {/* Financiamento */}
          {totals.totalFinanciamento > 0 && (
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-500" />
                Financiamento
              </span>
              <span className="font-semibold text-blue-500">+ {maskCurrency(totals.totalFinanciamento)}</span>
            </div>
          )}

          {/* Pagamentos (Saída) */}
          {totals.totalPagamentosSaida > 0 && (
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Pagamentos (saídas)
              </span>
              <span className="font-semibold text-red-500">- {maskCurrency(totals.totalPagamentosSaida)}</span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border my-2" />

          {/* Total Recebido */}
          <div className="flex justify-between items-center py-2 bg-muted/30 rounded-lg px-3 -mx-3">
            <span className="font-medium text-foreground">= Total Recebido</span>
            <span className="font-bold text-foreground">{maskCurrency(totalRecebido)}</span>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-border my-3" />

          {/* Saldo Final */}
          <div className={cn(
            "flex justify-between items-center py-3 px-4 -mx-4 rounded-lg",
            saldoStatus === 'ok' && "bg-green-500/10 border border-green-500/30",
            saldoStatus === 'pendente' && "bg-yellow-500/10 border border-yellow-500/30",
            saldoStatus === 'excesso' && "bg-red-500/10 border border-red-500/30"
          )}>
            <div className="flex items-center gap-2">
              {saldoStatus === 'ok' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {saldoStatus === 'pendente' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              {saldoStatus === 'excesso' && <AlertTriangle className="w-5 h-5 text-red-500" />}
              <div>
                <span className="font-semibold text-foreground">SALDO FINAL</span>
                <p className={cn(
                  "text-xs",
                  saldoStatus === 'ok' && "text-green-500",
                  saldoStatus === 'pendente' && "text-yellow-500",
                  saldoStatus === 'excesso' && "text-red-500"
                )}>
                  {saldoStatus === 'ok' && "Venda quitada"}
                  {saldoStatus === 'pendente' && "Falta receber do cliente"}
                  {saldoStatus === 'excesso' && "Valor recebido a mais"}
                </p>
              </div>
            </div>
            <span className={cn(
              "text-xl font-bold",
              saldoStatus === 'ok' && "text-green-500",
              saldoStatus === 'pendente' && "text-yellow-500",
              saldoStatus === 'excesso' && "text-red-500"
            )}>
              {maskCurrency(Math.abs(saldoFinal))}
            </span>
          </div>
        </div>

        {/* Financing Details */}
        {saleData.financiamento && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Detalhes do Financiamento</p>
            <div className="glass rounded-lg p-3 space-y-1">
              {saleData.financiamento.financeira_nome && (
                <p className="text-sm"><span className="text-muted-foreground">Financeira:</span> <span className="font-medium">{saleData.financiamento.financeira_nome}</span></p>
              )}
              <p className="text-sm"><span className="text-muted-foreground">Valor Financiado:</span> <span className="font-medium">{maskCurrency(saleData.financiamento.valor)}</span></p>
              {saleData.financiamento.numero_prestacao && saleData.financiamento.valor_prestacao && (
                <p className="text-sm"><span className="text-muted-foreground">Parcelas:</span> <span className="font-medium">{saleData.financiamento.numero_prestacao}x de {maskCurrency(saleData.financiamento.valor_prestacao)}</span></p>
              )}
            </div>
          </div>
        )}

        {/* Products/Services Details */}
        {saleData.servicosProdutos && saleData.servicosProdutos.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Produtos e Serviços</p>
            <div className="space-y-2">
              {saleData.servicosProdutos.map((item) => (
                <div key={item.id} className="glass rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{item.descricao}</p>
                    {item.categoria_nome && (
                      <p className="text-xs text-muted-foreground">{item.categoria_nome}</p>
                    )}
                  </div>
                  <span className="font-semibold text-accent">{maskCurrency(item.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Date and Observations */}
      <div className="glass rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data e Hora da Venda
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  {format(saleData.data_venda, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={saleData.data_venda}
                  onSelect={(date) => {
                    if (date) {
                      // Preservar hora e minuto atuais ao mudar a data
                      const newDate = new Date(date);
                      newDate.setHours(saleData.data_venda.getHours());
                      newDate.setMinutes(saleData.data_venda.getMinutes());
                      updateSaleData({ data_venda: newDate });
                    }
                  }}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
                {/* Time Picker */}
                <div className="border-t border-border p-3 flex items-center gap-2 justify-center">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={saleData.data_venda.getHours().toString().padStart(2, '0')}
                    onChange={(e) => handleTimeChange('hours', e.target.value)}
                    className="w-14 text-center"
                  />
                  <span className="text-lg font-bold text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={saleData.data_venda.getMinutes().toString().padStart(2, '0')}
                    onChange={(e) => handleTimeChange('minutes', e.target.value)}
                    className="w-14 text-center"
                  />
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Pode ser alterada conforme necessário
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={saleData.observacoes}
              onChange={(e) => updateSaleData({ observacoes: e.target.value })}
              placeholder="Observações gerais sobre a venda..."
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Validation Warning for Non-Zero Balance */}
      {canSave && Math.abs(saldoFinal) > 0.01 && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/50 flex items-start gap-3">
          <Lock className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-500">Saldo pendente detectado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Não é possível fechar a venda enquanto o saldo final for diferente de zero. 
              Ajuste os pagamentos, trocas ou valores para que o saldo fique zerado.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="outline"
          onClick={onSave}
          disabled={!canSave || saving}
          className="flex-1"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar
        </Button>

        <Button
          onClick={() => setConfirmDialogOpen(true)}
          disabled={!canSave || saving || Math.abs(saldoFinal) > 0.01}
          className="flex-1 bg-accent hover:bg-accent/90"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Salvar e Fechar Venda
        </Button>
      </div>

      {!canSave && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/50">
          <p className="text-sm text-destructive">
            Complete os passos anteriores (Cliente, Vendedor e Veículo) para salvar a venda.
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-accent" />
              Confirmar fechamento da venda?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Ao fechar a venda, os lançamentos financeiros serão criados automaticamente e 
                o veículo será marcado como vendido.
              </p>
              <p className="font-medium text-foreground">
                Após fechar, a venda não poderá mais ser editada.
              </p>
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
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Confirmar e Fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
