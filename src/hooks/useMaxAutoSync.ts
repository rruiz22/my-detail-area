import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { logger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

/**
 * Max.Auto Configuration Interface
 */
export interface MaxAutoConfig {
  id: string;
  dealer_id: number;
  auto_sync_enabled: boolean;
  sync_frequency_hours: 6 | 12 | 24;
  username_encrypted: string;
  username_iv: string;
  username_tag: string;
  password_encrypted: string;
  password_iv: string;
  password_tag: string;
  last_sync_at?: string;
  last_sync_status?: 'success' | 'failed' | 'in_progress';
  last_sync_details?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Hook for managing Max.Auto auto-sync configuration
 *
 * Uses Supabase Edge Functions for secure credential encryption
 * All secrets are stored in Supabase secrets, not in frontend
 */
export function useMaxAutoSync(dealerId?: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch current configuration
  const {
    data: config,
    isLoading,
    error
  } = useQuery({
    queryKey: ['max-auto-config', dealerId],
    queryFn: async () => {
      if (!dealerId) return null;

      const { data, error } = await supabase
        .from('dealer_max_auto_config')
        .select('*')
        .eq('dealer_id', dealerId)
        .maybeSingle();

      if (error) throw error;
      return data as MaxAutoConfig | null;
    },
    enabled: !!dealerId,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM
  });

  // Save/Update configuration (calls Edge Function for encryption)
  const saveConfig = useMutation({
    mutationFn: async ({
      username,
      password,
      autoSyncEnabled,
      syncFrequencyHours
    }: {
      username: string;
      password: string;
      autoSyncEnabled: boolean;
      syncFrequencyHours: 6 | 12 | 24;
    }) => {
      if (!dealerId) throw new Error('Dealer ID is required');

      logger.info(`[Dealer ${dealerId}] Saving Max.Auto config via Edge Function`);

      // Call Edge Function to encrypt and save
      const { data, error } = await supabase.functions.invoke('encrypt-max-auto-credentials', {
        body: {
          dealerId,
          username,
          password,
          autoSyncEnabled,
          syncFrequencyHours
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to save configuration');

      logger.info(`[Dealer ${dealerId}] Config saved successfully`);
      return data.config as MaxAutoConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['max-auto-config', dealerId] });
      toast({
        title: t('stock.auto_sync.config_saved_title'),
        description: t('stock.auto_sync.config_saved_description'),
      });
    },
    onError: (error) => {
      logger.error('Failed to save Max.Auto config:', error);
      toast({
        title: t('stock.auto_sync.config_error_title'),
        description: error.message || t('stock.auto_sync.config_error_description'),
        variant: 'destructive'
      });
    }
  });

  // Toggle auto-sync on/off (calls Edge Function)
  const toggleAutoSync = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!dealerId) throw new Error('Dealer ID is required');
      if (!config) throw new Error('Configuration not found');

      logger.info(`[Dealer ${dealerId}] Toggling auto-sync to ${enabled}`);

      // Call Edge Function to toggle
      const { data, error } = await supabase.functions.invoke('toggle-max-auto-sync', {
        body: {
          dealerId,
          enabled
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to toggle auto-sync');

      return data.config as MaxAutoConfig;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['max-auto-config', dealerId] });
      toast({
        title: data.auto_sync_enabled
          ? t('stock.auto_sync.enabled_title')
          : t('stock.auto_sync.disabled_title'),
        description: data.auto_sync_enabled
          ? t('stock.auto_sync.enabled_description')
          : t('stock.auto_sync.disabled_description'),
      });
    },
    onError: (error) => {
      logger.error('Failed to toggle auto-sync:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('stock.auto_sync.toggle_error'),
        variant: 'destructive'
      });
    }
  });

  // Trigger manual sync (calls Edge Function which calls Railway)
  const triggerSync = useMutation({
    mutationFn: async ({
      username,
      password
    }: {
      username: string;
      password: string;
    }) => {
      if (!dealerId) throw new Error('Dealer ID is required');

      logger.info(`[Dealer ${dealerId}] Triggering manual sync via Edge Function`);

      // Call Edge Function to trigger Railway sync
      const { data, error } = await supabase.functions.invoke('trigger-max-auto-sync', {
        body: {
          dealerId,
          username,
          password
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to trigger sync');

      return data;
    },
    onSuccess: () => {
      toast({
        title: t('stock.auto_sync.sync_started_title'),
        description: t('stock.auto_sync.sync_started_description'),
      });

      // Poll for status updates
      const pollInterval = setInterval(async () => {
        const { data } = await supabase
          .from('dealer_max_auto_config')
          .select('last_sync_status')
          .eq('dealer_id', dealerId)
          .single();

        if (data?.last_sync_status !== 'in_progress') {
          clearInterval(pollInterval);
          queryClient.invalidateQueries({ queryKey: ['max-auto-config', dealerId] });
          queryClient.invalidateQueries({ queryKey: ['dealer-inventory'] });
        }
      }, 5000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
    },
    onError: (error) => {
      logger.error('Failed to trigger sync:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('stock.auto_sync.sync_error'),
        variant: 'destructive'
      });
    }
  });

  return {
    config,
    isLoading,
    error,
    saveConfig: saveConfig.mutate,
    isSaving: saveConfig.isPending,
    toggleAutoSync: toggleAutoSync.mutate,
    isToggling: toggleAutoSync.isPending,
    triggerSync: triggerSync.mutate,
    isSyncing: triggerSync.isPending
  };
}
