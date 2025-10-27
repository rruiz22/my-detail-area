import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { compressImage, shouldCompressImage } from '@/utils/imageCompression';

/**
 * Hook: useDealershipLogo
 *
 * Enterprise-grade logo upload with hybrid optimization (Get Ready pattern)
 *
 * OPTIMIZATION STRATEGY (2-Step Hybrid):
 * 1. Client-side compression: 512x512px @ 90% quality (~200KB)
 * 2. Server-side thumbnail: 400x400px @ 70% quality (~25KB) - Background, non-blocking
 *
 * PERFORMANCE:
 * - Original logo: ~800KB
 * - After client compression: ~200KB (-75%)
 * - Thumbnail for display: ~25KB (-97%)
 *
 * USAGE:
 * const uploadMutation = useUploadDealershipLogo();
 * uploadMutation.mutate({ dealershipId: 123, file: logoFile });
 */

interface UploadLogoInput {
  dealershipId: number;
  file: File;
}

export function useUploadDealershipLogo() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dealershipId, file }: UploadLogoInput) => {
      // ========================================================================
      // VALIDATION: File size limit (2MB max)
      // ========================================================================
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(t('dealerships.logo_too_large'));
      }

      // ========================================================================
      // STEP 1: CLIENT-SIDE COMPRESSION (Frontend Optimization)
      // ========================================================================
      console.log('🗜️ [Step 1] Client-side compression starting...');
      console.log('📦 Original size:', (file.size / 1024).toFixed(2), 'KB');

      let fileToUpload = file;

      if (shouldCompressImage(file)) {
        try {
          fileToUpload = await compressImage(file, {
            maxWidth: 512,   // Logos should be small
            maxHeight: 512,
            quality: 0.90,   // High quality for logos (90%)
          });

          console.log('✅ Compressed size:', (fileToUpload.size / 1024).toFixed(2), 'KB');
          console.log('📊 Reduction:', ((1 - fileToUpload.size / file.size) * 100).toFixed(1), '%');
        } catch (compressionError) {
          console.warn('⚠️ Compression failed, using original:', compressionError);
          fileToUpload = file;
        }
      }

      // ========================================================================
      // CLEANUP: Remove old logos to avoid storage accumulation
      // ========================================================================
      const { data: existingFiles } = await supabase.storage
        .from('dealership-logos')
        .list(`${dealershipId}`);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${dealershipId}/${f.name}`);
        await supabase.storage
          .from('dealership-logos')
          .remove(filesToDelete);

        console.log('🗑️ Removed', existingFiles.length, 'old logo(s)');
      }

      // ========================================================================
      // UPLOAD: Upload compressed file to Supabase Storage
      // ========================================================================
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${dealershipId}/logo_${Date.now()}.${fileExt}`;

      console.log('📤 Uploading to:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dealership-logos')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600', // Cache for 1 hour
          upsert: true, // ✅ CHANGED: Allow overwriting files (replaces old logos automatically)
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      // ========================================================================
      // GET PUBLIC URL: Retrieve public URL for the uploaded logo
      // ========================================================================
      const { data: urlData } = supabase.storage
        .from('dealership-logos')
        .getPublicUrl(uploadData.path);

      console.log('🔗 Public URL:', urlData.publicUrl);

      // ========================================================================
      // DATABASE UPDATE: Update dealership record with logo URL
      // ========================================================================
      console.log('💾 Updating database with logo_url:', urlData.publicUrl);
      console.log('💾 Dealership ID:', dealershipId);

      const { data, error } = await supabase
        .from('dealerships')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', dealershipId)
        .select()
        .single();

      if (error) {
        console.error('❌ DB update error:', error);
        throw error;
      }

      if (!data) {
        console.warn('⚠️ DB update returned no data - possible RLS policy issue');
        console.warn('⚠️ Logo uploaded to storage but NOT saved to database');
        console.warn('⚠️ Check RLS policies on dealerships table for UPDATE permission');
      } else {
        console.log('✅ DB update successful:', data);
      }

      console.log('✅ [Step 1] Upload complete, logo_url updated');

      // ========================================================================
      // STEP 2: SERVER-SIDE THUMBNAIL GENERATION (Background, Non-Blocking)
      // ========================================================================
      if (fileToUpload.type.startsWith('image/')) {
        console.log('🖼️ [Step 2] Requesting thumbnail generation (background)...');

        // Non-blocking call - continues in background
        supabase.functions.invoke('generate-dealership-logo-thumbnail', {
          body: {
            filePath: uploadData.path,
            dealershipId
          }
        }).then(({ data: thumbData, error: thumbError }) => {
          if (thumbError) {
            console.warn('⚠️ Thumbnail generation failed (non-critical):', thumbError);
          } else {
            console.log('✅ [Step 2] Thumbnail generated:', thumbData);

            // Invalidate queries to refresh UI with thumbnail
            queryClient.invalidateQueries({ queryKey: ['accessible_dealerships'] });
          }
        }).catch((error) => {
          console.warn('⚠️ Thumbnail error (non-critical):', error);
        });
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate all queries that might display dealership data
      queryClient.invalidateQueries({ queryKey: ['accessible_dealerships'] });
      queryClient.invalidateQueries({ queryKey: ['dealership', data?.id] });

      // Toast is now shown in LogoUploader component for better UX control
    },
    onError: (error: any) => {
      console.error('Logo upload error:', error);
      // Error toast is now shown in LogoUploader component for better error context
    },
  });
}

/**
 * Hook: useDeleteDealershipLogo
 *
 * Deletes dealership logo and thumbnail from storage and database
 *
 * CLEANUP:
 * - Removes all files from storage (logo + thumbnail)
 * - Clears both logo_url and thumbnail_logo_url in database
 */
export function useDeleteDealershipLogo() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealershipId: number) => {
      // ========================================================================
      // DELETE FROM STORAGE: Remove all files in dealership folder
      // ========================================================================
      const { data: existingFiles } = await supabase.storage
        .from('dealership-logos')
        .list(`${dealershipId}`);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${dealershipId}/${f.name}`);
        await supabase.storage
          .from('dealership-logos')
          .remove(filesToDelete);

        console.log('🗑️ Deleted', existingFiles.length, 'file(s) from storage');
      }

      // ========================================================================
      // DATABASE UPDATE: Clear both logo URLs
      // ========================================================================
      const { data, error } = await supabase
        .from('dealerships')
        .update({
          logo_url: null,
          thumbnail_logo_url: null
        })
        .eq('id', dealershipId)
        .select()
        .single();

      if (error) {
        console.error('❌ DB update error:', error);
        throw error;
      }

      console.log('✅ Logo and thumbnail cleared from database');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessible_dealerships'] });
      toast({
        title: t('dealerships.logo_removed_successfully'),
      });
    },
    onError: (error: any) => {
      console.error('Logo deletion error:', error);
      toast({
        title: t('dealerships.logo_upload_failed'),
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}
