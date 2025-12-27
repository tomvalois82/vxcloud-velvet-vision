import { useState, useEffect, useRef } from "react";
import {
  Paperclip,
  Upload,
  Loader2,
  X,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Eye,
  Download,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import imageCompression from "browser-image-compression";

const BUCKET_NAME = "bucket";
const MAX_FILES = 12;
const MAX_SIZE_MB = 2;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface Anexo {
  id: string;
  id_movimento: string;
  nome_arquivo: string;
  url_arquivo: string | null;
  tipo_mime: string | null;
  base64: string | null;
}

// Helper to get file source (URL or base64 data URI)
const getFileSource = (anexo: Anexo): string | null => {
  if (anexo.url_arquivo) {
    return anexo.url_arquivo;
  }
  if (anexo.base64 && anexo.tipo_mime) {
    return `data:${anexo.tipo_mime};base64,${anexo.base64}`;
  }
  if (anexo.base64) {
    return `data:application/octet-stream;base64,${anexo.base64}`;
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

interface AnexosManagerProps {
  movimentoId: string | null;
  onAnexosChange?: (count: number) => void;
}

// Supported file types
const ACCEPTED_TYPES = {
  images: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
  videos: ["video/mp4", "video/webm", "video/quicktime"],
  documents: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ],
};

const ALL_ACCEPTED = [
  ...ACCEPTED_TYPES.images,
  ...ACCEPTED_TYPES.videos,
  ...ACCEPTED_TYPES.documents,
];

export function AnexosManager({ movimentoId, onAnexosChange }: AnexosManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [anexoToDelete, setAnexoToDelete] = useState<Anexo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch existing attachments
  useEffect(() => {
    if (movimentoId) {
      fetchAnexos();
    } else {
      setAnexos([]);
    }
  }, [movimentoId]);

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
      onAnexosChange?.(data?.length || 0);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar anexos",
        description: error.message,
        variant: "destructive",
      });
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

  const compressFile = async (file: File): Promise<File> => {
    // Only compress images and videos over 2MB
    if (file.size <= MAX_SIZE_BYTES) return file;

    if (ACCEPTED_TYPES.images.includes(file.type)) {
      // Compress image
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: MAX_SIZE_MB,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
        return compressedFile;
      } catch (error) {
        console.error("Error compressing image:", error);
        return file;
      }
    }

    if (ACCEPTED_TYPES.videos.includes(file.type)) {
      // For videos, we can't compress easily on client-side
      // Just warn the user
      toast({
        title: "Aviso",
        description: `O vídeo "${file.name}" é grande (${(file.size / 1024 / 1024).toFixed(1)}MB). O upload pode demorar.`,
      });
      return file;
    }

    return file;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !movimentoId) return;

    // Check max files limit
    if (anexos.length + files.length > MAX_FILES) {
      toast({
        title: "Limite excedido",
        description: `Máximo de ${MAX_FILES} arquivos por título.`,
        variant: "destructive",
      });
      return;
    }

    // Validate file types
    const invalidFiles = files.filter((f) => !ALL_ACCEPTED.includes(f.type));
    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivos inválidos",
        description: "Alguns arquivos têm formato não suportado e foram ignorados.",
        variant: "destructive",
      });
    }

    const validFiles = files.filter((f) => ALL_ACCEPTED.includes(f.type));
    if (!validFiles.length) return;

    setUploading(true);
    try {
      for (const file of validFiles) {
        // Compress if needed
        const processedFile = await compressFile(file);

        // Generate unique filename
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `movimentos/${movimentoId}/${timestamp}-${safeFileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, processedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        // Save to database
        const { error: dbError } = await supabase.from("vx_fin_anexo").insert({
          id_movimento: movimentoId,
          nome_arquivo: file.name,
          url_arquivo: publicUrl,
          tipo_mime: file.type,
        });

        if (dbError) throw dbError;
      }

      toast({
        title: "Upload concluído",
        description: `${validFiles.length} arquivo(s) enviado(s) com sucesso.`,
      });

      fetchAnexos();
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

  const handleDeleteClick = (anexo: Anexo) => {
    setAnexoToDelete(anexo);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!anexoToDelete) return;

    setDeleting(true);
    try {
      // Only delete from storage if we have a url_arquivo
      if (anexoToDelete.url_arquivo) {
        const urlParts = anexoToDelete.url_arquivo.split("/");
        const pathIndex = urlParts.findIndex((p) => p === "movimentos");
        if (pathIndex !== -1) {
          const filePath = urlParts.slice(pathIndex).join("/");
          await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from("vx_fin_anexo")
        .delete()
        .eq("id", anexoToDelete.id);

      if (error) throw error;

      toast({
        title: "Anexo excluído",
        description: "O arquivo foi removido com sucesso.",
      });

      fetchAnexos();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setAnexoToDelete(null);
    }
  };

  if (!movimentoId) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Salve o título para adicionar anexos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Paperclip className="w-4 h-4" />
          Anexos ({anexos.length}/{MAX_FILES})
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALL_ACCEPTED.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || anexos.length >= MAX_FILES}
          className="border-border/50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Anexar Arquivos
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
        </div>
      ) : anexos.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-3 border border-dashed border-border/50 rounded-lg">
          Nenhum arquivo anexado
        </div>
      ) : (
        <div className="space-y-2">
          {anexos.map((anexo) => (
            <div
              key={anexo.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-background/30 border border-border/30"
            >
              <div className="text-muted-foreground">
                {getFileIcon(anexo.tipo_mime)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {anexo.nome_arquivo}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {(ACCEPTED_TYPES.images.includes(anexo.tipo_mime || "") ||
                  ACCEPTED_TYPES.videos.includes(anexo.tipo_mime || "") ||
                  anexo.tipo_mime === "application/pdf") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-accent/20"
                    onClick={() => handlePreview(anexo)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-accent/20"
                  onClick={() => handleDownload(anexo)}
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-destructive/20 text-destructive"
                  onClick={() => handleDeleteClick(anexo)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="glass-strong border-border/50 sm:max-w-[800px] max-h-[90vh]">
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-strong border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir o arquivo "{anexoToDelete?.nome_arquivo}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
