import React from 'react';
import { usePermissions, AppModule, PermissionLevel } from '@/hooks/usePermissions';
import { useDealershipModules } from '@/hooks/useDealershipModules';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Order {
  id: string;
  dealer_id: number;
  order_type: string;
  status: string;
}

interface PermissionGuardProps {
  module: AppModule;
  permission: PermissionLevel;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  // Optional order-specific checks
  order?: Order;
  requireOrderAccess?: boolean;
  // Optional dealer module check
  checkDealerModule?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  permission,
  children,
  fallback,
  order,
  requireOrderAccess = false,
  checkDealerModule = false
}) => {
  const { hasPermission, canEditOrder, canDeleteOrder, loading, enhancedUser } = usePermissions();
  const { t } = useTranslation();

  // Get dealership modules only if needed
  const userDealershipId = (enhancedUser as any)?.dealership_id || 0;
  const isSystemAdmin = (enhancedUser as any)?.is_system_admin || false;
  const { hasModuleAccess, loading: modulesLoading } = useDealershipModules(
    checkDealerModule ? userDealershipId : 0
  );

  if (loading || (checkDealerModule && modulesLoading)) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-20"></div>
      </div>
    );
  }

  let hasAccess = false;

  try {
    const moduleAccess = hasPermission(module, permission);

    if (!moduleAccess) {
      hasAccess = false;
    } else if (requireOrderAccess && order) {
      if (permission === 'edit') {
        hasAccess = canEditOrder(order);
      } else if (permission === 'delete') {
        hasAccess = canDeleteOrder(order);
      } else {
        hasAccess = moduleAccess;
      }
    } else {
      hasAccess = moduleAccess;
    }

    // Additional check: Verify dealer has module enabled (if checkDealerModule is true)
    if (hasAccess && checkDealerModule && !isSystemAdmin) {
      const dealerHasModule = hasModuleAccess(module);
      if (!dealerHasModule) {
        hasAccess = false;
      }
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