import { UserRole } from '@/hooks/usePermissions';

/**
 * Check if user can view pricing information
 * Only admin and manager roles can see prices
 */
export const canViewPricing = (roles: UserRole[]): boolean => {
  return roles.some(role => 
    role.role_name === 'dealer_admin' || 
    role.role_name === 'dealer_manager' ||
    role.role_name === 'detail_super_manager' ||
    role.role_name === 'detail_admin'
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