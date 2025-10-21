/**
 * Permission Helper Utilities
 *
 * Utility functions for working with the granular permissions system
 */

import type { AppModule } from '@/hooks/usePermissions';
import type {
    LegacyPermissionLevel,
    ModulePermissionKey,
    SystemPermissionKey
} from '@/types/permissions';

/**
 * Map legacy permission levels to granular permission keys
 * Used for migration and backward compatibility
 */
export const mapLegacyToGranular = (
  level: LegacyPermissionLevel,
  module: AppModule
): ModulePermissionKey[] => {
  // Base permissions for different levels
  const levelMappings: Record<LegacyPermissionLevel, ModulePermissionKey[]> = {
    'none': [],
    'view': [
      'view_orders', 'view_inventory', 'view_contacts', 'view_dashboard',
      'view_reports', 'view_users', 'view_settings', 'view_dealerships',
      'view_tasks', 'view_conversations'
    ],
    'edit': [
      'view_orders', 'create_orders', 'edit_orders', 'change_status',
      'view_inventory', 'add_vehicles', 'edit_vehicles',
      'view_contacts', 'create_contacts', 'edit_contacts',
      'view_users', 'create_users', 'edit_users',
      'view_tasks', 'create_tasks', 'edit_tasks',
      'send_messages'
    ],
    'delete': [
      'view_orders', 'create_orders', 'edit_orders', 'delete_orders', 'change_status',
      'view_inventory', 'add_vehicles', 'edit_vehicles', 'delete_vehicles',
      'view_contacts', 'create_contacts', 'edit_contacts', 'delete_contacts',
      'view_users', 'create_users', 'edit_users',
      'view_tasks', 'create_tasks', 'edit_tasks', 'delete_tasks'
    ],
    'admin': [
      // All permissions for the module
      'view_orders', 'create_orders', 'edit_orders', 'delete_orders',
      'change_status', 'view_pricing', 'edit_pricing', 'access_internal_notes',
      'export_data', 'assign_orders', 'view_customer_info', 'edit_customer_info',
      'view_inventory', 'add_vehicles', 'edit_vehicles', 'delete_vehicles',
      'manage_stock_numbers', 'view_contacts', 'create_contacts', 'edit_contacts',
      'delete_contacts', 'generate_qr_codes', 'view_reports', 'create_custom_reports',
      'export_reports', 'schedule_reports', 'view_financial_reports',
      'view_users', 'create_users', 'edit_users', 'delete_users', 'assign_roles',
      'reset_passwords', 'view_user_activity', 'view_settings', 'edit_settings',
      'manage_modules', 'manage_themes', 'view_system_logs', 'manage_integrations'
    ]
  };

  return levelMappings[level] || [];
};

/**
 * Check if a permission is considered dangerous
 * Returns true for permissions that can cause significant system changes
 */
export const isDangerousPermission = (
  permission: SystemPermissionKey | ModulePermissionKey
): boolean => {
  if (!permission) return false;

  const dangerousPerms: (SystemPermissionKey | ModulePermissionKey)[] = [
    'delete_users',
    'manage_api_keys',
    'delete_dealerships',
    'edit_security_settings',
    'delete_orders',
    'delete_vehicles',
    'delete_contacts',
    'delete_tasks',
    'delete_messages',
    'manage_integrations'
  ];

  return dangerousPerms.includes(permission);
};

/**
 * Get human-readable permission description
 */
export const getPermissionDescription = (
  permission: SystemPermissionKey | ModulePermissionKey
): string => {
  const descriptions: Record<string, string> = {
    // System permissions
    'manage_all_settings': 'Full access to all system settings and configuration',
    'invite_users': 'Can send invitations to new team members',
    'activate_deactivate_users': 'Can enable or disable user accounts',
    'delete_users': 'Can permanently remove users from the system',
    'manage_dealerships': 'Can create and configure multiple dealerships',
    'view_audit_logs': 'Can view system security and change logs',
    'manage_roles': 'Can create and modify custom roles',
    'view_all_reports': 'Can access all reporting and analytics',

    // Module permissions
    'view_orders': 'Can view orders in this module',
    'create_orders': 'Can create new orders',
    'edit_orders': 'Can modify existing orders',
    'delete_orders': 'Can delete orders',
    'change_status': 'Can update order workflow status',
    'view_pricing': 'Can see pricing and cost information',
    'edit_pricing': 'Can modify prices and costs',
    'access_internal_notes': 'Can view and edit private notes',
    'export_data': 'Can export data to CSV/Excel',
    'assign_orders': 'Can reassign order ownership'
  };

  return descriptions[permission] || 'Permission description not available';
};

/**
 * Group permissions by category for UI display
 */
export interface PermissionGroup {
  category: string;
  permissions: Array<{
    key: string;
    display_name: string;
    description: string;
    is_dangerous: boolean;
  }>;
}

export const groupPermissionsByCategory = (
  permissions: (SystemPermissionKey | ModulePermissionKey)[]
): PermissionGroup[] => {
  const groups: Record<string, PermissionGroup> = {};

  permissions.forEach(perm => {
    let category = 'General';

    if (perm.includes('user')) category = 'User Management';
    else if (perm.includes('order')) category = 'Orders';
    else if (perm.includes('inventory') || perm.includes('vehicle')) category = 'Inventory';
    else if (perm.includes('report')) category = 'Reporting';
    else if (perm.includes('setting')) category = 'Settings';
    else if (perm.includes('dealership')) category = 'Dealerships';

    if (!groups[category]) {
      groups[category] = { category, permissions: [] };
    }

    groups[category].permissions.push({
      key: perm,
      display_name: perm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: getPermissionDescription(perm),
      is_dangerous: isDangerousPermission(perm)
    });
  });

  return Object.values(groups);
};

/**
 * Validate permission combination
 * Returns warnings if there are conflicting or redundant permissions
 */
export const validatePermissions = (
  permissions: ModulePermissionKey[]
): string[] => {
  const warnings: string[] = [];

  // Check for redundant permissions
  if (permissions.includes('delete_orders') && !permissions.includes('edit_orders')) {
    warnings.push('Delete permission typically requires edit permission');
  }

  if (permissions.includes('edit_orders') && !permissions.includes('view_orders')) {
    warnings.push('Edit permission typically requires view permission');
  }

  if (permissions.includes('edit_pricing') && !permissions.includes('view_pricing')) {
    warnings.push('Edit pricing requires view pricing permission');
  }

  // Check for dangerous permission combinations
  const dangerousCount = permissions.filter(isDangerousPermission).length;
  if (dangerousCount > 2) {
    warnings.push(`This role has ${dangerousCount} dangerous permissions. Review carefully.`);
  }

  return warnings;
};

/**
 * Get missing prerequisite permissions
 * Returns permissions that should be granted before the requested one
 */
export const getPrerequisitePermissions = (
  permission: ModulePermissionKey
): ModulePermissionKey[] => {
  const prerequisites: Partial<Record<ModulePermissionKey, ModulePermissionKey[]>> = {
    'edit_orders': ['view_orders'],
    'delete_orders': ['view_orders', 'edit_orders'],
    'edit_pricing': ['view_pricing', 'view_orders'],
    'edit_vehicles': ['view_inventory'],
    'delete_vehicles': ['view_inventory', 'edit_vehicles'],
    'edit_contacts': ['view_contacts'],
    'delete_contacts': ['view_contacts', 'edit_contacts'],
    'edit_users': ['view_users'],
    'delete_users': ['view_users', 'edit_users'],
    'assign_roles': ['view_users'],
    'edit_tasks': ['view_tasks'],
    'delete_tasks': ['view_tasks', 'edit_tasks'],
    'send_messages': ['view_conversations'],
    'delete_messages': ['view_conversations']
  };

  return prerequisites[permission] || [];
};

/**
 * Calculate permission score for sorting/comparison
 * Higher score = more powerful permission
 */
export const getPermissionScore = (permission: ModulePermissionKey): number => {
  const scores: Partial<Record<ModulePermissionKey, number>> = {
    'view_orders': 1,
    'view_inventory': 1,
    'view_contacts': 1,
    'create_orders': 2,
    'edit_orders': 3,
    'change_status': 3,
    'delete_orders': 5,
    'view_pricing': 2,
    'edit_pricing': 4,
    'access_internal_notes': 3,
    'export_data': 2,
    'assign_orders': 3
  };

  return scores[permission] || 0;
};

/**
 * Sort permissions by logical order (view -> create -> edit -> delete)
 */
export const sortPermissions = (
  permissions: ModulePermissionKey[]
): ModulePermissionKey[] => {
  return [...permissions].sort((a, b) => {
    const scoreA = getPermissionScore(a);
    const scoreB = getPermissionScore(b);

    if (scoreA !== scoreB) {
      return scoreA - scoreB;
    }

    return a.localeCompare(b);
  });
};

// Export aliases for shorter names
export const getPrerequisites = getPrerequisitePermissions;
export const sortPermissionsByCategory = sortPermissions;
