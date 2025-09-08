import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppModule = 
  | 'dashboard'
  | 'sales_orders'
  | 'service_orders'
  | 'recon_orders'
  | 'car_wash'
  | 'reports'
  | 'settings'
  | 'dealerships'
  | 'users'
  | 'management';

export type PermissionLevel = 'none' | 'read' | 'write' | 'delete' | 'admin';

export type UserPermission = {
  module: AppModule;
  permission_level: PermissionLevel;
};

export type UserRole = {
  role_id: string;
  role_name: string;
  display_name: string;
  user_type: 'dealer' | 'detail';
  dealer_role?: string;
  detail_role?: string;
  expires_at?: string;
};

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch user permissions using the database function
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_user_permissions', { user_uuid: user.id });

      if (permissionsError) {
        console.error('Error fetching user permissions:', permissionsError);
        setPermissions([]);
      } else {
        setPermissions(permissionsData || []);
      }

      // Fetch user roles using the database function
      const { data: rolesData, error: rolesError } = await supabase
        .rpc('get_user_roles', { user_uuid: user.id });

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        setRoles([]);
      } else {
        setRoles(rolesData || []);
      }
    } catch (error) {
      console.error('Error in fetchUserPermissions:', error);
      setPermissions([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  const hasPermission = useCallback((module: AppModule, requiredLevel: PermissionLevel): boolean => {
    if (!user) return false;

    // Admin users have all permissions
    if (roles.some(role => role.role_name === 'detail_super_manager')) {
      return true;
    }

    const userPermission = permissions.find(p => p.module === module);
    if (!userPermission) return false;

    // Define permission hierarchy
    const permissionHierarchy: Record<PermissionLevel, number> = {
      none: 0,
      read: 1,
      write: 2,
      delete: 3,
      admin: 4
    };

    const userLevel = permissionHierarchy[userPermission.permission_level];
    const requiredHierarchy = permissionHierarchy[requiredLevel];

    return userLevel >= requiredHierarchy;
  }, [user, permissions, roles]);

  const checkPermission = useCallback(async (module: AppModule, requiredLevel: PermissionLevel): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('has_permission', {
          user_uuid: user.id,
          check_module: module,
          required_level: requiredLevel
        });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error in checkPermission:', error);
      return false;
    }
  }, [user]);

  const assignRole = useCallback(async (userId: string, roleName: string, expiresAt?: string) => {
    try {
      const { data, error } = await supabase
        .rpc('assign_role', {
          target_user_id: userId,
          role_name: roleName,
          expires_at: expiresAt || null
        });

      if (error) {
        console.error('Error assigning role:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error in assignRole:', error);
      return { success: false, error: 'Failed to assign role' };
    }
  }, []);

  const removeRole = useCallback(async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('user_role_assignments')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('role_id', roleId);

      if (error) {
        console.error('Error removing role:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in removeRole:', error);
      return { success: false, error: 'Failed to remove role' };
    }
  }, []);

  const refreshPermissions = useCallback(() => {
    fetchUserPermissions();
  }, [fetchUserPermissions]);

  return {
    permissions,
    roles,
    loading,
    hasPermission,
    checkPermission,
    assignRole,
    removeRole,
    refreshPermissions
  };
};