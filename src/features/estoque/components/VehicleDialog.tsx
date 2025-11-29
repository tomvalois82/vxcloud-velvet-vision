import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploader } from './ImageUploader';
import { PhotoManager } from './PhotoManager';
import { supabase } from '@/integrations/supabase/client';
import { StorageManager, PhotoMetadata } from '../utils/storageManager';
import { toast } from '@/hooks/use-toast';

const vehicleSchema = z.object({
  modelo: z.string().min(1, 'Modelo é obrigatório'),
  fabricante: z.string().min(1, 'Fabricante é obrigatório'),
  ano: z.string().min(4, 'Ano inválido'),
  valor: z.string().min(1, 'Valor é obrigatório'),
  km: z.string().optional(),
  cor: z.string().optional(),
  placa: z.string().optional(),
  tipo_veiculo: z.string().optional(),
  observacao: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: number;
  onSuccess: () => void;
}

export function VehicleDialog({ open, onOpenChange, vehicleId, onSuccess }: VehicleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [activeTab, setActiveTab] = useState('info');
  const isEditing = !!vehicleId;

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      modelo: '',
      fabricante: '',
      ano: '',
      valor: '',
      km: '',
      cor: '',
      placa: '',
      tipo_veiculo: '',
      observacao: '',
    },
  });

  useEffect(() => {
    if (open && vehicleId) {
      loadVehicle();
    } else if (open && !vehicleId) {
      form.reset();
      setPhotos([]);
      setActiveTab('info');
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
        .single();

      if (error) throw error;

      form.reset({
        modelo: data.modelo || '',
        fabricante: data.fabricante || '',
        ano: data.ano || '',
        valor: data.valor || '',
        km: data.km || '',
        cor: data.cor || '',
        placa: data.placa || '',
        tipo_veiculo: data.tipo_veiculo || '',
        observacao: data.observacao || '',
      });

      const storageManager = new StorageManager(vehicleId);
      const metadata = await storageManager.loadMetadata();
      if (metadata?.photos) {
        setPhotos(metadata.photos);
      }
    } catch (error) {
      console.error('Error loading vehicle:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar veículo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: VehicleFormData) => {
    setLoading(true);
    try {
      // Get user's empresa_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado',
          variant: 'destructive',
        });
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('config')
        .eq('auth_id', user.id)
        .single();

      if (userError || !userData?.config) {
        toast({
          title: 'Erro',
          description: 'Configuração de empresa não encontrada',
          variant: 'destructive',
        });
        return;
      }

      const { data: configData, error: configError } = await supabase
        .from('config')
        .select('empresa:empresa(id)')
        .eq('id', userData.config)
        .single();

      if (configError || !configData) {
        toast({
          title: 'Erro',
          description: 'Empresa não encontrada',
          variant: 'destructive',
        });
        return;
      }

      const mainPhoto = photos.find((p) => p.isMain);
      const photoUrls = photos.map((p) => p.url);

      const vehicleData = {
        ...data,
        foto: mainPhoto?.url || null,
        fotos: photoUrls.length > 0 ? photoUrls : null,
        data_aquisicao: new Date().toISOString().split('T')[0],
        tipo_aquisicao: 'compra' as const,
        valor_aquisicao: parseFloat(data.valor.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
        id_empresa: (configData.empresa as any)?.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('estoque')
          .update(vehicleData)
          .eq('id', vehicleId);

        if (error) throw error;

        toast({
          title: 'Veículo atualizado',
          description: 'As informações foram salvas com sucesso',
        });
      } else {
        const { data: inserted, error } = await supabase
          .from('estoque')
          .insert([vehicleData])
          .select()
          .single();

        if (error) throw error;

        // If photos were uploaded before saving, update metadata with correct vehicle ID
        if (photos.length > 0 && inserted) {
          const storageManager = new StorageManager(inserted.id);
          await storageManager.saveMetadata({
            vehicleId: inserted.id,
            photos,
          });
        }

        toast({
          title: 'Veículo cadastrado',
          description: 'O veículo foi adicionado ao estoque',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar veículo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do veículo'
              : 'Preencha os dados do veículo para adicionar ao estoque'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fabricante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fabricante *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Volkswagen" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modelo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Gol" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ano"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 2020" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 45000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="km"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quilometragem</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Preto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="placa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: ABC-1234" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipo_veiculo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Sedan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Informações adicionais sobre o veículo"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isEditing ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="photos" className="space-y-4 mt-4">
            {!isEditing && photos.length === 0 ? (
              <div className="glass rounded-lg p-8 text-center">
                <p className="text-muted-foreground mb-4">
                  Salve o veículo primeiro para adicionar fotos
                </p>
                <Button onClick={() => setActiveTab('info')}>
                  Voltar para Informações
                </Button>
              </div>
            ) : (
              <>
                {photos.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Fotos Atuais</h3>
                    <PhotoManager
                      vehicleId={vehicleId || 0}
                      photos={photos}
                      onPhotosChange={setPhotos}
                    />
                  </div>
                )}

                {photos.length < 10 && vehicleId && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      {photos.length > 0 ? 'Adicionar Mais Fotos' : 'Adicionar Fotos'}
                    </h3>
                    <ImageUploader
                      vehicleId={vehicleId}
                      onUploadComplete={(newPhotos) => {
                        setPhotos((prev) => [...prev, ...newPhotos]);
                      }}
                      maxFiles={10 - photos.length}
                    />
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
