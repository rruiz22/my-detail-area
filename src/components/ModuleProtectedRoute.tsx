import { useAuth } from '@/contexts/AuthContext';
import { useDealershipModules } from '@/hooks/useDealershipModules';
import type { AppModule } from '@/hooks/usePermissions';
import { usePermissions } from '@/hooks/usePermissions';
import { Navigate, useLocation } from 'react-router-dom';

interface ModuleProtectedRouteProps {
  children: React.ReactNode;
  module: AppModule;
  redirectTo?: string;
}

/**
 * ModuleProtectedRoute
 *
 * Protects a route by checking:
 * 1. User is authenticated
 * 2. Dealership has the module enabled (or no config = allow)
 * 3. User has AT LEAST ONE permission in the module
 *
 * If any check fails, redirects to dashboard or specified route.
 */
export const ModuleProtectedRoute = ({
  children,
  module,
  redirectTo = '/dashboard'
}: ModuleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { enhancedUser, loading: permissionsLoading } = usePermissions();
  const isSystemAdmin = (enhancedUser as any)?.is_system_admin || false;
  const isSupermanager = (enhancedUser as any)?.is_supermanager || false;
  const dealershipId = (enhancedUser as any)?.dealership_id || 0;
  const { hasModuleAccess, loading: modulesLoading } = useDealershipModules(dealershipId, isSystemAdmin, isSupermanager);
  const location = useLocation();

  // Wait for all data to load
  if (authLoading || permissionsLoading || modulesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check 1: User must be authenticated
  if (!user) {
    const intendedPath = location.pathname + location.search;
    return <Navigate to={`/?redirect=${encodeURIComponent(intendedPath)}`} replace />;
  }

  // Check 2: System admins have full access
  if (enhancedUser?.is_system_admin) {
    console.log(`🟢 [ModuleProtectedRoute] System admin - full access to ${module}`);
    return <>{children}</>;
  }

  // Check 3: Dealership must have module enabled (or no config)
  const dealershipHasModule = hasModuleAccess(module);
  if (!dealershipHasModule) {
    console.warn(`🚫 [ModuleProtectedRoute] Dealership doesn't have ${module} module enabled - redirecting to ${redirectTo}`);
    return <Navigate to={redirectTo} replace />;
  }

  // Check 4: User must have AT LEAST ONE permission in this module
  // ⚠️ DEFENSIVE: Verify module_permissions is a Map before calling .has() and .get()
  const modulePermsIsMap = enhancedUser?.module_permissions &&
    typeof enhancedUser.module_permissions.has === 'function' &&
    typeof enhancedUser.module_permissions.get === 'function';

  const userHasModulePermissions = modulePermsIsMap &&
    enhancedUser.module_permissions.has(module) &&
    (enhancedUser.module_permissions.get(module)?.size ?? 0) > 0;

  if (!userHasModulePermissions) {
    console.warn(`🚫 [ModuleProtectedRoute] User has NO permissions for ${module} module - redirecting to ${redirectTo}`);
    if (modulePermsIsMap) {
      console.warn(`   User has permissions for: ${Array.from(enhancedUser?.module_permissions.keys() || []).join(', ')}`);
    } else {
      console.error(`   ⚠️ module_permissions is not a Map - permissions corrupted`);
    }
    return <Navigate to={redirectTo} replace />;
  }

  // All checks passed
  console.log(`✅ [ModuleProtectedRoute] Access granted to ${module} module`);
  return <>{children}</>;
};
