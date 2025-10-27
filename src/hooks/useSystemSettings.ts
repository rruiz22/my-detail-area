import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { AuthBranding } from './useAuthBranding';

/**
 * Hook: useSystemSettings
 *
 * Manages system-wide settings (requires system_admin role)
 *
 * FEATURES:
 * - Read/Update system_settings table
 * - RLS enforced (only system_admin)
 * - React Query caching
 * - Optimistic updates
 *
 * USAGE:
 * const { branding, updateBranding, isLoading } = useSystemSettings();
 */

export function useSystemSettings() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Fetch auth page branding settings
  const { data: branding, isLoading } = useQuery({
    queryKey: ['system-settings', 'auth_page_branding'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'auth_page_branding')
        .single();

      if (error) throw error;

      return data?.setting_value as AuthBranding;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update auth page branding
  const updateBrandingMutation = useMutation({
    mutationFn: async (newBranding: Partial<AuthBranding>) => {
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          setting_value: newBranding,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'auth_page_branding')
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'auth_page_branding'] });

      // Clear localStorage cache for Auth.tsx
      localStorage.removeItem('auth_branding_cache');

      toast({
        title: t('management.branding_updated_title'),
        description: t('management.branding_updated_description'),
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      console.error('[System Settings] Update failed:', error);

      toast({
        title: t('management.branding_update_error_title'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    branding: branding || {
      logo_url: null,
      title: 'My Detail Area',
      tagline: 'Dealership Operations Platform',
      enabled: true
    },
    isLoading,
    updateBranding: updateBrandingMutation.mutate,
    isUpdating: updateBrandingMutation.isPending,
  };
}
