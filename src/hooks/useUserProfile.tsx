import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserPreferences {
  id?: string;
  user_id: string;
  timezone: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  job_title?: string;
  department?: string;
  notification_email: boolean;
  notification_sms: boolean;
  notification_push: boolean;
  notification_in_app: boolean;
  notification_frequency: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  language_preference: string;
  date_format: string;
  time_format: string;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  dealership_id?: number;
  preferences?: UserPreferences;
}

export const useUserProfile = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        throw preferencesError;
      }

      setProfile({
        id: user.id,
        email: user.email || '',
        ...profileData
      });

      setPreferences(preferencesData || {
        user_id: user.id,
        timezone: 'America/New_York',
        notification_email: true,
        notification_sms: false,
        notification_push: true,
        notification_in_app: true,
        notification_frequency: 'immediate',
        language_preference: 'en',
        date_format: 'MM/dd/yyyy',
        time_format: '12h'
      });

    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error loading profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updates } : null);

      // Log activity
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'profile_updated',
          action_description: 'Profile information updated',
          details: { updated_fields: Object.keys(updates) }
        });

      toast({
        title: t('common.success'),
        description: t('profile.profile_updated'),
      });

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error updating profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          ...updates
        });

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...updates } : null);

      // Log activity
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'preferences_updated',
          action_description: 'User preferences updated',
          details: { updated_preferences: Object.keys(updates) }
        });

      toast({
        title: t('common.success'),
        description: t('profile.preferences_updated'),
      });

    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error updating preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_activity_log')
          .insert({
            user_id: user.id,
            action_type: 'password_changed',
            action_description: 'Password changed successfully'
          });
      }

      toast({
        title: t('common.success'),
        description: t('profile.password_changed'),
      });

      return true;
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error changing password',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    preferences,
    loading,
    updateProfile,
    updatePreferences,
    changePassword,
    refetch: fetchProfile
  };
};