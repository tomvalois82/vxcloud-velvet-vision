import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Info, CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
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
import {
  getFipeMarcas,
  getFipeModelos,
  getFipeAnos,
  getFipeValor,
  parseFipeValor,
  TipoVeiculo,
} from '../services/fipeService';
import { consultarPlaca } from '../services/consultaPlacaService';
import {
  maskPlaca,
  maskCurrency,
  maskKm,
  maskYear,
  normalizePlaca,
  unmaskCurrency,
  unmaskKm,
  maskRenavan,
  maskChassi,
} from '../utils/masks';
import {
  validatePlacaDuplicada,
  validateAnoModelo,
  validateKm,
  validateDataAquisicao,
  validateChassi,
} from '../utils/validations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const vehicleSchema = z.object({
  placa: z.string().optional(),
  renavan: z.string().optional(),
  chassi: z.string().optional(),
  tipo_veiculo_fipe: z.string().min(1, 'Tipo de veículo é obrigatório'),
  modelo: z.string().min(1, 'Modelo é obrigatório'),
  fabricante: z.string().min(1, 'Fabricante é obrigatório'),
  ano: z.string().min(4, 'Ano deve ter 4 dígitos'),
  ano_fabricacao: z.string().min(4, 'Ano de fabricação deve ter 4 dígitos'),
  valor: z.string().min(1, 'Valor de venda é obrigatório'),
  valor_compra: z.string().optional(),
  km: z.string().optional(),
  cor: z.string().optional(),
  carroceria: z.string().optional(),
  motor: z.string().optional(),
  cambio: z.string().optional(),
  tipo_aquisicao: z.string().optional(),
  data_aquisicao: z.string().optional(),
  adquirido_de: z.string().optional(),
  status: z.string().optional(),
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
  const [loadingFipe, setLoadingFipe] = useState(false);
  const [loadingPlaca, setLoadingPlaca] = useState(false);
  const [marcasFipe, setMarcasFipe] = useState<any[]>([]);
  const [fipeValorSugerido, setFipeValorSugerido] = useState<string | null>(null);
  const [selectedMarcaCodigo, setSelectedMarcaCodigo] = useState<string>('');
  const [placaError, setPlacaError] = useState<string>('');
  const [anoError, setAnoError] = useState<string>('');
  const [chassiError, setChassiError] = useState<string>('');
  const [anosDisponiveis, setAnosDisponiveis] = useState<number[]>([]);
  const [anosFabricacao, setAnosFabricacao] = useState<string[]>([]);
  const [tipoVeiculoFipe, setTipoVeiculoFipe] = useState<TipoVeiculo>('carros');
  const isEditing = !!vehicleId;

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      placa: '',
      renavan: '',
      chassi: '',
      tipo_veiculo_fipe: 'carros',
      modelo: '',
      fabricante: '',
      ano: '',
      ano_fabricacao: '',
      valor: '',
      valor_compra: '',
      km: '',
      cor: '',
      carroceria: '',
      motor: '',
      cambio: '',
      tipo_aquisicao: 'compra',
      data_aquisicao: new Date().toISOString().split('T')[0],
      adquirido_de: '',
      observacao: '',
    },
  });

  // Gerar lista de anos (1950 até ano atual + 1)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear + 1; year >= 1950; year--) {
      years.push(year);
    }
    setAnosDisponiveis(years);
  }, []);

  // Carregar marcas FIPE ao abrir o diálogo
  useEffect(() => {
    if (open) {
      loadMarcasFipe();
    }
  }, [open]);

  const loadMarcasFipe = async (tipo?: TipoVeiculo) => {
    try {
      setLoadingFipe(true);
      const tipoToLoad = tipo || tipoVeiculoFipe;
      const marcas = await getFipeMarcas(tipoToLoad);
      setMarcasFipe(marcas);
    } catch (error) {
      console.error('Erro ao carregar marcas FIPE:', error);
    } finally {
      setLoadingFipe(false);
    }
  };

  const handleTipoVeiculoChange = async (tipo: string) => {
    const tipoFipe = tipo as TipoVeiculo;
    setTipoVeiculoFipe(tipoFipe);
    form.setValue('tipo_veiculo_fipe', tipo);
    
    // Limpar fabricante e modelo ao mudar tipo
    form.setValue('fabricante', '');
    form.setValue('modelo', '');
    setSelectedMarcaCodigo('');
    
    // Carregar novas marcas
    await loadMarcasFipe(tipoFipe);
  };

  // Atualizar anos de fabricação quando ano modelo mudar
  const handleAnoModeloChange = (ano: string) => {
    form.setValue('ano', ano);
    const anoNum = parseInt(ano);
    if (!isNaN(anoNum)) {
      setAnosFabricacao([String(anoNum), String(anoNum - 1)]);
      // Auto-selecionar o mesmo ano como fabricação
      form.setValue('ano_fabricacao', String(anoNum));
    }
  };

  const handleMarcaChange = async (marcaNome: string) => {
    form.setValue('fabricante', marcaNome);
    const marca = marcasFipe.find((m) => m.nome === marcaNome);
    if (marca) {
      setSelectedMarcaCodigo(marca.codigo);
    }
  };

  const handlePlacaBlur = async () => {
    const placa = form.getValues('placa');
    if (!placa) {
      setPlacaError('');
      return;
    }

    const validation = await validatePlacaDuplicada(placa, vehicleId);
    if (!validation.valid) {
      setPlacaError(validation.message || '');
      form.setError('placa', { message: validation.message });
    } else {
      setPlacaError('');
      form.clearErrors('placa');
    }
  };

  const handleChassiBlur = () => {
    const chassi = form.getValues('chassi');
    if (!chassi) {
      setChassiError('');
      return;
    }

    const validation = validateChassi(chassi);
    if (!validation.valid) {
      setChassiError(validation.message || '');
      form.setError('chassi', { message: validation.message });
    } else {
      setChassiError('');
      form.clearErrors('chassi');
    }
  };

  const handleAnoModeloBlur = () => {
    const anoModelo = form.getValues('ano');
    const anoFabricacao = form.getValues('ano_fabricacao');
    
    if (anoModelo && anoFabricacao) {
      const validation = validateAnoModelo(anoModelo, anoFabricacao);
      if (!validation.valid) {
        setAnoError(validation.message || '');
        form.setError('ano', { message: validation.message });
      } else {
        setAnoError('');
        form.clearErrors('ano');
        form.clearErrors('ano_fabricacao');
      }
    }
  };

  const handleConsultaPlaca = async () => {
    const placa = form.getValues('placa');
    if (!placa || placa.length < 7) {
      toast({
        title: 'Placa inválida',
        description: 'Informe a placa completa para consultar.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingPlaca(true);
    try {
      const dados = await consultarPlaca(placa);
      
      // Preencher os campos do formulário
      if (dados.fabricante) {
        // Tentar encontrar a marca na lista FIPE
        const marcaEncontrada = marcasFipe.find(
          m => m.nome.toUpperCase().includes(dados.fabricante.toUpperCase()) ||
               dados.fabricante.toUpperCase().includes(m.nome.toUpperCase())
        );
        if (marcaEncontrada) {
          form.setValue('fabricante', marcaEncontrada.nome);
          setSelectedMarcaCodigo(marcaEncontrada.codigo);
        } else {
          form.setValue('fabricante', dados.fabricante);
        }
      }
      
      if (dados.modelo) form.setValue('modelo', dados.modelo);
      
      if (dados.ano) {
        form.setValue('ano', dados.ano);
        const anoNum = parseInt(dados.ano);
        if (!isNaN(anoNum)) {
          setAnosFabricacao([String(anoNum), String(anoNum - 1)]);
        }
      }
      
      if (dados.ano_fabricacao) {
        form.setValue('ano_fabricacao', dados.ano_fabricacao);
      } else if (dados.ano) {
        form.setValue('ano_fabricacao', dados.ano);
      }
      
      if (dados.cor) {
        // Mapear cor para o select
        const coresMap: Record<string, string> = {
          'PRETO': 'Preto',
          'BRANCO': 'Branco',
          'PRATA': 'Prata',
          'CINZA': 'Cinza',
          'VERMELHO': 'Vermelho',
          'AZUL': 'Azul',
          'VERDE': 'Verde',
          'MARROM': 'Marrom',
          'BEGE': 'Bege',
          'AMARELO': 'Amarelo',
          'LARANJA': 'Laranja',
          'ROXO': 'Roxo',
        };
        const corNormalizada = coresMap[dados.cor.toUpperCase()] || dados.cor;
        form.setValue('cor', corNormalizada);
      }
      
      if (dados.chassi) {
        form.setValue('chassi', dados.chassi.toUpperCase());
      }
      
      if (dados.motor) {
        form.setValue('motor', dados.motor);
      }
      
      if (dados.valorFipe) {
        setFipeValorSugerido(dados.valorFipe);
      }

      toast({
        title: 'Consulta realizada',
        description: 'Os dados do veículo foram preenchidos automaticamente.',
      });
    } catch (error) {
      toast({
        title: 'Erro na consulta',
        description: error instanceof Error ? error.message : 'Erro ao consultar placa.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlaca(false);
    }
  };

  useEffect(() => {
    if (open && vehicleId) {
      // Clear photos before loading new vehicle to prevent showing old photos
      setPhotos([]);
      loadVehicle();
    } else if (open && !vehicleId) {
      // Resetar formulário com valores padrão explícitos
      form.reset({
        placa: '',
        renavan: '',
        chassi: '',
        tipo_veiculo_fipe: 'carros',
        modelo: '',
        fabricante: '',
        ano: '',
        ano_fabricacao: '',
        valor: '',
        valor_compra: '',
        adquirido_de: '',
        data_aquisicao: new Date().toISOString().split('T')[0],
        km: '',
        cor: '',
        carroceria: '',
        motor: '',
        cambio: '',
        tipo_aquisicao: 'Próprio',
        observacao: '',
      });
      
      // Limpar todos os estados relacionados
      setPhotos([]);
      setActiveTab('info');
      setSelectedMarcaCodigo('');
      setPlacaError('');
      setAnoError('');
      setChassiError('');
      setAnosFabricacao([]);
      setFipeValorSugerido(null);
      setTipoVeiculoFipe('carros');
    } else if (!open) {
      // Clear photos when dialog closes
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
        .single();

      if (error) throw error;

      // Atualizar anos de fabricação ANTES de resetar o formulário
      if (data.ano) {
        const anoNum = parseInt(data.ano);
        if (!isNaN(anoNum)) {
          setAnosFabricacao([String(anoNum), String(anoNum - 1)]);
        }
      }

      // Mapear tipo_veiculo do banco para tipo_veiculo_fipe
      const tipoVeiculoMap: Record<string, TipoVeiculo> = {
        'Carros': 'carros',
        'Motos': 'motos',
        'Caminhões': 'caminhoes',
      };
      const tipoFipe = tipoVeiculoMap[data.tipo_veiculo || ''] || 'carros';
      setTipoVeiculoFipe(tipoFipe);

      form.reset({
        placa: data.placa ? maskPlaca(data.placa) : '',
        renavan: data.renavan ? String(data.renavan) : '',
        chassi: data.chassi || '',
        tipo_veiculo_fipe: tipoFipe,
        modelo: data.modelo || '',
        fabricante: data.fabricante || '',
        ano: data.ano || '',
        ano_fabricacao: data.ano_fabricacao || '',
        valor: data.valor ? maskCurrency(Number(data.valor)) : '',
        valor_compra: data.valor_aquisicao ? maskCurrency(data.valor_aquisicao) : '',
        km: data.km ? maskKm(data.km) : '',
        cor: data.cor || '',
        carroceria: data.categoria || '',
        motor: data.motor || '',
        cambio: data.cambio || '',
        tipo_aquisicao: data.tipo_aquisicao || 'Próprio',
        data_aquisicao: data.data_aquisicao || new Date().toISOString().split('T')[0],
        adquirido_de: data.adquirido_de || '',
        status: data.status || 'Em estoque',
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

      const valorNumerico = unmaskCurrency(data.valor);
      const valorCompraNumerico = data.valor_compra ? unmaskCurrency(data.valor_compra) : 0;
      const kmNumerico = data.km ? unmaskKm(data.km) : '';
      const placaNormalizada = data.placa ? normalizePlaca(data.placa) : null;

      // Mapear tipo_veiculo_fipe para valor a ser salvo no banco
      const tipoVeiculoDbMap: Record<string, string> = {
        'carros': 'Carros',
        'motos': 'Motos',
        'caminhoes': 'Caminhões',
      };

      const vehicleData = {
        modelo: data.modelo,
        fabricante: data.fabricante,
        ano: data.ano,
        ano_fabricacao: data.ano_fabricacao,
        cor: data.cor,
        tipo_veiculo: tipoVeiculoDbMap[data.tipo_veiculo_fipe] || 'Carros',
        categoria: data.carroceria || null,
        status: data.status || 'Em estoque',
        motor: data.motor,
        cambio: data.cambio,
        observacao: data.observacao,
        foto: mainPhoto?.url || null,
        fotos: photoUrls.length > 0 ? photoUrls : null,
        valor: String(valorNumerico),
        km: kmNumerico,
        placa: placaNormalizada,
        renavan: data.renavan ? parseInt(data.renavan) : null,
        chassi: data.chassi ? data.chassi.toUpperCase().trim() : null,
        data_aquisicao: data.data_aquisicao || new Date().toISOString().split('T')[0],
        tipo_aquisicao: data.tipo_aquisicao || 'Próprio',
        valor_aquisicao: valorCompraNumerico,
        adquirido_de: data.adquirido_de || null,
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Seção: Dados Básicos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                    Dados Básicos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="placa"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Placa</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                placeholder="Ex: ABC-1D23"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(maskPlaca(e.target.value));
                                  setPlacaError('');
                                }}
                                onBlur={handlePlacaBlur}
                                maxLength={8}
                              />
                            </FormControl>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleConsultaPlaca}
                                    disabled={loadingPlaca || !field.value || field.value.length < 7}
                                  >
                                    {loadingPlaca ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Search className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Consultar placa e preencher dados</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormMessage />
                          {placaError && (
                            <p className="text-sm text-destructive">{placaError}</p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="renavan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renavan</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 12345678901"
                              {...field}
                              onChange={(e) => field.onChange(maskRenavan(e.target.value))}
                              maxLength={11}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="chassi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chassi</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 9BWZZZ377VT004251"
                              {...field}
                              onChange={(e) => {
                                field.onChange(maskChassi(e.target.value));
                                setChassiError('');
                              }}
                              onBlur={handleChassiBlur}
                              maxLength={17}
                            />
                          </FormControl>
                          <FormMessage />
                          {chassiError && (
                            <p className="text-sm text-destructive">{chassiError}</p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tipo_veiculo_fipe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo Veículo *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={handleTipoVeiculoChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="carros">Carros</SelectItem>
                              <SelectItem value="motos">Motos</SelectItem>
                              <SelectItem value="caminhoes">Caminhões</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fabricante"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fabricante *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={handleMarcaChange}
                            disabled={loadingFipe}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a marca" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {loadingFipe ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="ml-2">Carregando...</span>
                                </div>
                              ) : (
                                marcasFipe.map((marca) => (
                                  <SelectItem key={marca.codigo} value={marca.nome}>
                                    {marca.nome}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
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
                            <Input
                              placeholder="Ex: Civic EX"
                              {...field}
                            />
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
                          <FormLabel>Ano Modelo *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={handleAnoModeloChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o ano" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {anosDisponiveis.map((ano) => (
                                <SelectItem key={ano} value={String(ano)}>
                                  {ano}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          {anoError && (
                            <p className="text-sm text-destructive">{anoError}</p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ano_fabricacao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ano Fabricação *</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={anosFabricacao.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o ano de fabricação" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {anosFabricacao.map((ano) => (
                                <SelectItem key={ano} value={ano}>
                                  {ano}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Seção: Preço */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                    Preço
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="valor_compra"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço de Compra</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: R$ 40.000,00"
                              value={field.value || ''}
                              onChange={(e) => {
                                const maskedValue = maskCurrency(e.target.value);
                                field.onChange(maskedValue);
                              }}
                            />
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
                          <FormLabel>Valor de Venda *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: R$ 45.000,00"
                              value={field.value || ''}
                              onChange={(e) => {
                                const maskedValue = maskCurrency(e.target.value);
                                field.onChange(maskedValue);
                              }}
                            />
                          </FormControl>
                          {fipeValorSugerido && (
                            <Alert className="mt-2 bg-accent/10 border-accent">
                              <Info className="h-4 w-4 text-accent" />
                              <AlertDescription className="text-sm">
                                Valor FIPE sugerido: <span className="font-semibold text-accent">{fipeValorSugerido}</span>
                              </AlertDescription>
                            </Alert>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Seção: Dados de Aquisição */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                    Dados de Aquisição
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipo_aquisicao"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Aquisição</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Próprio">Próprio</SelectItem>
                              <SelectItem value="Agenciado">Agenciado</SelectItem>
                              <SelectItem value="Parceria">Parceria</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="data_aquisicao"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Aquisição</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), 'dd/MM/yyyy')
                                  ) : (
                                    <span>Selecione a data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => {
                                  field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                                }}
                                disabled={(date) => date > new Date()}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Seção: Especificações */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                    Especificações
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="motor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motor</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: 1.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cambio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Câmbio</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Manual">Manual</SelectItem>
                              <SelectItem value="Automático">Automático</SelectItem>
                              <SelectItem value="Automatizado">Automatizado</SelectItem>
                              <SelectItem value="CVT">CVT</SelectItem>
                            </SelectContent>
                          </Select>
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
                            <Input
                              placeholder="Ex: 50.000"
                              {...field}
                              onChange={(e) => field.onChange(maskKm(e.target.value))}
                            />
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
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a cor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Preto">Preto</SelectItem>
                              <SelectItem value="Branco">Branco</SelectItem>
                              <SelectItem value="Prata">Prata</SelectItem>
                              <SelectItem value="Cinza">Cinza</SelectItem>
                              <SelectItem value="Vermelho">Vermelho</SelectItem>
                              <SelectItem value="Azul">Azul</SelectItem>
                              <SelectItem value="Verde">Verde</SelectItem>
                              <SelectItem value="Marrom">Marrom</SelectItem>
                              <SelectItem value="Bege">Bege</SelectItem>
                              <SelectItem value="Amarelo">Amarelo</SelectItem>
                              <SelectItem value="Laranja">Laranja</SelectItem>
                              <SelectItem value="Roxo">Roxo</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carroceria"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Carroceria</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Sedan">Sedan</SelectItem>
                              <SelectItem value="Hatch">Hatch</SelectItem>
                              <SelectItem value="Coupé">Coupé</SelectItem>
                              <SelectItem value="Conversível">Conversível</SelectItem>
                              <SelectItem value="SUV">SUV</SelectItem>
                              <SelectItem value="Pickup">Pickup</SelectItem>
                              <SelectItem value="Minivan">Minivan</SelectItem>
                              <SelectItem value="Utilitário">Utilitário</SelectItem>
                              <SelectItem value="Esportivo">Esportivo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Seção: Status e Observações */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2">
                    Status e Observações
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status do Veículo</FormLabel>
                        <Select value={field.value || 'Em estoque'} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Em estoque">Em estoque</SelectItem>
                            <SelectItem value="Reservado">Reservado</SelectItem>
                            <SelectItem value="Fora de Estoque">Fora de Estoque</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>

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

                {photos.length < 20 && vehicleId && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      {photos.length > 0 ? 'Adicionar Mais Fotos' : 'Adicionar Fotos'}
                    </h3>
                    <ImageUploader
                      vehicleId={vehicleId}
                      onUploadComplete={(newPhotos) => {
                        setPhotos((prev) => [...prev, ...newPhotos]);
                      }}
                      maxFiles={20 - photos.length}
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
