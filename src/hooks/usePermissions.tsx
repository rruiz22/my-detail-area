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
  | 'productivity';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'delete';

// Order types that correspond to modules
export type OrderType = 'sales' | 'service' | 'recon' | 'carwash';

// User roles simplified for multi-dealer system
export type UserRole = 'dealer_user' | 'manager' | 'system_admin';
export type UserType = 'dealer' | 'detail';

// User group information
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

// Enhanced user profile with multi-dealer fields
export interface EnhancedUser {
  id: string;
  email: string;
  role: UserRole;
  user_type: UserType;
  dealership_id: number;
  groups: UserGroup[];
}

export const usePermissions = () => {
  const { user } = useAuth();
  const [enhancedUser, setEnhancedUser] = useState<EnhancedUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Map AppModule to OrderType for permission checks
  const getOrderTypeFromModule = useCallback((module: AppModule): OrderType | null => {
    const moduleMap: Record<string, OrderType> = {
      'sales_orders': 'sales',
      'service_orders': 'service',
      'recon_orders': 'recon',
      'car_wash': 'carwash'
    };
    return moduleMap[module] || null;
  }, []);

  const fetchUserPermissions = useCallback(async () => {
    if (!user) {
      setEnhancedUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch user profile with dealer and groups information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          role,
          user_type,
          dealership_id
        `)
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Fetch user's groups if they are dealer_user with user_type 'dealer'
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

      const enhancedUserData: EnhancedUser = {
        id: profileData.id,
        email: profileData.email,
        role: profileData.role as UserRole,
        user_type: profileData.user_type as UserType,
        dealership_id: profileData.dealership_id,
        groups: userGroups
      };

      setEnhancedUser(enhancedUserData);

    } catch (error) {
      console.error('Error fetching user permissions:', error);
      setEnhancedUser(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  const hasPermission = useCallback((module: AppModule, requiredLevel: PermissionLevel): boolean => {
    if (!enhancedUser) return false;

    try {
      // System admin has full access to everything
      if (enhancedUser.role === 'system_admin') {
        return true;
      }

      // Only system_admin can delete
      if (requiredLevel === 'delete') {
        return enhancedUser.role === 'system_admin';
      }

      // For order modules, check specific order type access
      const orderType = getOrderTypeFromModule(module);
      if (orderType) {
        return canAccessOrderType(enhancedUser, orderType, requiredLevel);
      }

      // For non-order modules (dashboard, reports, settings, etc.)
      return canAccessGeneralModule(enhancedUser, module, requiredLevel);

    } catch (error) {
      console.error('Error in hasPermission:', error);
      return false;
    }
  }, [enhancedUser, getOrderTypeFromModule]);

  // Check if user can access specific order type
  const canAccessOrderType = useCallback((
    user: EnhancedUser,
    orderType: OrderType,
    requiredLevel: PermissionLevel
  ): boolean => {
    // Manager can access all order types from their dealer
    if (user.role === 'manager') {
      return requiredLevel !== 'delete'; // Manager can't delete
    }

    // dealer_user with user_type 'detail' can access all order types
    if (user.role === 'dealer_user' && user.user_type === 'detail') {
      return requiredLevel !== 'delete'; // Detail users can't delete
    }

    // dealer_user with user_type 'dealer' - check groups
    if (user.role === 'dealer_user' && user.user_type === 'dealer') {
      const hasAccess = user.groups.some(group =>
        group.allowed_order_types.includes(orderType)
      );
      return hasAccess && requiredLevel !== 'delete'; // Dealer users can't delete
    }

    return false;
  }, []);

  // Check access to general modules (non-orders)
  const canAccessGeneralModule = useCallback((
    user: EnhancedUser,
    module: AppModule,
    requiredLevel: PermissionLevel
  ): boolean => {
    // Basic access rules for general modules
    switch (module) {
      case 'dashboard':
        return true; // Everyone can view dashboard

      case 'reports':
      case 'settings':
        return user.role === 'manager' || user.role === 'system_admin';

      case 'users':
      case 'dealerships':
      case 'management':
        return user.role === 'system_admin'; // Only system admin

      case 'chat':
      case 'productivity':
      case 'stock':
        return true; // Everyone can access

      default:
        return false;
    }
  }, []);

  // Check if user can edit a specific order
  const canEditOrder = useCallback((order: { dealer_id: number; order_type: string; status: string }): boolean => {
    if (!enhancedUser) return false;

    // Must be same dealer
    if (order.dealer_id !== enhancedUser.dealership_id && enhancedUser.role !== 'system_admin') {
      return false;
    }

    // Can't edit completed or cancelled orders
    if (['completed', 'cancelled'].includes(order.status)) {
      return false;
    }

    // Check order type access
    const orderType = order.order_type as OrderType;
    return canAccessOrderType(enhancedUser, orderType, 'edit');
  }, [enhancedUser, canAccessOrderType]);

  // Check if user can delete a specific order
  const canDeleteOrder = useCallback((order: { dealer_id: number }): boolean => {
    if (!enhancedUser) return false;

    // Only system_admin can delete orders
    return enhancedUser.role === 'system_admin';
  }, [enhancedUser]);

  // Get user's allowed order types
  const getAllowedOrderTypes = useCallback((): OrderType[] => {
    if (!enhancedUser) return [];

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
  }, [enhancedUser]);

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
    // Legacy compatibility
    roles: [], // For backward compatibility
    permissions: [] // For backward compatibility
  };
};