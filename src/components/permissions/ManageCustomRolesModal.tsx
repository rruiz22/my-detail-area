import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { clearPermissionsCache, forceInvalidateAllPermissionCache } from '@/utils/permissionSerialization';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Shield, User, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ManageCustomRolesModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    dealership_id?: number;
  } | null;
  onRolesUpdated: () => void;
}

interface CustomRole {
  id: string;
  role_name: string;
  display_name: string;
  description: string | null;
}

interface UserRoleAssignment {
  id: string;
  custom_role_id: string;
  dealer_custom_roles: {
    id: string;
    role_name: string;
    display_name: string;
  } | null;
}

export const ManageCustomRolesModal: React.FC<ManageCustomRolesModalProps> = ({
  open,
  onClose,
  user,
  onRolesUpdated,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { refreshPermissions } = usePermissions();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<CustomRole[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleAssignment[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loadingRoles, setLoadingRoles] = useState(false);

  const fetchUserRolesAndAvailable = useCallback(async () => {
    if (!user?.dealership_id) {
      console.warn('No dealership_id for user, skipping role fetch');
      return;
    }

    try {
      setLoadingRoles(true);

      // Fetch all available roles for this dealership
      const { data: rolesData, error: rolesError } = await supabase
        .from('dealer_custom_roles')
        .select('id, role_name, display_name, description')
        .eq('dealer_id', user.dealership_id)
        .eq('is_active', true)
        .order('display_name');

      if (rolesError) throw rolesError;
      setAvailableRoles(rolesData || []);

      // Fetch user's current custom roles
      const { data: userRolesData, error: userRolesError } = await supabase
        .from('user_custom_role_assignments')
        .select(`
          id,
          custom_role_id,
          dealer_custom_roles (
            id,
            role_name,
            display_name
          )
        `)
        .eq('user_id', user.id)
        .eq('dealer_id', user.dealership_id)
        .eq('is_active', true);

      if (userRolesError) throw userRolesError;
      setUserRoles(userRolesData || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to load roles',
        variant: 'destructive'
      });
    } finally {
      setLoadingRoles(false);
    }
  }, [user, toast, t]);

  useEffect(() => {
    if (open && user) {
      fetchUserRolesAndAvailable();
      setSelectedRoleId('');
    }
  }, [open, user, fetchUserRolesAndAvailable]);

  const getUserFullName = () => {
    if (!user) return '';
    const { first_name, last_name, email } = user;
    return `${first_name || ''} ${last_name || ''}`.trim() || email;
  };

  const getAvailableRolesForAssignment = () => {
    const assignedRoleIds = userRoles
      .map(ur => ur.dealer_custom_roles?.id)
      .filter(Boolean);
    return availableRoles.filter(role => !assignedRoleIds.includes(role.id));
  };

  const handleAddRole = async () => {
    if (!user || !selectedRoleId || !user.dealership_id) {
      toast({
        title: t('common.error'),
        description: t('user_management.no_role_selected'),
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Add to user_custom_role_assignments
      const { error: assignmentError } = await supabase
        .from('user_custom_role_assignments')
        .upsert({
          user_id: user.id,
          dealer_id: user.dealership_id,
          custom_role_id: selectedRoleId,
          is_active: true,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,dealer_id,custom_role_id'
        });

      if (assignmentError) throw assignmentError;

      // Also update dealer_memberships for backward compatibility (if membership exists)
      const { data: membership, error: membershipQueryError } = await supabase
        .from('dealer_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('dealer_id', user.dealership_id)
        .single();

      if (membershipQueryError && membershipQueryError.code !== 'PGRST116') {
        console.warn('Error querying dealer_memberships:', membershipQueryError);
      }

      if (membership) {
        const { error: membershipUpdateError } = await supabase
          .from('dealer_memberships')
          .update({
            custom_role_id: selectedRoleId,
            updated_at: new Date().toISOString()
          })
          .eq('id', membership.id);

        if (membershipUpdateError) {
          console.error('Error updating dealer_memberships:', membershipUpdateError);
          // Don't throw - this is backward compatibility, not critical
        }
      }

      // Wait 200ms for DB to confirm transaction
      await new Promise(resolve => setTimeout(resolve, 200));

      toast({
        title: t('common.success'),
        description: t('user_management.role_assigned'),
        duration: 8000, // Mostrar más tiempo
      });

      // Notificar que el usuario debe recargar
      toast({
        title: '⚠️ ' + t('user_management.user_must_reload_title', { defaultValue: 'User Must Reload' }),
        description: t('user_management.user_must_reload_desc', {
          defaultValue: '{{name}} must reload their browser (Ctrl+Shift+R) to see the new permissions.',
          name: user.first_name || user.email
        }),
        variant: 'default',
        duration: 10000, // 10 segundos
      });

      setSelectedRoleId('');
      await fetchUserRolesAndAvailable();

      // AGGRESSIVE: Reset queries instead of just invalidating
      // 🔒 CRITICAL FIX v1.3.17: Force refetch for the modified user
      // This ensures the user sees updated permissions immediately across all sessions

      // Step 1: Reset queries (clears cache AND triggers refetch)
      await queryClient.resetQueries({
        queryKey: ['user-permissions', user.id]
      });
      await queryClient.resetQueries({
        queryKey: ['user_profile_permissions', user.id]
      });

      // Step 2: Clear serialized localStorage cache for this user
      clearPermissionsCache(user.id);

      // Step 3: Invalidate dealer users list
      await queryClient.invalidateQueries({
        queryKey: ['dealer_users_with_roles']
      });

      // Step 4: Force clear ALL permission-related cache globally
      forceInvalidateAllPermissionCache();

      // Step 5: Clear user profile cache
      localStorage.removeItem('user_profile_cache');

      // Step 6: Refresh current user's permissions (admin who made the change)
      refreshPermissions();

      // Step 7: Notify parent component
      onRolesUpdated();
    } catch (error) {
      console.error('Error adding role:', error);
      toast({
        title: t('common.error'),
        description: t('user_management.error_assigning_role'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (assignmentId: string, roleId: string) => {
    if (!user) return;

    setLoading(true);

    try {
      // Deactivate the assignment
      const { error: deactivateError } = await supabase
        .from('user_custom_role_assignments')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (deactivateError) throw deactivateError;

      toast({
        title: t('common.success'),
        description: t('user_management.role_removed'),
        duration: 8000,
      });

      // Notificar que el usuario debe recargar
      toast({
        title: '⚠️ ' + t('user_management.user_must_reload_title', { defaultValue: 'User Must Reload' }),
        description: t('user_management.user_must_reload_desc', {
          defaultValue: '{{name}} must reload their browser (Ctrl+Shift+R) to see the updated permissions.',
          name: user.first_name || user.email
        }),
        variant: 'default',
        duration: 10000,
      });

      await fetchUserRolesAndAvailable();

      // AGGRESSIVE: Reset queries instead of just invalidating
      // 🔒 CRITICAL FIX v1.3.17: Force refetch for the modified user
      // This ensures the user sees updated permissions immediately across all sessions

      // Step 1: Reset queries (clears cache AND triggers refetch)
      await queryClient.resetQueries({
        queryKey: ['user-permissions', user.id]
      });
      await queryClient.resetQueries({
        queryKey: ['user_profile_permissions', user.id]
      });

      // Step 2: Clear serialized localStorage cache for this user
      clearPermissionsCache(user.id);

      // Step 3: Invalidate dealer users list
      await queryClient.invalidateQueries({
        queryKey: ['dealer_users_with_roles']
      });

      // Step 4: Force clear ALL permission-related cache globally
      forceInvalidateAllPermissionCache();

      // Step 5: Clear user profile cache
      localStorage.removeItem('user_profile_cache');

      // Step 6: Refresh current user's permissions (admin who made the change)
      refreshPermissions();

      // Step 7: Notify parent component
      onRolesUpdated();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({
        title: t('common.error'),
        description: t('user_management.error_removing_role'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('user_management.manage_custom_roles')}
          </DialogTitle>
          <DialogDescription>
            {t('user_management.manage_custom_roles_desc', {
              defaultValue: 'Manage custom role assignments for this user. Users can have multiple roles.'
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('common.user')}:</span>
                  <span className="font-medium">{getUserFullName()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('common.email')}:</span>
                  <span className="text-sm">{user.email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Roles */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('user_management.current_custom_roles')}
            </Label>

            {loadingRoles ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : userRoles.length === 0 ? (
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {t('user_management.no_custom_roles')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {userRoles.map((userRole) => (
                  <Card key={userRole.id} className="relative">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Shield className="h-4 w-4 text-emerald-600" />
                          <div>
                            <Badge variant="secondary" className="font-medium">
                              {userRole.dealer_custom_roles?.display_name}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRole(userRole.id, userRole.custom_role_id)}
                          disabled={loading}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Assign New Role */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t('user_management.assign_custom_role')}
            </Label>

            <div className="flex gap-2">
              <Select
                value={selectedRoleId}
                onValueChange={setSelectedRoleId}
                disabled={loadingRoles || loading}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('user_management.select_role')} />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRolesForAssignment().length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      {t('user_management.all_roles_assigned')}
                    </div>
                  ) : (
                    getAvailableRolesForAssignment().map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div>
                          <div className="font-medium">{role.display_name}</div>
                          {role.description && (
                            <div className="text-xs text-muted-foreground">{role.description}</div>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button
                onClick={handleAddRole}
                disabled={!selectedRoleId || loading || loadingRoles}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('common.action_buttons.add')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
