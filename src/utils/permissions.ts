import { CustomRoleWithPermissions, AppModule, PermissionLevel } from '@/hooks/usePermissions';

/**
 * Module Permission
 * Represents a single module permission
 */
export interface ModulePermission {
  module: AppModule;
  permission_level: PermissionLevel;
}

/**
 * Check if user can view pricing information
 *
 * Users with pricing permissions in their custom roles can view pricing data.
 * System admins always have pricing access.
 *
 * @param roles - Array of custom roles with permissions
 * @param isSystemAdmin - Whether user is system admin
 * @returns true if user can view pricing
 */
export const canViewPricing = (
  roles: CustomRoleWithPermissions[],
  isSystemAdmin: boolean
): boolean => {
  if (isSystemAdmin) return true;

  return roles.some(role =>
    role.granularPermissions?.can_view_pricing === true
  );
};

/**
 * Check if user can access internal notes
 *
 * @param roles - Array of custom roles with permissions
 * @param isSystemAdmin - Whether user is system admin
 * @returns true if user can access internal notes
 */
export const canAccessInternalNotes = (
  roles: CustomRoleWithPermissions[],
  isSystemAdmin: boolean
): boolean => {
  if (isSystemAdmin) return true;

  return roles.some(role =>
    role.granularPermissions?.can_access_internal_notes === true
  );
};

/**
 * Check if user can delete orders
 *
 * @param roles - Array of custom roles with permissions
 * @param isSystemAdmin - Whether user is system admin
 * @returns true if user can delete orders
 */
export const canDeleteOrders = (
  roles: CustomRoleWithPermissions[],
  isSystemAdmin: boolean
): boolean => {
  if (isSystemAdmin) return true;

  return roles.some(role =>
    role.granularPermissions?.can_delete_orders === true
  );
};

/**
 * Check if user can export reports
 *
 * @param roles - Array of custom roles with permissions
 * @param isSystemAdmin - Whether user is system admin
 * @returns true if user can export reports
 */
export const canExportReports = (
  roles: CustomRoleWithPermissions[],
  isSystemAdmin: boolean
): boolean => {
  if (isSystemAdmin) return true;

  return roles.some(role =>
    role.granularPermissions?.can_export_reports === true
  );
};

/**
 * Check if user can change order status
 *
 * @param roles - Array of custom roles with permissions
 * @param isSystemAdmin - Whether user is system admin
 * @returns true if user can change order status
 */
export const canChangeOrderStatus = (
  roles: CustomRoleWithPermissions[],
  isSystemAdmin: boolean
): boolean => {
  if (isSystemAdmin) return true;

  return roles.some(role =>
    role.granularPermissions?.can_change_order_status === true
  );
};

/**
 * Check if user has specific permission level for a module
 *
 * @param permissions - Array of module permissions
 * @param module - Module to check
 * @param requiredLevel - Minimum required permission level
 * @returns true if user has required permission level or higher
 */
export const hasPermissionLevel = (
  permissions: ModulePermission[],
  module: AppModule,
  requiredLevel: PermissionLevel
): boolean => {
  const permission = permissions.find(p => p.module === module);
  if (!permission) return false;

  const permissionHierarchy: Record<PermissionLevel, number> = {
    'none': 0,
    'view': 1,
    'edit': 2,
    'delete': 3,
    'admin': 4
  };

  const requiredIndex = permissionHierarchy[requiredLevel];
  const userIndex = permissionHierarchy[permission.permission_level];

  return userIndex >= requiredIndex;
};
