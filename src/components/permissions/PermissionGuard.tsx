import React from 'react';
import { usePermissions, AppModule, PermissionLevel } from '@/hooks/usePermissions';

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
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  permission,
  children,
  fallback = null,
  order,
  requireOrderAccess = false
}) => {
  const { hasPermission, canEditOrder, canDeleteOrder, loading } = usePermissions();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-20"></div>
      </div>
    );
  }

  let hasAccess = false;

  try {
    // Check general module permission first
    const moduleAccess = hasPermission(module, permission);

    if (!moduleAccess) {
      hasAccess = false;
    } else if (requireOrderAccess && order) {
      // For order-specific actions, check order permissions
      if (permission === 'edit') {
        hasAccess = canEditOrder(order);
      } else if (permission === 'delete') {
        hasAccess = canDeleteOrder(order);
      } else {
        // For view permissions, check if user's dealer matches order's dealer
        hasAccess = moduleAccess;
      }
    } else {
      hasAccess = moduleAccess;
    }
  } catch (error) {
    console.error('Error checking permission:', error);
    hasAccess = false;
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
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