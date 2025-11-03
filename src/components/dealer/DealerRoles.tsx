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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('roles.custom_roles_title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('roles.custom_roles_description')}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('roles.create_role')}
        </Button>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {role.display_name}
                  </CardTitle>
                  <CardDescription>{role.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRole(role);
                      setShowNotificationsModal(true);
                    }}
                    title="Configure SMS/Email Notifications"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedRole(role);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteRole(role)}
                    disabled={role.users_count && role.users_count > 0}
                    className={role.users_count && role.users_count > 0 ? 'opacity-50 cursor-not-allowed' : ''}
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
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{role.users_count || 0} {t('roles.users').toLowerCase()}</span>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">
                    {t('permissions.module_permissions')}: {role.permissions.length}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.length === 0 ? (
                      <span className="text-sm text-muted-foreground">{t('roles.no_permissions_assigned')}</span>
                    ) : (
                      // Group by module and show count
                      Object.entries(
                        role.permissions.reduce((acc, perm) => {
                          acc[perm.module] = (acc[perm.module] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([module, count]) => (
                        <Badge key={module} variant="secondary" className="text-xs">
                          {module}: {count}
                        </Badge>
                      ))
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
