import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Save, CheckCircle, Loader2, Car, User, Users, ArrowLeftRight, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { maskCurrency } from '@/features/estoque/utils/masks';
import type { SaleData } from '../../types';

interface StepConclusaoProps {
  saleData: SaleData;
  updateSaleData: (updates: Partial<SaleData>) => void;
  saving: boolean;
  totals: {
    valorVeiculo: number;
    totalTrocas: number;
    valorAReceber: number;
    totalPagamentos: number;
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
  const canSave = saleData.id_cliente && saleData.id_vendedor && saleData.veiculo;

  return (
    <div className="space-y-6">
      {/* Sale Summary */}
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
            <p className="text-accent font-bold">
              {maskCurrency(totals.valorVeiculo)}
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

          {/* Financial */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="w-4 h-4" />
              <span className="text-sm">Acerto Financeiro</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-muted-foreground">A Receber</p>
                <p className="font-bold text-green-500">{maskCurrency(totals.valorAReceber)}</p>
              </div>
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="font-bold text-accent">{maskCurrency(totals.totalPagamentos)}</p>
              </div>
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className={`font-bold ${totals.saldoPendente === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {maskCurrency(totals.saldoPendente)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date and Time */}
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
                  onSelect={(date) => date && updateSaleData({ data_venda: date })}
                  locale={ptBR}
                  className="pointer-events-auto"
                />
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
          onClick={onSaveAndClose}
          disabled={!canSave || saving}
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
    </div>
  );
}
