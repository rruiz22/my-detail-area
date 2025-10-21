import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDealershipModules } from '@/hooks/useDealershipModules';
import { AppModule, PermissionLevel, usePermissions } from '@/hooks/usePermissions';
import type { ModulePermissionKey, SystemPermissionKey } from '@/types/permissions';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface Order {
  id: string;
  dealer_id: number;
  order_type: string;
  status: string;
}

interface PermissionGuardProps {
  module?: AppModule; // Optional for system-level permissions
  permission: PermissionLevel | ModulePermissionKey | SystemPermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  // Optional order-specific checks
  order?: Order;
  requireOrderAccess?: boolean;
  // Optional dealer module check
  checkDealerModule?: boolean;
  // Flag to indicate this is a system-level permission
  requireSystemPermission?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  permission,
  children,
  fallback,
  order,
  requireOrderAccess = false,
  checkDealerModule = false,
  requireSystemPermission = false
}) => {
  const { hasPermission, hasModulePermission, hasSystemPermission, canEditOrder, canDeleteOrder, loading, enhancedUser } = usePermissions();
  const { t } = useTranslation();

  // Get dealership modules only if needed
  const userDealershipId = (enhancedUser as any)?.dealership_id || 0;
  const isSystemAdmin = (enhancedUser as any)?.is_system_admin || false;
  const { hasModuleAccess, loading: modulesLoading } = useDealershipModules(
    checkDealerModule ? userDealershipId : 0
  );

  // Debug logging
  console.log(`🔍 [PermissionGuard] Checking access:`, {
    module,
    permission,
    checkDealerModule,
    isSystemAdmin,
    requireSystemPermission,
    hasEnhancedUser: !!enhancedUser
  });

  if (loading || (checkDealerModule && modulesLoading)) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-20"></div>
      </div>
    );
  }

  let hasAccess = false;

  try {
    // Check system-level permission
    if (requireSystemPermission) {
      hasAccess = hasSystemPermission(permission as SystemPermissionKey);
    }
    // Check module-level permission (granular or legacy)
    else if (module) {
      // IMPORTANT: When checkDealerModule is true, we enforce stricter checks
      // User must have at least ONE permission in the specific module
      if (checkDealerModule && !isSystemAdmin) {
        console.log(`🔍 [PermissionGuard] Enforcing strict module check for ${module}`);

        // Debug: Show what modules the user has permissions for
        const allUserModules = Array.from(enhancedUser?.module_permissions?.keys() || []);
        console.log(`   📋 User has permissions in ${allUserModules.length} modules: [${allUserModules.join(', ')}]`);

        // First, check if dealership has the module enabled
        const dealerHasModule = hasModuleAccess(module);
        if (!dealerHasModule) {
          console.warn(`🚫 [PermissionGuard] Dealership doesn't have ${module} module enabled`);
          hasAccess = false;
        } else {
          // Second, verify user has AT LEAST ONE permission in this module
          // This is the PRIMARY check - user must have module-specific permissions
          const userModulePerms = enhancedUser?.module_permissions?.get(module);
          const hasAnyModulePermission = userModulePerms && userModulePerms.size > 0;

          console.log(`   🔑 Permissions in "${module}": ${userModulePerms ? `[${Array.from(userModulePerms).join(', ')}]` : 'NONE (size: 0)'}`);

          if (!hasAnyModulePermission) {
            console.warn(`🚫 [PermissionGuard] User has NO permissions for ${module} module`);
            console.warn(`   User has permissions for: ${allUserModules.join(', ')}`);
            hasAccess = false;
          } else {
            console.log(`✅ [PermissionGuard] User has ${userModulePerms?.size} permission(s) in ${module}`);
            // User has permissions in this module, now check the specific permission
            const isLegacyLevel = ['none', 'view', 'edit', 'delete', 'admin'].includes(permission as string);

            if (isLegacyLevel) {
              // Use legacy hasPermission for backward compatibility
              hasAccess = hasPermission(module, permission as PermissionLevel);
            } else {
              // Use new granular permission system
              hasAccess = hasModulePermission(module, permission as ModulePermissionKey);
            }

            // Check order-specific permissions
            if (hasAccess && requireOrderAccess && order) {
              if (permission === 'edit' || permission === 'edit_orders') {
                hasAccess = canEditOrder(order);
              } else if (permission === 'delete' || permission === 'delete_orders') {
                hasAccess = canDeleteOrder(order);
              }
            }
          }
        }
      } else {
        // Standard permission check (no module access verification)
        const isLegacyLevel = ['none', 'view', 'edit', 'delete', 'admin'].includes(permission as string);

        if (isLegacyLevel) {
          // Use legacy hasPermission for backward compatibility
          hasAccess = hasPermission(module, permission as PermissionLevel);
        } else {
          // Use new granular permission system
          hasAccess = hasModulePermission(module, permission as ModulePermissionKey);
        }

        // Check order-specific permissions
        if (hasAccess && requireOrderAccess && order) {
          if (permission === 'edit' || permission === 'edit_orders') {
            hasAccess = canEditOrder(order);
          } else if (permission === 'delete' || permission === 'delete_orders') {
            hasAccess = canDeleteOrder(order);
          }
        }
      }
    } else {
      console.warn('PermissionGuard: No module specified and not a system permission');
      hasAccess = false;
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    hasAccess = false;
  }

  if (!hasAccess) {
    if (fallback !== undefined) {
      return fallback ? <>{fallback}</> : null;
    }

    return (
      <div className="min-h-[400px] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-6">
            <ShieldAlert className="h-20 w-20 mx-auto text-amber-500" />

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t('common.access_denied')}</h2>
              <p className="text-muted-foreground">
                {t('common.insufficient_permissions')}
              </p>
            </div>

            <Button asChild variant="default">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back_to_dashboard')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

interface WithPermissionProps {
  module: AppModule;
  permission: PermissionLevel;
  fallback?: React.ReactNode;
}

export const withPermission = <P extends object>(
  Component: React.ComponentType<P>,
  { module, permission, fallback }: WithPermissionProps
) => {
  const WrappedComponent = (props: P) => (
    <PermissionGuard module={module} permission={permission} fallback={fallback}>
      <Component {...props} />
    </PermissionGuard>
  );

  WrappedComponent.displayName = `withPermission(${Component.displayName || Component.name})`;
  return WrappedComponent;
};
