/**
 * Granular Permissions Type Definitions
 *
 * This file defines the new permission system with fine-grained access control.
 * Replaces the old hierarchical system (view/edit/delete/admin) with specific
 * action-based permissions.
 */

import type { AppModule } from '@/hooks/usePermissions';

// =====================================================
// System-Level Permissions
// =====================================================
// Global permissions that transcend specific modules

export type SystemPermissionKey =
  | 'manage_all_settings'
  | 'invite_users'
  | 'activate_deactivate_users'
  | 'delete_users'
  | 'manage_dealerships'
  | 'view_audit_logs'
  | 'manage_roles'
  | 'view_all_reports';

export interface SystemPermission {
  id: string;
  permission_key: SystemPermissionKey;
  display_name: string;
  description: string | null;
  category: string;
  is_active: boolean;
}

// =====================================================
// Module-Specific Permissions
// =====================================================
// Action-based permissions within each module

export type ModulePermissionKey =
  // Dashboard
  | 'view_dashboard'
  | 'customize_widgets'
  | 'view_all_dealerships'
  | 'export_dashboard_data'

  // Orders (sales, service, recon, car_wash)
  | 'view_orders'
  | 'create_orders'
  | 'edit_orders'
  | 'delete_orders'
  | 'change_status'
  | 'view_pricing'
  | 'edit_pricing'
  | 'access_internal_notes'
  | 'export_data'
  | 'assign_orders'
  | 'view_customer_info'
  | 'edit_customer_info'
  | 'receive_sms_notifications'

  // Stock/Inventory
  | 'view_inventory'
  | 'add_vehicles'
  | 'edit_vehicles'
  | 'delete_vehicles'
  | 'manage_stock_numbers'

  // Contacts
  | 'view_contacts'
  | 'create_contacts'
  | 'edit_contacts'
  | 'delete_contacts'
  | 'generate_qr_codes'

  // Reports
  | 'view_reports'
  | 'create_custom_reports'
  | 'export_reports'
  | 'schedule_reports'
  | 'view_financial_reports'

  // Users
  | 'view_users'
  | 'create_users'
  | 'edit_users'
  | 'delete_users'
  | 'assign_roles'
  | 'reset_passwords'
  | 'view_user_activity'

  // Management
  | 'view_settings'
  | 'edit_settings'
  | 'manage_modules'
  | 'manage_themes'
  | 'view_system_logs'
  | 'manage_integrations'

  // Productivity
  | 'view_tasks'
  | 'create_tasks'
  | 'edit_tasks'
  | 'delete_tasks'
  | 'assign_tasks'
  | 'view_calendar'
  | 'manage_calendar'

  // Chat
  | 'view_conversations'
  | 'send_messages'
  | 'create_groups'
  | 'delete_messages'
  | 'delete_others_messages'
  | 'manage_participants'
  | 'send_files'

  // Settings
  | 'edit_general_settings'
  | 'edit_notification_settings'
  | 'edit_security_settings'
  | 'manage_api_keys'

  // Dealerships
  | 'view_dealerships'
  | 'create_dealerships'
  | 'edit_dealerships'
  | 'delete_dealerships'
  | 'manage_dealership_modules'
  | 'switch_dealerships';

export interface ModulePermission {
  id: string;
  module: AppModule;
  permission_key: ModulePermissionKey;
  display_name: string;
  description: string | null;
  is_active: boolean;
}

// =====================================================
// Permission Assignment Types
// =====================================================

export interface RoleSystemPermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by: string | null;
  system_permissions?: SystemPermission;
}

export interface RoleModulePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by: string | null;
  module_permissions?: ModulePermission;
}

// =====================================================
// Enhanced User with Granular Permissions
// =====================================================

export interface GranularCustomRole {
  id: string;
  role_name: string;
  display_name: string;
  dealer_id: number | null; // NULL = system role, number = dealer-specific role
  role_type: 'system_role' | 'dealer_custom_role'; // Type of role
  system_permissions: Set<SystemPermissionKey>;
  module_permissions: Map<AppModule, Set<ModulePermissionKey>>;
}

export interface EnhancedUserGranular {
  id: string;
  email: string;
  dealership_id: number | null;
  is_system_admin: boolean;
  is_supermanager: boolean;  // NEW: Elevated access but limited (cannot manage platform settings or create system_admins)

  /** @deprecated Use allowed_modules instead. Kept for backward compatibility only. */
  bypass_custom_roles?: boolean;

  /** 🆕 NEW: Global allowed modules for supermanagers (applies to ALL dealers). Empty array or undefined = no access. */
  allowed_modules?: string[];

  custom_roles: GranularCustomRole[];
  // Aggregated permissions from all roles
  system_permissions: Set<SystemPermissionKey>;
  module_permissions: Map<AppModule, Set<ModulePermissionKey>>;
}

// =====================================================
// Permission Audit Types
// =====================================================

export interface PermissionAuditLog {
  id: string;
  role_id: string;
  permission_type: 'system' | 'module';
  permission_key: string;
  action: 'granted' | 'revoked';
  changed_by: string | null;
  changed_at: string;
  metadata: Record<string, any> | null;
}

// =====================================================
// Permission Configuration Types
// =====================================================

export interface PermissionCategory {
  name: string;
  display_name: string;
  description: string;
  permissions: SystemPermission[] | ModulePermission[];
}

export interface ModulePermissionConfig {
  module: AppModule;
  display_name: string;
  description: string;
  icon?: string;
  permissions: ModulePermission[];
}

// =====================================================
// Utility Types
// =====================================================

export type PermissionCheckResult = {
  granted: boolean;
  reason?: string;
  source?: 'system_admin' | 'role_permission' | 'default_deny';
};

// Mapping from old permission levels to new granular permissions
export type LegacyPermissionLevel = 'none' | 'view' | 'edit' | 'delete' | 'admin';

export interface LegacyToGranularMapping {
  level: LegacyPermissionLevel;
  module: AppModule;
  granular_permissions: ModulePermissionKey[];
}

// =====================================================
// Constants
// =====================================================

// Permissions that are considered dangerous and require extra caution
export const DANGEROUS_PERMISSIONS: (SystemPermissionKey | ModulePermissionKey)[] = [
  'delete_users',
  'manage_api_keys',
  'delete_dealerships',
  'edit_security_settings'
];

// Default permissions for new users (minimal access)
export const DEFAULT_USER_PERMISSIONS: ModulePermissionKey[] = [
  'view_dashboard',
  'view_conversations'
];
