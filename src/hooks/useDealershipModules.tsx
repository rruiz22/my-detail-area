import type { AppModule } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import * as logger from '@/utils/logger';

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

export const useDealershipModules = (
  dealerId: number,
  isSystemAdmin?: boolean,  // FIX: Primitive params instead of options object
  isSupermanager?: boolean  // FIX: Prevents infinite loop from object reference changes
): UseDealershipModulesReturn => {
  const [modules, setModules] = useState<DealershipModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshModules = useCallback(async () => {
    // ✅ SUPERMANAGER/SYSTEM_ADMIN FIX: If user is supermanager or system_admin,
    // they have access to ALL modules regardless of dealerId
    if (isSystemAdmin || isSupermanager) {
      logger.dev('🔓 [useDealershipModules] Supermanager/System Admin - enabling ALL modules by default');

      // Return all modules as enabled for supermanagers/system_admins
      const allModules: DealershipModule[] = [
        'dashboard', 'sales_orders', 'service_orders', 'recon_orders', 'car_wash',
        'stock', 'contacts', 'reports', 'users', 'productivity', 'chat',
        'dealerships', 'get_ready', 'settings', 'management', 'detail_hub',
        'vin_scanner', 'nfc_tracking'  // 🆕 NEW: VIN Scanner and NFC Tracking modules
      ].map(module => ({
        module: module as AppModule,
        is_enabled: true,
        enabled_at: new Date().toISOString(),
        enabled_by: 'system'
      }));

      setModules(allModules);
      setLoading(false);
      setError(null);
      return;
    }

    if (!dealerId) {
      // If no dealerId provided, immediately set loading to false with empty modules
      setLoading(false);
      setModules([]);
      setError(null);
      return;
    }

    // ✅ FIX #10: Input validation to prevent SQL injection and invalid data
    if (!Number.isInteger(dealerId) || dealerId <= 0) {
      console.error('❌ Invalid dealerId:', dealerId, typeof dealerId);
      setError('Invalid dealership ID format');
      setLoading(false);
      return;
    }

    // Additional safety: Check for extremely large numbers (potential DoS)
    if (dealerId > Number.MAX_SAFE_INTEGER) {
      console.error('❌ dealerId exceeds safe integer range:', dealerId);
      setError('Dealership ID out of range');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logger.dev(`🔍 [useDealershipModules] Fetching modules for dealership ID: ${dealerId}`);

      const { data, error: fetchError } = await supabase.rpc('get_dealership_modules', {
        p_dealer_id: dealerId
      });

      if (fetchError) {
        console.error(`❌ [useDealershipModules] RPC error for dealer ${dealerId}:`, fetchError);
        throw fetchError;
      }

      logger.dev(`✅ [useDealershipModules] Received ${data?.length || 0} modules for dealer ${dealerId}:`, data);
      setModules(data || []);
    } catch (err) {
      console.error('Error fetching dealership modules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch modules');
    } finally {
      setLoading(false);
    }
  }, [dealerId, isSystemAdmin, isSupermanager]);  // FIX: Primitive dependencies prevent infinite loop

  const updateModule = useCallback(async (module: AppModule, isEnabled: boolean): Promise<boolean> => {
    // ✅ FIX #10: Validate dealerId before update
    if (!Number.isInteger(dealerId) || dealerId <= 0) {
      console.error('❌ Invalid dealerId for module update:', dealerId);
      setError('Invalid dealership ID format');
      return false;
    }

    // ✅ Validate module name (should be alphanumeric with underscores only)
    const validModulePattern = /^[a-z_]+$/;
    if (!validModulePattern.test(module)) {
      console.error('❌ Invalid module name format:', module);
      setError('Invalid module name format');
      return false;
    }

    // ✅ Validate isEnabled is boolean
    if (typeof isEnabled !== 'boolean') {
      console.error('❌ Invalid isEnabled value:', isEnabled, typeof isEnabled);
      setError('Invalid enabled status');
      return false;
    }

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
  }, [dealerId, modules]);

  const hasModuleAccess = useCallback((module: AppModule): boolean => {
    // ✅ FIX: Implement fail-closed security policy (deny by default)
    // If no dealership modules are configured, DENY access (more secure)
    // This should never happen now because:
    // 1. New dealerships auto-seed modules via trigger
    // 2. Existing dealerships were backfilled
    if (modules.length === 0) {
      // ⚠️ OPTIMIZATION: Only show warning if NOT loading (reduces initial render noise)
      if (!loading) {
        logger.dev(`[hasModuleAccess] ⚠️ No modules configured - DENYING ${module} (fail-closed security)`);
        logger.dev('  This should not happen - dealership may need module configuration');
      }
      return false; // ✅ DENY by default (fail-closed)
    }

    // Check if this specific module is explicitly enabled
    const moduleData = modules.find(m => m.module === module);
    const isEnabled = moduleData?.is_enabled || false;

    if (!isEnabled) {
      logger.dev(`[hasModuleAccess] Module ${module} is explicitly disabled for dealership`);
    } else {
      logger.dev(`[hasModuleAccess] ✅ Module ${module} is enabled for dealership`);
    }

    return isEnabled;
  }, [modules, loading]);

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
