import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

/**
 * Hook: usePlatformSettings
 *
 * Manages platform-wide general configuration settings.
 *
 * FEATURES:
 * - Read/Update system_settings table (key: platform_general_config)
 * - RLS enforced (only system_admin)
 * - TanStack Query caching with 5-minute stale time
 * - Optimistic updates with automatic rollback on error
 * - Type-safe platform settings interface
 *
 * USAGE:
 * const { settings, isLoading, updateSettings, isUpdating } = usePlatformSettings();
 *
 * updateSettings({
 *   timezone: 'America/New_York',
 *   dateFormat: 'MM/DD/YYYY',
 *   currency: 'USD'
 * });
 */

export interface PlatformSettings {
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD.MM.YYYY';
  currency: 'USD' | 'CAD' | 'MXN' | 'EUR' | 'GBP';
  numberFormat: 'en-US' | 'es-MX' | 'pt-BR' | 'en-GB' | 'en-CA';
  businessName: string;
  fiscalYearStart: number; // 1-12 (month)
}

export interface PlatformSettingsResponse {
  setting_value: PlatformSettings;
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  currency: 'USD',
  numberFormat: 'en-US',
  businessName: 'My Detail Area',
  fiscalYearStart: 1,
};

export function usePlatformSettings() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch platform general settings
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['system-settings', 'platform_general_config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'platform_general_config')
        .single();

      if (error) {
        // If setting doesn't exist, return defaults
        if (error.code === 'PGRST116') {
          console.warn('[Platform Settings] No settings found, using defaults');
          return DEFAULT_PLATFORM_SETTINGS;
        }
        throw error;
      }

      return (data?.setting_value as PlatformSettings) || DEFAULT_PLATFORM_SETTINGS;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Update platform settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<PlatformSettings>) => {
      // Merge with existing settings
      const updatedSettings: PlatformSettings = {
        ...(settings || DEFAULT_PLATFORM_SETTINGS),
        ...newSettings,
      };

      const { data, error } = await supabase
        .from('system_settings')
        .upsert(
          {
            setting_key: 'platform_general_config',
            setting_value: updatedSettings,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'setting_key',
          }
        )
        .select('setting_value')
        .single();

      if (error) throw error;

      return data.setting_value as PlatformSettings;
    },
    // Optimistic update
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['system-settings', 'platform_general_config'],
      });

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<PlatformSettings>([
        'system-settings',
        'platform_general_config',
      ]);

      // Optimistically update cache
      queryClient.setQueryData<PlatformSettings>(
        ['system-settings', 'platform_general_config'],
        (old) => ({
          ...(old || DEFAULT_PLATFORM_SETTINGS),
          ...newSettings,
        })
      );

      return { previousSettings };
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['system-settings'],
      });

      toast({
        title: t('settings.platform.update_success'),
        description: t('settings.platform.update_success_desc'),
        variant: 'default',
      });
    },
    onError: (error: Error, _newSettings, context) => {
      console.error('[Platform Settings] Update failed:', error);

      // Rollback optimistic update
      if (context?.previousSettings) {
        queryClient.setQueryData(
          ['system-settings', 'platform_general_config'],
          context.previousSettings
        );
      }

      toast({
        title: t('settings.platform.update_error'),
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: ['system-settings', 'platform_general_config'],
      });
    },
  });

  return {
    settings: settings || DEFAULT_PLATFORM_SETTINGS,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    updateSettingsAsync: updateSettingsMutation.mutateAsync,
    isUpdating: updateSettingsMutation.isPending,
  };
}
