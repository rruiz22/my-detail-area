import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { userProfileCache } from '@/services/userProfileCache';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Enterprise-grade profile mutations hook
 * Handles all profile updates with automatic cache invalidation
 * Single source of truth: AuthContext
 */

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;  // ✅ For SMS notifications system
}

export interface PreferencesUpdateData {
  phone?: string;
  bio?: string;
  job_title?: string;
  department?: string;
  notification_email?: boolean;
  notification_sms?: boolean;
  notification_push?: boolean;
  notification_in_app?: boolean;
  notification_frequency?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  language_preference?: string;
  date_format?: string;
  time_format?: string;
  [key: string]: any;
}

export function useProfileMutations() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  /**
   * Update user profile (first_name, last_name)
   * Invalidates localStorage cache and refreshes AuthContext
   * Uses optimistic updates for better perceived performance
   */
  const updateProfile = async (updates: ProfileUpdateData): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Save snapshot of current data for rollback
    const previousData = queryClient.getQueryData(['user_profile', user.id]);

    try {
      setLoading(true);

      // Optimistically update the query cache before the server responds
      queryClient.setQueryData(['user_profile', user.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          ...updates
        };
      });

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Invalidate all caches after successful update
      userProfileCache.clearCache();
      queryClient.invalidateQueries({ queryKey: ['user_profile', user.id] });
      queryClient.invalidateQueries({ queryKey: ['user_profile_permissions', user.id] });

      // Force AuthContext reload by triggering auth state change
      await supabase.auth.refreshSession();

      // Log activity (non-blocking)
      supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'profile_updated',
          action_description: 'Profile information updated',
          details: updates
        })
        .then(() => {})
        .catch(err => console.error('Failed to log activity:', err));

      toast({
        title: t('common.success'),
        description: t('profile.profile_updated'),
      });

      return true;

    } catch (error: any) {
      console.error('Error updating profile:', error);

      // Rollback to previous state using snapshot
      if (previousData) {
        queryClient.setQueryData(['user_profile', user.id], previousData);
      } else {
        queryClient.invalidateQueries({ queryKey: ['user_profile', user.id] });
      }

      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user preferences (phone, bio, notifications, etc.)
   * Upsert pattern to handle first-time preference creation
   * Uses optimistic updates for instant UI feedback
   */
  const updatePreferences = async (updates: PreferencesUpdateData): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Save snapshot of current preferences for rollback
    const previousPreferences = queryClient.getQueryData(['user_preferences', user.id]);

    try {
      setLoading(true);

      // Optimistically update the preferences in cache
      queryClient.setQueryData(['user_preferences', user.id], (old: any) => {
        return {
          ...old,
          ...updates,
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id'
          }
        );

      if (error) throw error;

      // Invalidate TanStack Query cache
      queryClient.invalidateQueries({ queryKey: ['user_profile', user.id] });
      queryClient.invalidateQueries({ queryKey: ['user_preferences', user.id] });

      // Log activity (non-blocking)
      supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'preferences_updated',
          action_description: 'User preferences updated',
          details: updates
        })
        .then(() => {})
        .catch(err => console.error('Failed to log activity:', err));

      toast({
        title: t('common.success'),
        description: t('profile.preferences_updated'),
      });

      return true;

    } catch (error: any) {
      console.error('Error updating preferences:', error);

      // Rollback to previous state using snapshot
      if (previousPreferences) {
        queryClient.setQueryData(['user_preferences', user.id], previousPreferences);
      } else {
        queryClient.invalidateQueries({ queryKey: ['user_preferences', user.id] });
      }

      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update preferences',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Change user password
   * Requires current password for security
   */
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) throw new Error('No authenticated user');

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) throw new Error('Current password is incorrect');

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Log activity
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'password_changed',
          action_description: 'Password changed successfully'
        });

      toast({
        title: t('common.success'),
        description: t('profile.password_changed'),
      });

      return true;

    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update both profile and preferences in a single operation
   * Shows only ONE toast notification
   * Use this for PersonalInformationTab to avoid double toasts
   * ✅ Also syncs phone to profiles.phone_number for SMS notifications
   */
  const updateProfileAndPreferences = async (
    profileUpdates: ProfileUpdateData,
    preferencesUpdates: PreferencesUpdateData
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Save snapshots for rollback
    const previousProfile = queryClient.getQueryData(['user_profile', user.id]);
    const previousPreferences = queryClient.getQueryData(['user_preferences', user.id]);

    try {
      setLoading(true);

      // ✅ FIX: Sync phone to profiles.phone_number for SMS notifications
      const enhancedProfileUpdates = { ...profileUpdates };
      if (preferencesUpdates.phone) {
        enhancedProfileUpdates.phone_number = preferencesUpdates.phone;
      }

      // Optimistically update both caches
      queryClient.setQueryData(['user_profile', user.id], (old: any) => {
        if (!old) return old;
        return { ...old, ...enhancedProfileUpdates };
      });

      queryClient.setQueryData(['user_preferences', user.id], (old: any) => {
        return {
          ...old,
          ...preferencesUpdates,
          updated_at: new Date().toISOString()
        };
      });

      // Execute BOTH updates in parallel
      const [profileResult, preferencesResult] = await Promise.all([
        supabase.from('profiles').update(enhancedProfileUpdates).eq('id', user.id),
        supabase.from('user_preferences').upsert(
          {
            user_id: user.id,
            ...preferencesUpdates,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )
      ]);

      if (profileResult.error) throw profileResult.error;
      if (preferencesResult.error) throw preferencesResult.error;

      // Refetch to ensure cache is synchronized with server
      // Don't clear cache - we already have optimistic updates in place
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['user_profile', user.id] }),
        queryClient.refetchQueries({ queryKey: ['user_preferences', user.id] })
      ]);

      // Log activity (non-blocking)
      supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'profile_updated',
          action_description: 'Profile and preferences updated',
          details: { ...profileUpdates, ...preferencesUpdates }
        })
        .then(() => {})
        .catch(err => console.error('Failed to log activity:', err));

      // SINGLE toast notification
      toast({
        title: t('common.success'),
        description: t('profile.profile_updated'),
      });

      return true;

    } catch (error: any) {
      console.error('Error updating profile and preferences:', error);

      // Rollback both caches to previous state
      if (previousProfile) {
        queryClient.setQueryData(['user_profile', user.id], previousProfile);
      }
      if (previousPreferences) {
        queryClient.setQueryData(['user_preferences', user.id], previousPreferences);
      }

      // If no previous data, refetch from server
      if (!previousProfile || !previousPreferences) {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: ['user_profile', user.id] }),
          queryClient.refetchQueries({ queryKey: ['user_preferences', user.id] })
        ]);
      }

      toast({
        title: t('common.error'),
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    updateProfile,
    updatePreferences,
    changePassword,
    updateProfileAndPreferences
  };
}
