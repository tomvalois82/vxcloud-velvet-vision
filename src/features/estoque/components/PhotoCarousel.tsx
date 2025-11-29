import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhotoMetadata } from '../utils/storageManager';
import { cn } from '@/lib/utils';

interface PhotoCarouselProps {
  photos: PhotoMetadata[];
  initialIndex?: number;
  onClose: () => void;
  onSetMain?: (photoKey: string) => void;
  onRemove?: (photoKey: string) => void;
}

export function PhotoCarousel({
  photos,
  initialIndex = 0,
  onClose,
  onSetMain,
  onRemove,
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, photos.length]);

  const goToPrevious = () => {
    setIsLoading(true);
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setIsLoading(true);
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const currentPhoto = photos[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-foreground hover:bg-accent/20"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      <div className="absolute top-4 left-4 text-foreground">
        {currentIndex + 1} / {photos.length}
      </div>

      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground hover:bg-accent/20"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground hover:bg-accent/20"
            onClick={goToNext}
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </>
      )}

      <div className="relative max-w-5xl max-h-[80vh] mx-auto">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <img
          src={currentPhoto.url}
          alt={`Foto ${currentIndex + 1}`}
          className={cn(
            'max-w-full max-h-[80vh] object-contain rounded-lg',
            isLoading && 'opacity-0'
          )}
          onLoad={() => setIsLoading(false)}
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {onSetMain && !currentPhoto.isMain && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onSetMain(currentPhoto.key)}
            className="gap-2"
          >
            <Star className="w-4 h-4" />
            Definir como principal
          </Button>
        )}
        {onRemove && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onRemove(currentPhoto.key);
              if (photos.length === 1) {
                onClose();
              } else if (currentIndex === photos.length - 1) {
                setCurrentIndex(currentIndex - 1);
              }
            }}
          >
            Remover foto
          </Button>
        )}
      </div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
        {photos.map((_, index) => (
          <button
            key={index}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              index === currentIndex
                ? 'bg-accent w-8'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
            onClick={() => {
              setIsLoading(true);
              setCurrentIndex(index);
            }}
          />
        ))}
      </div>
    </div>
  );
}
