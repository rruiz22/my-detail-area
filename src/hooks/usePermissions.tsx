import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  | 'chat'
  | 'reports'
  | 'settings'
  | 'dealerships'
  | 'users'
  | 'management'
  | 'productivity'
  | 'contacts';

/**
 * Permission Levels
 * Hierarchical permission levels: none < view < edit < delete < admin
 */
export type PermissionLevel = 'none' | 'view' | 'edit' | 'delete' | 'admin';

/**
 * Order Types
 * Different types of orders in the dealership system
 */
export type OrderType = 'sales' | 'service' | 'recon' | 'carwash';

/**
 * Granular Permissions (JSONB)
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
 * Custom Role with Permissions
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
 * Enhanced User (Modern System)
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
 * Permission Hierarchy
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
 * usePermissions Hook
 *
 * Manages user permissions using the Custom Roles system.
 * Loads user's custom roles and aggregates permissions from all assigned roles.
 *
 * @returns {Object} Permission utilities and user data
 */
export const usePermissions = () => {
  const { user } = useAuth();
  const [enhancedUser, setEnhancedUser] = useState<EnhancedUser | null>(null);
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
   * Fetch Custom Role Permissions
   *
   * Loads user's custom roles and permissions from database.
   * Aggregates permissions from multiple roles (takes highest level).
   */
  const fetchCustomRolePermissions = useCallback(async (): Promise<EnhancedUser | null> => {
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
          all_permissions: new Map()
        };
      }

      // Fetch user's role assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('user_custom_role_assignments')
        .select(`
          custom_role_id,
          dealer_id,
          dealer_custom_roles (
            id,
            role_name,
            display_name,
            dealer_id,
            permissions
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (assignmentsError) {
        console.error('❌ Error fetching role assignments:', assignmentsError);
        return {
          id: profileData.id,
          email: profileData.email,
          dealership_id: profileData.dealership_id,
          is_system_admin: false,
          custom_roles: [],
          all_permissions: new Map()
        };
      }

      const roleIds = (assignmentsData || [])
        .map(a => a.dealer_custom_roles?.id)
        .filter(Boolean) as string[];

      if (roleIds.length === 0) {
        console.warn('⚠️ User has no custom roles assigned');
        return {
          id: profileData.id,
          email: profileData.email,
          dealership_id: profileData.dealership_id,
          is_system_admin: false,
          custom_roles: [],
          all_permissions: new Map()
        };
      }

      // Fetch module permissions for all assigned roles
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('dealer_role_permissions')
        .select('role_id, module, permission_level')
        .in('role_id', roleIds);

      if (permissionsError) throw permissionsError;

      // Build roles map with permissions
      const rolesMap = new Map<string, CustomRoleWithPermissions>();

      (assignmentsData || []).forEach(assignment => {
        const role = assignment.dealer_custom_roles;
        if (!role) return;

        const rolePerms = (permissionsData || [])
          .filter(p => p.role_id === role.id);

        const permissionsMap = new Map<AppModule, PermissionLevel>();
        rolePerms.forEach(p => {
          permissionsMap.set(p.module as AppModule, p.permission_level as PermissionLevel);
        });

        rolesMap.set(role.id, {
          id: role.id,
          role_name: role.role_name,
          display_name: role.display_name,
          dealer_id: role.dealer_id,
          permissions: permissionsMap,
          granularPermissions: (role.permissions as GranularPermissions) || {}
        });
      });

      // Aggregate permissions from all roles (take highest level)
      const allPermissions = new Map<AppModule, PermissionLevel>();

      rolesMap.forEach(role => {
        role.permissions.forEach((level, module) => {
          const existingLevel = allPermissions.get(module);
          if (!existingLevel || PERMISSION_HIERARCHY[level] > PERMISSION_HIERARCHY[existingLevel]) {
            allPermissions.set(module, level);
          }
        });
      });

      console.log(`✅ Loaded ${rolesMap.size} custom roles with ${allPermissions.size} module permissions`);

      return {
        id: profileData.id,
        email: profileData.email,
        dealership_id: profileData.dealership_id,
        is_system_admin: false,
        custom_roles: Array.from(rolesMap.values()),
        all_permissions: allPermissions
      };
    } catch (error) {
      console.error('💥 Error in fetchCustomRolePermissions:', error);
      return null;
    }
  }, [user, profileData]);

  /**
   * Fetch User Permissions
   * Main function to load user permissions
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
      console.log('🔄 Fetching user permissions...');

      const userData = await fetchCustomRolePermissions();
      setEnhancedUser(userData);

      if (userData) {
        console.log('✅ User permissions loaded successfully');
      }
    } catch (error) {
      console.error('💥 Error fetching user permissions:', error);
      setEnhancedUser(null);
    } finally {
      setLoading(false);
    }
  }, [user, isLoadingProfile, fetchCustomRolePermissions]);

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  /**
   * Check if user has permission for a module
   *
   * @param module - The module to check
   * @param requiredLevel - The minimum permission level required
   * @returns true if user has required permission level or higher
   */
  const hasPermission = useCallback((module: AppModule, requiredLevel: PermissionLevel): boolean => {
    if (!enhancedUser) return false;

    // System admins have full access
    if (enhancedUser.is_system_admin) return true;

    // Users without custom roles can only access dashboard and productivity
    if (enhancedUser.custom_roles.length === 0) {
      const allowedModules: AppModule[] = ['dashboard', 'productivity'];
      return allowedModules.includes(module) && requiredLevel === 'view';
    }

    // Check module permission
    const userLevel = enhancedUser.all_permissions.get(module);
    if (!userLevel || userLevel === 'none') return false;

    // Compare hierarchy
    return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel];
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

    return hasPermission(module, 'edit');
  }, [enhancedUser, hasPermission]);

  /**
   * Check if user can delete an order
   *
   * @param order - Order to check (requires dealer_id)
   * @returns true if user can delete the order
   */
  const canDeleteOrder = useCallback((order: { dealer_id: number }): boolean => {
    if (!enhancedUser) return false;

    // Only system admins can delete orders
    return enhancedUser.is_system_admin;
  }, [enhancedUser]);

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

    // Check which order modules user has access to
    const allowed: OrderType[] = [];
    const orderModules: Array<[OrderType, AppModule]> = [
      ['sales', 'sales_orders'],
      ['service', 'service_orders'],
      ['recon', 'recon_orders'],
      ['carwash', 'car_wash']
    ];

    orderModules.forEach(([orderType, module]) => {
      if (hasPermission(module, 'view')) {
        allowed.push(orderType);
      }
    });

    return allowed;
  }, [enhancedUser, hasPermission]);

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
