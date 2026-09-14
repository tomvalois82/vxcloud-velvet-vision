import { useState } from 'react';
import { Car, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { VehicleDialog } from '@/features/estoque/components/VehicleDialog';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';
import type { PurchaseData, PurchaseVehicle } from '../../types';

interface StepVeiculoCompraProps {
  purchaseData: PurchaseData;
  veiculosEstoque: PurchaseVehicle[];
  setVeiculo: (veiculo: PurchaseVehicle | null) => void;
  updatePurchaseData: (updates: Partial<PurchaseData>) => void;
  refreshVeiculosEstoque: () => Promise<PurchaseVehicle[]>;
}

export function StepVeiculoCompra({
  purchaseData,
  veiculosEstoque,
  setVeiculo,
  updatePurchaseData,
  refreshVeiculosEstoque,
}: StepVeiculoCompraProps) {
  const [busca, setBusca] = useState('');
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);

  const veiculosFiltrados = veiculosEstoque.filter(v => {
    const termo = busca.toLowerCase();
    return (
      (v.modelo || '').toLowerCase().includes(termo) ||
      (v.fabricante || '').toLowerCase().includes(termo) ||
      (v.placa || '').toLowerCase().includes(termo) ||
      (v.ano || '').includes(termo)
    );
  });

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePurchaseData({ valor_compra: unmaskCurrency(e.target.value) });
  };

  const idsAtuais = veiculosEstoque.map(v => v.id);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Seleção do veículo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-accent" />
              <Label className="text-lg font-semibold">Veículo comprado</Label>
            </div>
            <Button size="sm" variant="outline" onClick={() => setVehicleDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Cadastrar novo veículo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por modelo, fabricante ou placa..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[340px] pr-4">
            <div className="space-y-2">
              {veiculosFiltrados.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum veículo encontrado</p>
              ) : (
                veiculosFiltrados.map(veiculo => (
                  <button
                    key={veiculo.id}
                    onClick={() => setVeiculo(veiculo)}
                    className={cn(
                      'w-full p-4 rounded-lg text-left transition-all border',
                      purchaseData.veiculo?.id === veiculo.id
                        ? 'bg-accent/20 border-accent'
                        : 'bg-muted/50 border-transparent hover:border-accent/50'
                    )}
                  >
                    <p className="font-medium text-foreground">
                      {veiculo.fabricante} {veiculo.modelo}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {veiculo.ano} {veiculo.placa && `• ${veiculo.placa}`}
                    </p>
                    <p className="text-sm text-accent">
                      {veiculo.valor ? maskCurrency(Number(veiculo.valor)) : 'R$ 0,00'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Dados da compra */}
        <div className="space-y-6">
          {purchaseData.veiculo ? (
            <div className="glass rounded-lg p-4 space-y-3">
              <h3 className="text-xl font-bold text-foreground">
                {purchaseData.veiculo.fabricante} {purchaseData.veiculo.modelo}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {purchaseData.veiculo.ano && (
                  <div>
                    <span className="text-muted-foreground">Ano:</span>
                    <span className="ml-2 text-foreground">{purchaseData.veiculo.ano}</span>
                  </div>
                )}
                {purchaseData.veiculo.cor && (
                  <div>
                    <span className="text-muted-foreground">Cor:</span>
                    <span className="ml-2 text-foreground">{purchaseData.veiculo.cor}</span>
                  </div>
                )}
                {purchaseData.veiculo.placa && (
                  <div>
                    <span className="text-muted-foreground">Placa:</span>
                    <span className="ml-2 text-foreground">{purchaseData.veiculo.placa}</span>
                  </div>
                )}
                {purchaseData.veiculo.km && (
                  <div>
                    <span className="text-muted-foreground">KM:</span>
                    <span className="ml-2 text-foreground">{purchaseData.veiculo.km}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Car className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Selecione um veículo ou cadastre um novo para continuar
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="valor_compra" className="text-base font-semibold">
              Valor da compra
            </Label>
            <Input
              id="valor_compra"
              value={maskCurrency(purchaseData.valor_compra)}
              onChange={handleValorChange}
              className="text-lg font-bold h-12"
              placeholder="R$ 0,00"
            />
            <p className="text-xs text-muted-foreground">Valor final negociado nesta compra</p>
          </div>
        </div>
      </div>

      <VehicleDialog
        open={vehicleDialogOpen}
        onOpenChange={setVehicleDialogOpen}
        vehicleId={undefined}
        onSuccess={async () => {
          const atualizados = await refreshVeiculosEstoque();
          const novo = atualizados.find(v => !idsAtuais.includes(v.id));
          if (novo) {
            setVeiculo(novo);
          }
        }}
      />
    </div>
  );
}
