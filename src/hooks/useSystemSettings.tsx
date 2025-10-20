import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized hook for system settings with shared cache
 * Eliminates redundant queries by using TanStack Query's global cache
 *
 * staleTime: 30 minutes - Settings rarely change
 * cacheTime: 60 minutes - Keep in cache even longer
 */

interface SystemSetting {
  setting_key: string;
  setting_value: boolean | string | number;
}

/**
 * Get a specific system setting with shared cache across all components
 */
export function useSystemSetting(settingKey: string) {
  return useQuery({
    queryKey: ['system_setting', settingKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', settingKey)
        .single();

      if (error) {
        console.warn(`System setting "${settingKey}" not found, using default`);
        return null;
      }

      return data?.setting_value ?? null;
    },
    staleTime: 1800000, // 30 minutes
    gcTime: 3600000, // 60 minutes (formerly cacheTime)
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Specific hook for custom roles system feature flag
 * Most commonly used setting - gets its own hook for convenience
 */
export function useCustomRolesSystem() {
  const { data, isLoading, error } = useSystemSetting('use_custom_roles_system');

  return {
    useCustomRoles: data === true || data === 'true',
    isLoading,
    error,
  };
}

/**
 * Get multiple system settings at once with shared cache
 */
export function useSystemSettings(settingKeys: string[]) {
  return useQuery({
    queryKey: ['system_settings', settingKeys.sort().join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', settingKeys);

      if (error) {
        console.error('Error fetching system settings:', error);
        return {};
      }

      // Convert array to object for easy access
      return (data || []).reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, any>);
    },
    staleTime: 1800000, // 30 minutes
    gcTime: 3600000, // 60 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
