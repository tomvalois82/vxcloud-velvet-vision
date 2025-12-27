import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
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
  Check,
  Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { maskCurrency } from "@/features/estoque/utils/masks";
import { MovimentoDialog } from "@/features/financeiro/components/MovimentoDialog";
import imageCompression from "browser-image-compression";

// Aggressive compression options for OCR - smallest possible while legible
const OCR_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.3, // Max 300KB
  maxWidthOrHeight: 1200, // Enough for OCR legibility
  useWebWorker: true,
  fileType: "image/jpeg" as const,
  initialQuality: 0.6, // Lower quality for smaller size
};

// Helper function to compress image for OCR
async function compressImageForOCR(file: File): Promise<File> {
  // Only compress images, not PDFs
  if (!file.type.startsWith("image/")) {
    return file;
  }

  try {
    console.log(`Original file size: ${(file.size / 1024).toFixed(2)} KB`);
    const compressedFile = await imageCompression(file, OCR_COMPRESSION_OPTIONS);
    console.log(`Compressed file size: ${(compressedFile.size / 1024).toFixed(2)} KB`);
    return compressedFile;
  } catch (error) {
    console.error("Error compressing image:", error);
    // Return original file if compression fails
    return file;
  }
}

interface VeiculoOption {
  id: number;
  placa: string;
  modelo: string | null;
  fabricante: string | null;
  status: string | null;
}

interface MovimentoResult {
  id: string;
  descricao: string | null;
  placa: string | null;
  forma_pagamento: string | null;
  data_compra: string | null;
  valor: number;
}

interface MovimentoForEdit {
  id: string;
  tipo_movimento: string;
  descricao: string;
  valor_bruto: number;
  valor_liquido: number;
  data_vencimento: string;
  data_pagamento: string | null;
  data_compra: string | null;
  id_conta: string;
  id_categoria: string;
  id_empresa: string;
  id_forma_pagamento: string | null;
  id_cartao: string | null;
  id_pessoa: string | null;
  observacoes: string | null;
  status: string;
  id_estoque: number | null;
  competencia?: string | null;
  recorrencia_id?: string | null;
  ordem_ocorrencia?: number | null;
  total_ocorrencias?: number | null;
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

  // Result state
  const [movimentoResult, setMovimentoResult] = useState<MovimentoResult | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [movimentoForEdit, setMovimentoForEdit] = useState<MovimentoForEdit | null>(null);

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
    setMovimentoResult(null);

    try {
      // Compress image before sending (if it's an image)
      const fileToSend = await compressImageForOCR(file);

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
        reader.readAsDataURL(fileToSend);
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

      // Send to webhook and wait for response
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

      // Parse response to get movement ID (webhook sometimes returns JSON with wrong headers)
      const raw = await response.text();
      let responseData: any;
      try {
        responseData = raw ? JSON.parse(raw) : null;
      } catch {
        console.error("Resposta inválida do webhook:", raw);
        throw new Error("Resposta inválida do webhook. Tente novamente.");
      }

      console.log("Webhook response:", responseData);

      const movimentoData = Array.isArray(responseData) ? responseData[0] : responseData;
      const movimentoId = movimentoData?.id ?? movimentoData?.id_movimento;

      // Check if ID is valid
      if (!movimentoId || movimentoId === "" || movimentoId === "erro") {
        throw new Error("Erro ao processar o lançamento. Tente novamente.");
      }

      // Fetch movement details from database
      const { data: movimento, error: movimentoError } = await supabase
        .from("vx_fin_movimento")
        .select(`
          id,
          descricao,
          data_compra,
          valor_bruto,
          id_forma_pagamento,
          id_estoque,
          vx_forma_pagamento (descricao),
          estoque (placa)
        `)
        .eq("id", movimentoId)
        .maybeSingle();

      if (movimentoError) throw movimentoError;

      if (!movimento) {
        throw new Error("Movimento não encontrado no banco de dados.");
      }

      // Set result data
      setMovimentoResult({
        id: movimento.id,
        descricao: movimento.descricao,
        placa: movimento.estoque?.placa || null,
        forma_pagamento: movimento.vx_forma_pagamento?.descricao || null,
        data_compra: movimento.data_compra,
        valor: movimento.valor_bruto,
      });

      toast({
        title: "Enviado com sucesso!",
        description: "O lançamento foi processado.",
      });

      // Clear form for next entry
      setFile(null);
      setFilePreview(null);
      setDescricao("");
      setSelectedVeiculo(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Erro ao enviar:", error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o lançamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleEditMovimento = async () => {
    if (!movimentoResult) return;

    try {
      // Fetch full movement data for editing
      const { data: movimento, error } = await supabase
        .from("vx_fin_movimento")
        .select("*")
        .eq("id", movimentoResult.id)
        .maybeSingle();

      if (error) throw error;

      if (movimento) {
        setMovimentoForEdit({
          id: movimento.id,
          tipo_movimento: movimento.tipo_movimento,
          descricao: movimento.descricao || "",
          valor_bruto: movimento.valor_bruto,
          valor_liquido: movimento.valor_liquido,
          data_vencimento: movimento.data_vencimento,
          data_pagamento: movimento.data_pagamento,
          data_compra: movimento.data_compra,
          id_conta: movimento.id_conta || "",
          id_categoria: movimento.id_categoria || "",
          id_empresa: movimento.id_empresa,
          id_forma_pagamento: movimento.id_forma_pagamento,
          id_cartao: movimento.id_cartao,
          id_pessoa: movimento.id_pessoa,
          observacoes: movimento.observacoes,
          status: movimento.status,
          id_estoque: movimento.id_estoque,
          competencia: movimento.competencia,
          recorrencia_id: movimento.recorrencia_id,
          ordem_ocorrencia: movimento.ordem_ocorrencia,
          total_ocorrencias: movimento.total_ocorrencias,
        });
        setEditDialogOpen(true);
      }
    } catch (error: any) {
      console.error("Erro ao carregar movimento:", error);
      toast({
        title: "Erro ao carregar movimento",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditSuccess = async () => {
    // Refresh movement result data after edit
    if (movimentoResult) {
      const { data: movimento } = await supabase
        .from("vx_fin_movimento")
        .select(`
          id,
          descricao,
          data_compra,
          valor_bruto,
          id_forma_pagamento,
          id_estoque,
          vx_forma_pagamento (descricao),
          estoque (placa)
        `)
        .eq("id", movimentoResult.id)
        .maybeSingle();

      if (movimento) {
        setMovimentoResult({
          id: movimento.id,
          descricao: movimento.descricao,
          placa: movimento.estoque?.placa || null,
          forma_pagamento: movimento.vx_forma_pagamento?.descricao || null,
          data_compra: movimento.data_compra,
          valor: movimento.valor_bruto,
        });
      }
    }
    setEditDialogOpen(false);
    setMovimentoForEdit(null);
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
        <div className="pt-4 pb-2">
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
                Processando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Enviar Lançamento
              </>
            )}
          </Button>
        </div>

        {/* Result Display */}
        {movimentoResult && (
          <div className="border border-border rounded-lg p-4 bg-muted/20 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium truncate">
                  {movimentoResult.descricao || "-"}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {movimentoResult.placa && (
                    <span className="flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {movimentoResult.placa}
                    </span>
                  )}
                  {movimentoResult.forma_pagamento && (
                    <span>{movimentoResult.forma_pagamento}</span>
                  )}
                  {movimentoResult.data_compra && (
                    <span>
                      {format(new Date(movimentoResult.data_compra + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn(
                  "font-semibold",
                  tipo === "Pagar" ? "text-red-500" : "text-green-500"
                )}>
                  {maskCurrency(movimentoResult.valor)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleEditMovimento}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="pb-6" />
      </div>

      {/* MovimentoDialog for full editing */}
      <MovimentoDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setMovimentoForEdit(null);
        }}
        movimento={movimentoForEdit}
        defaultTipo={tipo}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default FinanceiroFast;
