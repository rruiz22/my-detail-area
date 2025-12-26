/**
 * useVehicleImagesCache - Optimized hook for caching vehicle images
 *
 * This hook pre-loads all vehicle images from the Stock inventory in a single query,
 * eliminating the need for per-page image queries (reduces 40+ queries to 1).
 *
 * Usage:
 *   const { getImageUrl, isLoading } = useVehicleImagesCache();
 *   const imageUrl = getImageUrl(vehicle.vin);
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { validateDealershipObject } from '@/utils/dealerValidation';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useCallback, useMemo } from 'react';

interface VehicleImagesCacheResult {
  /** Get the image URL for a vehicle by VIN */
  getImageUrl: (vin: string) => string | undefined;
  /** Check if we have an image for a specific VIN */
  hasImage: (vin: string) => boolean;
  /** Get all cached image URLs as a Map */
  imagesMap: Map<string, string>;
  /** Whether the images are still loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Number of images cached */
  imageCount: number;
  /** Refetch images */
  refetch: () => void;
}

/**
 * Hook to pre-load and cache all vehicle images from Stock inventory
 *
 * Benefits:
 * - Single query on mount instead of per-page queries
 * - Cached for 10 minutes (configurable via CACHE_TIMES)
 * - Instant image lookups via Map
 * - Reduces network requests from 40+ to 1 for 200 vehicles
 */
export function useVehicleImagesCache(): VehicleImagesCacheResult {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);

  const {
    data: imagesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['vehicle-images-cache', currentDealership?.id],
    queryFn: async () => {
      if (!dealerId) {
        return new Map<string, string>();
      }

      // Single query to get ALL vehicle images for this dealer
      const { data, error } = await supabase
        .from('dealer_vehicle_inventory')
        .select('vin, key_photo_url')
        .eq('dealer_id', dealerId)
        .not('key_photo_url', 'is', null)
        .not('vin', 'is', null);

      if (error) {
        console.error('[VehicleImagesCache] Error fetching images:', error);
        throw error;
      }

      // Build VIN -> URL map
      const imageMap = new Map<string, string>();
      if (data) {
        data.forEach((row) => {
          if (row.vin && row.key_photo_url) {
            imageMap.set(row.vin, row.key_photo_url);
          }
        });
      }

      console.log(`📸 [VehicleImagesCache] Loaded ${imageMap.size} vehicle images in single query`);
      return imageMap;
    },
    enabled: !!dealerId,
    staleTime: CACHE_TIMES.LONG, // 10 minutes - images don't change frequently
    gcTime: GC_TIMES.LONG, // 30 minutes garbage collection
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Memoize the images map
  const imagesMap = useMemo(() => {
    return imagesData || new Map<string, string>();
  }, [imagesData]);

  // Callback to get image URL by VIN
  const getImageUrl = useCallback((vin: string): string | undefined => {
    if (!vin || !imagesMap) return undefined;
    return imagesMap.get(vin);
  }, [imagesMap]);

  // Callback to check if we have an image
  const hasImage = useCallback((vin: string): boolean => {
    if (!vin || !imagesMap) return false;
    return imagesMap.has(vin);
  }, [imagesMap]);

  return {
    getImageUrl,
    hasImage,
    imagesMap,
    isLoading,
    error: error as Error | null,
    imageCount: imagesMap.size,
    refetch
  };
}

/**
 * Lightweight hook that only returns the getImageUrl function
 * Use this in components that only need to look up images
 */
export function useGetVehicleImage() {
  const { getImageUrl, isLoading } = useVehicleImagesCache();
  return { getImageUrl, isLoading };
}

export default useVehicleImagesCache;
