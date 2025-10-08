import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppModule } from '@/hooks/usePermissions';

export interface DealershipModule {
  module: AppModule;
  is_enabled: boolean;
  enabled_at: string;
  enabled_by: string | null;
}

interface UseDealershipModulesReturn {
  modules: DealershipModule[];
  loading: boolean;
  error: string | null;
  refreshModules: () => Promise<void>;
  updateModule: (module: AppModule, isEnabled: boolean) => Promise<boolean>;
  hasModuleAccess: (module: AppModule) => boolean;
}

export const useDealershipModules = (dealerId: number): UseDealershipModulesReturn => {
  const [modules, setModules] = useState<DealershipModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshModules = useCallback(async () => {
    if (!dealerId) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase.rpc('get_dealership_modules', {
        p_dealer_id: dealerId
      });

      if (fetchError) throw fetchError;

      setModules(data || []);
    } catch (err) {
      console.error('Error fetching dealership modules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch modules');
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  const updateModule = useCallback(async (module: AppModule, isEnabled: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase.rpc('update_dealership_module', {
        p_dealer_id: dealerId,
        p_module: module,
        p_is_enabled: isEnabled
      });

      if (updateError) throw updateError;

      // Update local state
      setModules(prev => {
        const existing = prev.find(m => m.module === module);
        if (existing) {
          return prev.map(m => 
            m.module === module 
              ? { ...m, is_enabled: isEnabled, enabled_at: new Date().toISOString() }
              : m
          );
        } else {
          return [...prev, {
            module,
            is_enabled: isEnabled,
            enabled_at: new Date().toISOString(),
            enabled_by: null
          }];
        }
      });

      return true;
    } catch (err) {
      console.error('Error updating module:', err);
      setError(err instanceof Error ? err.message : 'Failed to update module');
      return false;
    }
  }, [dealerId]);

  const hasModuleAccess = useCallback((module: AppModule): boolean => {
    const moduleData = modules.find(m => m.module === module);
    return moduleData?.is_enabled || false;
  }, [modules]);

  useEffect(() => {
    refreshModules();
  }, [refreshModules]);

  return {
    modules,
    loading,
    error,
    refreshModules,
    updateModule,
    hasModuleAccess
  };
};