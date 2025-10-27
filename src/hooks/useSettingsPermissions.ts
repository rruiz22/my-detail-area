import { usePermissions } from '@/hooks/usePermissions';

/**
 * Hook: useSettingsPermissions
 *
 * Granular permission system for Settings page
 *
 * PERMISSION MATRIX:
 * - system_admin: Full access to everything
 * - dealer_admin: Own dealership settings + integrations
 * - dealer_manager: Own dealership settings + integrations + notifications
 * - dealer_user: Only personal account settings
 *
 * USAGE:
 * const perms = useSettingsPermissions();
 * if (perms.canManagePlatform) { ... }
 */

export interface SettingsPermissions {
  // Platform Settings (system-wide)
  canManagePlatform: boolean;
  canEditBranding: boolean;
  canEditFeatureFlags: boolean;
  canEditGeneralSettings: boolean;

  // Account Settings (personal)
  canEditProfile: boolean; // Everyone
  canEditPreferences: boolean; // Everyone
  canChangeSecurity: boolean; // Everyone

  // Dealership Settings
  canViewDealership: boolean;
  canEditDealership: boolean; // admin/manager
  canEditDealershipBranding: boolean;

  // Integrations
  canViewIntegrations: boolean;
  canEditIntegrations: boolean; // admin/manager
  canTestIntegrations: boolean;

  // Notifications
  canViewNotifications: boolean;
  canEditNotificationTemplates: boolean; // manager+
  canEditNotificationRules: boolean; // manager+
  canViewNotificationAnalytics: boolean;

  // Security
  canManageSecurity: boolean; // system_admin only
  canViewAuditLogs: boolean; // admin+
  canEditSecurityPolicy: boolean; // system_admin only

  // User metadata
  role: string;
  dealershipId: number | null;
  isSystemAdmin: boolean;
  isDealerAdmin: boolean;
  isDealerManager: boolean;
}

export function useSettingsPermissions(): SettingsPermissions {
  const { enhancedUser } = usePermissions();

  const role = enhancedUser?.role || 'dealer_user';
  const dealershipId = enhancedUser?.dealership_id || null;

  // Check both role AND is_system_admin flag for backwards compatibility
  const isSystemAdmin = role === 'system_admin' || enhancedUser?.is_system_admin === true;
  const isDealerAdmin = role === 'dealer_admin';
  const isDealerManager = role === 'dealer_manager';
  const hasManagerialAccess = isSystemAdmin || isDealerAdmin || isDealerManager;

  return {
    // Platform Settings - system_admin only
    canManagePlatform: isSystemAdmin,
    canEditBranding: isSystemAdmin,
    canEditFeatureFlags: isSystemAdmin,
    canEditGeneralSettings: isSystemAdmin,

    // Account Settings - everyone
    canEditProfile: true,
    canEditPreferences: true,
    canChangeSecurity: true,

    // Dealership Settings - admin/manager of their dealership
    canViewDealership: !!dealershipId,
    canEditDealership: hasManagerialAccess && !!dealershipId,
    canEditDealershipBranding: hasManagerialAccess && !!dealershipId,

    // Integrations - admin/manager can configure for their dealership
    canViewIntegrations: hasManagerialAccess,
    canEditIntegrations: hasManagerialAccess,
    canTestIntegrations: hasManagerialAccess,

    // Notifications - manager+ can configure
    canViewNotifications: hasManagerialAccess,
    canEditNotificationTemplates: hasManagerialAccess,
    canEditNotificationRules: hasManagerialAccess,
    canViewNotificationAnalytics: hasManagerialAccess,

    // Security - system_admin only
    canManageSecurity: isSystemAdmin,
    canViewAuditLogs: isSystemAdmin || isDealerAdmin,
    canEditSecurityPolicy: isSystemAdmin,

    // Metadata
    role,
    dealershipId,
    isSystemAdmin,
    isDealerAdmin,
    isDealerManager
  };
}

/**
 * Helper: Check if user can access a specific settings tab
 */
export function canAccessTab(tab: string, permissions: SettingsPermissions): boolean {
  switch (tab) {
    case 'platform':
      return permissions.canManagePlatform;
    case 'account':
      return true; // Everyone
    case 'dealership':
      return permissions.canViewDealership;
    case 'integrations':
      return permissions.canViewIntegrations;
    case 'notifications':
      return permissions.canViewNotifications;
    case 'security':
      return permissions.canManageSecurity;
    default:
      return false;
  }
}
