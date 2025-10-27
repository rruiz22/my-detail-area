/**
 * Legacy Permissions System
 *
 * This file contains deprecated types and interfaces from the old permission system.
 * These are kept for backward compatibility during the migration period.
 *
 * @deprecated All types and interfaces in this file are deprecated.
 * Use the new granular permission system from usePermissions.tsx instead.
 *
 * Migration guide:
 * - PermissionLevel → Use ModulePermissionKey with specific actions
 * - CustomRoleWithPermissions → Use GranularCustomRole
 * - EnhancedUser → Use EnhancedUserGranular
 * - hasPermission() → Use hasModulePermission()
 */

import type { ModulePermissionKey } from '@/types/permissions';

/**
 * @deprecated Legacy permission levels - Use ModulePermissionKey instead
 * Hierarchical permission levels: none < view < edit < delete < admin
 *
 * Migration:
 * - 'view' → 'view_orders' | 'view_inventory' | 'view_contacts'
 * - 'edit' → 'edit_orders' | 'manage_inventory'
 * - 'delete' → 'delete_orders'
 * - 'admin' → All permissions
 */
export type PermissionLevel = 'none' | 'view' | 'edit' | 'delete' | 'admin';

/**
 * @deprecated Legacy Permission Hierarchy
 * Used to compare and aggregate permission levels
 *
 * This hierarchical system is replaced by explicit permission checks.
 */
export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  'none': 0,
  'view': 1,
  'edit': 2,
  'delete': 3,
  'admin': 4
};

/**
 * @deprecated Legacy Granular Permissions (JSONB)
 * Fine-grained permissions stored in dealer_custom_roles.permissions
 *
 * Replaced by: role_module_permissions_new table with foreign keys
 */
export interface GranularPermissions {
  [module: string]: {
    [permission: string]: boolean;
  };
}

/**
 * @deprecated Legacy Custom Role with Permissions
 * Represents a dealer-specific custom role with module permissions
 *
 * Use GranularCustomRole from @/types/permissions instead
 */
export interface CustomRoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  permissions: GranularPermissions;
  dealer_id: number;
}

/**
 * @deprecated Legacy Enhanced User (Modern System)
 * User with custom roles and aggregated permissions
 *
 * Use EnhancedUserGranular from @/types/permissions instead
 */
export interface EnhancedUser {
  id: string;
  email: string;
  dealership_id: number | null;
  roles: CustomRoleWithPermissions[];
  permissions: GranularPermissions;
}

/**
 * Map legacy permission levels to granular permissions
 *
 * @deprecated This mapping is for backward compatibility only
 * New code should use ModulePermissionKey directly
 */
export const LEGACY_PERMISSION_MAPPING: Record<PermissionLevel, ModulePermissionKey[]> = {
  'none': [],
  'view': [
    'view_orders',
    'view_inventory',
    'view_contacts',
    'view_dashboard',
    'view_reports',
    'view_analytics',
    'view_settings'
  ],
  'edit': [
    'view_orders',
    'create_orders',
    'edit_orders',
    'view_inventory',
    'manage_inventory',
    'view_contacts',
    'manage_contacts',
    'view_dashboard',
    'view_reports',
    'view_settings'
  ],
  'delete': [
    'view_orders',
    'create_orders',
    'edit_orders',
    'delete_orders',
    'view_inventory',
    'manage_inventory',
    'delete_inventory',
    'view_contacts',
    'manage_contacts',
    'delete_contacts',
    'view_dashboard',
    'view_reports',
    'view_settings',
    'edit_settings'
  ],
  'admin': [
    'view_orders',
    'create_orders',
    'edit_orders',
    'delete_orders',
    'approve_orders',
    'view_inventory',
    'manage_inventory',
    'delete_inventory',
    'import_inventory',
    'export_inventory',
    'view_contacts',
    'manage_contacts',
    'delete_contacts',
    'view_dashboard',
    'view_reports',
    'view_analytics',
    'export_reports',
    'view_settings',
    'edit_settings',
    'manage_users',
    'manage_roles'
  ]
};

/**
 * Helper to convert legacy permission level to granular permissions
 *
 * @deprecated Use specific ModulePermissionKey checks instead
 */
export function getLegacyPermissions(level: PermissionLevel): ModulePermissionKey[] {
  return LEGACY_PERMISSION_MAPPING[level] || [];
}

/**
 * Helper to check if a permission level satisfies another
 *
 * @deprecated Use explicit permission checks with hasModulePermission
 */
export function hasLegacyPermissionLevel(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel
): boolean {
  return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel];
}
