import { useState, useEffect } from 'react';
import { differenceInDays, differenceInMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Car, Calendar, Gauge, Palette, CreditCard, FileText, 
  Clock, Edit, MapPin, Hash, Settings, Fuel, TrendingUp, Receipt
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useVehicleMainPhoto } from '@/features/estoque/hooks/useVehicleMainPhoto';
import { useVehicleFinancials } from '@/features/estoque/hooks/useVehicleFinancials';
import { maskCurrency, maskKm } from '@/features/estoque/utils/masks';
import { PhotoCarousel } from './PhotoCarousel';
import { StorageManager, PhotoMetadata } from '@/features/estoque/utils/storageManager';

interface VehicleDetail {
  id: number;
  modelo: string | null;
  fabricante: string | null;
  ano: string | null;
  ano_fabricacao: string | null;
  valor: string | null;
  valor_aquisicao: number | null;
  km: string | null;
  cor: string | null;
  foto: string | null;
  fotos: string[] | null;
  placa: string | null;
  renavan: number | null;
  chassi: string | null;
  motor: string | null;
  cambio: string | null;
  categoria: string | null;
  tipo_veiculo: string | null;
  status: string | null;
  observacao: string | null;
  caracteristicas: string | null;
  garantia: string | null;
  data_aquisicao: string | null;
  tipo_aquisicao: string | null;
  created_at: string;
}

interface VehicleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: number | undefined;
  onEdit: (id: number) => void;
}

function calculateTimeInStock(createdAt: string): string {
  const startDate = new Date(createdAt);
  const now = new Date();
  
  const totalDays = differenceInDays(now, startDate);
  const months = differenceInMonths(now, startDate);
  const remainingDays = totalDays - (months * 30);
  
  if (months === 0) {
    return `${totalDays} ${totalDays === 1 ? 'dia' : 'dias'}`;
  }
  
  if (remainingDays <= 0) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  
  return `${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`;
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
    </div>
  );
}

export function VehicleDetailDialog({ open, onOpenChange, vehicleId, onEdit }: VehicleDetailDialogProps) {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  
  const { mainPhoto } = useVehicleMainPhoto(vehicleId, vehicle?.foto || null);
  const { custos, valorVenda, margem, loading: financialsLoading } = useVehicleFinancials(
    vehicleId,
    vehicle?.valor_aquisicao || null
  );

  useEffect(() => {
    if (open && vehicleId) {
      loadVehicle();
      loadPhotos();
    } else {
      setVehicle(null);
      setPhotos([]);
    }
  }, [open, vehicleId]);

  const loadVehicle = async () => {
    if (!vehicleId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('estoque')
        .select('*')
        .eq('id', vehicleId)
        .maybeSingle();

      if (error) throw error;
      setVehicle(data);
    } catch (error) {
      console.error('Error loading vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async () => {
    if (!vehicleId) return;
    
    try {
      const storageManager = new StorageManager(vehicleId);
      const metadata = await storageManager.loadMetadata();
      
      if (metadata?.photos && metadata.photos.length > 0) {
        // Sort by isMain first, then by uploadedAt
        const sortedPhotos = [...metadata.photos].sort((a, b) => {
          if (a.isMain && !b.isMain) return -1;
          if (!a.isMain && b.isMain) return 1;
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        });
        setPhotos(sortedPhotos);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const handlePhotoClick = (index: number) => {
    setCarouselIndex(index);
    setCarouselOpen(true);
  };

  const handleEditClick = () => {
    if (vehicleId) {
      onOpenChange(false);
      onEdit(vehicleId);
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'Disponível': 'default',
      'Vendido': 'secondary',
      'Reservado': 'outline',
    };
    
    return (
      <Badge variant={variants[status] || 'default'} className="ml-2">
        {status}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {loading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                <>
                  {vehicle?.fabricante} {vehicle?.modelo}
                  {getStatusBadge(vehicle?.status)}
                </>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEditClick}>
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="w-full h-64 rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          ) : vehicle ? (
            <div className="space-y-6">
              {/* Photo Section */}
              <div className="relative">
                {photos.length > 0 ? (
                  <div className="space-y-2">
                    <div 
                      className="relative h-64 rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => handlePhotoClick(0)}
                    >
                      <img
                        src={mainPhoto || photos[0].url}
                        alt={`${vehicle.fabricante} ${vehicle.modelo}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white font-medium">Clique para ampliar</span>
                      </div>
                    </div>
                    {photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {photos.slice(0, 6).map((photo, idx) => (
                          <div
                            key={idx}
                            className="relative w-20 h-20 rounded-lg overflow-hidden cursor-pointer shrink-0 border-2 border-transparent hover:border-accent transition-colors"
                            onClick={() => handlePhotoClick(idx)}
                          >
                            <img
                              src={photo.url}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {photos.length > 6 && (
                          <div 
                            className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center cursor-pointer shrink-0 hover:bg-muted/80 transition-colors"
                            onClick={() => handlePhotoClick(6)}
                          >
                            <span className="text-sm text-muted-foreground">+{photos.length - 6}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
                    <Car className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Time in Stock Highlight */}
              <div className="glass rounded-lg p-4 flex items-center gap-3 bg-accent/5 border-accent/20">
                <Clock className="w-6 h-6 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Tempo em Estoque</p>
                  <p className="text-lg font-semibold text-accent">
                    {calculateTimeInStock(vehicle.created_at)}
                  </p>
                </div>
              </div>

              {/* Price Section */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Valor de Venda</p>
                  <p className="text-xl font-bold text-accent">
                    {vehicle.valor ? maskCurrency(Number(vehicle.valor)) : 'Não informado'}
                  </p>
                </div>
                <div className="glass rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1">Valor de Aquisição</p>
                  <p className="text-xl font-semibold text-foreground">
                    {vehicle.valor_aquisicao ? maskCurrency(vehicle.valor_aquisicao) : 'Não informado'}
                  </p>
                </div>
                <div className="glass rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Custos com o Veículo</p>
                  </div>
                  {financialsLoading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : (
                    <p className="text-xl font-semibold text-red-400">
                      {maskCurrency(custos)}
                    </p>
                  )}
                </div>
                <div className="glass rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Margem</p>
                  </div>
                  {financialsLoading ? (
                    <Skeleton className="h-7 w-24" />
                  ) : margem !== null && valorVenda ? (
                    <p className={`text-xl font-bold ${margem >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {maskCurrency(margem)} / {((margem / valorVenda) * 100).toFixed(0)}%
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sem venda</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Vehicle Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Identificação</h3>
                  <DetailRow icon={MapPin} label="Placa" value={vehicle.placa} />
                  <DetailRow icon={Hash} label="Renavan" value={vehicle.renavan?.toString()} />
                  <DetailRow icon={FileText} label="Chassi" value={vehicle.chassi} />
                  <DetailRow icon={Car} label="Tipo" value={vehicle.tipo_veiculo} />
                  <DetailRow icon={Car} label="Categoria" value={vehicle.categoria} />
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Características</h3>
                  <DetailRow icon={Calendar} label="Ano Modelo" value={vehicle.ano} />
                  <DetailRow icon={Calendar} label="Ano Fabricação" value={vehicle.ano_fabricacao} />
                  <DetailRow icon={Gauge} label="Quilometragem" value={vehicle.km ? `${maskKm(vehicle.km)} km` : null} />
                  <DetailRow icon={Palette} label="Cor" value={vehicle.cor} />
                  <DetailRow icon={Settings} label="Câmbio" value={vehicle.cambio} />
                  <DetailRow icon={Fuel} label="Motor" value={vehicle.motor} />
                </div>
              </div>

              <Separator />

              {/* Acquisition Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Aquisição</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <DetailRow 
                    icon={Calendar} 
                    label="Data de Aquisição" 
                    value={vehicle.data_aquisicao ? format(new Date(vehicle.data_aquisicao), 'dd/MM/yyyy', { locale: ptBR }) : null} 
                  />
                  <DetailRow icon={CreditCard} label="Tipo de Aquisição" value={vehicle.tipo_aquisicao} />
                </div>
              </div>

              {/* Additional Info */}
              {(vehicle.caracteristicas || vehicle.observacao || vehicle.garantia) && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    {vehicle.caracteristicas && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Características</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.caracteristicas}</p>
                      </div>
                    )}
                    {vehicle.observacao && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Observações</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.observacao}</p>
                      </div>
                    )}
                    {vehicle.garantia && (
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Garantia</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.garantia}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Car className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Veículo não encontrado</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo Carousel */}
      {carouselOpen && photos.length > 0 && (
        <PhotoCarousel
          photos={photos}
          initialIndex={carouselIndex}
          onClose={() => setCarouselOpen(false)}
        />
      )}
    </>
  );
}
