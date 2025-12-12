import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Star, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoMetadata, StorageManager } from '../utils/storageManager';
import { PhotoCarousel } from './PhotoCarousel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Helper function to sync photo URLs to estoque.fotos
async function syncPhotosToDatabase(vehicleId: number, photos: PhotoMetadata[]) {
  const photoUrls = photos.map(photo => photo.url);
  await supabase
    .from('estoque')
    .update({ fotos: photoUrls })
    .eq('id', vehicleId);
}

interface PhotoManagerProps {
  vehicleId: number;
  photos: PhotoMetadata[];
  onPhotosChange: (photos: PhotoMetadata[]) => void;
}

function SortablePhoto({
  photo,
  onView,
  onSetMain,
  onRemove,
}: {
  photo: PhotoMetadata;
  onView: () => void;
  onSetMain: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.key,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative glass rounded-lg overflow-hidden group',
        isDragging && 'opacity-50 cursor-grabbing'
      )}
    >
      <img
        src={photo.thumbUrl || photo.url}
        alt="Foto do veículo"
        className="w-full h-32 object-cover"
      />

      {photo.isMain && (
        <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
          <Star className="w-3 h-3 fill-current" />
          Principal
        </div>
      )}

      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 z-20 cursor-grab active:cursor-grabbing bg-background/80 backdrop-blur-sm rounded p-1.5 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
      </div>

      <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={onView}>
          <Eye className="w-4 h-4" />
        </Button>
        {!photo.isMain && (
          <Button variant="secondary" size="sm" onClick={onSetMain}>
            <Star className="w-4 h-4" />
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={onRemove}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function PhotoManager({ vehicleId, photos, onPhotosChange }: PhotoManagerProps) {
  const [items, setItems] = useState<PhotoMetadata[]>(photos);
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null);
  const [photoToRemove, setPhotoToRemove] = useState<PhotoMetadata | null>(null);

  // Sync items with photos prop whenever vehicleId or photos change
  useEffect(() => {
    setItems(photos);
  }, [vehicleId, photos]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.key === active.id);
        const newIndex = items.findIndex((item) => item.key === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Save to storage and database
        const storageManager = new StorageManager(vehicleId);
        Promise.all([
          storageManager.saveMetadata({
            vehicleId,
            photos: newItems,
          }),
          syncPhotosToDatabase(vehicleId, newItems)
        ])
          .then(() => {
            onPhotosChange(newItems);
            toast({
              title: 'Ordem atualizada',
              description: 'A ordem das fotos foi salva com sucesso',
            });
          })
          .catch((error) => {
            console.error('Failed to save order:', error);
            toast({
              title: 'Erro',
              description: 'Falha ao salvar a ordem das fotos',
              variant: 'destructive',
            });
          });

        return newItems;
      });
    }
  };

  const handleSetMain = async (photoKey: string) => {
    const newItems = items.map((photo) => ({
      ...photo,
      isMain: photo.key === photoKey,
    }));

    setItems(newItems);

    const storageManager = new StorageManager(vehicleId);
    try {
      await storageManager.saveMetadata({
        vehicleId,
        photos: newItems,
      });
      onPhotosChange(newItems);
      toast({
        title: 'Foto principal atualizada',
        description: 'A foto principal foi definida com sucesso',
      });
    } catch (error) {
      console.error('Failed to set main photo:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao definir foto principal',
        variant: 'destructive',
      });
    }
  };

  const confirmRemove = async () => {
    if (!photoToRemove) return;

    const storageManager = new StorageManager(vehicleId);
    try {
      // Delete main photo
      await storageManager.deletePhoto(photoToRemove.key);
      
      // Delete thumbnail if it exists
      if (photoToRemove.thumbUrl) {
        // Extract filename from the main photo key (e.g., "veiculos/123/photo.jpg" -> "photo.jpg")
        const fileName = photoToRemove.key.split('/').pop();
        if (fileName) {
          const thumbPath = `veiculos/${vehicleId}/thumbs/${fileName}`;
          await storageManager.deletePhoto(thumbPath);
        }
      }

      const newItems = items.filter((photo) => photo.key !== photoToRemove.key);
      
      // If removed photo was main, set first photo as main
      if (photoToRemove.isMain && newItems.length > 0) {
        newItems[0].isMain = true;
      }

      setItems(newItems);
      
      // Save to storage and database
      await Promise.all([
        storageManager.saveMetadata({
          vehicleId,
          photos: newItems,
        }),
        syncPhotosToDatabase(vehicleId, newItems)
      ]);

      onPhotosChange(newItems);
      toast({
        title: 'Foto removida',
        description: 'A foto foi excluída com sucesso',
      });
    } catch (error) {
      console.error('Failed to remove photo:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover foto',
        variant: 'destructive',
      });
    } finally {
      setPhotoToRemove(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="glass rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Nenhuma foto adicionada ainda</p>
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((p) => p.key)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {items.map((photo, index) => (
              <SortablePhoto
                key={photo.key}
                photo={photo}
                onView={() => setCarouselIndex(index)}
                onSetMain={() => handleSetMain(photo.key)}
                onRemove={() => setPhotoToRemove(photo)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {carouselIndex !== null && (
        <PhotoCarousel
          photos={items}
          initialIndex={carouselIndex}
          onClose={() => setCarouselIndex(null)}
          onSetMain={handleSetMain}
          onRemove={(key) => {
            const photo = items.find((p) => p.key === key);
            if (photo) setPhotoToRemove(photo);
          }}
        />
      )}

      <AlertDialog open={!!photoToRemove} onOpenChange={() => setPhotoToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta foto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
