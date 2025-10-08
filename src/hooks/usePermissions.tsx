import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export type PermissionLevel = 'none' | 'view' | 'edit' | 'delete' | 'admin';

export type OrderType = 'sales' | 'service' | 'recon' | 'carwash';

/** @deprecated Legacy types - use CustomRole system instead */
export type UserRole = 'dealer_user' | 'manager' | 'system_admin';
/** @deprecated Legacy types - no longer used */
export type UserType = 'dealer' | 'detail';

/** @deprecated Legacy interface - use EnhancedUserV2 instead */
export interface UserGroup {
  id: string;
  name: string;
  slug: string;
  allowed_order_types: OrderType[];
  dealer_id: number;
  department?: string;
  permission_level?: string;
  description?: string;
}

export interface CustomRoleWithPermissions {
  id: string;
  role_name: string;
  display_name: string;
  dealer_id: number;
  permissions: Map<AppModule, PermissionLevel>; // Module permissions
  granularPermissions?: {
    can_access_internal_notes?: boolean;
    can_view_pricing?: boolean;
    can_delete_orders?: boolean;
    can_export_reports?: boolean;
    can_change_order_status?: boolean;
  };
}

export interface EnhancedUserV2 {
  id: string;
  email: string;
  dealership_id: number | null;
  is_system_admin: boolean;
  custom_roles: CustomRoleWithPermissions[];
  all_permissions: Map<AppModule, PermissionLevel>;
}

/** @deprecated Legacy interface for backward compatibility */
export interface EnhancedUser {
  id: string;
  email: string;
  role: UserRole;
  user_type: UserType;
  dealership_id: number;
  groups: UserGroup[];
}

// Feature flag cache (5 minutes)
let featureFlagCache: boolean | null = null;
let featureFlagTimestamp = 0;
const FEATURE_FLAG_CACHE_DURATION = 300000; // 5 minutes

export const usePermissions = () => {
  const { user } = useAuth();
  const [enhancedUser, setEnhancedUser] = useState<EnhancedUser | EnhancedUserV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [useCustomRoles, setUseCustomRoles] = useState(false);

  const getOrderTypeFromModule = useCallback((module: AppModule): OrderType | null => {
    const moduleMap: Record<string, OrderType> = {
      'sales_orders': 'sales',
      'service_orders': 'service',
      'recon_orders': 'recon',
      'car_wash': 'carwash'
    };
    return moduleMap[module] || null;
  }, []);

  const fetchFeatureFlag = useCallback(async (): Promise<boolean> => {
    // Return cached value if still valid
    if (featureFlagCache !== null && Date.now() - featureFlagTimestamp < FEATURE_FLAG_CACHE_DURATION) {
      return featureFlagCache;
    }

    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'use_custom_roles_system')
        .single();

      if (error || !data) {
        console.log('Feature flag not accessible, using legacy system');
        featureFlagCache = false;
        featureFlagTimestamp = Date.now();
        return false;
      }

      const flagValue = data.setting_value === true || data.setting_value === 'true';
      featureFlagCache = flagValue;
      featureFlagTimestamp = Date.now();
      return flagValue;
    } catch (error) {
      console.error('Error fetching feature flag:', error);
      featureFlagCache = false;
      featureFlagTimestamp = Date.now();
      return false;
    }
  }, []);

  const fetchCustomRolePermissions = useCallback(async (): Promise<EnhancedUserV2 | null> => {
    if (!user) return null;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, dealership_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData.role === 'system_admin') {
        return {
          id: profileData.id,
          email: profileData.email,
          dealership_id: profileData.dealership_id,
          is_system_admin: true,
          custom_roles: [],
          all_permissions: new Map()
        };
      }

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
        console.error('Error fetching role assignments:', assignmentsError);
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
        return {
          id: profileData.id,
          email: profileData.email,
          dealership_id: profileData.dealership_id,
          is_system_admin: false,
          custom_roles: [],
          all_permissions: new Map()
        };
      }

      const { data: permissionsData, error: permissionsError } = await supabase
        .from('dealer_role_permissions')
        .select('role_id, module, permission_level')
        .in('role_id', roleIds);

      if (permissionsError) throw permissionsError;

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
          permissions: permissionsMap, // Module permissions (Map)
          granularPermissions: (role as any).permissions || {} // JSONB permissions
        } as any);
      });

      const allPermissions = new Map<AppModule, PermissionLevel>();
      const permissionHierarchy: Record<PermissionLevel, number> = {
        'none': 0,
        'view': 1,
        'edit': 2,
        'delete': 3,
        'admin': 4
      };

      rolesMap.forEach(role => {
        // Handle Map format (legacy module permissions)
        if (role.permissions instanceof Map) {
          role.permissions.forEach((level, module) => {
            const existingLevel = allPermissions.get(module);
            if (!existingLevel || permissionHierarchy[level] > permissionHierarchy[existingLevel]) {
              allPermissions.set(module, level);
            }
          });
        }
        // JSONB format doesn't have module-level permissions, handled separately
      });

      return {
        id: profileData.id,
        email: profileData.email,
        dealership_id: profileData.dealership_id,
        is_system_admin: false,
        custom_roles: Array.from(rolesMap.values()),
        all_permissions: allPermissions
      };
    } catch (error) {
      console.error('Error in fetchCustomRolePermissions:', error);
      return null;
    }
  }, [user]);

  const fetchLegacyPermissions = useCallback(async (): Promise<EnhancedUser | null> => {
    if (!user) return null;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, role, user_type, dealership_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      let userGroups: UserGroup[] = [];
      if (profileData.role === 'dealer_user' && profileData.user_type === 'dealer') {
        const { data: groupsData, error: groupsError } = await supabase
          .from('user_group_memberships')
          .select(`
            dealer_groups (
              id,
              name,
              slug,
              allowed_order_types,
              dealer_id
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (!groupsError && groupsData) {
          userGroups = groupsData
            .map(membership => membership.dealer_groups)
            .filter(group => group)
            .map(group => ({
              id: group.id,
              name: group.name,
              slug: group.slug,
              allowed_order_types: group.allowed_order_types as OrderType[],
              dealer_id: group.dealer_id
            }));
        }
      }

      return {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role as UserRole,
        user_type: profileData.user_type as UserType,
        dealership_id: profileData.dealership_id,
        groups: userGroups
      };
    } catch (error) {
      console.error('Error in fetchLegacyPermissions:', error);
      return null;
    }
  }, [user]);

  const fetchUserPermissions = useCallback(async () => {
    if (!user) {
      setEnhancedUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const customRolesEnabled = await fetchFeatureFlag();
      setUseCustomRoles(customRolesEnabled);

      if (customRolesEnabled) {
        console.log('🟢 Using CUSTOM ROLES system');
        const userData = await fetchCustomRolePermissions();
        setEnhancedUser(userData);
      } else {
        console.log('🟡 Using LEGACY system');
        const userData = await fetchLegacyPermissions();
        setEnhancedUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      setEnhancedUser(null);
    } finally {
      setLoading(false);
    }
  }, [user, fetchFeatureFlag, fetchCustomRolePermissions, fetchLegacyPermissions]);

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  const isEnhancedUserV2 = (user: any): user is EnhancedUserV2 => {
    return user && 'is_system_admin' in user && 'all_permissions' in user;
  };

  const hasPermissionCustomRoles = useCallback((
    userV2: EnhancedUserV2,
    module: AppModule,
    requiredLevel: PermissionLevel
  ): boolean => {
    if (userV2.is_system_admin) return true;

    // Fallback: Users without custom roles can only access dashboard, productivity, profile
    if (userV2.custom_roles.length === 0) {
      const allowedModules: AppModule[] = ['dashboard', 'productivity'];
      if (allowedModules.includes(module) && requiredLevel === 'view') {
        return true;
      }
      return false;
    }

    const userLevel = userV2.all_permissions.get(module);
    if (!userLevel || userLevel === 'none') return false;

    const hierarchy: Record<PermissionLevel, number> = {
      'none': 0,
      'view': 1,
      'edit': 2,
      'delete': 3,
      'admin': 4
    };

    return hierarchy[userLevel] >= hierarchy[requiredLevel];
  }, []);

  const hasPermissionLegacy = useCallback((
    userLegacy: EnhancedUser,
    module: AppModule,
    requiredLevel: PermissionLevel
  ): boolean => {
    try {
      if (userLegacy.role === 'system_admin') {
        return true;
      }

      if (requiredLevel === 'delete') {
        return userLegacy.role === 'system_admin';
      }

      const orderType = getOrderTypeFromModule(module);
      if (orderType) {
        if (userLegacy.role === 'manager') {
          return requiredLevel !== 'delete';
        }

        if (userLegacy.role === 'dealer_user' && userLegacy.user_type === 'detail') {
          return requiredLevel !== 'delete';
        }

        if (userLegacy.role === 'dealer_user' && userLegacy.user_type === 'dealer') {
          const hasAccess = userLegacy.groups.some(group =>
            group.allowed_order_types.includes(orderType)
          );
          return hasAccess && requiredLevel !== 'delete';
        }

        return false;
      }

      switch (module) {
        case 'dashboard':
          return true;
        case 'reports':
        case 'settings':
          return userLegacy.role === 'manager' || userLegacy.role === 'system_admin';
        case 'users':
        case 'dealerships':
        case 'management':
          return userLegacy.role === 'system_admin';
        case 'chat':
        case 'productivity':
        case 'stock':
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error in hasPermissionLegacy:', error);
      return false;
    }
  }, [getOrderTypeFromModule]);

  const hasPermission = useCallback((module: AppModule, requiredLevel: PermissionLevel): boolean => {
    if (!enhancedUser) return false;

    if (isEnhancedUserV2(enhancedUser)) {
      return hasPermissionCustomRoles(enhancedUser, module, requiredLevel);
    } else {
      return hasPermissionLegacy(enhancedUser, module, requiredLevel);
    }
  }, [enhancedUser, hasPermissionCustomRoles, hasPermissionLegacy]);

  const canEditOrder = useCallback((order: { dealer_id: number; order_type: string; status: string }): boolean => {
    if (!enhancedUser) return false;

    if (isEnhancedUserV2(enhancedUser)) {
      if (enhancedUser.is_system_admin) return true;

      if (order.dealer_id !== enhancedUser.dealership_id) return false;
      if (['completed', 'cancelled'].includes(order.status)) return false;

      const orderType = order.order_type as OrderType;
      const moduleMap: Record<OrderType, AppModule> = {
        'sales': 'sales_orders',
        'service': 'service_orders',
        'recon': 'recon_orders',
        'carwash': 'car_wash'
      };
      const module = moduleMap[orderType];
      return hasPermissionCustomRoles(enhancedUser, module, 'edit');
    } else {
      if (enhancedUser.role === 'system_admin') return true;
      if (order.dealer_id !== enhancedUser.dealership_id) return false;
      if (['completed', 'cancelled'].includes(order.status)) return false;
      const orderType = order.order_type as OrderType;
      return hasPermissionLegacy(enhancedUser, `${orderType}_orders` as AppModule, 'edit');
    }
  }, [enhancedUser, hasPermissionCustomRoles, hasPermissionLegacy]);

  const canDeleteOrder = useCallback((order: { dealer_id: number }): boolean => {
    if (!enhancedUser) return false;

    if (isEnhancedUserV2(enhancedUser)) {
      return enhancedUser.is_system_admin;
    } else {
      return enhancedUser.role === 'system_admin';
    }
  }, [enhancedUser]);

  const getAllowedOrderTypes = useCallback((): OrderType[] => {
    if (!enhancedUser) return [];

    if (isEnhancedUserV2(enhancedUser)) {
      if (enhancedUser.is_system_admin) {
        return ['sales', 'service', 'recon', 'carwash'];
      }

      // If user has no custom roles assigned, return empty (no order access)
      if (enhancedUser.custom_roles.length === 0) {
        console.warn('⚠️ User has no custom roles assigned - no order access');
        return [];
      }

      const allowed: OrderType[] = [];
      const orderModules: Array<[OrderType, AppModule]> = [
        ['sales', 'sales_orders'],
        ['service', 'service_orders'],
        ['recon', 'recon_orders'],
        ['carwash', 'car_wash']
      ];

      orderModules.forEach(([orderType, module]) => {
        if (hasPermissionCustomRoles(enhancedUser, module, 'view')) {
          allowed.push(orderType);
        }
      });

      return allowed;
    } else {
      if (enhancedUser.role === 'system_admin') {
        return ['sales', 'service', 'recon', 'carwash'];
      }
      if (enhancedUser.role === 'manager') {
        return ['sales', 'service', 'recon', 'carwash'];
      }
      if (enhancedUser.role === 'dealer_user' && enhancedUser.user_type === 'detail') {
        return ['sales', 'service', 'recon', 'carwash'];
      }
      if (enhancedUser.role === 'dealer_user' && enhancedUser.user_type === 'dealer') {
        return enhancedUser.groups.flatMap(group => group.allowed_order_types);
      }
      return [];
    }
  }, [enhancedUser, hasPermissionCustomRoles]);

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
    roles: [],
    permissions: []
  };
};