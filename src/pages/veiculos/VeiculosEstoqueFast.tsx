import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Car
} from "lucide-react";
import imageCompression from "browser-image-compression";

// Compression options for OCR - good quality for text recognition
const OCR_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5, // Max 500KB
  maxWidthOrHeight: 1400, // Good resolution for OCR
  useWebWorker: true,
  fileType: "image/jpeg" as const,
  initialQuality: 0.7,
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
    return file;
  }
}



const VeiculosEstoqueFast = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ id: number; placa: string; modelo: string } | null>(null);

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

    setSending(true);
    setResult(null);

    try {
      // Get user's empresa and webhook URL from config
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { data: usuario } = await supabase
        .from("usuario")
        .select("config")
        .eq("auth_id", userData.user.id)
        .single();

      if (!usuario?.config) throw new Error("Configuração não encontrada");

      const { data: config } = await supabase
        .from("config")
        .select("link_wh_ocr_estoque")
        .eq("id", usuario.config)
        .single();

      if (!config?.link_wh_ocr_estoque) throw new Error("Webhook não configurado");

      const { data: empresa } = await supabase
        .from("empresa")
        .select("id")
        .eq("id_config", usuario.config)
        .single();

      if (!empresa) throw new Error("Empresa não encontrada");

      // Compress image before sending
      const fileToSend = await compressImageForOCR(file);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileToSend);
      });

      const payload = {
        id_empresa: empresa.id,
        descricao: descricao.trim(),
        arquivo: {
          nome: file.name,
          tipo_mime: file.type,
          base64,
        },
      };

      // Send to webhook
      const response = await fetch(config.link_wh_ocr_estoque, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      // Parse response
      const raw = await response.text();
      let responseData: any;
      try {
        responseData = raw ? JSON.parse(raw) : null;
      } catch {
        console.error("Resposta inválida do webhook:", raw);
        throw new Error("Resposta inválida do webhook. Tente novamente.");
      }

      console.log("Webhook response:", responseData);

      const veiculoData = Array.isArray(responseData) ? responseData[0] : responseData;
      const veiculoId = veiculoData?.id_estoque;

      if (!veiculoId || veiculoId === "" || veiculoId === "erro") {
        throw new Error("Erro ao processar o veículo. Tente novamente.");
      }

      // Fetch vehicle details from database
      const { data: veiculo, error: veiculoError } = await supabase
        .from("estoque")
        .select("id, placa, modelo")
        .eq("id", veiculoId)
        .maybeSingle();

      if (veiculoError) throw veiculoError;

      if (!veiculo) {
        throw new Error("Veículo não encontrado no banco de dados.");
      }

      setResult({
        id: veiculo.id,
        placa: veiculo.placa || "Sem placa",
        modelo: veiculo.modelo || "Sem modelo",
      });

      toast({
        title: "Veículo cadastrado!",
        description: "O veículo foi processado com sucesso.",
      });

      // Clear form for next entry
      setFile(null);
      setFilePreview(null);
      setDescricao("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Erro ao enviar:", error);
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível processar o veículo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleViewVehicle = () => {
    if (result) {
      navigate(`/veiculos/estoque`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/veiculos/estoque")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Estoque Fast</h1>
            <p className="text-sm text-muted-foreground">
              Cadastro rápido via OCR
            </p>
          </div>
        </div>
      </div>

      <div className="container py-6 max-w-2xl mx-auto space-y-6">
        {/* Result Card */}
        {result && (
          <div className="rounded-lg border bg-card p-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Car className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Veículo Cadastrado</h3>
                <p className="text-sm text-muted-foreground">
                  {result.modelo} • {result.placa}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewVehicle}
              >
                Ver Estoque
              </Button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div className="space-y-4">
          <Label>Documento do Veículo</Label>
          
          {!file ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-accent transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                Clique para selecionar ou arraste um arquivo
              </p>
              <p className="text-xs text-muted-foreground">
                PDF ou imagem (JPG, PNG, WEBP) • Máximo 10MB
              </p>
            </div>
          ) : (
            <div className="relative rounded-lg border bg-card overflow-hidden">
              {filePreview ? (
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-full max-h-64 object-contain bg-muted"
                />
              ) : (
                <div className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                    {file.type === "application/pdf" ? (
                      <FileText className="w-6 h-6 text-red-500" />
                    ) : (
                      <FileImage className="w-6 h-6 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={removeFile}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Observações (opcional)</Label>
          <Textarea
            placeholder="Informações adicionais sobre o veículo..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!file || sending}
        >
          {sending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Enviar para Cadastro
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            O documento será processado via OCR para extrair automaticamente
            os dados do veículo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VeiculosEstoqueFast;
