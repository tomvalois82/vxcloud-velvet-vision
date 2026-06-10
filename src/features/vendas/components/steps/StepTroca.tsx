import { useState } from 'react';
import { Plus, Search, Car, Trash2, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useVehicleMainPhoto } from '@/features/estoque/hooks/useVehicleMainPhoto';
import { maskCurrency, unmaskCurrency } from '@/features/estoque/utils/masks';
import { VehicleDialog } from '@/features/estoque/components/VehicleDialog';
import type { SaleData, SaleVehicle, TradeInVehicle } from '../../types';

interface StepTrocaProps {
  saleData: SaleData;
  veiculosEstoque: SaleVehicle[];
  addTradeIn: (vehicle: SaleVehicle, valor: number) => void;
  removeTradeIn: (id: string) => void;
  updateTradeInValue: (id: string, valor: number) => void;
  refreshVeiculosEstoque?: () => Promise<SaleVehicle[]>;
}

function VehicleMiniCard({ vehicle }: { vehicle: SaleVehicle }) {
  const { mainPhoto } = useVehicleMainPhoto(vehicle.id, vehicle.foto);

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-12 rounded bg-muted overflow-hidden flex-shrink-0">
        {mainPhoto ? (
          <img src={mainPhoto} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-foreground truncate">
          {vehicle.fabricante} {vehicle.modelo}
        </p>
        <p className="text-xs text-muted-foreground">
          {vehicle.ano} {vehicle.placa && `• ${vehicle.placa}`}
        </p>
      </div>
    </div>
  );
}

function TradeInCard({
  tradeIn,
  onRemove,
  onUpdateValue,
}: {
  tradeIn: TradeInVehicle;
  onRemove: () => void;
  onUpdateValue: (valor: number) => void;
}) {
  const { mainPhoto } = useVehicleMainPhoto(tradeIn.vehicle.id, tradeIn.vehicle.foto);

  return (
    <Card className="glass">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-24 h-20 rounded bg-muted overflow-hidden flex-shrink-0">
            {mainPhoto ? (
              <img src={mainPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">
                  {tradeIn.vehicle.fabricante} {tradeIn.vehicle.modelo}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tradeIn.vehicle.ano} {tradeIn.vehicle.placa && `• ${tradeIn.vehicle.placa}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRemove}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Valor da Troca:</Label>
              <Input
                value={maskCurrency(tradeIn.valor_troca)}
                onChange={(e) => onUpdateValue(unmaskCurrency(e.target.value))}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepTroca({
  saleData,
  veiculosEstoque,
  addTradeIn,
  removeTradeIn,
  updateTradeInValue,
  refreshVeiculosEstoque,
}: StepTrocaProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<SaleVehicle | null>(null);
  const [tradeValue, setTradeValue] = useState('');
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [prevVehicleIds, setPrevVehicleIds] = useState<number[]>([]);

  const usedVehicleIds = saleData.trocas.map(t => t.vehicle.id);
  const availableVehicles = veiculosEstoque.filter(v => !usedVehicleIds.includes(v.id));

  const filteredVehicles = availableVehicles.filter(v =>
    v.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.fabricante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.placa?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectVehicle = (vehicle: SaleVehicle) => {
    setSelectedVehicle(vehicle);
    setTradeValue(vehicle.valor ? maskCurrency(Number(vehicle.valor)) : '');
  };

  const handleAddTradeIn = () => {
    if (selectedVehicle) {
      const valor = unmaskCurrency(tradeValue);
      addTradeIn(selectedVehicle, valor);
      setSelectedVehicle(null);
      setTradeValue('');
      setDialogOpen(false);
    }
  };

  const totalTrocas = saleData.trocas.reduce((sum, t) => sum + t.valor_troca, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-accent" />
          <h3 className="text-lg font-semibold">Veículos de Troca</h3>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-accent hover:bg-accent/90">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Troca
        </Button>
      </div>

      {saleData.trocas.length === 0 ? (
        <div className="glass rounded-lg p-12 text-center">
          <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h4 className="text-lg font-semibold mb-2">Nenhum veículo na troca</h4>
          <p className="text-muted-foreground mb-4">
            A venda pode ter nenhum, um ou vários veículos como parte do pagamento.
          </p>
          <Button onClick={() => setDialogOpen(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Veículo de Troca
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {saleData.trocas.map(tradeIn => (
            <TradeInCard
              key={tradeIn.id}
              tradeIn={tradeIn}
              onRemove={() => removeTradeIn(tradeIn.id)}
              onUpdateValue={(valor) => updateTradeInValue(tradeIn.id, valor)}
            />
          ))}

          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total em Trocas:</span>
              <span className="text-xl font-bold text-accent">
                {maskCurrency(totalTrocas)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Add Trade-In Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Adicionar Veículo de Troca</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedVehicle ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar veículo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {filteredVehicles.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum veículo disponível
                      </p>
                    ) : (
                      filteredVehicles.map(vehicle => (
                        <button
                          key={vehicle.id}
                          onClick={() => handleSelectVehicle(vehicle)}
                          className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                        >
                          <VehicleMiniCard vehicle={vehicle} />
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-4">
                <div className="glass rounded-lg p-4">
                  <VehicleMiniCard vehicle={selectedVehicle} />
                </div>

                <div className="space-y-2">
                  <Label>Valor da Troca</Label>
                  <Input
                    value={tradeValue}
                    onChange={(e) => setTradeValue(maskCurrency(unmaskCurrency(e.target.value)))}
                    placeholder="R$ 0,00"
                    className="text-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor original: {selectedVehicle.valor ? maskCurrency(Number(selectedVehicle.valor)) : 'R$ 0,00'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedVehicle(null)} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleAddTradeIn} className="flex-1 bg-accent hover:bg-accent/90">
                    Adicionar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
