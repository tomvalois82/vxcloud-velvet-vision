import { useState, useEffect, useCallback, useRef } from 'react';
import { differenceInDays, differenceInMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Car, Calendar, Gauge, Palette, CreditCard, FileText, Clock, Edit, MapPin, Hash, Settings, Fuel, TrendingUp, Receipt, Printer, Plus, Trash2, Pencil, Copy } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
import { VehicleReportPrint } from './VehicleReportPrint';
import { MovimentoDialog } from '@/features/financeiro/components/MovimentoDialog';
import { useToast } from '@/hooks/use-toast';
import { deleteAnexosDoMovimento } from '@/features/financeiro/utils/anexosUtils';
import { EstoqueAnexosManager } from './EstoqueAnexosManager';
interface VehicleCost {
  id: string;
  descricao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  data_compra: string | null;
  valor_liquido: number;
  pessoa?: {
    nome: string;
  } | null;
}
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
  const remainingDays = totalDays - months * 30;
  if (months === 0) {
    return `${totalDays} ${totalDays === 1 ? 'dia' : 'dias'}`;
  }
  if (remainingDays <= 0) {
    return `${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  return `${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`;
}
function DetailRow({
  icon: Icon,
  label,
  value,
  copyable = false,
  onCopy
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
  onCopy?: (value: string) => void;
}) {
  if (!value) return null;
  return <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          <p className="text-sm text-foreground break-words">{value}</p>
          {copyable && onCopy && (
            <button
              type="button"
              className="p-1 hover:bg-accent/20 rounded transition-colors"
              onClick={() => onCopy(value)}
            >
              <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>;
}
interface Empresa {
  foto_url: string | null;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  municipio: string;
  estado: string;
  cep: string;
  telefone: string | null;
  site: string | null;
}
export function VehicleDetailDialog({
  open,
  onOpenChange,
  vehicleId,
  onEdit
}: VehicleDetailDialogProps) {
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [vehicleCosts, setVehicleCosts] = useState<VehicleCost[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [dataVenda, setDataVenda] = useState<string | null>(null);
  const [movimentoDialogOpen, setMovimentoDialogOpen] = useState(false);
  const [selectedMovimento, setSelectedMovimento] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<VehicleCost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const {
    mainPhoto
  } = useVehicleMainPhoto(vehicleId, vehicle?.foto || null);
  const {
    custos,
    valorVenda,
    margem,
    loading: financialsLoading
  } = useVehicleFinancials(vehicleId, vehicle?.valor_aquisicao || null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatório - ${vehicle?.fabricante || ''} ${vehicle?.modelo || ''}`
  });
  const loadVehicleCosts = useCallback(async () => {
    if (!vehicleId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('vx_fin_movimento').select('id, descricao, data_vencimento, data_pagamento, data_compra, valor_liquido, id_pessoa, vx_pessoa(nome)').eq('id_estoque', vehicleId).eq('tipo_movimento', 'Pagar').order('data_vencimento', {
        ascending: true
      });
      if (error) throw error;

      // Transform data to match interface
      const transformedData = (data || []).map(item => ({
        ...item,
        pessoa: item.vx_pessoa ? {
          nome: item.vx_pessoa.nome
        } : null
      }));
      setVehicleCosts(transformedData);
    } catch (error) {
      console.error('Error loading vehicle costs:', error);
    }
  }, [vehicleId]);
  useEffect(() => {
    if (open && vehicleId) {
      loadVehicle();
      loadPhotos();
      loadVehicleCosts();
      loadEmpresa();
      loadDataVenda();
    } else {
      setVehicle(null);
      setPhotos([]);
      setVehicleCosts([]);
      setDataVenda(null);
    }
  }, [open, vehicleId]);
  const loadEmpresa = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('empresa').select('foto_url, nome_fantasia, logradouro, numero, complemento, bairro, municipio, estado, cep, telefone, site').limit(1).single();
      if (!error && data) {
        setEmpresa(data);
      }
    } catch (error) {
      console.error('Error loading empresa:', error);
    }
  };
  const loadDataVenda = async () => {
    if (!vehicleId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('vx_vendas').select('data_venda').eq('id_veiculo_vendido', vehicleId).maybeSingle();
      if (!error && data) {
        setDataVenda(data.data_venda);
      }
    } catch (error) {
      console.error('Error loading data venda:', error);
    }
  };
  useEffect(() => {
    if (!open || !vehicleId) return;
    const channel = supabase.channel(`vehicle-costs-detail-${vehicleId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'vx_fin_movimento',
      filter: `id_estoque=eq.${vehicleId}`
    }, () => loadVehicleCosts()).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, vehicleId, loadVehicleCosts]);
  const loadVehicle = async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('estoque').select('*').eq('id', vehicleId).maybeSingle();
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

  const handleEditCost = async (costId: string) => {
    try {
      const { data, error } = await supabase
        .from('vx_fin_movimento')
        .select('*')
        .eq('id', costId)
        .single();
      
      if (error) throw error;
      setSelectedMovimento(data);
      setMovimentoDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar custo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCost = async () => {
    if (!costToDelete) return;
    
    setDeleting(true);
    try {
      // Delete attachments first
      await deleteAnexosDoMovimento(costToDelete.id);
      
      // Then delete the movement
      const { error } = await supabase
        .from('vx_fin_movimento')
        .delete()
        .eq('id', costToDelete.id);
      
      if (error) throw error;
      
      toast({
        title: "Custo excluído",
        description: "O custo foi removido com sucesso.",
      });
      
      loadVehicleCosts();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir custo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCostToDelete(null);
    }
  };
  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'Disponível': 'default',
      'Vendido': 'secondary',
      'Reservado': 'outline'
    };
    return <Badge variant={variants[status] || 'default'} className="ml-2">
        {status}
      </Badge>;
  };
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {loading ? <Skeleton className="h-6 w-48" /> : <>
                  {vehicle?.fabricante} {vehicle?.modelo}
                  {getStatusBadge(vehicle?.status)}
                </>}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handlePrint()}>
                <Printer className="w-4 h-4 mr-1" />
                Relatório de Custos
              </Button>
              <Button variant="outline" size="sm" onClick={handleEditClick}>
                <Edit className="w-4 h-4 mr-1" />
                Editar
              </Button>
            </div>
          </DialogHeader>

          {loading ? <div className="space-y-4">
              <Skeleton className="w-full h-64 rounded-lg" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div> : vehicle ? <div className="space-y-6">
              {/* Photo Section */}
              <div className="relative">
                {photos.length > 0 ? <div className="relative h-64 rounded-lg overflow-hidden cursor-pointer group" onClick={() => handlePhotoClick(0)}>
                    <img src={mainPhoto || photos[0].url} alt={`${vehicle.fabricante} ${vehicle.modelo}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-medium">Clique para ampliar</span>
                    </div>
                  </div> : <div className="h-48 rounded-lg bg-muted flex items-center justify-center">
                    <Car className="w-16 h-16 text-muted-foreground" />
                  </div>}
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
                  {financialsLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-xl font-semibold text-red-400">
                      {maskCurrency(custos)}
                    </p>}
                </div>
                <div className="glass rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Margem</p>
                  </div>
                  {financialsLoading ? <Skeleton className="h-7 w-24" /> : margem !== null && valorVenda ? <p className={`text-xl font-bold ${margem >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {maskCurrency(margem)} / {(margem / valorVenda * 100).toFixed(0)}%
                    </p> : <p className="text-sm text-muted-foreground italic">Sem venda</p>}
                </div>
              </div>

              <Separator />

              {/* Vehicle Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Identificação</h3>
                  <DetailRow icon={MapPin} label="Placa" value={vehicle.placa} copyable onCopy={(v) => {
                    navigator.clipboard.writeText(v);
                    toast({ title: 'Copiado!', description: 'Placa copiada para a área de transferência.' });
                  }} />
                  <DetailRow icon={Hash} label="Renavan" value={vehicle.renavan?.toString()} copyable onCopy={(v) => {
                    navigator.clipboard.writeText(v);
                    toast({ title: 'Copiado!', description: 'Renavan copiado para a área de transferência.' });
                  }} />
                  <DetailRow icon={FileText} label="Chassi" value={vehicle.chassi} copyable onCopy={(v) => {
                    navigator.clipboard.writeText(v);
                    toast({ title: 'Copiado!', description: 'Chassi copiado para a área de transferência.' });
                  }} />
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

              {/* Costs Section */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Custos</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMovimento(null);
                      setMovimentoDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Custo
                  </Button>
                </div>
                {vehicleCosts.length > 0 ? (
                  <div className="glass rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50">
                            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Descrição</th>
                            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Vencimento</th>
                            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Pagamento</th>
                            <th className="text-right py-2 px-3 text-muted-foreground font-medium">Valor</th>
                            <th className="text-center py-2 px-3 text-muted-foreground font-medium w-20">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vehicleCosts.map(cost => <tr key={cost.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                              <td className="py-2 px-3 text-foreground">{cost.descricao}</td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {format(new Date(cost.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy', {
                          locale: ptBR
                        })}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {cost.data_pagamento ? format(new Date(cost.data_pagamento + 'T00:00:00'), 'dd/MM/yyyy', {
                          locale: ptBR
                        }) : '-'}
                              </td>
                              <td className="py-2 px-3 text-right text-red-400">
                                {maskCurrency(cost.valor_liquido)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEditCost(cost.id)}
                                    title="Editar"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      setCostToDelete(cost);
                                      setDeleteDialogOpen(true);
                                    }}
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>)}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted/30">
                            <td colSpan={4} className="py-2 px-3 font-semibold text-foreground">Total</td>
                            <td className="py-2 px-3 text-right font-bold text-red-400">
                              {maskCurrency(vehicleCosts.reduce((acc, c) => acc + c.valor_liquido, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum custo registrado.</p>
                  )}
                </div>

              <Separator />

              {/* Attachments Section */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Documentos</h3>
                <EstoqueAnexosManager estoqueId={vehicleId} />
              </div>

              <Separator />

              {/* Acquisition Info */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Aquisição</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <DetailRow icon={Calendar} label="Data de Aquisição" value={vehicle.data_aquisicao ? format(new Date(vehicle.data_aquisicao), 'dd/MM/yyyy', {
                locale: ptBR
              }) : null} />
                  <DetailRow icon={CreditCard} label="Tipo de Aquisição" value={vehicle.tipo_aquisicao} />
                </div>
              </div>

              {/* Additional Info */}
              {(vehicle.caracteristicas || vehicle.observacao || vehicle.garantia) && <>
                  <Separator />
                  <div className="space-y-4">
                    {vehicle.caracteristicas && <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Características</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.caracteristicas}</p>
                      </div>}
                    {vehicle.observacao && <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Observações</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.observacao}</p>
                      </div>}
                    {vehicle.garantia && <div>
                        <h3 className="text-sm font-semibold text-foreground mb-2">Garantia</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vehicle.garantia}</p>
                      </div>}
                  </div>
                </>}
            </div> : <div className="text-center py-8">
              <Car className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Veículo não encontrado</p>
            </div>}
        </DialogContent>
      </Dialog>

      {/* Photo Carousel */}
      {carouselOpen && photos.length > 0 && <PhotoCarousel photos={photos} initialIndex={carouselIndex} onClose={() => setCarouselOpen(false)} />}
      
      {/* Componente de Impressão (oculto) */}
      {vehicle && <div className="hidden">
          <VehicleReportPrint ref={printRef} vehicle={vehicle} costs={vehicleCosts} valorVenda={valorVenda} empresa={empresa} dataVenda={dataVenda} />
        </div>}

      {/* Dialog para adicionar/editar custo */}
      <MovimentoDialog
        open={movimentoDialogOpen}
        onOpenChange={(open) => {
          setMovimentoDialogOpen(open);
          if (!open) setSelectedMovimento(null);
        }}
        movimento={selectedMovimento}
        defaultTipo="Pagar"
        initialVehicleId={selectedMovimento ? undefined : vehicleId}
        onSuccess={() => {
          loadVehicleCosts();
          setSelectedMovimento(null);
        }}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o custo "{costToDelete?.descricao}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCost}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}