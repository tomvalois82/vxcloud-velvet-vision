import { useState, useEffect } from "react";
import {
  Loader2,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface Anexo {
  id: string;
  id_movimento: string;
  nome_arquivo: string;
  url_arquivo: string | null;
  tipo_mime: string | null;
  base64: string | null;
}

// Helper to get file source (base64 prioritized, URL as fallback)
const getFileSource = (anexo: Anexo): string | null => {
  // Priorizar base64
  if (anexo.base64 && anexo.tipo_mime) {
    return `data:${anexo.tipo_mime};base64,${anexo.base64}`;
  }
  if (anexo.base64) {
    return `data:application/octet-stream;base64,${anexo.base64}`;
  }
  // Fallback para url_arquivo
  if (anexo.url_arquivo) {
    return anexo.url_arquivo;
  }
  return null;
};

// Helper to download base64 file
const downloadBase64File = (anexo: Anexo) => {
  const source = getFileSource(anexo);
  if (!source) return;
  
  const link = document.createElement("a");
  link.href = source;
  link.download = anexo.nome_arquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface AnexosViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimentoId: string | null;
  descricaoMovimento?: string;
}

const ACCEPTED_TYPES = {
  images: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  videos: ["video/mp4", "video/webm", "video/quicktime"],
};

export function AnexosViewerDialog({
  open,
  onOpenChange,
  movimentoId,
  descricaoMovimento,
}: AnexosViewerDialogProps) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  useEffect(() => {
    if (open && movimentoId) {
      fetchAnexos();
    }
  }, [open, movimentoId]);

  const fetchAnexos = async () => {
    if (!movimentoId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vx_fin_anexo")
        .select("*")
        .eq("id_movimento", movimentoId)
        .order("nome_arquivo");

      if (error) throw error;
      setAnexos(data || []);
    } catch (error) {
      console.error("Erro ao carregar anexos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (tipo: string | null) => {
    if (!tipo) return <File className="w-5 h-5" />;
    if (ACCEPTED_TYPES.images.includes(tipo)) return <ImageIcon className="w-5 h-5" />;
    if (ACCEPTED_TYPES.videos.includes(tipo)) return <Video className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const handlePreview = (anexo: Anexo) => {
    const source = getFileSource(anexo);
    setPreviewUrl(source);
    setPreviewType(anexo.tipo_mime);
  };

  const handleDownload = (anexo: Anexo) => {
    if (anexo.url_arquivo) {
      window.open(anexo.url_arquivo, "_blank");
    } else {
      downloadBase64File(anexo);
    }
  };

  const canPreview = (anexo: Anexo) => {
    const tipo = anexo.tipo_mime;
    const hasSource = anexo.url_arquivo || anexo.base64;
    if (!tipo || !hasSource) return false;
    return (
      ACCEPTED_TYPES.images.includes(tipo) ||
      ACCEPTED_TYPES.videos.includes(tipo) ||
      tipo === "application/pdf"
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card max-w-lg">
          <DialogHeader>
            <DialogTitle>Comprovantes Anexados</DialogTitle>
            {descricaoMovimento && (
              <p className="text-sm text-muted-foreground">{descricaoMovimento}</p>
            )}
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : anexos.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              Nenhum anexo encontrado
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {anexos.map((anexo) => (
                <div
                  key={anexo.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="text-muted-foreground">
                    {getFileIcon(anexo.tipo_mime)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {anexo.nome_arquivo}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {canPreview(anexo) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-accent/20"
                        onClick={() => handlePreview(anexo)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-accent/20"
                      onClick={() => handleDownload(anexo)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="glass-card sm:max-w-[800px] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualização</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewType && ACCEPTED_TYPES.images.includes(previewType) && (
              <img
                src={previewUrl || ""}
                alt="Preview"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
            {previewType && ACCEPTED_TYPES.videos.includes(previewType) && (
              <video
                src={previewUrl || ""}
                controls
                className="max-w-full max-h-[70vh] rounded-lg"
              />
            )}
            {previewType === "application/pdf" && (
              <iframe
                src={previewUrl || ""}
                className="w-full h-[70vh] rounded-lg"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
