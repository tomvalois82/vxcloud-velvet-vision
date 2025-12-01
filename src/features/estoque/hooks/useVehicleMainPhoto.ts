import { useState, useEffect } from 'react';
import { StorageManager } from '../utils/storageManager';

export function useVehicleMainPhoto(vehicleId: number, fallbackPhoto: string | null) {
  const [mainPhoto, setMainPhoto] = useState<string | null>(fallbackPhoto);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadMainPhoto = async () => {
      try {
        setLoading(true);
        const storageManager = new StorageManager(vehicleId);
        const metadata = await storageManager.loadMetadata();

        if (isMounted && metadata && metadata.photos.length > 0) {
          // Find the main photo or use the first one
          const main = metadata.photos.find((p) => p.isMain) || metadata.photos[0];
          setMainPhoto(main.url);
        } else if (isMounted) {
          // No metadata, use fallback
          setMainPhoto(fallbackPhoto);
        }
      } catch (error) {
        // Metadata doesn't exist, use fallback
        if (isMounted) {
          setMainPhoto(fallbackPhoto);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMainPhoto();

    return () => {
      isMounted = false;
    };
  }, [vehicleId, fallbackPhoto]);

  return { mainPhoto, loading };
}
