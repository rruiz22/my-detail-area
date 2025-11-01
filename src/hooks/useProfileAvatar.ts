import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { compressImage, shouldCompressImage } from '@/utils/imageCompression';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

/**
 * Hook: useProfileAvatar
 *
 * Enterprise-grade profile avatar upload with hybrid optimization
 *
 * OPTIMIZATION STRATEGY (2-Step Hybrid like Stock/Dealership Logo):
 * 1. Client-side compression: 400x400px @ 85% quality (~50-80KB)
 * 2. Server generates thumbnail if needed
 *
 * PERFORMANCE:
 * - Original photo: ~2MB
 * - After client compression: ~50-80KB (-96%)
 * - Perfect for profile display
 *
 * STORAGE STRUCTURE:
 * - Bucket: profile-avatars
 * - Path: {user_id}/avatar_{timestamp}.{ext}
 * - Public access for display
 *
 * USAGE:
 * const uploadMutation = useUploadProfileAvatar();
 * await uploadMutation.mutateAsync({ file });
 */

interface UploadAvatarInput {
  file: File;
}

export function useUploadProfileAvatar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file }: UploadAvatarInput) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // ========================================================================
      // VALIDATION: File size limit (5MB max)
      // ========================================================================
      const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(t('profile.avatar_too_large', 'Image must be less than 5MB'));
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error(t('profile.avatar_invalid_type', 'Only image files are allowed'));
      }

      // ========================================================================
      // STEP 1: CLIENT-SIDE COMPRESSION (Frontend Optimization)
      // ========================================================================
      console.log('🗜️ [Step 1] Client-side avatar compression starting...');
      console.log('📦 Original size:', (file.size / 1024).toFixed(2), 'KB');

      let fileToUpload = file;

      if (shouldCompressImage(file)) {
        try {
          fileToUpload = await compressImage(file, {
            maxWidth: 400,    // Profile avatars are small
            maxHeight: 400,
            quality: 0.85,    // Good quality for avatars (85%)
          });

          console.log('✅ Compressed size:', (fileToUpload.size / 1024).toFixed(2), 'KB');
          console.log('📊 Reduction:', ((1 - fileToUpload.size / file.size) * 100).toFixed(1), '%');
        } catch (compressionError) {
          console.warn('⚠️ Compression failed, using original:', compressionError);
          fileToUpload = file;
        }
      }

      // ========================================================================
      // CLEANUP: Remove old avatars to avoid storage accumulation
      // ========================================================================
      const { data: existingFiles } = await supabase.storage
        .from('profile-avatars')
        .list(user.id);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from('profile-avatars').remove(filesToDelete);
        console.log('🗑️ Cleaned up old avatars:', filesToDelete.length);
      }

      // ========================================================================
      // STEP 2: UPLOAD TO SUPABASE STORAGE
      // ========================================================================
      const fileExt = fileToUpload.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${user.id}/avatar_${timestamp}.${fileExt}`;

      console.log('📤 [Step 2] Uploading to Supabase Storage...');

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-avatars')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: fileToUpload.type
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ Upload successful:', uploadData.path);

      // ========================================================================
      // STEP 3: GET PUBLIC URL
      // ========================================================================
      const { data: urlData } = supabase.storage
        .from('profile-avatars')
        .getPublicUrl(uploadData.path);

      const avatarUrl = urlData.publicUrl;
      console.log('🔗 Public URL:', avatarUrl);

      // ========================================================================
      // STEP 4: UPDATE PROFILE DATABASE
      // ========================================================================
      console.log('💾 [Step 3] Updating profile database...');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('❌ Database update error:', updateError);
        // Clean up uploaded file
        await supabase.storage.from('profile-avatars').remove([uploadData.path]);
        throw updateError;
      }

      console.log('✅ Profile updated successfully');

      return {
        avatarUrl,
        path: uploadData.path,
        originalSize: file.size,
        compressedSize: fileToUpload.size,
        reduction: ((1 - fileToUpload.size / file.size) * 100).toFixed(1)
      };
    },
    onSuccess: (data) => {
      toast({
        title: t('profile.avatar_uploaded', 'Avatar uploaded successfully'),
        description: t('profile.avatar_compressed', `Image optimized: ${data.reduction}% smaller`),
      });

      // Invalidate all user-related queries to force re-fetch with new avatar
      queryClient.invalidateQueries({ queryKey: ['user_profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user_avatar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] }); // All profiles (for dropdowns)
      queryClient.invalidateQueries({ queryKey: ['users'] }); // All users queries
      queryClient.invalidateQueries({ queryKey: ['dealer_users'] }); // Dealer users

      // Force reload of current user data in AuthContext
      window.location.reload();

      console.log('✅ Avatar upload complete!');
    },
    onError: (error: Error) => {
      console.error('❌ Avatar upload failed:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete profile avatar and revert to initials
 */
export function useDeleteProfileAvatar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      console.log('🗑️ Deleting profile avatar...');

      // Get current avatar from profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage if exists
      if (profile?.avatar_url) {
        const { data: existingFiles } = await supabase.storage
          .from('profile-avatars')
          .list(user.id);

        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from('profile-avatars').remove(filesToDelete);
          console.log('🗑️ Deleted files:', filesToDelete.length);
        }
      }

      // Update profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      console.log('✅ Avatar deleted successfully');
    },
    onSuccess: () => {
      toast({
        title: t('profile.avatar_removed', 'Avatar removed'),
        description: t('profile.avatar_reverted', 'Reverted to initials avatar'),
      });

      // Invalidate all user-related queries to force re-fetch
      queryClient.invalidateQueries({ queryKey: ['user_profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user_avatar', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] }); // All profiles
      queryClient.invalidateQueries({ queryKey: ['users'] }); // All users queries
      queryClient.invalidateQueries({ queryKey: ['dealer_users'] }); // Dealer users

      // Force reload to update AuthContext
      window.location.reload();
    },
    onError: (error: Error) => {
      console.error('❌ Avatar deletion failed:', error);
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
