import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Edit, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateRoleModal } from './CreateRoleModal';
import { EditRoleModal } from './EditRoleModal';
import { confirmDelete, showError, showSuccess } from '@/utils/sweetalert';

interface DealerRolesProps {
  dealerId: string;
}

interface CustomRole {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
  is_active: boolean;
  permissions: RolePermission[];
  users_count?: number;
}

interface RolePermission {
  module: string;
  permission_level: string;
}

export const DealerRoles: React.FC<DealerRolesProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);

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
          // Get module permissions
          const { data: permissionsData } = await supabase
            .from('dealer_role_permissions')
            .select('module, permission_level')
            .eq('role_id', role.id);

          // Get count of users with this role
          const { count: usersCount } = await supabase
            .from('user_custom_role_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('custom_role_id', role.id)
            .eq('is_active', true);

          return {
            ...role,
            granularPermissions: role.permissions || {}, // Keep JSONB permissions
            permissions: permissionsData || [], // Module permissions array
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

  const handleDeleteRole = async (role: CustomRole) => {
    // Check if role has users assigned
    if (role.users_count && role.users_count > 0) {
      await showError(
        t('roles.cannot_delete_role'),
        t('roles.role_has_users', { count: role.users_count, name: role.display_name }),
        t('common.action_buttons.close')
      );
      return;
    }

    // Confirm deletion with SweetAlert
    const result = await confirmDelete(
      t('roles.confirm_delete_role', { name: role.display_name }),
      t('roles.delete_warning'),
      t('common.action_buttons.delete'),
      t('common.action_buttons.cancel')
    );

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Soft delete: set is_active = false
      const { error } = await supabase
        .from('dealer_custom_roles')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', role.id);

      if (error) throw error;

      await showSuccess(
        t('common.success'),
        t('roles.role_deleted', { name: role.display_name })
      );

      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      await showError(
        t('common.error'),
        t('roles.error_deleting_role')
      );
    }
  };

  const getPermissionBadgeColor = (level: string) => {
    switch (level) {
      case 'admin': return 'bg-red-500 text-white';
      case 'delete': return 'bg-orange-500 text-white';
      case 'edit': return 'bg-blue-500 text-white';
      case 'view': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
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
          <h2 className="text-2xl font-bold">Custom Roles</h2>
          <p className="text-sm text-muted-foreground">
            Manage custom roles with granular permissions for this dealership
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
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
                  <span>{role.users_count || 0} {role.users_count === 1 ? 'user' : 'users'}</span>
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Permissions:</div>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No permissions assigned</span>
                    ) : (
                      role.permissions.map((perm, idx) => (
                        <Badge key={idx} className={getPermissionBadgeColor(perm.permission_level)}>
                          {perm.module}: {perm.permission_level}
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
                <h3 className="text-lg font-semibold">No custom roles yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first custom role to manage user permissions
                </p>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Role
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
        onRoleUpdated={fetchRoles}
      />
    </div>
  );
};