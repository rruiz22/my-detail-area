import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useDealershipModules } from '@/hooks/useDealershipModules';
import type { AppModule } from '@/hooks/usePermissions';
import { useRoleModuleAccess } from '@/hooks/useRoleModuleAccess';
import { supabase } from '@/integrations/supabase/client';
import type {
  ModulePermission,
  ModulePermissionKey,
  SystemPermission,
  SystemPermissionKey
} from '@/types/permissions';
import {
  getPrerequisitePermissions,
  isDangerousPermission,
  sortPermissions,
  validatePermissions
} from '@/utils/permissionHelpers';
import {
  AlertTriangle,
  Info,
  Lock,
  RotateCcw,
  Save,
  Shield
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GranularPermissionManagerProps {
  roleId: string;
  roleName?: string;
  dealerId?: number;
  onSave?: () => void;
}

interface ModulePermissionsState {
  [module: string]: Set<ModulePermissionKey>;
}

export const GranularPermissionManager: React.FC<GranularPermissionManagerProps> = ({
  roleId,
  roleName,
  dealerId,
  onSave
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { hasModuleAccess, loading: modulesLoading } = useDealershipModules(dealerId || 0);
  const { moduleAccess, toggleModuleAccess, bulkSetModuleAccess, hasRoleModuleAccess, loading: moduleAccessLoading } = useRoleModuleAccess(roleId);

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [systemPermissions, setSystemPermissions] = useState<Set<SystemPermissionKey>>(new Set());
  const [modulePermissions, setModulePermissions] = useState<ModulePermissionsState>({});
  const [availableSystemPerms, setAvailableSystemPerms] = useState<SystemPermission[]>([]);
  const [availableModulePerms, setAvailableModulePerms] = useState<Record<AppModule, ModulePermission[]>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * Load available permissions from database
   */
  const loadAvailablePermissions = useCallback(async () => {
    try {
      // Load system permissions
      const { data: sysPerms, error: sysError } = await supabase
        .from('system_permissions')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (sysError) throw sysError;
      setAvailableSystemPerms(sysPerms || []);

      // Load module permissions
      const { data: modPerms, error: modError } = await supabase
        .from('module_permissions')
        .select('*')
        .eq('is_active', true)
        .order('module, permission_key', { ascending: true });

      if (modError) throw modError;

      // Group by module
      const grouped = (modPerms || []).reduce((acc, perm) => {
        const module = perm.module as AppModule;
        if (!acc[module]) acc[module] = [];
        acc[module].push(perm);
        return acc;
      }, {} as Record<AppModule, ModulePermission[]>);

      setAvailableModulePerms(grouped);
    } catch (error) {
      console.error('Error loading available permissions:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load available permissions',
        variant: 'destructive'
      });
    }
  }, [t, toast]);

  /**
   * Load current role permissions
   */
  const loadRolePermissions = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 [GranularPermissionManager] Loading permissions for roleId:', roleId);

      // Load system permissions for this role
      const { data: sysPerms, error: sysError } = await supabase
        .from('role_system_permissions')
        .select(`
          system_permissions (permission_key)
        `)
        .eq('role_id', roleId);

      if (sysError) throw sysError;
      console.log('🔍 [GranularPermissionManager] System perms loaded:', sysPerms?.length || 0);

      const sysPermSet = new Set<SystemPermissionKey>();
      (sysPerms || []).forEach((item: any) => {
        if (item.system_permissions?.permission_key) {
          sysPermSet.add(item.system_permissions.permission_key as SystemPermissionKey);
        }
      });
      setSystemPermissions(sysPermSet);

      // Load module permissions for this role
      const { data: modPerms, error: modError } = await supabase
        .from('role_module_permissions_new')
        .select(`
          module_permissions (module, permission_key)
        `)
        .eq('role_id', roleId);

      if (modError) throw modError;
      console.log('🔍 [GranularPermissionManager] Module perms loaded:', modPerms?.length || 0);

      const modPermState: ModulePermissionsState = {};
      (modPerms || []).forEach((item: any) => {
        if (item.module_permissions) {
          const module = item.module_permissions.module;
          const permKey = item.module_permissions.permission_key as ModulePermissionKey;

          if (!modPermState[module]) {
            modPermState[module] = new Set();
          }
          modPermState[module].add(permKey);
        }
      });
      setModulePermissions(modPermState);

      console.log('✅ [GranularPermissionManager] Loaded permissions for', Object.keys(modPermState).length, 'modules');
      console.log('   - System permissions:', sysPermSet.size);
      Object.entries(modPermState || {}).forEach(([mod, perms]) => {
        console.log(`   - ${mod}: ${perms.size} permissions`);
      });

      setHasChanges(false);
    } catch (error) {
      console.error('Error loading role permissions:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load role permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [roleId, t, toast]);

  /**
   * Initialize component
   */
  useEffect(() => {
    const init = async () => {
      await loadAvailablePermissions();
      await loadRolePermissions();
    };
    init();
  }, [loadAvailablePermissions, loadRolePermissions]);

  /**
   * Toggle system permission
   */
  const toggleSystemPermission = useCallback((permKey: SystemPermissionKey) => {
    setSystemPermissions(prev => {
      const updated = new Set(prev);
      if (updated.has(permKey)) {
        updated.delete(permKey);
      } else {
        updated.add(permKey);
      }
      return updated;
    });
    setHasChanges(true);
  }, []);

  /**
   * Toggle module permission
   */
  const toggleModulePermission = useCallback((module: AppModule, permKey: ModulePermissionKey) => {
    setModulePermissions(prev => {
      const updated = { ...prev };
      if (!updated[module]) {
        updated[module] = new Set();
      } else {
        updated[module] = new Set(updated[module]);
      }

      if (updated[module].has(permKey)) {
        updated[module].delete(permKey);
      } else {
        updated[module].add(permKey);

        // Auto-add prerequisites
        const prerequisites = getPrerequisitePermissions(permKey);
        prerequisites.forEach(prereq => {
          updated[module].add(prereq);
        });
      }

      return updated;
    });
    setHasChanges(true);

    // Validate and show warnings
    const allModulePerms = Object.values(modulePermissions).flatMap(set => Array.from(set));
    const validationWarnings = validatePermissions(allModulePerms as ModulePermissionKey[]);
    setWarnings(validationWarnings);
  }, [modulePermissions]);

  /**
   * Save all permissions
   */
  const savePermissions = useCallback(async () => {
    try {
      setSaving(true);

      // Delete existing permissions
      await supabase
        .from('role_system_permissions')
        .delete()
        .eq('role_id', roleId);

      await supabase
        .from('role_module_permissions_new')
        .delete()
        .eq('role_id', roleId);

      // Insert system permissions
      if (systemPermissions.size > 0) {
        const sysPermsToInsert: any[] = [];
        for (const permKey of systemPermissions) {
          // Get permission ID
          const { data: permData } = await supabase
            .from('system_permissions')
            .select('id')
            .eq('permission_key', permKey)
            .single();

          if (permData) {
            sysPermsToInsert.push({
              role_id: roleId,
              permission_id: permData.id
            });
          }
        }

        if (sysPermsToInsert.length > 0) {
          const { error: sysInsertError } = await supabase
            .from('role_system_permissions')
            .insert(sysPermsToInsert);

          if (sysInsertError) throw sysInsertError;
        }
      }

      // Insert module permissions
      const modPermsToInsert: any[] = [];
      for (const [module, perms] of Object.entries(modulePermissions || {})) {
        for (const permKey of perms) {
          // Get permission ID
          const { data: permData } = await supabase
            .from('module_permissions')
            .select('id')
            .eq('module', module)
            .eq('permission_key', permKey)
            .single();

          if (permData) {
            modPermsToInsert.push({
              role_id: roleId,
              permission_id: permData.id
            });
          }
        }
      }

      if (modPermsToInsert.length > 0) {
        const { error: modInsertError } = await supabase
          .from('role_module_permissions_new')
          .insert(modPermsToInsert);

        if (modInsertError) throw modInsertError;
      }

      toast({
        title: t('common.success'),
        description: 'Permissions saved successfully'
      });

      setHasChanges(false);
      onSave?.();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to save permissions',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [roleId, systemPermissions, modulePermissions, t, toast, onSave]);

  /**
   * Toggle module access for role
   */
  const handleToggleModuleAccess = useCallback(async (module: AppModule, isEnabled: boolean) => {
    const success = await toggleModuleAccess(module, isEnabled);
    if (success) {
      setHasChanges(true);
      toast({
        title: t('common.success'),
        description: isEnabled
          ? `Module ${module} enabled for this role`
          : `Module ${module} disabled for this role`
      });
    }
  }, [toggleModuleAccess, t, toast]);

  /**
   * Reset to loaded state
   */
  const resetChanges = useCallback(() => {
    loadRolePermissions();
    setWarnings([]);
  }, [loadRolePermissions]);

  if (loading || moduleAccessLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {roleName || 'Role'} Permissions
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure granular permissions for this role
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={resetChanges}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button onClick={savePermissions} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* System-Level Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Administration Permissions
          </CardTitle>
          <CardDescription>
            System-wide permissions that apply across all modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableSystemPerms.map(perm => {
              const isChecked = systemPermissions.has(perm.permission_key as SystemPermissionKey);
              const isDangerous = isDangerousPermission(perm.permission_key as SystemPermissionKey);

              return (
                <div
                  key={perm.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-colors ${
                    isChecked ? 'bg-primary/5 border-primary' : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <Checkbox
                    id={`sys-${perm.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggleSystemPermission(perm.permission_key as SystemPermissionKey)}
                  />
                  <label
                    htmlFor={`sys-${perm.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {perm.display_name}
                      </span>
                      {isDangerous && (
                        <Badge variant="destructive" className="text-xs">
                          <Lock className="h-3 w-3 mr-1" />
                          Dangerous
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {perm.description}
                    </p>
                  </label>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Module-Specific Permissions */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold flex items-center gap-2">
          <Info className="h-4 w-4" />
          Module Permissions
        </h4>

        {Object.entries(availableModulePerms || {})
          .filter(([module]) => {
            // Don't filter if no dealerId provided (backwards compatibility)
            if (!dealerId) return true;

            // Always show if loading
            if (modulesLoading) return true;

            // Filter by enabled modules
            return hasModuleAccess(module as AppModule);
          })
          .map(([module, perms]) => {
          const modulePerms = (modulePermissions || {})[module] || new Set();
          const checkedCount = modulePerms.size;
          const totalCount = perms.length;
          const isModuleEnabled = hasModuleAccess(module as AppModule);
          const roleHasModuleAccess = hasRoleModuleAccess(module as AppModule);

          return (
            <Card key={module}>
              <CardHeader>
                <div className="space-y-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="capitalize">{module.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      {!isModuleEnabled && dealerId && (
                        <Badge variant="secondary" className="text-xs">
                          Module Disabled
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {checkedCount} / {totalCount} enabled
                      </Badge>
                    </div>
                  </CardTitle>

                  {/* NEW: Toggle to enable/disable module for this role */}
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <div>
                        <Label className="text-sm font-medium">
                          Enable {module.replace(/_/g, ' ')} for this role
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {roleHasModuleAccess
                            ? 'This role can access this module'
                            : 'Access disabled - permissions saved but not active'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={roleHasModuleAccess}
                      onCheckedChange={(checked) => handleToggleModuleAccess(module as AppModule, checked)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Info alert when module is disabled but has permissions */}
                {!roleHasModuleAccess && checkedCount > 0 && (
                  <Alert className="mb-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This module has {checkedCount} saved permission(s) but access is currently disabled.
                      Enable the toggle above to activate these permissions.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Disable permissions when module toggle is OFF */}
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 transition-opacity ${
                  roleHasModuleAccess ? '' : 'opacity-40 pointer-events-none'
                }`}>
                  {sortPermissions(perms.map(p => p.permission_key as ModulePermissionKey))
                    .map(permKey => {
                      const perm = perms.find(p => p.permission_key === permKey);
                      if (!perm) return null;

                      const isChecked = modulePerms.has(permKey);
                      const isDangerous = isDangerousPermission(permKey);
                      const prerequisites = getPrerequisitePermissions(permKey);
                      const hasPrerequisites = prerequisites.length > 0;

                      return (
                        <div
                          key={perm.id}
                          className={`flex items-start space-x-2 p-2 rounded border transition-colors ${
                            isChecked ? 'bg-primary/5 border-primary/50' : 'border-muted hover:bg-muted/30'
                          }`}
                        >
                          <Checkbox
                            id={`mod-${perm.id}`}
                            checked={isChecked}
                            onCheckedChange={() => toggleModulePermission(module as AppModule, permKey)}
                          />
                          <label
                            htmlFor={`mod-${perm.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium">
                                {perm.display_name}
                              </span>
                              {isDangerous && (
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                            {perm.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {perm.description}
                              </p>
                            )}
                            {hasPrerequisites && (
                              <p className="text-[10px] text-amber-600 mt-0.5">
                                Requires: {prerequisites.join(', ')}
                              </p>
                            )}
                          </label>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
