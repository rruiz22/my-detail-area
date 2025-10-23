import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useDealerActiveModules } from '@/hooks/useDealerActiveModules';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Users,
  Lock,
  Unlock,
  Eye,
  Edit,
  Trash2,
  Settings,
  AlertTriangle,
  History,
  CheckCircle
} from 'lucide-react';

interface Permission {
  module: string;
  permission_level: 'none' | 'read' | 'write' | 'delete' | 'admin';
  description?: string;
}

interface Role {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  user_type: 'dealer' | 'detail' | 'system_admin';
  is_system_role: boolean;
  permissions: Permission[];
}

interface PermissionModule {
  name: string;
  display_name: string;
  description: string;
  permissions: Array<{
    level: Permission['permission_level'];
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

const PERMISSION_MODULES: PermissionModule[] = [
  {
    name: 'dashboard',
    display_name: 'Dashboard',
    description: 'Access to main dashboard and overview',
    permissions: [
      { level: 'read', description: 'View dashboard', icon: Eye },
      { level: 'admin', description: 'Manage dashboard settings', icon: Settings }
    ]
  },
  {
    name: 'sales_orders',
    display_name: 'Sales Orders',
    description: 'Manage sales orders and customer requests',
    permissions: [
      { level: 'read', description: 'View sales orders', icon: Eye },
      { level: 'write', description: 'Create and edit orders', icon: Edit },
      { level: 'delete', description: 'Delete orders', icon: Trash2 },
      { level: 'admin', description: 'Manage order settings', icon: Settings }
    ]
  },
  {
    name: 'service_orders',
    display_name: 'Service Orders',
    description: 'Manage service orders and maintenance requests',
    permissions: [
      { level: 'read', description: 'View service orders', icon: Eye },
      { level: 'write', description: 'Create and edit orders', icon: Edit },
      { level: 'delete', description: 'Delete orders', icon: Trash2 },
      { level: 'admin', description: 'Manage service settings', icon: Settings }
    ]
  },
  {
    name: 'recon_orders',
    display_name: 'Recon Orders',
    description: 'Vehicle reconditioning workflow management',
    permissions: [
      { level: 'read', description: 'View recon orders', icon: Eye },
      { level: 'write', description: 'Create and edit recon orders', icon: Edit },
      { level: 'delete', description: 'Delete recon orders', icon: Trash2 },
      { level: 'admin', description: 'Manage recon settings', icon: Settings }
    ]
  },
  {
    name: 'car_wash',
    display_name: 'Car Wash',
    description: 'Quick service and car wash order management',
    permissions: [
      { level: 'read', description: 'View car wash orders', icon: Eye },
      { level: 'write', description: 'Create and edit car wash orders', icon: Edit },
      { level: 'delete', description: 'Delete car wash orders', icon: Trash2 },
      { level: 'admin', description: 'Manage car wash settings', icon: Settings }
    ]
  },
  {
    name: 'stock',
    display_name: 'Stock/Inventory',
    description: 'Vehicle inventory and stock management',
    permissions: [
      { level: 'read', description: 'View stock', icon: Eye },
      { level: 'write', description: 'Create and edit stock', icon: Edit },
      { level: 'delete', description: 'Delete stock items', icon: Trash2 },
      { level: 'admin', description: 'Manage stock settings', icon: Settings }
    ]
  },
  {
    name: 'get_ready',
    display_name: 'Get Ready',
    description: 'Vehicle preparation workflow management',
    permissions: [
      { level: 'read', description: 'View get ready tasks', icon: Eye },
      { level: 'write', description: 'Create and edit tasks', icon: Edit },
      { level: 'delete', description: 'Delete tasks', icon: Trash2 },
      { level: 'admin', description: 'Manage get ready settings', icon: Settings }
    ]
  },
  {
    name: 'chat',
    display_name: 'Team Chat',
    description: 'Team communication and messaging',
    permissions: [
      { level: 'read', description: 'View messages', icon: Eye },
      { level: 'write', description: 'Send messages', icon: Edit },
      { level: 'admin', description: 'Manage chat settings', icon: Settings }
    ]
  },
  {
    name: 'contacts',
    display_name: 'Contacts',
    description: 'Customer and dealer contact management',
    permissions: [
      { level: 'read', description: 'View contacts', icon: Eye },
      { level: 'write', description: 'Create and edit contacts', icon: Edit },
      { level: 'delete', description: 'Delete contacts', icon: Trash2 },
      { level: 'admin', description: 'Manage contact settings', icon: Settings }
    ]
  },
  {
    name: 'productivity',
    display_name: 'Productivity',
    description: 'Task management, calendar, and productivity tools',
    permissions: [
      { level: 'read', description: 'View tasks and calendar', icon: Eye },
      { level: 'write', description: 'Create and edit tasks', icon: Edit },
      { level: 'delete', description: 'Delete tasks', icon: Trash2 },
      { level: 'admin', description: 'Manage productivity settings', icon: Settings }
    ]
  },
  {
    name: 'reports',
    display_name: 'Reports & Analytics',
    description: 'Access to reports and analytical data',
    permissions: [
      { level: 'read', description: 'View reports', icon: Eye },
      { level: 'write', description: 'Create custom reports', icon: Edit },
      { level: 'admin', description: 'Manage report settings', icon: Settings }
    ]
  },
  {
    name: 'settings',
    display_name: 'Settings',
    description: 'System configuration and preferences',
    permissions: [
      { level: 'read', description: 'View settings', icon: Eye },
      { level: 'write', description: 'Modify settings', icon: Edit },
      { level: 'admin', description: 'Manage all settings', icon: Settings }
    ]
  },
  {
    name: 'users',
    display_name: 'User Management',
    description: 'Manage users, roles, and permissions',
    permissions: [
      { level: 'read', description: 'View users', icon: Eye },
      { level: 'write', description: 'Create and edit users', icon: Edit },
      { level: 'delete', description: 'Delete users', icon: Trash2 },
      { level: 'admin', description: 'Manage permissions', icon: Shield }
    ]
  },
  {
    name: 'dealerships',
    display_name: 'Dealerships',
    description: 'Multi-dealership management and configuration',
    permissions: [
      { level: 'read', description: 'View dealerships', icon: Eye },
      { level: 'write', description: 'Edit dealership info', icon: Edit },
      { level: 'admin', description: 'Manage dealerships', icon: Shield }
    ]
  },
  {
    name: 'management',
    display_name: 'Management',
    description: 'Advanced management tools and admin functions',
    permissions: [
      { level: 'read', description: 'View management data', icon: Eye },
      { level: 'write', description: 'Perform management actions', icon: Edit },
      { level: 'admin', description: 'Full management access', icon: Shield }
    ]
  }
];

interface AdvancedPermissionManagerProps {
  roleId?: string;
  userId?: string;
  dealerId?: number; // Dealer ID to filter active modules
  customRoleId?: string; // For editing dealer custom roles
  onPermissionsChange?: (permissions: Permission[]) => void;
}

export const AdvancedPermissionManager: React.FC<AdvancedPermissionManagerProps> = ({
  roleId,
  userId,
  dealerId,
  customRoleId,
  onPermissionsChange
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // Get active modules for dealer (if dealerId provided)
  const { activeModules, isModuleActive, loading: modulesLoading } = useDealerActiveModules(dealerId || null);
  
  // State management
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>(['dashboard']);

  // Fetch roles and permissions
  const fetchRolesAndPermissions = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select(`
          *,
          role_permissions (
            module,
            permission_level
          )
        `)
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      const processedRoles: Role[] = (rolesData || []).map(role => ({
        id: role.id,
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        user_type: role.user_type,
        is_system_role: role.is_system_role,
        permissions: role.role_permissions || []
      }));

      setRoles(processedRoles);

      // If roleId is provided, select that role
      if (roleId) {
        const role = processedRoles.find(r => r.id === roleId);
        if (role) {
          setSelectedRole(role);
          setPermissions(role.permissions);
        }
      }

    } catch (error: any) {
      console.error('Error fetching roles and permissions:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error loading permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [roleId, t, toast]);

  // Update permission level for a module
  const updatePermissionLevel = (module: string, level: Permission['permission_level']) => {
    const updatedPermissions = permissions.filter(p => p.module !== module);
    
    if (level !== 'none') {
      updatedPermissions.push({
        module,
        permission_level: level
      });
    }

    setPermissions(updatedPermissions);
    onPermissionsChange?.(updatedPermissions);
  };

  // Get current permission level for a module
  const getPermissionLevel = (module: string): Permission['permission_level'] => {
    const permission = permissions.find(p => p.module === module);
    return permission?.permission_level || 'none';
  };

  // Get permission hierarchy weight
  const getPermissionWeight = (level: Permission['permission_level']): number => {
    const weights = { none: 0, read: 1, write: 2, delete: 3, admin: 4 };
    return weights[level];
  };

  // Save permissions
  const savePermissions = async () => {
    if (!selectedRole) return;

    try {
      setSaving(true);

      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRole.id);

      if (deleteError) throw deleteError;

      // Insert new permissions
      if (permissions.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(
            permissions.map(p => ({
              role_id: selectedRole.id,
              module: p.module as any, // Type assertion for enum compatibility
              permission_level: p.permission_level
            }))
          );

        if (insertError) throw insertError;
      }

      toast({
        title: t('common.success'),
        description: 'Permissions updated successfully',
      });

      // Refresh data
      fetchRolesAndPermissions();

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Error saving permissions',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle module expansion
  const toggleModule = (moduleName: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleName)
        ? prev.filter(m => m !== moduleName)
        : [...prev, moduleName]
    );
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [roleId, userId, fetchRolesAndPermissions]);

  // Filter modules based on dealer's active modules
  const visibleModules = React.useMemo(() => {
    // If dealerId is provided, filter to only active modules
    if (dealerId && activeModules.length > 0) {
      return PERMISSION_MODULES.filter(module => 
        isModuleActive(module.name as any)
      );
    }
    // Otherwise show all modules (for system roles)
    return PERMISSION_MODULES;
  }, [dealerId, activeModules, isModuleActive]);

  if (loading || modulesLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
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
          <h3 className="text-lg font-semibold">Advanced Permission Manager</h3>
          <p className="text-sm text-muted-foreground">
            Configure detailed permissions for roles and users
          </p>
        </div>
        {selectedRole && (
          <Button 
            onClick={savePermissions} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles">Role Permissions</TabsTrigger>
          <TabsTrigger value="hierarchy">Permission Hierarchy</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Role Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Roles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {roles.map((role) => (
                  <Button
                    key={role.id}
                    variant={selectedRole?.id === role.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedRole(role);
                      setPermissions(role.permissions);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Shield className="h-4 w-4" />
                      <div className="text-left flex-1">
                        <p className="font-medium">{role.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {role.permissions.length} permissions
                        </p>
                      </div>
                      {role.is_system_role && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Permission Configuration */}
            <div className="lg:col-span-2">
              {selectedRole ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        {selectedRole.display_name} Permissions
                      </CardTitle>
                      <div className="flex items-center gap-4">
                        {selectedRole.is_system_role && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            System Role
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {permissions.length} modules
                        </Badge>
                      </div>
                    </div>
                    {selectedRole.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedRole.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleModules.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {dealerId 
                            ? 'No active modules found for this dealer. Please activate modules in the Modules tab first.'
                            : 'No modules available.'}
                        </p>
                      </div>
                    ) : (
                      visibleModules.map((module) => {
                      const isExpanded = expandedModules.includes(module.name);
                      const currentLevel = getPermissionLevel(module.name);
                      
                      return (
                        <Collapsible
                          key={module.name}
                          open={isExpanded}
                          onOpenChange={() => toggleModule(module.name)}
                        >
                          <Card className="border-2 border-dashed">
                            <CollapsibleTrigger asChild>
                              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                    <div>
                                      <h4 className="font-medium">{module.display_name}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        {module.description}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {currentLevel !== 'none' && (
                                      <Badge variant="outline">
                                        {currentLevel}
                                      </Badge>
                                    )}
                                    {currentLevel !== 'none' ? (
                                      <Unlock className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Lock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CardHeader>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <CardContent>
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <Label>Permission Level</Label>
                                    <Badge variant={currentLevel === 'none' ? 'secondary' : 'default'}>
                                      {currentLevel === 'none' ? 'No Access' : currentLevel}
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid gap-2">
                                    {['none', ...module.permissions.map(p => p.level)].map((level) => {
                                      const permissionInfo = module.permissions.find(p => p.level === level);
                                      const isActive = currentLevel === level;
                                      const IconComponent = permissionInfo?.icon || Lock;
                                      
                                      return (
                                        <div
                                          key={level}
                                          className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                            isActive 
                                              ? 'border-primary bg-primary/5' 
                                              : 'border-muted hover:border-muted-foreground/50'
                                          }`}
                                          onClick={() => updatePermissionLevel(module.name, level as Permission['permission_level'])}
                                        >
                                          <div className="flex items-center gap-3">
                                            <IconComponent className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <div>
                                              <p className={`font-medium ${isActive ? 'text-primary' : ''}`}>
                                                {level === 'none' ? 'No Access' : level.charAt(0).toUpperCase() + level.slice(1)}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {level === 'none' 
                                                  ? 'No access to this module' 
                                                  : permissionInfo?.description || `${level} access`
                                                }
                                              </p>
                                            </div>
                                          </div>
                                          {isActive && (
                                            <CheckCircle className="h-4 w-4 text-primary" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </CardContent>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      );
                    }))}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Select a role to configure permissions</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Hierarchy</CardTitle>
              <p className="text-sm text-muted-foreground">
                Understanding permission levels and their relationships
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['admin', 'delete', 'write', 'read', 'none'].map((level, index) => (
                  <div key={level} className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {5 - index}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium capitalize">{level}</h4>
                      <p className="text-sm text-muted-foreground">
                        {level === 'admin' && 'Full administrative access - can manage all settings and permissions'}
                        {level === 'delete' && 'Can delete records in addition to write permissions'}
                        {level === 'write' && 'Can create and modify records in addition to read permissions'}
                        {level === 'read' && 'Can view and access data but cannot modify'}
                        {level === 'none' && 'No access to the module'}
                      </p>
                      {level !== 'none' && (
                        <Badge variant="outline" className="mt-1">
                          Includes all lower permissions
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Permission Audit Log
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track changes to roles and permissions
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Audit logging feature coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This will track all permission changes for compliance and security
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};