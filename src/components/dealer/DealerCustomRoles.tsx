import { AdvancedPermissionManager } from '@/components/permissions/AdvancedPermissionManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    AlertCircle,
    Edit,
    Loader2,
    Plus,
    Shield,
    Trash2,
    Users
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CustomRole {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
  dealer_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

interface DealerCustomRolesProps {
  dealerId: string;
}

export const DealerCustomRoles: React.FC<DealerCustomRolesProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<CustomRole | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    role_name: '',
    display_name: '',
    description: ''
  });

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('dealer_custom_roles')
        .select('*')
        .eq('dealer_id', parseInt(dealerId))
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Fetch user counts for each role
      const rolesWithCounts = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { count } = await supabase
            .from('user_custom_role_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('custom_role_id', role.id)
            .eq('is_active', true);

          return {
            ...role,
            user_count: count || 0
          };
        })
      );

      setRoles(rolesWithCounts);
    } catch (error) {
      console.error('Error fetching custom roles:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load custom roles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, t, toast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormData({
      role_name: '',
      display_name: '',
      description: ''
    });
    setShowModal(true);
  };

  const handleEditRole = (role: CustomRole) => {
    setEditingRole(role);
    setFormData({
      role_name: role.role_name,
      display_name: role.display_name,
      description: role.description || ''
    });
    setShowModal(true);
  };

  const handleSaveRole = async () => {
    if (!formData.role_name || !formData.display_name) {
      toast({
        title: t('common.error'),
        description: 'Role name and display name are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingRole) {
        // Update existing role
        const { error } = await supabase
          .from('dealer_custom_roles')
          .update({
            role_name: formData.role_name,
            display_name: formData.display_name,
            description: formData.description || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRole.id);

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: 'Role updated successfully'
        });
      } else {
        // Create new role
        const { error } = await supabase
          .from('dealer_custom_roles')
          .insert({
            dealer_id: parseInt(dealerId),
            role_name: formData.role_name,
            display_name: formData.display_name,
            description: formData.description || null,
            is_active: true
          });

        if (error) throw error;

        toast({
          title: t('common.success'),
          description: 'Role created successfully'
        });
      }

      setShowModal(false);
      fetchRoles();
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to save role',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(roleId);

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('dealer_custom_roles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Role deleted successfully'
      });

      fetchRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to delete role',
        variant: 'destructive'
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleConfigurePermissions = (role: CustomRole) => {
    setSelectedRoleForPermissions(role);
    setShowPermissionsModal(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Custom Roles
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage custom roles with granular permissions for your dealership
              </p>
            </div>
            <Button onClick={handleCreateRole}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No custom roles created yet
              </p>
              <Button onClick={handleCreateRole} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Role
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Users</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{role.display_name}</p>
                        <p className="text-xs text-muted-foreground">{role.role_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {role.description || 'No description'}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit mx-auto">
                        <Users className="h-3 w-3" />
                        {role.user_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={role.is_active ? 'default' : 'secondary'}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleConfigurePermissions(role)}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Permissions
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRole(role.id)}
                          disabled={deleting === role.id}
                        >
                          {deleting === role.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Role Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? 'Update role information. Configure permissions after saving.'
                : 'Create a new custom role for your dealership. You can configure permissions after creating the role.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role_name">
                Role Name (Technical) *
              </Label>
              <Input
                id="role_name"
                value={formData.role_name}
                onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                placeholder="e.g., sales_manager, service_advisor"
              />
              <p className="text-xs text-muted-foreground">
                Internal identifier (lowercase, underscores only)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">
                Display Name *
              </Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g., Sales Manager, Service Advisor"
              />
              <p className="text-xs text-muted-foreground">
                User-friendly name shown in the interface
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the role's responsibilities and access level..."
                rows={3}
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Next Steps</p>
                <p className="text-muted-foreground">
                  After creating this role, use the "Permissions" button to configure which modules and actions this role can access.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveRole}>
              {editingRole ? t('common.save') : t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Configuration Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configure Permissions: {selectedRoleForPermissions?.display_name}
            </DialogTitle>
            <DialogDescription>
              Select permissions for each active module. Only modules enabled for this dealership are shown.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedRoleForPermissions && (
              <AdvancedPermissionManager
                customRoleId={selectedRoleForPermissions.id}
                dealerId={parseInt(dealerId)}
              />
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => {
              setShowPermissionsModal(false);
              setSelectedRoleForPermissions(null);
            }}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
