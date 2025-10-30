import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { VehiclePhoto } from './useVehiclePhotos';

interface UseStockPhotosForVehicleProps {
  vin: string;
  dealerId: number;
}

interface StockPhotosResult {
  photos: VehiclePhoto[];
  vehicleImageUrl?: string | null;
}

// Raw photo data from database
interface RawPhotoData {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  photo_url: string;
  storage_path?: string;
  is_key_photo: boolean;
  display_order: number;
  category: string;
  metadata?: Record<string, unknown>;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to fetch Stock photos for a vehicle by VIN
 *
 * This hook bridges Get Ready and Stock modules by:
 * 1. Finding the vehicle in Stock inventory by VIN
 * 2. Fetching all photos associated with that vehicle
 *
 * @param vin - Vehicle Identification Number
 * @param dealerId - Dealer ID for filtering
 * @returns Array of VehiclePhoto objects ordered by display_order
 */
export const useStockPhotosForVehicle = ({ vin, dealerId }: UseStockPhotosForVehicleProps) => {
  return useQuery({
    queryKey: ['stock-photos-by-vin', vin, dealerId],
    queryFn: async (): Promise<StockPhotosResult> => {
      // Return empty result if no VIN provided
      if (!vin || !dealerId) {
        console.log('[useStockPhotosForVehicle] No VIN or dealerId provided');
        return { photos: [], vehicleImageUrl: null };
      }

      console.log('[useStockPhotosForVehicle] Fetching photos for VIN:', vin);

      // Step 1: Find vehicle in Stock inventory by VIN (include key_photo_url)
      const { data: stockVehicle, error: stockError } = await supabase
        .from('dealer_vehicle_inventory')
        .select('id, key_photo_url')
        .eq('dealer_id', dealerId)
        .eq('vin', vin)
        .maybeSingle();

      if (stockError) {
        console.error('[useStockPhotosForVehicle] Error finding vehicle:', stockError);
        return { photos: [], vehicleImageUrl: null };
      }

      if (!stockVehicle) {
        console.log('[useStockPhotosForVehicle] Vehicle not found in Stock inventory for VIN:', vin);
        return { photos: [], vehicleImageUrl: null };
      }

      console.log('[useStockPhotosForVehicle] Found stock vehicle ID:', stockVehicle.id);

      // Step 2: Get all photos for this vehicle, ordered by photo_url (name) ascending
      // Using type assertion because dealer_vehicle_photos may not be in generated types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: photosError } = await (supabase as any)
        .from('dealer_vehicle_photos')
        .select('*')
        .eq('vehicle_id', stockVehicle.id)
        .order('photo_url', { ascending: true });

      if (photosError) {
        console.error('[useStockPhotosForVehicle] Error fetching photos:', photosError);
        return { photos: [], vehicleImageUrl: stockVehicle.key_photo_url };
      }

      console.log(`[useStockPhotosForVehicle] Found ${data?.length || 0} photos`);

      // Map to VehiclePhoto type
      const photos: VehiclePhoto[] = (data || []).map((photo: RawPhotoData) => ({
        id: photo.id,
        vehicle_id: photo.vehicle_id,
        dealer_id: photo.dealer_id,
        photo_url: photo.photo_url,
        storage_path: photo.storage_path,
        is_key_photo: photo.is_key_photo || false,
        display_order: photo.display_order || 0,
        category: (photo.category as 'exterior' | 'interior' | 'engine' | 'other') || 'other',
        metadata: photo.metadata,
        uploaded_by: photo.uploaded_by,
        created_at: photo.created_at,
        updated_at: photo.updated_at,
      }));

      return {
        photos,
        vehicleImageUrl: stockVehicle.key_photo_url
      };
    },
    enabled: !!vin && !!dealerId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};
