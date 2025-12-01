import { useState, useEffect } from 'react';
import { Plus, Search, Car, Trash2 } from 'lucide-react';
import { useVehicleMainPhoto } from '@/features/estoque/hooks/useVehicleMainPhoto';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VehicleDialog } from '@/features/estoque/components/VehicleDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
import { StorageManager } from '@/features/estoque/utils/storageManager';
import { maskCurrency } from '@/features/estoque/utils/masks';

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

function VehicleCard({
  vehicle,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  onEdit: (id: number) => void;
  onDelete: (e: React.MouseEvent, vehicle: Vehicle) => void;
}) {
  const { mainPhoto, loading } = useVehicleMainPhoto(vehicle.id, vehicle.foto);

  return (
    <Card
      className="glass hover:border-accent/50 transition-all cursor-pointer group"
      onClick={() => onEdit(vehicle.id)}
    >
      <CardContent className="p-0">
        <div className="relative h-48 overflow-hidden rounded-t-lg bg-muted">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="w-16 h-16 text-muted-foreground animate-pulse" />
            </div>
          ) : mainPhoto ? (
            <img
              src={mainPhoto}
              alt={`${vehicle.fabricante} ${vehicle.modelo}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Car className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => onDelete(e, vehicle)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
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
            {vehicle.valor ? maskCurrency(Number(vehicle.valor)) : 'R$ 0,00'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

const VeiculosEstoque = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteClick = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation();
    setVehicleToDelete(vehicle);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;

    setDeleting(true);
    try {
      // 1. Excluir todas as fotos do Storage
      const storageManager = new StorageManager(vehicleToDelete.id);
      await storageManager.deleteAllPhotos();

      // 2. Excluir o registro do banco
      const { error } = await supabase
        .from('estoque')
        .delete()
        .eq('id', vehicleToDelete.id);

      if (error) throw error;

      // 3. Atualizar a UI
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleToDelete.id));

      toast({
        title: 'Veículo excluído',
        description: 'O veículo foi removido com sucesso',
      });
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir veículo',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setVehicleToDelete(null);
    }
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
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Veículo</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o veículo{' '}
              <strong>
                {vehicleToDelete?.fabricante} {vehicleToDelete?.modelo}
              </strong>
              ? Esta ação não pode ser desfeita e todas as fotos serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VeiculosEstoque;
