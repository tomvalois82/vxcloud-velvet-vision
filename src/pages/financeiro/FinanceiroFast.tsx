import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Loader2, 
  Send, 
  FileImage, 
  FileText,
  ArrowDownCircle,
  ArrowUpCircle,
  Car,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subMonths } from "date-fns";

interface VeiculoOption {
  id: number;
  placa: string;
  modelo: string | null;
  fabricante: string | null;
  status: string | null;
}

const FinanceiroFast = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get tipo from URL, default to Pagar
  const tipoFromUrl = searchParams.get("tipo");
  const [tipo, setTipo] = useState<"Pagar" | "Receber">(
    tipoFromUrl === "Receber" ? "Receber" : "Pagar"
  );
  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  
  // Vehicle selection state
  const [veiculos, setVeiculos] = useState<VeiculoOption[]>([]);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoOption | null>(null);
  const [veiculoOpen, setVeiculoOpen] = useState(false);
  const [loadingVeiculos, setLoadingVeiculos] = useState(false);

  // Fetch webhook URL and vehicles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: usuario } = await supabase
          .from("usuario")
          .select("config")
          .eq("auth_id", userData.user.id)
          .single();

        if (usuario?.config) {
          const { data: configData } = await supabase
            .from("config")
            .select("link_wh_ocr")
            .eq("id", usuario.config)
            .single();

          if (configData?.link_wh_ocr) {
            setWebhookUrl(configData.link_wh_ocr);
          }
        }

        // Fetch vehicles
        await fetchVeiculos();
      } catch (error) {
        console.error("Erro ao carregar configuração:", error);
      }
    };

    fetchData();
  }, []);

  const fetchVeiculos = async () => {
    setLoadingVeiculos(true);
    try {
      // Calculate date 3 months ago
      const threeMonthsAgo = subMonths(new Date(), 3).toISOString();

      // Get user's empresa
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: usuario } = await supabase
        .from("usuario")
        .select("config")
        .eq("auth_id", userData.user.id)
        .single();

      if (!usuario?.config) return;

      const { data: configData } = await supabase
        .from("config")
        .select("id")
        .eq("id", usuario.config)
        .single();

      if (!configData) return;

      const { data: empresa } = await supabase
        .from("empresa")
        .select("id")
        .eq("id_config", configData.id)
        .single();

      if (!empresa) return;

      // Fetch all vehicles
      const { data: veiculosData, error } = await supabase
        .from("estoque")
        .select("id, placa, modelo, fabricante, status")
        .eq("id_empresa", empresa.id)
        .not("placa", "is", null);

      if (error) throw error;

      // Get sold vehicles with sale date from vx_vendas
      const { data: vendasData } = await supabase
        .from("vx_vendas")
        .select("id_veiculo_vendido, data_venda")
        .eq("id_empresa", empresa.id)
        .gte("data_venda", threeMonthsAgo);

      const veiculosVendidosRecentes = new Set(
        (vendasData || []).map(v => v.id_veiculo_vendido)
      );

      // Filter vehicles based on status
      const filteredVeiculos = (veiculosData || []).filter(v => {
        if (v.status === "Em estoque" || v.status === "Fora de Estoque") {
          return true;
        }
        if (v.status === "Vendido") {
          // Include only if sold in last 3 months
          return veiculosVendidosRecentes.has(v.id);
        }
        return false;
      });

      setVeiculos(filteredVeiculos);
    } catch (error) {
      console.error("Erro ao carregar veículos:", error);
    } finally {
      setLoadingVeiculos(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Selecione uma imagem (JPG, PNG, WEBP, GIF) ou PDF.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Arquivo obrigatório",
        description: "Por favor, anexe um arquivo PDF ou imagem.",
        variant: "destructive",
      });
      return;
    }

    if (!webhookUrl) {
      toast({
        title: "Webhook não configurado",
        description: "O link do webhook não está configurado. Verifique as configurações.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data:*/*;base64, prefix
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const payload = {
        tipo,
        descricao: descricao.trim(),
        placa: selectedVeiculo?.placa || null,
        arquivo: {
          nome: file.name,
          tipo_mime: file.type,
          base64,
        },
      };

      // Send to webhook
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      toast({
        title: "Enviado com sucesso!",
        description: "O lançamento foi enviado para processamento.",
      });

      // Navigate back
      navigate(tipo === "Pagar" ? "/financeiro/pagar" : "/financeiro/receber");
    } catch (error: any) {
      console.error("Erro ao enviar:", error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o lançamento.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="animate-fade-in min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Lançamento Rápido</h1>
          <p className="text-sm text-muted-foreground">
            Envie um comprovante para processamento automático
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-6 max-w-lg mx-auto w-full">
        {/* Tipo Selection */}
        <div className="space-y-3">
          <Label className="text-base">Tipo de Lançamento</Label>
          <RadioGroup
            value={tipo}
            onValueChange={(value) => setTipo(value as "Pagar" | "Receber")}
            className="grid grid-cols-2 gap-3"
          >
            <div>
              <RadioGroupItem
                value="Pagar"
                id="pagar"
                className="peer sr-only"
              />
              <Label
                htmlFor="pagar"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 cursor-pointer transition-all",
                  "hover:bg-accent/10 hover:border-accent/50",
                  tipo === "Pagar" && "border-red-500 bg-red-500/10"
                )}
              >
                <ArrowDownCircle className={cn(
                  "w-8 h-8",
                  tipo === "Pagar" ? "text-red-500" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "font-medium",
                  tipo === "Pagar" ? "text-red-500" : "text-muted-foreground"
                )}>
                  Despesa
                </span>
              </Label>
            </div>
            <div>
              <RadioGroupItem
                value="Receber"
                id="receber"
                className="peer sr-only"
              />
              <Label
                htmlFor="receber"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 cursor-pointer transition-all",
                  "hover:bg-accent/10 hover:border-accent/50",
                  tipo === "Receber" && "border-green-500 bg-green-500/10"
                )}
              >
                <ArrowUpCircle className={cn(
                  "w-8 h-8",
                  tipo === "Receber" ? "text-green-500" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "font-medium",
                  tipo === "Receber" ? "text-green-500" : "text-muted-foreground"
                )}>
                  Receita
                </span>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Vehicle Selection */}
        <div className="space-y-3">
          <Label className="text-base">
            Veículo <span className="text-muted-foreground text-sm">(opcional)</span>
          </Label>
          <Popover open={veiculoOpen} onOpenChange={setVeiculoOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={veiculoOpen}
                className="w-full justify-between h-12 bg-background/50"
              >
                {selectedVeiculo ? (
                  <div className="flex items-center gap-2 truncate">
                    <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {selectedVeiculo.placa} - {selectedVeiculo.fabricante} {selectedVeiculo.modelo}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Selecione um veículo
                  </span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] max-w-lg p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar por placa ou modelo..." />
                <CommandList>
                  <CommandEmpty>
                    {loadingVeiculos ? "Carregando..." : "Nenhum veículo encontrado."}
                  </CommandEmpty>
                  <CommandGroup>
                    {veiculos.map((veiculo) => (
                      <CommandItem
                        key={veiculo.id}
                        value={`${veiculo.placa} ${veiculo.fabricante} ${veiculo.modelo}`}
                        onSelect={() => {
                          setSelectedVeiculo(
                            selectedVeiculo?.id === veiculo.id ? null : veiculo
                          );
                          setVeiculoOpen(false);
                        }}
                        className="py-3"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedVeiculo?.id === veiculo.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{veiculo.placa}</span>
                          <span className="text-xs text-muted-foreground">
                            {veiculo.fabricante} {veiculo.modelo}
                            {veiculo.status && (
                              <span className={cn(
                                "ml-2 px-1.5 py-0.5 rounded text-[10px]",
                                veiculo.status === "Em estoque" && "bg-green-500/20 text-green-600",
                                veiculo.status === "Fora de Estoque" && "bg-yellow-500/20 text-yellow-600",
                                veiculo.status === "Vendido" && "bg-blue-500/20 text-blue-600"
                              )}>
                                {veiculo.status}
                              </span>
                            )}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedVeiculo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVeiculo(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar seleção
            </Button>
          )}
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <Label className="text-base">Comprovante</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-muted-foreground/30 rounded-lg p-8",
                "flex flex-col items-center justify-center gap-3 cursor-pointer",
                "hover:border-accent/50 hover:bg-accent/5 transition-colors"
              )}
            >
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium text-foreground">
                  Toque para selecionar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF ou Imagem (máx. 10MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="relative border border-border rounded-lg overflow-hidden">
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-full h-48 object-contain bg-muted/20"
                />
              ) : (
                <div className="w-full h-48 flex items-center justify-center bg-muted/20">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="w-12 h-12" />
                    <span className="text-sm font-medium">{file.name}</span>
                  </div>
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={removeFile}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="p-3 bg-muted/30 border-t border-border">
                <div className="flex items-center gap-2">
                  {file.type.startsWith("image/") ? (
                    <FileImage className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <FileText className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-3">
          <Label htmlFor="descricao" className="text-base">
            Descrição <span className="text-muted-foreground text-sm">(opcional)</span>
          </Label>
          <Textarea
            id="descricao"
            placeholder="Ex: Conta de luz, Combustível, Recebimento cliente..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="min-h-[100px] bg-background/50"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 pb-6">
          <Button
            onClick={handleSubmit}
            disabled={!file || sending}
            className={cn(
              "w-full h-14 text-lg font-medium",
              tipo === "Pagar" 
                ? "bg-red-600 hover:bg-red-700" 
                : "bg-green-600 hover:bg-green-700"
            )}
          >
            {sending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Enviar Lançamento
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinanceiroFast;
