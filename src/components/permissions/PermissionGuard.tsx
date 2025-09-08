import React from 'react';
import { usePermissions, AppModule, PermissionLevel } from '@/hooks/usePermissions';

interface PermissionGuardProps {
  module: AppModule;
  permission: PermissionLevel;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  permission,
  children,
  fallback = null
}) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-20"></div>
      </div>
    );
  }

  // Ensure hasPermission returns a boolean and handle any errors
  let hasAccess = false;
  try {
    const result = hasPermission(module, permission);
    hasAccess = Boolean(result);
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