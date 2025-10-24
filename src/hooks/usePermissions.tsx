import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type {
    EnhancedUserGranular,
    GranularCustomRole,
    ModulePermissionKey,
    SystemPermissionKey
} from '@/types/permissions';
import { useCallback, useEffect, useState } from 'react';
import { useUserProfileForPermissions } from './useUserProfile';

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
  | 'contacts';

/**
 * @deprecated Legacy permission levels - Use ModulePermissionKey instead
 * Hierarchical permission levels: none < view < edit < delete < admin
 */
export type PermissionLevel = 'none' | 'view' | 'edit' | 'delete' | 'admin';

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
 * @deprecated Legacy Permission Hierarchy
 * Used to compare and aggregate permission levels
 */
const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  'none': 0,
  'view': 1,
  'edit': 2,
  'delete': 3,
  'admin': 4
};

/**
 * usePermissions Hook (Granular System)
 *
 * Manages user permissions using the Granular Custom Roles system.
 * Loads user's custom roles and aggregates permissions from all assigned roles.
 * Supports both system-level and module-specific permissions.
 *
 * @returns {Object} Permission utilities and user data
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const [enhancedUser, setEnhancedUser] = useState<EnhancedUserGranular | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: profileData, isLoading: isLoadingProfile } = useUserProfileForPermissions();

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

    try {
      // System admins have full access to everything
      if (profileData.role === 'system_admin') {
        console.log('🟢 User is system_admin - full access granted');
        return {
          id: profileData.id,
          email: profileData.email,
          dealership_id: profileData.dealership_id,
          is_system_admin: true,
          custom_roles: [],
          system_permissions: new Set(),
          module_permissions: new Map()
        };
      }

      // Fetch user's role assignments from BOTH tables
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
      // 2. Load system-level role (assigned via dealer_memberships.custom_role_id)
      // ========================================================================
      // These are global system roles (dealer_id = NULL)
      // Example: "user", "manager", "system_admin"
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

      // Process system role (must have dealer_id = NULL)
      (membershipsData || []).forEach(m => {
        if (m.dealer_custom_roles?.id) {
          // VALIDATION: System roles MUST have dealer_id = NULL
          if (m.dealer_custom_roles.dealer_id === null) {
            roleIds.add(m.dealer_custom_roles.id);
            rolesDebug.push({
              source: 'dealer_memberships',
              type: 'system_role',
              role_id: m.dealer_custom_roles.id,
              role_name: m.dealer_custom_roles.role_name,
              display_name: m.dealer_custom_roles.display_name,
              dealer_id: null
            });
          } else {
            console.warn(
              '⚠️ Invalid system role assignment - dealer_id should be NULL for system roles:',
              m.dealer_custom_roles.role_name,
              '(dealer_id:', m.dealer_custom_roles.dealer_id, ')'
            );
          }
        }
      });

      const roleIdsArray = Array.from(roleIds);

      if (roleIdsArray.length === 0) {
        console.warn('⚠️ User has no custom roles assigned');
        return {
          id: profileData.id,
          email: profileData.email,
          dealership_id: profileData.dealership_id,
          is_system_admin: false,
          custom_roles: [],
          system_permissions: new Set(),
          module_permissions: new Map()
        };
      }

      // Count system roles (dealer_id = NULL)
      const systemRoleCount = membershipsData?.filter(m =>
        m.dealer_custom_roles?.dealer_id === null
      ).length || 0;

      console.log(`📋 Found ${roleIdsArray.length} total role(s) for user`);
      console.log(`   - Dealer custom roles: ${(assignmentsData || []).length}`);
      console.log(`   - System role: ${systemRoleCount}`);
      console.log(`📋 Roles breakdown:`, rolesDebug);

      // Fetch system-level permissions for all assigned roles
      const { data: systemPermsData, error: systemPermsError } = await supabase
        .from('role_system_permissions')
        .select(`
          role_id,
          system_permissions (
            permission_key
          )
        `)
        .in('role_id', roleIdsArray);

      if (systemPermsError) throw systemPermsError;

      // Fetch module-specific permissions for all assigned roles
      const { data: modulePermsData, error: modulePermsError } = await supabase
        .from('role_module_permissions_new')
        .select(`
          role_id,
          module_permissions (
            module,
            permission_key
          )
        `)
        .in('role_id', roleIdsArray);

      if (modulePermsError) throw modulePermsError;

      // Fetch role module access for all assigned roles (NEW LAYER)
      const { data: roleModuleAccessData, error: roleModuleAccessError } = await supabase
        .from('role_module_access')
        .select('role_id, module, is_enabled')
        .in('role_id', roleIdsArray)
        .eq('is_enabled', true); // Only load enabled modules

      if (roleModuleAccessError) {
        console.warn('⚠️ Error fetching role module access (non-critical):', roleModuleAccessError);
      }

      // Build a map of which modules each role has access to
      const roleModuleAccessMap = new Map<string, Set<string>>();
      (roleModuleAccessData || []).forEach((item: any) => {
        if (!roleModuleAccessMap.has(item.role_id)) {
          roleModuleAccessMap.set(item.role_id, new Set());
        }
        roleModuleAccessMap.get(item.role_id)!.add(item.module);
      });

      console.log(`📋 Loaded role module access for ${roleModuleAccessMap.size} roles`);

      // Build roles map with granular permissions
      const rolesMap = new Map<string, GranularCustomRole>();

      // Helper function to process a role
      const processRole = (role: any, roleType: 'system_role' | 'dealer_custom_role') => {
        if (!role || rolesMap.has(role.id)) return; // Skip if already processed

        // Get system permissions for this role
        const roleSystemPerms = (systemPermsData || [])
          .filter((p: any) => p.role_id === role.id && p.system_permissions)
          .map((p: any) => p.system_permissions.permission_key as SystemPermissionKey);

        // Get module permissions for this role
        const roleModulePerms = (modulePermsData || [])
          .filter((p: any) => p.role_id === role.id && p.module_permissions);

        // Get which modules this role has access to (toggle layer)
        const roleModulesEnabled = roleModuleAccessMap.get(role.id);

        // Organize module permissions by module
        // IMPORTANT: Only include permissions for modules that the role has access to
        const modulePermissionsMap = new Map<AppModule, Set<ModulePermissionKey>>();
        roleModulePerms.forEach((p: any) => {
          const module = p.module_permissions.module as AppModule;
          const permKey = p.module_permissions.permission_key as ModulePermissionKey;

          // TRIPLE VERIFICATION LAYER:
          // 1. Dealership has module enabled (checked in PermissionGuard)
          // 2. Role has module access enabled (checked HERE - NEW)
          // 3. Role has specific permission (added below)

          // If role_module_access is empty, assume all modules enabled (backwards compatible)
          // If role_module_access exists, only include if module is in the enabled set
          const roleHasModuleAccess = !roleModulesEnabled || roleModulesEnabled.has(module);

          if (!roleHasModuleAccess) {
            // Role has module disabled - skip these permissions
            console.log(`⚠️ Skipping ${module} permissions for role ${role.role_name} - module disabled for role`);
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
      // Process roles from both sources
      // ========================================================================
      // Dealer custom roles (dealer_id != NULL)
      (assignmentsData || []).forEach(a =>
        processRole(a.dealer_custom_roles, 'dealer_custom_role')
      );

      // System roles (dealer_id = NULL)
      (membershipsData || []).forEach(m => {
        // Only process if dealer_id is NULL (system role)
        if (m.dealer_custom_roles?.dealer_id === null) {
          processRole(m.dealer_custom_roles, 'system_role');
        }
      });

      // Aggregate all permissions from all roles (OR logic - union)
      const aggregatedSystemPerms = new Set<SystemPermissionKey>();
      const aggregatedModulePerms = new Map<AppModule, Set<ModulePermissionKey>>();

      rolesMap.forEach(role => {
        // Aggregate system permissions
        role.system_permissions.forEach(perm => {
          aggregatedSystemPerms.add(perm);
        });

        // Aggregate module permissions
        role.module_permissions.forEach((perms, module) => {
          if (!aggregatedModulePerms.has(module)) {
            aggregatedModulePerms.set(module, new Set());
          }
          perms.forEach(perm => {
            aggregatedModulePerms.get(module)!.add(perm);
          });
        });
      });

      console.log(`✅ Loaded ${rolesMap.size} custom roles`);
      console.log(`   - ${aggregatedSystemPerms.size} system-level permissions`);
      console.log(`   - ${aggregatedModulePerms.size} modules with granular permissions`);

      return {
        id: profileData.id,
        email: profileData.email,
        dealership_id: profileData.dealership_id,
        is_system_admin: false,
        custom_roles: Array.from(rolesMap.values()),
        system_permissions: aggregatedSystemPerms,
        module_permissions: aggregatedModulePerms
      };
    } catch (error) {
      console.error('💥 Error in fetchGranularRolePermissions:', error);
      return null;
    }
  }, [user, profileData]);

  /**
   * Fetch User Permissions
   * Main function to load user permissions (Granular System)
   */
  const fetchUserPermissions = useCallback(async () => {
    if (!user) {
      setEnhancedUser(null);
      setLoading(false);
      return;
    }

    if (isLoadingProfile) {
      return; // Wait for profile to load
    }

    try {
      setLoading(true);
      console.log('🔄 Fetching granular user permissions...');

      const userData = await fetchGranularRolePermissions();
      setEnhancedUser(userData);

      if (userData) {
        console.log('✅ Granular user permissions loaded successfully');
      }
    } catch (error) {
      console.error('💥 Error fetching user permissions:', error);
      setEnhancedUser(null);
    } finally {
      setLoading(false);
    }
  }, [user, isLoadingProfile, fetchGranularRolePermissions]);

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  /**
   * Check if user has a specific system-level permission
   *
   * @param permission - The system permission to check
   * @returns true if user has the system permission
   */
  const hasSystemPermission = useCallback((permission: SystemPermissionKey): boolean => {
    if (!enhancedUser) return false;

    // System admins have all permissions
    if (enhancedUser.is_system_admin) return true;

    // Check if user has this system permission
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
    if (!enhancedUser) return false;

    // System admins have all permissions
    if (enhancedUser.is_system_admin) return true;

    // Users without custom roles have no access
    if (enhancedUser.custom_roles.length === 0) {
      return false;
    }

    // Check if user has this specific permission for the module
    const modulePerms = enhancedUser.module_permissions.get(module);
    if (!modulePerms) return false;

    return modulePerms.has(permission);
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

    // System admins have full access
    if (enhancedUser.is_system_admin) return true;

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

    // System admins have access to all order types
    if (enhancedUser.is_system_admin) {
      return ['sales', 'service', 'recon', 'carwash'];
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
   * Useful after role changes
   */
  const refreshPermissions = useCallback(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

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
