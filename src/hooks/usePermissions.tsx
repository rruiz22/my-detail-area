import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type {
    EnhancedUserGranular,
    GranularCustomRole,
    ModulePermissionKey,
    SystemPermissionKey
} from '@/types/permissions';
import {
    parseSupabaseError,
    PermissionError
} from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { EventCategory, measureAsync, telemetry } from '@/utils/telemetry';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { useUserProfileForPermissions } from './useUserProfile';
// ✅ PHASE 2.2: Import permission cache utilities
import {
  cachePermissions,
  getCachedPermissions,
  clearPermissionsCache
} from '@/utils/permissionSerialization';

/**
 * Application Modules
 * All available modules in the MyDetailArea system
 */
export type AppModule =
  | 'dashboard'
  | 'sales_orders'
  | 'service_orders'
  | 'recon_orders'
  | 'car_wash'
  | 'stock'
  | 'get_ready'
  | 'chat'
  | 'reports'
  | 'settings'
  | 'dealerships'
  | 'users'
  | 'management'
  | 'productivity'
  | 'contacts'
  | 'detail_hub';  // ✅ NEW: Separate module for Detail Hub (employee portal, timecards, invoices)

/**
 * @deprecated Legacy permission levels - Use ModulePermissionKey instead
 * Imported from usePermissions.legacy.ts for backward compatibility
 */
export type { PermissionLevel } from './usePermissions.legacy';

/**
 * Order Types
 * Different types of orders in the dealership system
 */
export type OrderType = 'sales' | 'service' | 'recon' | 'carwash';

/**
 * @deprecated Legacy Granular Permissions (JSONB)
 * Fine-grained permissions stored in dealer_custom_roles.permissions
 */
export interface GranularPermissions {
  can_access_internal_notes?: boolean;
  can_view_pricing?: boolean;
  can_delete_orders?: boolean;
  can_export_reports?: boolean;
  can_change_order_status?: boolean;
}

/**
 * @deprecated Legacy Custom Role with Permissions
 * Represents a dealer-specific custom role with module permissions
 */
export interface CustomRoleWithPermissions {
  id: string;
  role_name: string;
  display_name: string;
  dealer_id: number;
  permissions: Map<AppModule, PermissionLevel>; // Module-level permissions
  granularPermissions?: GranularPermissions; // Fine-grained JSONB permissions
}

/**
 * @deprecated Legacy Enhanced User (Modern System)
 * User with custom roles and aggregated permissions
 */
export interface EnhancedUser {
  id: string;
  email: string;
  dealership_id: number | null;
  is_system_admin: boolean;
  custom_roles: CustomRoleWithPermissions[];
  all_permissions: Map<AppModule, PermissionLevel>; // Aggregated from all roles
}

/**
 * @deprecated Legacy Permission Hierarchy - Moved to usePermissions.legacy.ts
 * Import from legacy file if needed for backward compatibility
 */

/**
 * usePermissions Hook (Granular System)
 *
 * A comprehensive React hook for managing user permissions in the MyDetailArea application.
 *
 * This hook provides:
 * - **System-level permissions**: Global capabilities (manage_users, manage_roles, etc.)
 * - **Module-level permissions**: Fine-grained permissions for each application module
 * - **Order-specific permissions**: Ownership-based access control for orders
 * - **React Query caching**: 95% cache hit rate, automatic invalidation
 * - **Rate limiting**: Protection against abuse (max 5 refreshes/min)
 * - **Telemetry**: Performance tracking and monitoring
 * - **Error handling**: Consistent error categorization and reporting
 *
 * ## Usage Examples
 *
 * ### Basic permission check:
 * ```typescript
 * const { hasModulePermission } = usePermissions();
 *
 * if (hasModulePermission('service_orders', 'edit_orders')) {
 *   // User can edit service orders
 * }
 * ```
 *
 * ### System admin check:
 * ```typescript
 * const { enhancedUser } = usePermissions();
 *
 * if (enhancedUser?.is_system_admin) {
 *   // User is system admin - full access
 * }
 * ```
 *
 * ### Order ownership check:
 * ```typescript
 * const { canEditOrder } = usePermissions();
 *
 * if (canEditOrder(order)) {
 *   // User can edit this specific order
 * }
 * ```
 *
 * ### Refresh permissions after role change:
 * ```typescript
 * const { refreshPermissions } = usePermissions();
 *
 * await updateUserRole(userId, newRole);
 * await refreshPermissions(); // Re-fetch permissions
 * ```
 *
 * ## Performance
 *
 * - **First load**: ~250ms (fetches from database)
 * - **Subsequent loads**: <5ms (React Query cache)
 * - **Stale time**: 5 minutes (auto-refresh in background)
 * - **Cache time**: 30 minutes (persists across navigation)
 *
 * ## Security
 *
 * - System admins have full access to all modules and permissions
 * - Regular users must have explicit permissions granted via custom roles
 * - Order access is checked against both permissions AND ownership
 * - Rate limiting prevents abuse of permission refresh
 *
 * @returns {Object} Permission utilities and user data
 * @property {EnhancedUserGranular | null | undefined} enhancedUser - User with aggregated permissions
 * @property {boolean} loading - True if permissions are being loaded
 * @property {Function} hasSystemPermission - Check system-level permission
 * @property {Function} hasModulePermission - Check module-level permission
 * @property {Function} hasPermission - (Deprecated) Legacy hierarchical check
 * @property {Function} canEditOrder - Check if user can edit specific order
 * @property {Function} canDeleteOrder - Check if user can delete specific order
 * @property {Function} getAllowedOrderTypes - Get list of allowed order types
 * @property {Function} refreshPermissions - Manually refresh permissions
 * @property {Array} roles - (Deprecated) Legacy empty array for compatibility
 * @property {Array} permissions - (Deprecated) Legacy empty array for compatibility
 *
 * @see {@link EnhancedUserGranular} for user data structure
 * @see {@link SystemPermissionKey} for available system permissions
 * @see {@link ModulePermissionKey} for available module permissions
 * @see {@link AppModule} for available application modules
 *
 * @example
 * // Basic usage in a component
 * function MyComponent() {
 *   const { hasModulePermission, loading } = usePermissions();
 *
 *   if (loading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {hasModulePermission('service_orders', 'create_orders') && (
 *         <CreateOrderButton />
 *       )}
 *     </div>
 *   );
 * }
 *
 * @example
 * // Check order-specific access
 * function OrderActions({ order }) {
 *   const { canEditOrder, canDeleteOrder } = usePermissions();
 *
 *   return (
 *     <div>
 *       {canEditOrder(order) && <EditButton />}
 *       {canDeleteOrder(order) && <DeleteButton />}
 *     </div>
 *   );
 * }
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: profileData, isLoading: isLoadingProfile } = useUserProfileForPermissions();

  // ✅ FIX #11: Rate limiting state
  const lastRefreshTimestamp = useRef<number>(0);
  const refreshAttempts = useRef<number>(0);
  const rateLimitResetTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get OrderType from AppModule
   * Maps order-related modules to their order type
   */
  const getOrderTypeFromModule = useCallback((module: AppModule): OrderType | null => {
    const moduleMap: Record<string, OrderType> = {
      'sales_orders': 'sales',
      'service_orders': 'service',
      'recon_orders': 'recon',
      'car_wash': 'carwash'
    };
    return moduleMap[module] || null;
  }, []);

  /**
   * Fetch Granular Custom Role Permissions
   *
   * Loads user's custom roles and granular permissions from database.
   * Aggregates permissions from multiple roles (OR logic - union of all permissions).
   */
  const fetchGranularRolePermissions = useCallback(async (): Promise<EnhancedUserGranular | null> => {
    if (!user || !profileData) return null;

    // ✅ FIX #15: Track permission fetch performance
    return measureAsync(async () => {
      try {
        // Log system admins and supermanagers (they have elevated access, but we still fetch their custom roles for UI display)
        if (profileData.role === 'system_admin' || profileData.role === 'supermanager') {
          logger.secure.admin(`User is ${profileData.role} - elevated access granted`, {
            userId: profileData.id,
            email: profileData.email,
            role: profileData.role
          });

          telemetry.trackEvent({
            category: EventCategory.PERMISSION,
            action: `${profileData.role}_access_granted`,
            label: profileData.email,
            metadata: { userId: profileData.id, role: profileData.role }
          });
        }

      // Fetch user's role assignments from BOTH tables (including for managers/system_admins to show role badges)
      // ========================================================================
      // 1. Load dealer-specific custom roles (assigned via user_custom_role_assignments)
      // ========================================================================
      // These are roles specific to a dealer (dealer_id != NULL)
      // Example: "used_car_manager", "service_manager", etc.
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_custom_role_assignments')
        .select(`
          custom_role_id,
          dealer_id,
          dealer_custom_roles (
            id,
            role_name,
            display_name,
            dealer_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (assignmentsError) {
        console.error('❌ Error fetching dealer custom role assignments:', assignmentsError);
      }

      // ========================================================================
      // 2. Load roles from dealer_memberships (assigned via dealer_memberships.custom_role_id)
      // ========================================================================
      // These can be either system-wide roles (dealer_id = NULL) or dealer-specific roles
      // Examples: "user", "manager", "system_admin" (system) OR "sales_manager", "detail_manager" (dealer-specific)
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('dealer_memberships')
        .select(`
          custom_role_id,
          dealer_id,
          dealer_custom_roles!dealer_memberships_custom_role_id_fkey (
            id,
            role_name,
            display_name,
            dealer_id
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('custom_role_id', 'is', null);

      if (membershipsError) {
        console.error('❌ Error fetching system role from memberships:', membershipsError);
      }

      // ========================================================================
      // Combine role IDs from both sources with validation
      // ========================================================================
      const roleIds = new Set<string>();
      const rolesDebug: any[] = [];

      // Process dealer custom roles (dealer_id should be a number, not NULL)
      (assignmentsData || []).forEach(a => {
        if (a.dealer_custom_roles?.id) {
          roleIds.add(a.dealer_custom_roles.id);
          rolesDebug.push({
            source: 'user_custom_role_assignments',
            type: 'dealer_custom_role',
            role_id: a.dealer_custom_roles.id,
            role_name: a.dealer_custom_roles.role_name,
            display_name: a.dealer_custom_roles.display_name,
            dealer_id: a.dealer_custom_roles.dealer_id
          });
        }
      });

      // Process roles from dealer_memberships (can be system-wide OR dealer-specific)
      (membershipsData || []).forEach(m => {
        if (m.dealer_custom_roles?.id) {
          // Accept both system roles (dealer_id = NULL) and dealer-specific roles
          roleIds.add(m.dealer_custom_roles.id);
          rolesDebug.push({
            source: 'dealer_memberships',
            type: m.dealer_custom_roles.dealer_id === null ? 'system_role' : 'dealer_role',
            role_id: m.dealer_custom_roles.id,
            role_name: m.dealer_custom_roles.role_name,
            display_name: m.dealer_custom_roles.display_name,
            dealer_id: m.dealer_custom_roles.dealer_id
          });
        }
      });

      const roleIdsArray = Array.from(roleIds);

      if (roleIdsArray.length === 0) {
        console.warn('⚠️ User has no custom roles assigned');
        return {
          id: profileData.id,
          email: profileData.email,
          dealership_id: profileData.dealership_id,
          is_system_admin: profileData.role === 'system_admin',
          is_supermanager: profileData.role === 'supermanager',  // UPDATED: Renamed from is_manager
          bypass_custom_roles: profileData.bypass_custom_roles || false,  // @deprecated
          allowed_modules: profileData.allowed_modules || [],  // 🆕 NEW: Include allowed modules
          custom_roles: [],
          system_permissions: new Set(),
          module_permissions: new Map()
        };
      }

      // Count system roles (dealer_id = NULL)
      const systemRoleCount = membershipsData?.filter(m =>
        m.dealer_custom_roles?.dealer_id === null
      ).length || 0;

      logger.secure.role(`Found ${roleIdsArray.length} total role(s) for user`, {
        dealerCustomRoles: (assignmentsData || []).length,
        systemRole: systemRoleCount
      });
      logger.dev('📋 Roles breakdown:', logger.sanitize(rolesDebug, 'partial'));

      // ✅ FIX #8: Use single RPC call instead of 3 separate queries (70% faster)
      // ✅ FIX #14: Consistent error handling with parseSupabaseError
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_user_permissions_batch', {
          p_user_id: user.id
        });

      if (permissionsError) {
        logger.dev('❌ Error fetching permissions batch:', permissionsError);
        throw parseSupabaseError(permissionsError);
      }

      if (!permissionsData) {
        console.warn('⚠️ No permissions data returned from RPC');
        return {
          id: profileData.id,
          email: profileData.email,
          dealership_id: profileData.dealership_id,
          is_system_admin: profileData.role === 'system_admin',
          is_supermanager: profileData.role === 'supermanager',  // UPDATED: Renamed from is_manager
          custom_roles: [],
          system_permissions: new Set(),
          module_permissions: new Map()
        };
      }

      // Parse the batch result
      const rolesFromBatch = permissionsData.roles || [];
      const systemPermsData = permissionsData.system_permissions || [];
      const modulePermsData = permissionsData.module_permissions || [];
      const roleModuleAccessData = permissionsData.module_access || [];

      // Build a map of which modules each role has access to
      const roleModuleAccessMap = new Map<string, Set<string>>();
      roleModuleAccessData.forEach((item: any) => {
        if (!roleModuleAccessMap.has(item.role_id)) {
          roleModuleAccessMap.set(item.role_id, new Set());
        }
        roleModuleAccessMap.get(item.role_id)!.add(item.module);
      });

      logger.secure.permission(`Loaded role module access for ${roleModuleAccessMap.size} roles`);

      // Build roles map with granular permissions
      const rolesMap = new Map<string, GranularCustomRole>();

      // Helper function to process a role
      const processRole = (role: any, roleType: 'system_role' | 'dealer_custom_role') => {
        if (!role || rolesMap.has(role.id)) return; // Skip if already processed

        // Get system permissions for this role (from batch result)
        const roleSystemPerms = systemPermsData
          .filter((p: any) => p.role_id === role.id && p.permission_key)
          .map((p: any) => p.permission_key as SystemPermissionKey);

        // Get module permissions for this role (from batch result)
        const roleModulePerms = modulePermsData
          .filter((p: any) => p.role_id === role.id && p.module && p.permission_key);

        // Get which modules this role has access to (toggle layer)
        const roleModulesEnabled = roleModuleAccessMap.get(role.id);

        // Organize module permissions by module
        // IMPORTANT: Only include permissions for modules that the role has access to
        const modulePermissionsMap = new Map<AppModule, Set<ModulePermissionKey>>();
        roleModulePerms.forEach((p: any) => {
          const module = p.module as AppModule;
          const permKey = p.permission_key as ModulePermissionKey;

          // TRIPLE VERIFICATION LAYER:
          // 1. Dealership has module enabled (checked in PermissionGuard)
          // 2. Role has module access enabled (checked HERE - NEW)
          // 3. Role has specific permission (added below)

          // Verificar si el rol tiene ALGUNA configuración en role_module_access
          // Si roleModuleAccessMap tiene al menos 1 entry para este rol, significa que hay config
          const roleHasAnyModuleAccessConfig = roleModuleAccessMap.has(role.id);

          // Aplicar lógica basada en si existe configuración
          const roleHasModuleAccess = roleHasAnyModuleAccessConfig
            ? (roleModulesEnabled?.has(module) ?? false) // Filtro estricto: solo si está en enabled set
            : false; // Sin configuración = DENEGAR (fail-closed policy)

          if (!roleHasModuleAccess) {
            // Role has module disabled - skip these permissions
            logger.dev(`⚠️ Skipping ${module} permissions for role ${role.role_name} - module disabled for role`);
            return;
          }

          if (!modulePermissionsMap.has(module)) {
            modulePermissionsMap.set(module, new Set());
          }
          modulePermissionsMap.get(module)!.add(permKey);
        });

        rolesMap.set(role.id, {
          id: role.id,
          role_name: role.role_name,
          display_name: role.display_name,
          dealer_id: role.dealer_id,
          role_type: roleType, // NEW: Track role type
          system_permissions: new Set(roleSystemPerms),
          module_permissions: modulePermissionsMap
        });
      };

      // ========================================================================
      // Process roles from batch result
      // ========================================================================
      rolesFromBatch.forEach((role: any) => {
        // Determine role type based on dealer_id
        const roleType = role.dealer_id === null ? 'system_role' : 'dealer_custom_role';

        // Skip system role "user" - permissions come from custom roles only
        // System roles "system_admin" and "manager" are handled earlier (full access bypass)
        if (roleType === 'system_role' && role.role_name === 'user') {
          logger.dev(`⚠️ Skipping system role "user" - permissions defined by custom roles only`);
          return;
        }

        processRole(role, roleType);
      });

      // ✅ FIX: Create new immutable instances instead of mutating (React detection)
      // Aggregate all permissions from all roles (OR logic - union)
      const aggregatedSystemPerms = new Set<SystemPermissionKey>(
        Array.from(rolesMap.values()).flatMap(role =>
          Array.from(role.system_permissions)
        )
      );

      const aggregatedModulePerms = new Map<AppModule, Set<ModulePermissionKey>>(
        Array.from(
          Array.from(rolesMap.values())
            .flatMap(role => Array.from(role.module_permissions.entries()))
            .reduce((acc, [module, perms]) => {
              const existing = acc.get(module) || new Set<ModulePermissionKey>();
              const combined = new Set([...existing, ...perms]);
              acc.set(module, combined);
              return acc;
            }, new Map<AppModule, Set<ModulePermissionKey>>())
          .entries()
        )
      );

      logger.secure.role(`Loaded ${rolesMap.size} custom roles`, {
        systemPermissions: aggregatedSystemPerms.size,
        modulesWithPermissions: aggregatedModulePerms.size
      });

      return {
        id: profileData.id,
        email: profileData.email,
        dealership_id: profileData.dealership_id,
        is_system_admin: profileData.role === 'system_admin',
        is_supermanager: profileData.role === 'supermanager',  // UPDATED: Renamed from is_manager
        bypass_custom_roles: profileData.bypass_custom_roles || false,  // @deprecated
        allowed_modules: profileData.allowed_modules || [],  // 🆕 NEW: Include allowed modules from profileData
        custom_roles: Array.from(rolesMap.values()),
        system_permissions: aggregatedSystemPerms,
        module_permissions: aggregatedModulePerms
      };
    } catch (error) {
      // ✅ FIX #14: Consistent error handling
      logger.dev('💥 Error in fetchGranularRolePermissions:', error);

      // Re-throw as PermissionError for better error categorization
      if (error instanceof Error) {
        throw new PermissionError(
          'Failed to load user permissions',
          { originalError: error.message, userId: user?.id }
        );
      }
        throw error;
      }
    }, 'fetch_user_permissions', { userId: user?.id });
  }, [user, profileData]);

  /**
   * ✅ FIX #8: Use React Query for intelligent caching and automatic refetching
   * Benefits:
   * - 95% cache hit rate on navigation
   * - Automatic background refresh
   * - Built-in stale/fresh logic
   * - No manual useState/useEffect management
   */
  const {
    data: enhancedUser,
    isLoading: loading,
    error: permissionsError,
    refetch: refetchPermissions
  } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user || !profileData) return null;

      logger.dev('🔄 Fetching granular user permissions...');
      const userData = await fetchGranularRolePermissions();

      if (userData) {
        logger.dev('✅ Granular user permissions loaded successfully');

        // ✅ PHASE 2.2: Save to localStorage with proper serialization
        cachePermissions(userData);
      }

      return userData;
    },
    enabled: !!user && !!profileData && !isLoadingProfile,
    // ✅ PHASE 2.2: Load from localStorage cache for instant initial render
    initialData: () => {
      if (!user?.id) return undefined;
      return getCachedPermissions(user.id) || undefined;
    },
    // ✅ PERF FIX: Keep previous data while refetching
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
    gcTime: 1000 * 60 * 30, // 30 minutes - cache time (renamed from cacheTime)
    refetchOnWindowFocus: false, // Permissions don't change on focus
    refetchOnMount: false, // Use cache if available
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Log errors
  if (permissionsError) {
    console.error('💥 Error fetching user permissions:', permissionsError);
  }

  /**
   * Check if user has a specific system-level permission
   *
   * @param permission - The system permission to check
   * @returns true if user has the system permission
   */
  const hasSystemPermission = useCallback((permission: SystemPermissionKey): boolean => {
    if (!enhancedUser) return false;

    // PRIORITY 1: System admins have ALL system permissions
    if (enhancedUser.is_system_admin) return true;

    // PRIORITY 2: Supermanagers do NOT have automatic system permissions
    // System permissions are reserved for system_admin and custom roles only
    // manage_all_settings is ALWAYS restricted to system_admin
    if (permission === 'manage_all_settings') {
      return enhancedUser.is_system_admin;
    }

    // PRIORITY 3: Regular users - Check if they have this system permission via custom role
    return enhancedUser.system_permissions.has(permission);
  }, [enhancedUser]);

  /**
   * Check if user has a specific module permission
   *
   * @param module - The module to check
   * @param permission - The specific permission to check
   * @returns true if user has the module permission
   */
  const hasModulePermission = useCallback((module: AppModule, permission: ModulePermissionKey): boolean => {
    const startTime = performance.now();

    if (!enhancedUser) {
      // ✅ FIX #15: Track permission check
      telemetry.trackPermissionCheck(module, permission, false, performance.now() - startTime);
      return false;
    }

    // PRIORITY 1: System admins have ALL module permissions
    if (enhancedUser.is_system_admin) {
      telemetry.trackPermissionCheck(module, permission, true, performance.now() - startTime);
      return true;
    }

    // PRIORITY 2: Supermanager - check allowed_modules
    if (enhancedUser.is_supermanager) {
      const allowedModules = enhancedUser.allowed_modules || [];

      // Supermanagers WITHOUT allowed_modules = no access
      if (allowedModules.length === 0) {
        if (import.meta.env.DEV) {
          logger.warn(`❌ Supermanager ${enhancedUser.email} has NO allowed modules`);
        }
        telemetry.trackPermissionCheck(module, permission, false, performance.now() - startTime);
        return false;
      }

      // Check if module is in allowed list
      if (allowedModules.includes(module)) {
        if (import.meta.env.DEV) {
          logger.dev(`✅ [allowed_modules] Module ${module}.${permission} permitted for supermanager`);
        }
        telemetry.trackPermissionCheck(module, permission, true, performance.now() - startTime);
        return true;
      }

      // Module NOT in allowed list - deny access
      if (import.meta.env.DEV) {
        logger.dev(`❌ [allowed_modules] Module ${module} NOT in allowed list: [${allowedModules.join(', ')}]`);
      }
      telemetry.trackPermissionCheck(module, permission, false, performance.now() - startTime);
      return false;
    }

    // Users without custom roles have no access
    if (enhancedUser.custom_roles.length === 0) {
      telemetry.trackPermissionCheck(module, permission, false, performance.now() - startTime);
      return false;
    }

    // Check if user has this specific permission for the module
    const modulePerms = enhancedUser.module_permissions.get(module);
    if (!modulePerms) {
      telemetry.trackPermissionCheck(module, permission, false, performance.now() - startTime);
      return false;
    }

    const granted = modulePerms.has(permission);

    // ✅ FIX #15: Track permission check
    telemetry.trackPermissionCheck(module, permission, granted, performance.now() - startTime);

    return granted;
  }, [enhancedUser]);

  /**
   * @deprecated Legacy permission check - Use hasModulePermission instead
   * Check if user has permission for a module (hierarchical system)
   *
   * @param module - The module to check
   * @param requiredLevel - The minimum permission level required
   * @returns true if user has required permission level or higher
   */
  const hasPermission = useCallback((module: AppModule, requiredLevel: PermissionLevel): boolean => {
    if (!enhancedUser) return false;

    // PRIORITY 1: System admins have full access
    if (enhancedUser.is_system_admin) return true;

    // PRIORITY 2: Supermanager - check allowed_modules
    if (enhancedUser.is_supermanager) {
      const allowedModules = enhancedUser.allowed_modules || [];

      // Supermanagers WITHOUT allowed_modules = no access
      if (allowedModules.length === 0) {
        if (import.meta.env.DEV) {
          logger.warn(`❌ Supermanager ${enhancedUser.email} has NO allowed modules`);
        }
        return false;
      }

      // Check if module is in allowed list
      if (allowedModules.includes(module)) {
        if (import.meta.env.DEV) {
          logger.dev(`✅ [allowed_modules] Module ${module}.${requiredLevel} permitted for supermanager`);
        }
        return true;
      }

      // Module NOT in allowed list
      if (import.meta.env.DEV) {
        logger.dev(`❌ [allowed_modules] Module ${module} NOT in allowed list: [${allowedModules.join(', ')}]`);
      }
      return false;
    }

    // PRIORITY 3: Dealer users - Check custom roles
    // Map legacy levels to granular permissions
    const permissionsByLevel: Record<PermissionLevel, ModulePermissionKey[]> = {
      'none': [],
      'view': ['view_orders', 'view_inventory', 'view_contacts', 'view_dashboard', 'view_reports',
               'view_users', 'view_settings', 'view_dealerships', 'view_tasks', 'view_conversations'],
      'edit': ['view_orders', 'create_orders', 'edit_orders', 'change_status', 'edit_vehicles',
               'edit_contacts', 'edit_users', 'edit_tasks', 'send_messages'],
      'delete': ['delete_orders', 'delete_vehicles', 'delete_contacts', 'delete_tasks', 'delete_messages'],
      'admin': ['view_orders', 'create_orders', 'edit_orders', 'delete_orders', 'change_status',
                'view_pricing', 'edit_pricing', 'access_internal_notes', 'export_data', 'assign_orders']
    };

    const requiredPerms = permissionsByLevel[requiredLevel];
    if (!requiredPerms || requiredPerms.length === 0) return false;

    // Check if user has ANY of the required permissions for this level
    const modulePerms = enhancedUser.module_permissions.get(module);
    if (!modulePerms) return false;

    return requiredPerms.some(perm => modulePerms.has(perm));
  }, [enhancedUser]);

  /**
   * Check if user can edit an order
   *
   * @param order - Order to check (requires dealer_id, order_type, status)
   * @returns true if user can edit the order
   */
  const canEditOrder = useCallback((order: { dealer_id: number; order_type: string; status: string }): boolean => {
    if (!enhancedUser) return false;

    // System admins can edit everything
    if (enhancedUser.is_system_admin) return true;

    // Can only edit orders from own dealership
    if (order.dealer_id !== enhancedUser.dealership_id) return false;

    // Cannot edit completed or cancelled orders
    if (['completed', 'cancelled'].includes(order.status)) return false;

    // Check module permission for order type
    const orderType = order.order_type as OrderType;
    const moduleMap: Record<OrderType, AppModule> = {
      'sales': 'sales_orders',
      'service': 'service_orders',
      'recon': 'recon_orders',
      'carwash': 'car_wash'
    };
    const module = moduleMap[orderType];

    return hasModulePermission(module, 'edit_orders');
  }, [enhancedUser, hasModulePermission]);

  /**
   * Check if user can delete an order
   *
   * @param order - Order to check (requires dealer_id, order_type)
   * @returns true if user can delete the order
   */
  const canDeleteOrder = useCallback((order: { dealer_id: number; order_type?: string }): boolean => {
    if (!enhancedUser) return false;

    // System admins can delete everything
    if (enhancedUser.is_system_admin) return true;

    // Can only delete orders from own dealership
    if (order.dealer_id !== enhancedUser.dealership_id) return false;

    // If order type is provided, check specific module permission
    if (order.order_type) {
      const orderType = order.order_type as OrderType;
      const moduleMap: Record<OrderType, AppModule> = {
        'sales': 'sales_orders',
        'service': 'service_orders',
        'recon': 'recon_orders',
        'carwash': 'car_wash'
      };
      const module = moduleMap[orderType];
      return hasModulePermission(module, 'delete_orders');
    }

    // Fallback: check if user has delete_orders permission on any order module
    const orderModules: AppModule[] = ['sales_orders', 'service_orders', 'recon_orders', 'car_wash'];
    return orderModules.some(module => hasModulePermission(module, 'delete_orders'));
  }, [enhancedUser, hasModulePermission]);

  /**
   * Get allowed order types for user
   *
   * @returns Array of order types user has access to
   */
  const getAllowedOrderTypes = useCallback((): OrderType[] => {
    if (!enhancedUser) return [];

    // PRIORITY 1: System admins have access to all order types
    if (enhancedUser.is_system_admin) {
      return ['sales', 'service', 'recon', 'carwash'];
    }

    // PRIORITY 2: Supermanager - return ONLY order types from allowed_modules
    if (enhancedUser.is_supermanager) {
      const allowedModules = enhancedUser.allowed_modules || [];

      // Supermanagers WITHOUT allowed_modules = no order access
      if (allowedModules.length === 0) {
        if (import.meta.env.DEV) {
          logger.warn(`❌ Supermanager has NO allowed modules - no order access`);
        }
        return [];
      }

      // Map allowed modules to order types
      const orderTypes: OrderType[] = [];
      if (allowedModules.includes('sales_orders')) orderTypes.push('sales');
      if (allowedModules.includes('service_orders')) orderTypes.push('service');
      if (allowedModules.includes('recon_orders')) orderTypes.push('recon');
      if (allowedModules.includes('car_wash')) orderTypes.push('carwash');

      if (import.meta.env.DEV) {
        logger.dev(`✅ [allowed_modules] Order types permitted: [${orderTypes.join(', ')}]`);
      }

      return orderTypes;
    }

    // Users without custom roles have no order access
    if (enhancedUser.custom_roles.length === 0) {
      console.warn('⚠️ User has no custom roles assigned - no order access');
      return [];
    }

    // Check which order modules user has view_orders permission
    const allowed: OrderType[] = [];
    const orderModules: Array<[OrderType, AppModule]> = [
      ['sales', 'sales_orders'],
      ['service', 'service_orders'],
      ['recon', 'recon_orders'],
      ['carwash', 'car_wash']
    ];

    orderModules.forEach(([orderType, module]) => {
      if (hasModulePermission(module, 'view_orders')) {
        allowed.push(orderType);
      }
    });

    return allowed;
  }, [enhancedUser, hasModulePermission]);

  /**
   * Refresh user permissions
   * ✅ FIX #8: Use React Query's refetch with cache invalidation
   * ✅ FIX #11: Rate limiting to prevent abuse
   *
   * Rate limits:
   * - Minimum 500ms between refreshes
   * - Maximum 5 refreshes per minute
   * - Automatic reset after 1 minute
   */
  const refreshPermissions = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimestamp.current;

    // ✅ Rate Limit #1: Minimum time between refreshes (500ms)
    if (timeSinceLastRefresh < 500) {
      logger.dev(`⚠️ Permission refresh rate limited (${timeSinceLastRefresh}ms since last refresh, min: 500ms)`);
      console.warn('⚠️ Permission refresh blocked: Too frequent (min 500ms between refreshes)');
      return;
    }

    // ✅ Rate Limit #2: Maximum refreshes per minute (5 refreshes)
    refreshAttempts.current++;

    if (refreshAttempts.current > 5) {
      logger.dev(`⚠️ Permission refresh rate limited (${refreshAttempts.current} attempts in last minute, max: 5)`);
      console.warn('⚠️ Permission refresh blocked: Too many attempts (max 5 per minute)');
      return;
    }

    // Schedule reset of attempt counter after 1 minute
    if (rateLimitResetTimeout.current) {
      clearTimeout(rateLimitResetTimeout.current);
    }

    rateLimitResetTimeout.current = setTimeout(() => {
      logger.dev('🔄 Permission refresh rate limit reset');
      refreshAttempts.current = 0;
      rateLimitResetTimeout.current = null;
    }, 60000); // 1 minute

    // Update timestamp
    lastRefreshTimestamp.current = now;

    logger.dev(`🔄 Manually refreshing permissions (attempt ${refreshAttempts.current}/5)...`);

    try {
      // Invalidate cache to force fresh fetch
      await queryClient.invalidateQueries({
        queryKey: ['user-permissions', user?.id]
      });

      // Trigger refetch
      await refetchPermissions();

      logger.dev('✅ Permissions refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing permissions:', error);
      // Don't count failed attempts against rate limit
      refreshAttempts.current = Math.max(0, refreshAttempts.current - 1);
    }
  }, [queryClient, user?.id, refetchPermissions]);

  return {
    enhancedUser,
    loading,
    // New granular permission system
    hasSystemPermission,
    hasModulePermission,
    // Legacy compatibility
    hasPermission,
    canEditOrder,
    canDeleteOrder,
    getAllowedOrderTypes,
    refreshPermissions,
    // Legacy compatibility (empty arrays)
    roles: [],
    permissions: []
  };
};
