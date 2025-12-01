import { useState, useEffect } from 'react';
import { StorageManager } from '../utils/storageManager';

export function useVehicleMainPhoto(vehicleId: number, fallbackPhoto: string | null) {
  const [mainPhoto, setMainPhoto] = useState<string | null>(fallbackPhoto);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) return;

    let cancelled = false;

    const loadMainPhoto = async () => {
      setLoading(true);
      // Reset to fallback immediately to avoid showing stale photos
      setMainPhoto(fallbackPhoto ?? null);

      try {
        const storageManager = new StorageManager(vehicleId);
        const metadata = await storageManager.loadMetadata();

        if (cancelled) return;

        if (metadata && metadata.photos.length > 0 && metadata.vehicleId === vehicleId) {
          const main = metadata.photos.find((p) => p.isMain) || metadata.photos[0];
          setMainPhoto(main.url);
        } else {
          setMainPhoto(fallbackPhoto ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setMainPhoto(fallbackPhoto ?? null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMainPhoto();

    return () => {
      cancelled = true;
    };
  }, [vehicleId, fallbackPhoto]);

  return { mainPhoto, loading };
}
