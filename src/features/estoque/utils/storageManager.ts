import { supabase } from '@/integrations/supabase/client';
import { generateFileName } from './imageCompression';

export interface PhotoMetadata {
  key: string;
  url: string;
  thumbUrl?: string;
  isMain: boolean;
  uploadedAt: string;
  originalName: string;
}

export interface VehicleMetadata {
  vehicleId: number;
  photos: PhotoMetadata[];
}

const BUCKET_NAME = 'car-fotos';

export class StorageManager {
  private vehicleId: number;
  private basePath: string;

  constructor(vehicleId: number) {
    this.vehicleId = vehicleId;
    this.basePath = `veiculos/${vehicleId}`;
  }

  async uploadPhoto(file: File, isMain: boolean = false): Promise<PhotoMetadata> {
    const fileName = generateFileName(file.name);
    const filePath = `${this.basePath}/${fileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Falha no upload: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      key: filePath,
      url: publicUrl,
      isMain,
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
    };
  }

  async uploadThumbnail(file: File, originalFileName: string): Promise<string> {
    const fileName = generateFileName(originalFileName);
    const thumbPath = `${this.basePath}/thumbs/${fileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(thumbPath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Thumbnail upload error:', error);
      throw new Error('Falha ao enviar miniatura');
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(thumbPath);

    return publicUrl;
  }

  async deletePhoto(filePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      throw new Error('Falha ao deletar foto');
    }
  }

  async deleteAllPhotos(): Promise<void> {
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(this.basePath);

    if (listError) {
      console.error('List error:', listError);
      return;
    }

    if (!files || files.length === 0) return;

    const filePaths = files.map((file) => `${this.basePath}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) {
      console.error('Batch delete error:', deleteError);
    }
  }

  async saveMetadata(metadata: VehicleMetadata): Promise<void> {
    const metadataPath = `${this.basePath}/metadata.json`;
    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(metadataPath, blob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Metadata save error:', error);
      throw new Error('Falha ao salvar metadados');
    }
  }

  async loadMetadata(): Promise<VehicleMetadata | null> {
    const metadataPath = `${this.basePath}/metadata.json`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(metadataPath);

    if (error) {
      console.error('Metadata load error:', error);
      return null;
    }

    const text = await data.text();
    return JSON.parse(text);
  }
}

export async function uploadWithRetry<T>(
  uploadFn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Upload falhou após múltiplas tentativas');
}
