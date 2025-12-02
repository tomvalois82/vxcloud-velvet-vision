import { Car } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useVehicleMainPhoto } from '@/features/estoque/hooks/useVehicleMainPhoto';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';
import type { SaleData } from '../../types';

interface StepVeiculoProps {
  saleData: SaleData;
  updateSaleData: (updates: Partial<SaleData>) => void;
}

export function StepVeiculo({ saleData, updateSaleData }: StepVeiculoProps) {
  const { veiculo, valor_venda, km_venda, observacoes_veiculo } = saleData;
  const { mainPhoto, loading } = useVehicleMainPhoto(veiculo?.id || null, veiculo?.foto || null);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = unmaskCurrency(e.target.value);
    updateSaleData({ valor_venda: value });
  };

  if (!veiculo) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Car className="w-16 h-16 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhum veículo selecionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Vehicle Image */}
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="w-20 h-20 text-muted-foreground animate-pulse" />
              </div>
            ) : mainPhoto ? (
              <img
                src={mainPhoto}
                alt={`${veiculo.fabricante} ${veiculo.modelo}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Vehicle Info */}
          <div className="glass rounded-lg p-4 space-y-3">
            <h3 className="text-xl font-bold text-foreground">
              {veiculo.fabricante} {veiculo.modelo}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {veiculo.ano && (
                <div>
                  <span className="text-muted-foreground">Ano:</span>
                  <span className="ml-2 text-foreground">{veiculo.ano}</span>
                </div>
              )}
              {veiculo.cor && (
                <div>
                  <span className="text-muted-foreground">Cor:</span>
                  <span className="ml-2 text-foreground">{veiculo.cor}</span>
                </div>
              )}
              {veiculo.placa && (
                <div>
                  <span className="text-muted-foreground">Placa:</span>
                  <span className="ml-2 text-foreground">{veiculo.placa}</span>
                </div>
              )}
              {veiculo.km && (
                <div>
                  <span className="text-muted-foreground">KM Original:</span>
                  <span className="ml-2 text-foreground">{veiculo.km}</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-border">
              <span className="text-muted-foreground">Valor Tabela:</span>
              <span className="ml-2 text-lg font-bold text-accent">
                {veiculo.valor ? maskCurrency(Number(veiculo.valor)) : 'R$ 0,00'}
              </span>
            </div>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="valor_venda" className="text-base font-semibold">
              Valor de Venda
            </Label>
            <Input
              id="valor_venda"
              value={maskCurrency(valor_venda)}
              onChange={handleValorChange}
              className="text-lg font-bold h-12"
              placeholder="R$ 0,00"
            />
            <p className="text-xs text-muted-foreground">
              Valor final negociado para esta venda
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="km_venda" className="text-base font-semibold">
              KM na Venda
            </Label>
            <Input
              id="km_venda"
              value={km_venda}
              onChange={(e) => updateSaleData({ km_venda: e.target.value.replace(/\D/g, '') })}
              placeholder="Ex: 45000"
            />
            <p className="text-xs text-muted-foreground">
              Quilometragem no momento da venda
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes_veiculo" className="text-base font-semibold">
              Observações do Veículo
            </Label>
            <Textarea
              id="observacoes_veiculo"
              value={observacoes_veiculo}
              onChange={(e) => updateSaleData({ observacoes_veiculo: e.target.value })}
              placeholder="Detalhes adicionais sobre o estado do veículo..."
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
