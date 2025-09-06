import React, { createContext, useContext } from 'react';
import { usePermissions, AppModule, PermissionLevel, UserPermission, UserRole } from '@/hooks/usePermissions';

interface PermissionContextType {
  permissions: UserPermission[];
  roles: UserRole[];
  loading: boolean;
  hasPermission: (module: AppModule, requiredLevel: PermissionLevel) => boolean;
  checkPermission: (module: AppModule, requiredLevel: PermissionLevel) => Promise<boolean>;
  assignRole: (userId: string, roleName: string, expiresAt?: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  removeRole: (userId: string, roleId: string) => Promise<{ success: boolean; error?: string }>;
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
  const permissionData = usePermissions();

  return (
    <PermissionContext.Provider value={permissionData}>
      {children}
    </PermissionContext.Provider>
  );
};