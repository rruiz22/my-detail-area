import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Types based on database schema
export type MediaType = 'photo' | 'video' | 'document';

export interface VehicleMedia {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  file_path: string; // Supabase Storage path
  file_name: string;
  file_size: number;
  file_type: string; // MIME type
  thumbnail_path?: string;
  category: string; // intake, damage, work_in_progress, completion, exterior_360, interior, undercarriage, engine_bay, vin_plates, odometer
  is_required: boolean;
  annotations?: Record<string, any>;
  metadata?: Record<string, any>;
  linked_work_item_id?: string;
  uploaded_by?: string;
  created_at: string;
  // Joined data
  uploaded_by_profile?: {
    first_name: string;
    last_name: string;
  };
  // Computed properties
  file_url?: string; // Will be computed from file_path
  media_type?: MediaType; // Will be computed from file_type
}

export interface UploadMediaInput {
  vehicle_id: string;
  file: File;
  category?: string;
  is_required?: boolean;
  annotations?: Record<string, any>;
  linked_work_item_id?: string;
}

export interface UpdateMediaInput {
  id: string;
  category?: string;
  is_required?: boolean;
  annotations?: Record<string, any>;
  linked_work_item_id?: string;
}

/**
 * Hook to fetch all media for a vehicle
 */
export function useVehicleMedia(vehicleId: string | null) {
  const { t } = useTranslation();

  return useQuery({
    queryKey: ['vehicle-media', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('vehicle_media')
        .select(`
          *,
          uploaded_by_profile:profiles!uploaded_by(
            first_name,
            last_name
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicle media:', error);
        toast.error(t('get_ready.media.error_loading'));
        throw error;
      }

      // Compute file_url and media_type from stored data
      const mediaWithUrls = (data || []).map((item: any) => {
        const { data: urlData } = supabase.storage
          .from('vehicle-media')
          .getPublicUrl(item.file_path);

        const mediaType: MediaType = item.file_type.startsWith('image/')
          ? 'photo'
          : item.file_type.startsWith('video/')
          ? 'video'
          : 'document';

        return {
          ...item,
          file_url: urlData.publicUrl,
          media_type: mediaType,
        } as VehicleMedia;
      });

      return mediaWithUrls;
    },
    enabled: !!vehicleId,
  });
}

/**
 * Hook to upload new media for a vehicle
 */
export function useUploadMedia() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadMediaInput) => {
      if (!user?.dealer_id) {
        throw new Error('Dealer ID not found');
      }

      // Upload file to Supabase Storage
      const fileExt = input.file.name.split('.').pop();
      const fileName = `${input.vehicle_id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vehicle-media')
        .upload(fileName, input.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      // Extract metadata (for images)
      let metadata: any = {};
      if (input.file.type.startsWith('image/')) {
        try {
          const img = new Image();
          const imageUrl = URL.createObjectURL(input.file);
          await new Promise((resolve, reject) => {
            img.onload = () => {
              metadata.width = img.naturalWidth;
              metadata.height = img.naturalHeight;
              URL.revokeObjectURL(imageUrl);
              resolve(true);
            };
            img.onerror = reject;
            img.src = imageUrl;
          });
        } catch (err) {
          console.warn('Failed to extract image metadata:', err);
        }
      }

      // Create database record
      const { data, error } = await supabase
        .from('vehicle_media')
        .insert({
          vehicle_id: input.vehicle_id,
          dealer_id: user.dealer_id,
          file_path: uploadData.path,
          file_name: input.file.name,
          file_size: input.file.size,
          file_type: input.file.type,
          category: input.category || 'general',
          is_required: input.is_required || false,
          annotations: input.annotations || {},
          metadata,
          linked_work_item_id: input.linked_work_item_id,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating media record:', error);
        // Try to clean up uploaded file
        await supabase.storage.from('vehicle-media').remove([uploadData.path]);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-media', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });
      toast.success(t('get_ready.media.uploaded_successfully'));
    },
    onError: (error) => {
      console.error('Upload media mutation error:', error);
      toast.error(t('get_ready.media.error_uploading'));
    },
  });
}

/**
 * Hook to update media metadata
 */
export function useUpdateMedia() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMediaInput & { vehicleId: string }) => {
      const { id, vehicleId, ...updates } = input;

      const { data, error } = await supabase
        .from('vehicle_media')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating media:', error);
        throw error;
      }

      return { ...data, vehicleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-media', data.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicleId] });
      toast.success(t('get_ready.media.updated_successfully'));
    },
    onError: (error) => {
      console.error('Update media mutation error:', error);
      toast.error(t('get_ready.media.error_updating'));
    },
  });
}

/**
 * Hook to delete media
 */
export function useDeleteMedia() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId, filePath }: { id: string; vehicleId: string; filePath: string }) => {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('vehicle-media')
        .remove([filePath]);

      if (storageError) {
        console.warn('Error deleting file from storage:', storageError);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete database record
      const { error } = await supabase
        .from('vehicle_media')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting media:', error);
        throw error;
      }

      return { id, vehicleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-media', data.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicleId] });
      toast.success(t('get_ready.media.deleted_successfully'));
    },
    onError: (error) => {
      console.error('Delete media mutation error:', error);
      toast.error(t('get_ready.media.error_deleting'));
    },
  });
}
