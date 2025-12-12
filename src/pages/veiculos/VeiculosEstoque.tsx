import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Car, Trash2, Handshake, Eye, EyeOff, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useVehicleMainPhoto } from '@/features/estoque/hooks/useVehicleMainPhoto';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { VehicleDialog } from '@/features/estoque/components/VehicleDialog';
import { VehicleDetailDialog } from '@/features/estoque/components/VehicleDetailDialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StorageManager } from '@/features/estoque/utils/storageManager';
import { maskCurrency } from '@/features/estoque/utils/masks';
import { VehicleListPrint } from '@/features/estoque/components/VehicleListPrint';

interface Vehicle {
  id: number;
  modelo: string;
  fabricante: string;
  ano: string;
  ano_fabricacao?: string;
  valor: string;
  valor_aquisicao: number;
  km: string;
  cor: string;
  foto: string | null;
  placa: string | null;
  status: string | null;
  tipo_aquisicao: string;
  motor?: string;
  cambio?: string;
}

interface VehicleCosts {
  [vehicleId: number]: number;
}

function VehicleCard({
  vehicle,
  onView,
  onDelete,
  onSell,
}: {
  vehicle: Vehicle;
  onView: (id: number) => void;
  onDelete: (e: React.MouseEvent, vehicle: Vehicle) => void;
  onSell: (e: React.MouseEvent, vehicleId: number) => void;
}) {
  const { mainPhoto, loading } = useVehicleMainPhoto(vehicle.id, vehicle.foto);

  return (
    <Card
      className="glass hover:border-accent/50 transition-all cursor-pointer group"
      onClick={() => onView(vehicle.id)}
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
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-accent">
              {vehicle.valor ? maskCurrency(Number(vehicle.valor)) : 'R$ 0,00'}
            </p>
            <Button
              size="sm"
              onClick={(e) => onSell(e, vehicle.id)}
              className="bg-accent hover:bg-accent/90"
            >
              <Handshake className="w-4 h-4 mr-1" />
              Vender
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const VeiculosEstoque = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleCosts, setVehicleCosts] = useState<VehicleCosts>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Em estoque');
  const [tipoAquisicaoFilter, setTipoAquisicaoFilter] = useState<string[]>([]);
  const [showValues, setShowValues] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Listagem de Veículos',
  });
  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('estoque')
        .select('id, modelo, fabricante, ano, ano_fabricacao, valor, valor_aquisicao, km, cor, foto, placa, status, tipo_aquisicao, motor, cambio')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const vehicleData = data || [];
      setVehicles(vehicleData);

      // Carregar custos dos veículos
      if (vehicleData.length > 0) {
        const vehicleIds = vehicleData.map(v => v.id);
        const { data: movimentos, error: movError } = await supabase
          .from('vx_fin_movimento')
          .select('id_estoque, valor_liquido')
          .in('id_estoque', vehicleIds)
          .eq('tipo_movimento', 'Pagar');

        if (!movError && movimentos) {
          const costs: VehicleCosts = {};
          movimentos.forEach(m => {
            if (m.id_estoque) {
              costs[m.id_estoque] = (costs[m.id_estoque] || 0) + Number(m.valor_liquido || 0);
            }
          });
          setVehicleCosts(costs);
        }
      }
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

  // Contagem por tipo de aquisição (antes do filtro de tipo)
  const tipoAquisicaoCounts = useMemo(() => {
    const baseFiltered = vehicles.filter((vehicle) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        vehicle.modelo?.toLowerCase().includes(searchLower) ||
        vehicle.placa?.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === 'todos' || 
        (vehicle.status || 'Em estoque') === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return {
      'Próprio': baseFiltered.filter(v => v.tipo_aquisicao === 'Próprio').length,
      'Consignado': baseFiltered.filter(v => v.tipo_aquisicao === 'Consignado' || v.tipo_aquisicao === 'Agenciado').length,
      'Parceria': baseFiltered.filter(v => v.tipo_aquisicao === 'Parceria').length,
    };
  }, [vehicles, searchTerm, statusFilter]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        vehicle.modelo?.toLowerCase().includes(searchLower) ||
        vehicle.placa?.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === 'todos' || 
        (vehicle.status || 'Em estoque') === statusFilter;
      
      const matchesTipoAquisicao = tipoAquisicaoFilter.length === 0 || 
        tipoAquisicaoFilter.some(tipo => {
          if (tipo === 'Consignado') {
            return vehicle.tipo_aquisicao === 'Consignado' || vehicle.tipo_aquisicao === 'Agenciado';
          }
          return vehicle.tipo_aquisicao === tipo;
        });
      
      return matchesSearch && matchesStatus && matchesTipoAquisicao;
    });
  }, [vehicles, searchTerm, statusFilter, tipoAquisicaoFilter]);

  // Cálculos dos cards
  const statsCards = useMemo(() => {
    const quantidade = filteredVehicles.length;
    const totalEstoque = filteredVehicles.reduce((acc, v) => acc + Number(v.valor || 0), 0);
    const custoEstoque = filteredVehicles.reduce((acc, v) => {
      const valorCompra = Number(v.valor_aquisicao || 0);
      const custos = vehicleCosts[v.id] || 0;
      return acc + valorCompra + custos;
    }, 0);
    // Margem = Valor de Venda - (Valor de Compra + Custos)
    const margem = totalEstoque - custoEstoque;

    return { quantidade, totalEstoque, custoEstoque, margem };
  }, [filteredVehicles, vehicleCosts]);

  const handleTipoAquisicaoToggle = (tipo: string) => {
    setTipoAquisicaoFilter(prev => 
      prev.includes(tipo) 
        ? prev.filter(t => t !== tipo)
        : [...prev, tipo]
    );
  };

  const handleView = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
    setDetailDialogOpen(true);
  };

  const handleEdit = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
    setDetailDialogOpen(false);
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

  const handleSellClick = (e: React.MouseEvent, vehicleId: number) => {
    e.stopPropagation();
    navigate(`/vendas/nova?veiculoId=${vehicleId}`);
  };

  const handleDeleteConfirm = async () => {
    if (!vehicleToDelete) return;

    setDeleting(true);
    try {
      const storageManager = new StorageManager(vehicleToDelete.id);
      await storageManager.deleteAllPhotos();

      const { error } = await supabase
        .from('estoque')
        .delete()
        .eq('id', vehicleToDelete.id);

      if (error) throw error;

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

  const formatValue = (value: number) => {
    if (!showValues) return '••••••';
    return maskCurrency(value);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Estoque"
        description="Controle de estoque de veículos"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handlePrint()}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Listagem
            </Button>
            <Button onClick={handleNew} className="bg-accent hover:bg-accent/90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Veículo
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Cards Estatísticos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade</p>
                  <p className="text-2xl font-bold text-foreground">{statsCards.quantidade}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowValues(!showValues)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {showValues ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total em Estoque</p>
              <p className="text-2xl font-bold text-foreground">{formatValue(statsCards.totalEstoque)}</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Custo do Estoque</p>
              <p className="text-2xl font-bold text-foreground">{formatValue(statsCards.custoEstoque)}</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Margem</p>
              <p className={`text-2xl font-bold ${statsCards.margem >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatValue(statsCards.margem)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="glass rounded-lg p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Busca por Modelo ou Placa */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por modelo ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Em estoque">Em estoque</SelectItem>
                <SelectItem value="Vendido">Vendido</SelectItem>
                <SelectItem value="Reservado">Reservado</SelectItem>
                <SelectItem value="Fora de Estoque">Fora de Estoque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Tipo de Aquisição (Marcadores) */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={tipoAquisicaoFilter.includes('Próprio') ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                tipoAquisicaoFilter.includes('Próprio') 
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                  : 'hover:bg-accent/20'
              }`}
              onClick={() => handleTipoAquisicaoToggle('Próprio')}
            >
              {tipoAquisicaoCounts['Próprio']} | Próprios
            </Badge>
            <Badge
              variant={tipoAquisicaoFilter.includes('Consignado') ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                tipoAquisicaoFilter.includes('Consignado') 
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                  : 'hover:bg-accent/20'
              }`}
              onClick={() => handleTipoAquisicaoToggle('Consignado')}
            >
              {tipoAquisicaoCounts['Consignado']} | Consignados
            </Badge>
            <Badge
              variant={tipoAquisicaoFilter.includes('Parceria') ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                tipoAquisicaoFilter.includes('Parceria') 
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90' 
                  : 'hover:bg-accent/20'
              }`}
              onClick={() => handleTipoAquisicaoToggle('Parceria')}
            >
              {tipoAquisicaoCounts['Parceria']} | Parcerias
            </Badge>
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
              {searchTerm || statusFilter !== 'todos' || tipoAquisicaoFilter.length > 0
                ? 'Nenhum veículo encontrado'
                : 'Estoque vazio'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm || statusFilter !== 'todos' || tipoAquisicaoFilter.length > 0
                ? 'Tente ajustar os filtros de busca'
                : 'Adicione o primeiro veículo ao estoque'}
            </p>
            {!searchTerm && statusFilter === 'todos' && tipoAquisicaoFilter.length === 0 && (
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
                onView={handleView}
                onDelete={handleDeleteClick}
                onSell={handleSellClick}
              />
            ))}
          </div>
        )}
      </div>

      <VehicleDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        vehicleId={selectedVehicleId}
        onEdit={handleEdit}
      />

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

      {/* Componente de Impressão (oculto) */}
      <div className="hidden">
        <VehicleListPrint ref={printRef} vehicles={filteredVehicles} />
      </div>
    </div>
  );
};

export default VeiculosEstoque;
