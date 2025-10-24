import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  photo_url: string;
  storage_path?: string;
  is_key_photo: boolean;
  display_order: number;
  category: 'exterior' | 'interior' | 'engine' | 'other';
  metadata?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
    orientation?: string;
    originalSize?: number;
    compressedSize?: number;
  };
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
}

interface UseVehiclePhotosProps {
  vehicleId: string;
  dealerId: number;
}

interface UseVehiclePhotosReturn {
  photos: VehiclePhoto[];
  loading: boolean;
  error: string | null;
  uploadPhoto: (file: File, category?: 'exterior' | 'interior' | 'engine' | 'other') => Promise<void>;
  setKeyPhoto: (photoId: string) => Promise<void>;
  deletePhoto: (photoId: string) => Promise<void>;
  reorderPhotos: (photoIds: string[]) => Promise<void>;
  updateCategory: (photoId: string, category: 'exterior' | 'interior' | 'engine' | 'other') => Promise<void>;
}

export const useVehiclePhotos = ({ vehicleId, dealerId }: UseVehiclePhotosProps): UseVehiclePhotosReturn => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Category priority for sorting
  const categoryPriority: Record<string, number> = {
    'exterior': 1,
    'interior': 2,
    'engine': 3,
    'other': 4
  };

  // Fetch photos for vehicle
  const photosQuery = useQuery({
    queryKey: ['vehicle-photos', vehicleId],
    queryFn: async (): Promise<VehiclePhoto[]> => {
      const { data, error } = await supabase
        .from('dealer_vehicle_photos')
        .select('*')
        .eq('vehicle_id', vehicleId);

      if (error) {
        console.error('Error fetching vehicle photos:', error);
        throw error;
      }

      // Sort photos: Key photo first, then by category (exterior→interior→engine→other), then by display_order
      const sorted = (data || []).sort((a, b) => {
        // Key photo always first
        if (a.is_key_photo !== b.is_key_photo) {
          return a.is_key_photo ? -1 : 1;
        }

        // Then by category priority
        const catA = categoryPriority[a.category || 'other'] || 4;
        const catB = categoryPriority[b.category || 'other'] || 4;
        if (catA !== catB) {
          return catA - catB;
        }

        // Finally by display_order
        return (a.display_order || 0) - (b.display_order || 0);
      });

      return sorted;
    },
    enabled: !!vehicleId,
  });

  // Upload photo mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('User not authenticated');

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const storagePath = `${dealerId}/${vehicleId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-photos')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload photo: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(storagePath);

      // Get current photo count to determine display_order
      const existingPhotos = photosQuery.data || [];
      const displayOrder = existingPhotos.length;

      // Insert photo record to database
      const { error: dbError } = await supabase
        .from('dealer_vehicle_photos')
        .insert({
          vehicle_id: vehicleId,
          dealer_id: dealerId,
          photo_url: publicUrl,
          storage_path: storagePath,
          is_key_photo: existingPhotos.length === 0, // First photo is key photo
          display_order: displayOrder,
          uploaded_by: user.id
        });

      if (dbError) {
        // Cleanup storage if DB insert fails
        await supabase.storage.from('vehicle-photos').remove([storagePath]);
        throw new Error(`Failed to save photo: ${dbError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['stock-inventory'] });
      toast({
        title: t('common.success'),
        description: t('stock.photos.upload_success', 'Photo uploaded successfully')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Set key photo mutation
  const setKeyPhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      // First, unset all key photos for this vehicle
      await supabase
        .from('dealer_vehicle_photos')
        .update({ is_key_photo: false })
        .eq('vehicle_id', vehicleId);

      // Then set the selected photo as key
      const { error } = await supabase
        .from('dealer_vehicle_photos')
        .update({ is_key_photo: true })
        .eq('id', photoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['stock-inventory'] });
      toast({
        title: t('common.success'),
        description: t('stock.photos.key_photo_set', 'Key photo updated')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Delete photo mutation
  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      // Get photo details to delete from storage
      const photo = photosQuery.data?.find(p => p.id === photoId);
      if (!photo) throw new Error('Photo not found');

      // Delete from database first
      const { error: dbError } = await supabase
        .from('dealer_vehicle_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      // Delete from storage if storage_path exists
      if (photo.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('vehicle-photos')
          .remove([photo.storage_path]);

        if (storageError) {
          console.warn('Failed to delete from storage:', storageError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['stock-inventory'] });
      toast({
        title: t('common.success'),
        description: t('stock.photos.delete_success', 'Photo deleted')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Reorder photos mutation
  const reorderPhotosMutation = useMutation({
    mutationFn: async (photoIds: string[]) => {
      const updates = photoIds.map((photoId, index) => ({
        id: photoId,
        display_order: index
      }));

      const { error } = await supabase
        .from('dealer_vehicle_photos')
        .upsert(updates);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-photos', vehicleId] });
    }
  });

  return {
    photos: photosQuery.data || [],
    loading: photosQuery.isLoading,
    error: photosQuery.error ? (photosQuery.error as Error).message : null,
    uploadPhoto: uploadMutation.mutateAsync,
    setKeyPhoto: setKeyPhotoMutation.mutateAsync,
    deletePhoto: deletePhotoMutation.mutateAsync,
    reorderPhotos: reorderPhotosMutation.mutateAsync,
  };
};
