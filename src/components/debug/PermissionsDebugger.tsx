/**
 * PermissionsDebugger Component
 *
 * Herramienta de diagnóstico para revisar el estado de permisos en tiempo real
 * Solo disponible en modo desarrollo
 *
 * Uso:
 * import { PermissionsDebugger } from '@/components/debug/PermissionsDebugger';
 *
 * // En tu componente
 * {import.meta.env.DEV && <PermissionsDebugger />}
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useDealershipModules } from '@/hooks/useDealershipModules';
import { usePermissions } from '@/hooks/usePermissions';
import { useRoleModuleAccess } from '@/hooks/useRoleModuleAccess';
import { supabase } from '@/integrations/supabase/client';
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Copy,
    RefreshCcw,
    Shield,
    XCircle
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export const PermissionsDebugger: React.FC = () => {
  const { user } = useAuth();
  const { enhancedUser, hasPermission, hasModulePermission, hasSystemPermission, loading } = usePermissions();

  const dealershipId = (enhancedUser as any)?.dealership_id || 0;
  const isSystemAdmin = (enhancedUser as any)?.is_system_admin || false;

  const { modules: dealerModules, loading: dealerModulesLoading, hasModuleAccess } = useDealershipModules(dealershipId);

  const [roleId, setRoleId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get user's custom role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from('user_custom_role_assignments')
        .select('custom_role_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setRoleId(data.custom_role_id);
      }
    };

    fetchUserRole();
  }, [user?.id]);

  const { moduleAccess: roleModules, loading: roleModulesLoading } = useRoleModuleAccess(roleId);

  const copyDebugInfo = () => {
    // Helper to convert Map/Set to arrays
    const mapToArray = (map: any) => {
      if (!map) return [];
      if (typeof map.entries === 'function') {
        return Array.from(map.entries()).map(([k, v]) => ({
          key: k,
          value: v?.size !== undefined ? Array.from(v) : v
        }));
      }
      // Handle plain object
      return Object.entries(map).map(([k, v]) => ({
        key: k,
        value: Array.isArray(v) ? v : (v?.size !== undefined ? Array.from(v as any) : v)
      }));
    };

    const debugInfo = {
      user: {
        id: user?.id,
        email: user?.email,
        is_system_admin: isSystemAdmin,
        dealership_id: dealershipId,
        role_id: roleId
      },
      loading: {
        permissions: loading,
        dealerModules: dealerModulesLoading,
        roleModules: roleModulesLoading
      },
      dealerModules: dealerModules.map(m => ({
        module: m.module,
        enabled: m.is_enabled
      })),
      roleModules: Array.from(roleModules.entries()).map(([module, enabled]) => ({
        module,
        enabled
      })),
      modulePermissions: mapToArray(enhancedUser?.module_permissions),
      systemPermissions: enhancedUser?.system_permissions ?
        (Array.isArray(enhancedUser.system_permissions) ? enhancedUser.system_permissions : Array.from(enhancedUser.system_permissions as any)) : []
    };

    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    alert('Debug info copied to clipboard!');
  };

  const getModuleStatus = (module: string) => {
    const dealerHas = hasModuleAccess(module as any);
    const roleHas = roleModules.get(module as any);

    // Handle both Map and plain object for module_permissions
    let userPerms: Set<any> | undefined;
    if (enhancedUser?.module_permissions) {
      if (typeof enhancedUser.module_permissions.get === 'function') {
        userPerms = enhancedUser.module_permissions.get(module as any);
      } else {
        userPerms = (enhancedUser.module_permissions as any)[module];
      }
    }

    if (!dealerHas) return { status: 'blocked', reason: 'Dealer module disabled', icon: XCircle, color: 'text-destructive' };
    if (roleHas === false) return { status: 'blocked', reason: 'Role module disabled', icon: XCircle, color: 'text-destructive' };
    if (!userPerms || (userPerms.size === undefined ? Object.keys(userPerms).length === 0 : userPerms.size === 0)) {
      return { status: 'warning', reason: 'No permissions', icon: AlertCircle, color: 'text-amber-500' };
    }
    const permCount = userPerms.size !== undefined ? userPerms.size : Object.keys(userPerms).length;
    return { status: 'ok', reason: `${permCount} permissions`, icon: CheckCircle2, color: 'text-green-500' };
  };

  const allModules = [
    'dashboard', 'sales_orders', 'service_orders', 'recon_orders', 'car_wash',
    'stock', 'get_ready', 'chat', 'contacts', 'reports', 'settings',
    'dealerships', 'users', 'management', 'productivity'
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="shadow-lg">
            <Shield className="h-4 w-4 mr-2" />
            Permissions Debugger
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <Card className="w-[600px] shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Permissions Debugger
                  </CardTitle>
                  <CardDescription>
                    Real-time permissions analysis
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRefreshKey(k => k + 1)}
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyDebugInfo}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="modules">Modules</TabsTrigger>
                  <TabsTrigger value="perms">Permissions</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">User ID:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{user?.id?.slice(0, 8)}...</code>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-mono text-xs">{user?.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Dealership ID:</span>
                      <Badge variant="outline">{dealershipId || 'N/A'}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">System Admin:</span>
                      {isSystemAdmin ? (
                        <Badge variant="default">YES</Badge>
                      ) : (
                        <Badge variant="secondary">NO</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Loading State:</span>
                      {loading ? (
                        <Badge variant="destructive">Loading...</Badge>
                      ) : (
                        <Badge variant="default">Ready</Badge>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-2">Quick Stats</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Dealer Modules:</span>
                        <div className="font-semibold">
                          {dealerModules.filter(m => m.is_enabled).length} / {dealerModules.length}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Role Modules:</span>
                        <div className="font-semibold">
                          {Array.from(roleModules.values()).filter(Boolean).length} / {roleModules.size}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Module Perms:</span>
                        <div className="font-semibold">
                          {(() => {
                            const modPerms = enhancedUser?.module_permissions;
                            if (!modPerms) return 0;
                            return typeof modPerms.size === 'number' ? modPerms.size : Object.keys(modPerms).length;
                          })()} modules
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">System Perms:</span>
                        <div className="font-semibold">
                          {(() => {
                            const sysPerms = enhancedUser?.system_permissions;
                            if (!sysPerms) return 0;
                            if (Array.isArray(sysPerms)) return sysPerms.length;
                            return typeof sysPerms.size === 'number' ? sysPerms.size : 0;
                          })()} perms
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Modules Tab */}
                <TabsContent value="modules">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-2">
                      {allModules.map(module => {
                        const status = getModuleStatus(module);
                        const Icon = status.icon;

                        return (
                          <div
                            key={module}
                            className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${status.color}`} />
                              <span className="text-sm font-mono">{module}</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {status.reason}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Permissions Tab */}
                <TabsContent value="perms">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {/* System Permissions */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">System Permissions</h4>
                        <div className="space-y-1">
                          {(() => {
                            const sysPerms = enhancedUser?.system_permissions;
                            if (!sysPerms) return <div className="text-xs text-muted-foreground">No system permissions</div>;

                            const permsArray = Array.isArray(sysPerms) ? sysPerms :
                                             (typeof sysPerms.size === 'number' && sysPerms.size > 0) ? Array.from(sysPerms as any) : [];

                            return permsArray.length > 0 ? permsArray.map((perm: any) => (
                              <div key={perm} className="text-xs bg-primary/10 px-2 py-1 rounded flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                                {perm}
                              </div>
                            )) : <div className="text-xs text-muted-foreground">No system permissions</div>;
                          })()}
                        </div>
                      </div>

                      {/* Module Permissions */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Module Permissions</h4>
                        {(() => {
                          const modPerms = enhancedUser?.module_permissions;
                          if (!modPerms) return <div className="text-xs text-muted-foreground">No module permissions</div>;

                          // Handle both Map and plain object
                          const entries = typeof modPerms.entries === 'function' ?
                            Array.from(modPerms.entries()) :
                            Object.entries(modPerms);

                          return entries.length > 0 ? entries.map(([module, perms]: [any, any]) => {
                            const permsArray = Array.isArray(perms) ? perms :
                                             (perms?.size !== undefined ? Array.from(perms) : []);

                            return (
                              <div key={module} className="mb-3">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">
                                  {module}
                                </div>
                                <div className="space-y-1 pl-3">
                                  {permsArray.map((perm: any) => (
                                    <div key={perm} className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-2">
                                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      {perm}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }) : <div className="text-xs text-muted-foreground">No module permissions</div>;
                        })()}
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Raw Tab */}
                <TabsContent value="raw">
                  <ScrollArea className="h-[400px]">
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                      {JSON.stringify({
                        user: {
                          id: user?.id,
                          email: user?.email,
                          dealership_id: dealershipId,
                          is_system_admin: isSystemAdmin
                        },
                        enhancedUser: enhancedUser ? {
                          user_type: (enhancedUser as any).user_type,
                          role: (enhancedUser as any).role,
                          module_permissions: enhancedUser.module_permissions ?
                            (typeof enhancedUser.module_permissions.entries === 'function' ?
                              Array.from(enhancedUser.module_permissions.entries()).map(([k, v]: [any, any]) =>
                                [k, v?.size !== undefined ? Array.from(v) : v]) :
                              Object.entries(enhancedUser.module_permissions).map(([k, v]) =>
                                [k, Array.isArray(v) ? v : (v?.size !== undefined ? Array.from(v as any) : v)])
                            ) : [],
                          system_permissions: enhancedUser.system_permissions ?
                            (Array.isArray(enhancedUser.system_permissions) ? enhancedUser.system_permissions :
                             Array.from(enhancedUser.system_permissions as any)) : []
                        } : null,
                        dealer_modules: dealerModules,
                        role_modules: Array.from(roleModules.entries())
                      }, null, 2)}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
