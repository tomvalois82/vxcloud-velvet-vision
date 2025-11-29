import { useState, useCallback } from 'react';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { validateImageFile, compressImage, createThumbnail } from '../utils/imageCompression';
import { StorageManager, uploadWithRetry, PhotoMetadata } from '../utils/storageManager';
import { toast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  vehicleId: number;
  onUploadComplete: (photos: PhotoMetadata[]) => void;
  maxFiles?: number;
}

interface UploadingFile {
  file: File;
  preview: string;
  progress: number;
  error?: string;
  uploading: boolean;
}

export function ImageUploader({ vehicleId, onUploadComplete, maxFiles = 10 }: ImageUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [globalProgress, setGlobalProgress] = useState(0);

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      
      if (fileArray.length + uploadingFiles.length > maxFiles) {
        toast({
          title: 'Limite excedido',
          description: `Máximo de ${maxFiles} fotos permitido`,
          variant: 'destructive',
        });
        return;
      }

      const newFiles: UploadingFile[] = [];

      for (const file of fileArray) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast({
            title: 'Arquivo inválido',
            description: validation.error,
            variant: 'destructive',
          });
          continue;
        }

        const preview = URL.createObjectURL(file);
        newFiles.push({
          file,
          preview,
          progress: 0,
          uploading: false,
        });
      }

      setUploadingFiles((prev) => [...prev, ...newFiles]);
    },
    [uploadingFiles.length, maxFiles]
  );

  const uploadFiles = async () => {
    const storageManager = new StorageManager(vehicleId);
    const uploaded: PhotoMetadata[] = [];
    let completed = 0;

    const filesToUpload = uploadingFiles.filter((f) => !f.error && !f.uploading);

    for (const uploadingFile of filesToUpload) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.preview === uploadingFile.preview ? { ...f, uploading: true, progress: 10 } : f
        )
      );

      try {
        // Compress main image
        const compressed = await compressImage(uploadingFile.file);
        
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.preview === uploadingFile.preview ? { ...f, progress: 40 } : f
          )
        );

        // Create thumbnail
        const thumbnail = await createThumbnail(uploadingFile.file);
        
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.preview === uploadingFile.preview ? { ...f, progress: 60 } : f
          )
        );

        // Upload with retry
        const photoMetadata = await uploadWithRetry(() =>
          storageManager.uploadPhoto(compressed, uploaded.length === 0)
        );

        const thumbUrl = await uploadWithRetry(() =>
          storageManager.uploadThumbnail(thumbnail, uploadingFile.file.name)
        );

        photoMetadata.thumbUrl = thumbUrl;
        uploaded.push(photoMetadata);

        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.preview === uploadingFile.preview ? { ...f, progress: 100 } : f
          )
        );

        completed++;
        setGlobalProgress((completed / filesToUpload.length) * 100);
      } catch (error) {
        console.error('Upload failed:', error);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.preview === uploadingFile.preview
              ? { ...f, error: 'Falha no upload', uploading: false }
              : f
          )
        );
      }
    }

    if (uploaded.length > 0) {
      await storageManager.saveMetadata({
        vehicleId,
        photos: uploaded,
      });

      onUploadComplete(uploaded);
      toast({
        title: 'Upload concluído',
        description: `${uploaded.length} foto(s) enviada(s) com sucesso`,
      });
    }

    setUploadingFiles([]);
    setGlobalProgress(0);
  };

  const removeFile = (preview: string) => {
    setUploadingFiles((prev) => {
      const file = prev.find((f) => f.preview === preview);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.preview !== preview);
    });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div className="space-y-4">
      <div
        className="glass rounded-lg border-2 border-dashed border-border hover:border-accent/50 transition-colors p-8 text-center cursor-pointer"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-foreground mb-2">
          Clique ou arraste fotos aqui
        </p>
        <p className="text-sm text-muted-foreground">
          JPG, PNG ou WEBP (máx. 10MB por arquivo)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Até {maxFiles} fotos
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {uploadingFiles.map((file) => (
              <div key={file.preview} className="relative glass rounded-lg overflow-hidden">
                <img
                  src={file.preview}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                />
                {file.uploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                )}
                {file.error && (
                  <div className="absolute inset-0 bg-destructive/80 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-destructive-foreground" />
                  </div>
                )}
                {!file.uploading && (
                  <button
                    onClick={() => removeFile(file.preview)}
                    className="absolute top-2 right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {file.progress > 0 && file.progress < 100 && (
                  <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                    <Progress value={file.progress} className="h-1" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {globalProgress > 0 && globalProgress < 100 && (
            <Alert>
              <AlertDescription>
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <div className="flex-1">
                    <Progress value={globalProgress} />
                  </div>
                  <span className="text-sm">{Math.round(globalProgress)}%</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={uploadFiles}
            disabled={uploadingFiles.some((f) => f.uploading) || uploadingFiles.every((f) => f.error)}
            className="w-full"
          >
            {uploadingFiles.some((f) => f.uploading) ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              `Enviar ${uploadingFiles.length} foto(s)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
