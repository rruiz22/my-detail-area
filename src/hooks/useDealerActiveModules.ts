import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import type { AppModule } from './usePermissions';

interface DealerActiveModulesResult {
  activeModules: AppModule[];
  isModuleActive: (module: AppModule) => boolean;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage active modules for a specific dealer
 * @param dealerId - The dealer ID to fetch modules for
 * @returns Object containing active modules, checker function, loading state, and refetch function
 */
export function useDealerActiveModules(dealerId: number | null): DealerActiveModulesResult {
  const [activeModules, setActiveModules] = useState<AppModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveModules = useCallback(async () => {
    if (!dealerId) {
      setActiveModules([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_dealership_modules', {
        p_dealer_id: dealerId
      });

      if (fetchError) throw fetchError;

      // Filter to only enabled modules and extract module names
      const enabled = (data || [])
        .filter((m: { is_enabled: boolean }) => m.is_enabled)
        .map((m: { module: AppModule }) => m.module);

      setActiveModules(enabled);
    } catch (err) {
      console.error('Error fetching dealer active modules:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setActiveModules([]);
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  useEffect(() => {
    fetchActiveModules();
  }, [fetchActiveModules]);

  const isModuleActive = useCallback(
    (module: AppModule): boolean => {
      return activeModules.includes(module);
    },
    [activeModules]
  );

  return {
    activeModules,
    isModuleActive,
    loading,
    error,
    refetch: fetchActiveModules
  };
}
