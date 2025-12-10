import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Edit, Plus, Shield, Trash2, Users } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateRoleModal } from './CreateRoleModal';
import { EditRoleModal } from './EditRoleModal';
import { RoleNotificationsModal } from './RoleNotificationsModal';

interface DealerRolesProps {
  dealerId: string;
}

interface CustomRole {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  permissions: GranularRolePermission[];
  users_count?: number;
}

interface GranularRolePermission {
  module: string;
  permission_key: string;
  display_name: string;
}

// Module configuration with unique colors and friendly names
const MODULE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  dashboard: { label: 'Dashboard', color: 'text-slate-700', bgColor: 'bg-slate-100 hover:bg-slate-200' },
  sales_orders: { label: 'Sales', color: 'text-emerald-700', bgColor: 'bg-emerald-100 hover:bg-emerald-200' },
  service_orders: { label: 'Service', color: 'text-blue-700', bgColor: 'bg-blue-100 hover:bg-blue-200' },
  recon_orders: { label: 'Recon', color: 'text-purple-700', bgColor: 'bg-purple-100 hover:bg-purple-200' },
  car_wash: { label: 'Car Wash', color: 'text-cyan-700', bgColor: 'bg-cyan-100 hover:bg-cyan-200' },
  contacts: { label: 'Contacts', color: 'text-pink-700', bgColor: 'bg-pink-100 hover:bg-pink-200' },
  users: { label: 'Users', color: 'text-red-700', bgColor: 'bg-red-100 hover:bg-red-200' },
  productivity: { label: 'Productivity', color: 'text-green-700', bgColor: 'bg-green-100 hover:bg-green-200' },
  get_ready: { label: 'Get Ready', color: 'text-amber-700', bgColor: 'bg-amber-100 hover:bg-amber-200' },
  stock: { label: 'Stock', color: 'text-indigo-700', bgColor: 'bg-indigo-100 hover:bg-indigo-200' },
  chat: { label: 'Chat', color: 'text-teal-700', bgColor: 'bg-teal-100 hover:bg-teal-200' },
  reports: { label: 'Reports', color: 'text-gray-700', bgColor: 'bg-gray-100 hover:bg-gray-200' },
  management: { label: 'Management', color: 'text-orange-700', bgColor: 'bg-orange-100 hover:bg-orange-200' },
};

const getModuleConfig = (module: string) => {
  return MODULE_CONFIG[module] || {
    label: module,
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 hover:bg-gray-200'
  };
};

export const DealerRoles: React.FC<DealerRolesProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<CustomRole | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch custom roles for this dealership
      const { data: rolesData, error: rolesError } = await supabase
        .from('dealer_custom_roles')
        .select('*')
        .eq('dealer_id', parseInt(dealerId))
        .eq('is_active', true)
        .order('display_name');

      if (rolesError) throw rolesError;

      // Fetch permissions and user counts for each role
      const rolesWithPermissions = await Promise.all(
        (rolesData || []).map(async (role) => {
          // Get module permissions (NEW GRANULAR SYSTEM)
          const { data: permissionsData } = await supabase
            .from('role_module_permissions_new')
            .select(`
              module_permissions (
                module,
                permission_key,
                display_name
              )
            `)
            .eq('role_id', role.id);

          // Get count of users with this role
          const { count: usersCount } = await supabase
            .from('user_custom_role_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('custom_role_id', role.id)
            .eq('is_active', true);

          // Transform granular permissions to display format
          const transformedPerms = (permissionsData || []).map((item: any) => ({
            module: item.module_permissions?.module || '',
            permission_key: item.module_permissions?.permission_key || '',
            display_name: item.module_permissions?.display_name || ''
          }));

          return {
            ...role,
            permissions: transformedPerms,
            users_count: usersCount || 0
          };
        })
      );

      setRoles(rolesWithPermissions);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load roles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, toast, t]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDeleteRole = (role: CustomRole) => {
    // Check if role has users assigned
    if (role.users_count && role.users_count > 0) {
      toast({
        variant: 'destructive',
        title: t('roles.cannot_delete_role'),
        description: t('roles.role_has_users', { count: role.users_count, name: role.display_name })
      });
      return;
    }

    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
      // Soft delete: set is_active = false
      const { error } = await supabase
        .from('dealer_custom_roles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', roleToDelete.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('roles.role_deleted', { name: roleToDelete.display_name })
      });

      setRoleToDelete(null);
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('roles.error_deleting_role')
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            {t('common.loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('roles.custom_roles_title')}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('roles.custom_roles_description')}
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateModal(true)} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              {t('roles.create_role')}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg mb-1">
                      {role.display_name}
                    </CardTitle>
                    {role.description && (
                      <CardDescription className="text-sm">
                        {role.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!role.id) {
                        console.error('[DealerRoles] Cannot open notifications modal: role.id is missing', role);
                        toast({
                          variant: 'destructive',
                          description: 'Cannot open notification settings: Invalid role selected',
                        });
                        return;
                      }
                      console.log('[DealerRoles] Opening notifications for role:', role.display_name, role.id);
                      setSelectedRole(role);
                      setShowNotificationsModal(true);
                    }}
                    title="Configure Notification Settings"
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedRole(role);
                      setShowEditModal(true);
                    }}
                    title={t('common.edit')}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRole(role)}
                    disabled={role.users_count && role.users_count > 0}
                    className={role.users_count && role.users_count > 0 ? 'opacity-50 cursor-not-allowed' : 'text-destructive hover:text-destructive hover:bg-destructive/10'}
                    title={role.users_count && role.users_count > 0
                      ? t('roles.cannot_delete_has_users', { count: role.users_count })
                      : t('roles.delete_role')
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* User Count */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-md">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-700">{role.users_count || 0}</span>
                    <span className="text-xs text-blue-600/70">{t('roles.users').toLowerCase()}</span>
                  </div>
                </div>

                {/* Module Permissions */}
                <div>
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {t('permissions.module_permissions')}: {role.permissions.length}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.length === 0 ? (
                      <span className="text-sm text-muted-foreground italic">{t('roles.no_permissions_assigned')}</span>
                    ) : (
                      // Group by module and show count with unique colors
                      Object.entries(
                        role.permissions.reduce((acc, perm) => {
                          acc[perm.module] = (acc[perm.module] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([module, count]) => {
                        const config = getModuleConfig(module);
                        return (
                          <span
                            key={module}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-colors ${config.bgColor} ${config.color}`}
                          >
                            {config.label}: {count}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">{t('roles.no_custom_roles')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('roles.create_role_description')}
                </p>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('roles.create_first_role')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Role Modal */}
      <CreateRoleModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        dealerId={dealerId}
        onRoleCreated={fetchRoles}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        dealerId={dealerId}
        onRoleUpdated={fetchRoles}
      />

      {/* Notifications Modal */}
      <RoleNotificationsModal
        open={showNotificationsModal}
        onClose={() => {
          setShowNotificationsModal(false);
          setSelectedRole(null);
        }}
        role={selectedRole}
        dealerId={dealerId}
      />

      {/* Delete Confirmation Dialog - Team Chat Style */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('roles.confirm_delete_role_title', 'Delete Role?')}
        description={t('roles.confirm_delete', roleToDelete ? `Are you sure you want to delete "${roleToDelete.display_name}"? This action cannot be undone.` : '')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeleteRole}
        variant="destructive"
      />
    </div>
  );
};
