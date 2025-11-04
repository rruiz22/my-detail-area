import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
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

/**
 * ✅ FIX #9: Memoized PermissionGuard to prevent unnecessary re-renders
 * Performance optimization using React.memo
 *
 * ⚠️ CRITICAL: All hooks must be called in the same order every render
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = React.memo(({
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
  const { selectedDealerId } = useDealerFilter();

  // Get dealership modules - Use global filter instead of user's dealership_id
  // This allows system admins and multi-dealer users to check modules for the currently selected dealer
  const activeDealerId = typeof selectedDealerId === 'number' ? selectedDealerId : (enhancedUser as any)?.dealership_id || 0;
  const isSystemAdmin = (enhancedUser as any)?.is_system_admin || false;
  const isSupermanager = (enhancedUser as any)?.is_supermanager || false;
  const { hasModuleAccess, loading: modulesLoading } = useDealershipModules(activeDealerId, isSystemAdmin, isSupermanager);

  // Debug logging (only in dev)
  if (import.meta.env.DEV) {
    console.log(`🔍 [PermissionGuard] Checking access:`, {
      module,
      permission,
      checkDealerModule,
      isSystemAdmin,
      requireSystemPermission,
      hasEnhancedUser: !!enhancedUser
    });
  }

  // ✅ ALWAYS call all hooks in the same order
  // ✅ PHASE 1.2: Consolidated loading check to prevent "Access Denied" flash
  // Wait for all critical systems: auth, permissions, and modules
  const isInitializing = loading || modulesLoading || (!enhancedUser && !loading);

  // Early return after all hooks are called
  // Show full-page skeleton during initialization
  if (isInitializing) {
    return (
      <div className="container mx-auto py-8 space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  // ✅ Simplified hasAccess calculation - REMOVED useMemo to prevent hook order issues
  let hasAccess = false;

  try {
    // Check system-level permission
    if (requireSystemPermission) {
      hasAccess = hasSystemPermission(permission as SystemPermissionKey);
    }
    // Check module-level permission (granular or legacy)
    else if (module) {
      // IMPORTANT: When checkDealerModule is true, we enforce stricter checks
      if (checkDealerModule && !isSystemAdmin) {
        // PRIORITY 1: Supermanager - check allowed_modules
        if (isSupermanager) {
          const allowedModules = (enhancedUser as any)?.allowed_modules || [];

          if (allowedModules.length === 0) {
            // No allowed modules = no access
            if (import.meta.env.DEV) {
              console.warn(`❌ [PermissionGuard] Supermanager has NO allowed modules`);
            }
            hasAccess = false;
          } else if (module && allowedModules.includes(module)) {
            // Module in allowed list - delegate to hasPermission/hasModulePermission
            if (import.meta.env.DEV) {
              console.log(`✅ [PermissionGuard] Module ${module} in allowed list - checking specific permission`);
            }

            const isLegacyLevel = ['none', 'view', 'edit', 'delete', 'admin'].includes(permission as string);

            if (isLegacyLevel) {
              hasAccess = hasPermission(module, permission as PermissionLevel);
            } else {
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
          } else {
            // Module NOT in allowed list
            if (import.meta.env.DEV) {
              console.warn(`❌ [PermissionGuard] Module ${module} NOT in allowed list: [${allowedModules.join(', ')}]`);
            }
            hasAccess = false;
          }
        }
        // PRIORITY 2: Dealer users - strict module check
        else {
          if (import.meta.env.DEV) {
            console.log(`🔍 [PermissionGuard] Enforcing strict module check for ${module}`);
            const allUserModules = Array.from(enhancedUser?.module_permissions?.keys() || []);
            console.log(`   📋 User has permissions in ${allUserModules.length} modules: [${allUserModules.join(', ')}]`);
          }

          // First, check if dealership has the module enabled
          const dealerHasModule = hasModuleAccess(module);
          if (!dealerHasModule) {
            if (import.meta.env.DEV) {
              console.warn(`🚫 [PermissionGuard] Dealership doesn't have ${module} module enabled`);
            }
            hasAccess = false;
          } else {
            // Second, verify user has AT LEAST ONE permission in this module
            const userModulePerms = enhancedUser?.module_permissions?.get(module);
            const hasAnyModulePermission = userModulePerms && userModulePerms.size > 0;

            if (import.meta.env.DEV) {
              console.log(`   🔑 Permissions in "${module}": ${userModulePerms ? `[${Array.from(userModulePerms).join(', ')}]` : 'NONE'}`);
            }

            if (!hasAnyModulePermission) {
              if (import.meta.env.DEV) {
                console.warn(`🚫 [PermissionGuard] User has NO permissions for ${module} module`);
              }
              hasAccess = false;
            } else {
              // User has permissions, check the specific permission
              const isLegacyLevel = ['none', 'view', 'edit', 'delete', 'admin'].includes(permission as string);

              if (isLegacyLevel) {
                hasAccess = hasPermission(module, permission as PermissionLevel);
              } else {
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
        }
      } else {
        // Standard permission check
        const isLegacyLevel = ['none', 'view', 'edit', 'delete', 'admin'].includes(permission as string);

        if (isLegacyLevel) {
          hasAccess = hasPermission(module, permission as PermissionLevel);
        } else {
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
      if (import.meta.env.DEV) {
        console.warn('PermissionGuard: No module specified and not a system permission');
      }
      hasAccess = false;
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    hasAccess = false;
  }

  // ✅ Direct render without useMemo to prevent hook order issues
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
}, (prevProps, nextProps) => {
  // ✅ Custom comparison function for React.memo
  // Only re-render if these props actually changed
  return (
    prevProps.module === nextProps.module &&
    prevProps.permission === nextProps.permission &&
    prevProps.checkDealerModule === nextProps.checkDealerModule &&
    prevProps.requireSystemPermission === nextProps.requireSystemPermission &&
    prevProps.requireOrderAccess === nextProps.requireOrderAccess &&
    prevProps.order?.id === nextProps.order?.id &&
    prevProps.order?.status === nextProps.order?.status &&
    prevProps.fallback === nextProps.fallback
  );
});

PermissionGuard.displayName = 'PermissionGuard';

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
