import React, { createContext, useContext } from 'react';
import { usePermissions, AppModule, PermissionLevel } from '@/hooks/usePermissions';

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

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { hasPermission, loading, refreshPermissions } = usePermissions();

  return (
    <PermissionContext.Provider value={{ hasPermission, loading, refreshPermissions }}>
      {children}
    </PermissionContext.Provider>
  );
};
