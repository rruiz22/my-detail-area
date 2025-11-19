import { PermissionBoundary } from '@/components/permissions/PermissionBoundary';
import { AppModule, PermissionLevel, usePermissions } from '@/hooks/usePermissions';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

interface PermissionContextType {
  loading: boolean;
  hasPermission: (module: AppModule, requiredLevel: PermissionLevel) => boolean;
  refreshPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: React.ReactNode;
}

/**
 * ✅ FIX: Added proper cleanup to prevent memory leaks
 * ✅ FIX #12: Wrapped with Error Boundary for graceful error handling
 * - Uses ref to track mount state
 * - Safe wrapper for refreshPermissions
 * - Memoized context value to prevent unnecessary re-renders
 * - Error boundary catches permission errors
 */
export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const isMountedRef = useRef(true);
  const permissionsHook = usePermissions();

  // Track mount state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ Safe wrapper that checks if component is still mounted
  const safeRefreshPermissions = useCallback(() => {
    if (isMountedRef.current) {
      permissionsHook.refreshPermissions();
    } else {
      console.warn('⚠️ Attempted to refresh permissions on unmounted PermissionProvider');
    }
  }, [permissionsHook.refreshPermissions]);

  // ✅ Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    hasPermission: permissionsHook.hasPermission,
    loading: permissionsHook.loading,
    refreshPermissions: safeRefreshPermissions
  }), [
    permissionsHook.hasPermission,
    permissionsHook.loading,
    safeRefreshPermissions
  ]);

  return (
    <PermissionBoundary>
      <PermissionContext.Provider value={contextValue}>
        {children}
      </PermissionContext.Provider>
    </PermissionBoundary>
  );
};
