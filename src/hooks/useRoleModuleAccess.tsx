import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppModule } from '@/hooks/usePermissions';

/**
 * Module Access State for a Role
 * Controls whether a role can access a specific module
 */
export interface RoleModuleAccess {
  module: AppModule;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface UseRoleModuleAccessReturn {
  moduleAccess: Map<AppModule, boolean>;
  loading: boolean;
  error: string | null;
  refreshAccess: () => Promise<void>;
  toggleModuleAccess: (module: AppModule, isEnabled: boolean) => Promise<boolean>;
  bulkSetModuleAccess: (modules: Array<{ module: AppModule; is_enabled: boolean }>) => Promise<boolean>;
  hasRoleModuleAccess: (module: AppModule) => boolean;
}

/**
 * useRoleModuleAccess Hook
 *
 * Manages module access toggles for custom roles.
 * This provides a layer between dealership modules (which modules the dealer has)
 * and granular permissions (what the user can do in each module).
 *
 * @param roleId - The custom role ID to manage
 * @returns Module access utilities
 */
export const useRoleModuleAccess = (roleId: string | null): UseRoleModuleAccessReturn => {
  const [moduleAccess, setModuleAccess] = useState<Map<AppModule, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load module access settings for this role
   */
  const refreshAccess = useCallback(async () => {
    if (!roleId) {
      setLoading(false);
      setModuleAccess(new Map());
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.rpc('get_role_module_access', {
        p_role_id: roleId
      });

      if (fetchError) throw fetchError;

      // Convert array to Map for fast lookups
      const accessMap = new Map<AppModule, boolean>();
      (data || []).forEach((item: RoleModuleAccess) => {
        accessMap.set(item.module, item.is_enabled);
      });

      setModuleAccess(accessMap);
      console.log(`✅ [useRoleModuleAccess] Loaded access for ${accessMap.size} modules`);
    } catch (err) {
      console.error('Error fetching role module access:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch module access');
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  /**
   * Toggle access to a single module
   */
  const toggleModuleAccess = useCallback(async (module: AppModule, isEnabled: boolean): Promise<boolean> => {
    if (!roleId) return false;

    try {
      const { data, error: updateError } = await supabase.rpc('toggle_role_module_access', {
        p_role_id: roleId,
        p_module: module,
        p_is_enabled: isEnabled
      });

      if (updateError) throw updateError;

      // Update local state
      setModuleAccess(prev => {
        const updated = new Map(prev);
        updated.set(module, isEnabled);
        return updated;
      });

      console.log(`✅ [useRoleModuleAccess] Toggled ${module} to ${isEnabled}`);
      return data;
    } catch (err) {
      console.error('Error toggling module access:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle module access');
      return false;
    }
  }, [roleId]);

  /**
   * Set multiple module access settings at once
   * Useful for bulk operations
   */
  const bulkSetModuleAccess = useCallback(async (
    modules: Array<{ module: AppModule; is_enabled: boolean }>
  ): Promise<boolean> => {
    if (!roleId) return false;

    try {
      const { data, error: updateError } = await supabase.rpc('bulk_set_role_module_access', {
        p_role_id: roleId,
        p_modules_access: modules
      });

      if (updateError) throw updateError;

      // Update local state
      setModuleAccess(prev => {
        const updated = new Map(prev);
        modules.forEach(({ module, is_enabled }) => {
          updated.set(module, is_enabled);
        });
        return updated;
      });

      console.log(`✅ [useRoleModuleAccess] Bulk updated ${modules.length} modules`);
      return data;
    } catch (err) {
      console.error('Error bulk setting module access:', err);
      setError(err instanceof Error ? err.message : 'Failed to set module access');
      return false;
    }
  }, [roleId]);

  /**
   * Check if role has access to a module
   * Returns true if module is enabled for this role
   */
  const hasRoleModuleAccess = useCallback((module: AppModule): boolean => {
    // If no data loaded yet, assume enabled (fail-open for loading state)
    if (moduleAccess.size === 0) {
      return true;
    }

    // Check if module is enabled for this role
    return moduleAccess.get(module) ?? true; // Default to true if not explicitly set
  }, [moduleAccess]);

  /**
   * Load on mount and when roleId changes
   */
  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  return {
    moduleAccess,
    loading,
    error,
    refreshAccess,
    toggleModuleAccess,
    bulkSetModuleAccess,
    hasRoleModuleAccess
  };
};
