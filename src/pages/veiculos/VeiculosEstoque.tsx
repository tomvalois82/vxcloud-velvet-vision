import { useState, useEffect } from 'react';
import { Plus, Search, Car } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VehicleDialog } from '@/features/estoque/components/VehicleDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Vehicle {
  id: number;
  modelo: string;
  fabricante: string;
  ano: string;
  valor: string;
  km: string;
  cor: string;
  foto: string | null;
  placa: string | null;
}

const VeiculosEstoque = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>();

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('estoque')
        .select('id, modelo, fabricante, ano, valor, km, cor, foto, placa')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar veículos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      vehicle.modelo?.toLowerCase().includes(searchLower) ||
      vehicle.fabricante?.toLowerCase().includes(searchLower) ||
      vehicle.ano?.includes(searchLower) ||
      vehicle.placa?.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedVehicleId(undefined);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedVehicleId(undefined);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Estoque"
        description="Controle de estoque de veículos"
        action={
          <Button onClick={handleNew} className="bg-accent hover:bg-accent/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Veículo
          </Button>
        }
      />

      <div className="space-y-6">
        <div className="glass rounded-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por modelo, fabricante, ano ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="glass">
                <CardContent className="p-0">
                  <Skeleton className="w-full h-48 rounded-t-lg" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="glass rounded-lg p-12 text-center">
            <Car className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">
              {searchTerm ? 'Nenhum veículo encontrado' : 'Estoque vazio'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm
                ? 'Tente ajustar os filtros de busca'
                : 'Adicione o primeiro veículo ao estoque'}
            </p>
            {!searchTerm && (
              <Button onClick={handleNew} className="bg-accent hover:bg-accent/90">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Veículo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className="glass hover:border-accent/50 transition-all cursor-pointer group"
                onClick={() => handleEdit(vehicle.id)}
              >
                <CardContent className="p-0">
                  <div className="relative h-48 overflow-hidden rounded-t-lg bg-muted">
                    {vehicle.foto ? (
                      <img
                        src={vehicle.foto}
                        alt={`${vehicle.fabricante} ${vehicle.modelo}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Car className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">
                      {vehicle.fabricante} {vehicle.modelo}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Ano: {vehicle.ano}</span>
                      {vehicle.km && <span>{vehicle.km} km</span>}
                    </div>
                    {vehicle.cor && (
                      <p className="text-sm text-muted-foreground">Cor: {vehicle.cor}</p>
                    )}
                    {vehicle.placa && (
                      <p className="text-sm text-muted-foreground">Placa: {vehicle.placa}</p>
                    )}
                    <p className="text-lg font-bold text-accent">
                      R$ {vehicle.valor || '0,00'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <VehicleDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        vehicleId={selectedVehicleId}
        onSuccess={loadVehicles}
      />
    </div>
  );
};

export default VeiculosEstoque;
