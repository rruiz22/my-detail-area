import { UserRole } from '@/hooks/usePermissions';

/**
 * Check if user can view pricing information and manage categories
 * Only system admin and manager roles can see prices and manage categories
 */
export const canViewPricing = (roles: UserRole[]): boolean => {
  return roles.some(role => 
    role.role_name === 'system_admin' ||
    role.role_name === 'dealer_admin' || 
    role.role_name === 'dealer_manager' ||
    role.role_name === 'detail_super_manager' ||
    role.role_name === 'detail_admin'
  );
};

/**
 * Check if user is system administrator
 * System admins can access special features like the landing page
 */
export const isSystemAdmin = (roles: UserRole[]): boolean => {
  return roles.some(role => 
    role.role_name === 'system_admin' ||
    role.role_name === 'dealer_admin' || 
    role.role_name === 'detail_super_manager'
  );
};

/**
 * Check if user has specific permission level for a module
 */
export const hasPermissionLevel = (
  permissions: any[], 
  module: string, 
  level: 'read' | 'write' | 'delete' | 'admin'
): boolean => {
  const permission = permissions.find(p => p.module === module);
  if (!permission) return false;
  
  const levels = ['none', 'read', 'write', 'delete', 'admin'];
  const requiredIndex = levels.indexOf(level);
  const userIndex = levels.indexOf(permission.permission_level);
  
  return userIndex >= requiredIndex;
};