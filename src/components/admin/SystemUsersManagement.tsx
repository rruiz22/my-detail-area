/**
 * System Users Management Component
 *
 * Manages system-level users (system_admin and supermanager roles).
 * These users have elevated privileges and are not tied to specific dealerships.
 *
 * Features:
 * - List all system admins and supermanagers
 * - Create new system users
 * - Edit system user roles and permissions
 * - Deactivate system users
 *
 * Permissions Required:
 * - Only accessible by system_admin role
 * - Supermanagers can view but cannot create/edit system admins
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, UserCog, Plus, Edit, Trash2, AlertTriangle, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { useState } from 'react';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { CreateSystemUserModal } from './CreateSystemUserModal';
import { EditAllowedModulesModal } from './EditAllowedModulesModal';

export function SystemUsersManagement() {
  const { t } = useTranslation();
  const { enhancedUser } = usePermissions();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editModulesUser, setEditModulesUser] = useState<any>(null);

  // Fetch system users (system_admin and supermanager)
  const { data: systemUsers, isLoading, error } = useQuery({
    queryKey: ['system-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          created_at,
          dealership_id,
          dealer_memberships (
            dealer_id,
            custom_role_id,
            is_active,
            dealer_custom_roles (
              role_name,
              display_name,
              dealer_id
            )
          )
        `)
        .in('role', ['system_admin', 'supermanager'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 🆕 Load allowed_modules for each supermanager
      const usersWithModules = await Promise.all(
        data.map(async (user) => {
          if (user.role === 'supermanager') {
            const { data: modules } = await supabase
              .rpc('get_user_allowed_modules', { target_user_id: user.id });

            return {
              ...user,
              allowed_modules: modules || []
            };
          }
          return user;
        })
      );

      return usersWithModules;
    },
    staleTime: CACHE_TIMES.MEDIUM,  // 5 minutes
    gcTime: GC_TIMES.MEDIUM          // 10 minutes
  });

  // Security check: Only system_admin can access this component
  if (!enhancedUser?.is_system_admin) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('common.access_denied')}
          </CardTitle>
          <CardDescription>
            {t('admin.system_users_restricted')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('admin.system_users_system_admin_only')}
          </p>
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
                <Shield className="h-5 w-5 text-primary" />
                {t('admin.system_users')}
              </CardTitle>
              <CardDescription>
                {t('admin.system_users_description')}
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('admin.add_system_user')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted rounded"></div>
                      <div className="h-3 w-48 bg-muted rounded"></div>
                    </div>
                  </div>
                  <div className="h-6 w-24 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('common.error_loading_data')}
              </p>
            </div>
          ) : systemUsers && systemUsers.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('admin.no_system_users')}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {t('admin.create_first_system_user')}
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.add_system_user')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {systemUsers?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.dealership_id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('admin.primary_dealership')}: {user.dealership_id}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* System Role Badge */}
                    <Badge
                      variant={user.role === 'system_admin' ? 'destructive' : 'default'}
                      className="font-medium"
                    >
                      {user.role === 'system_admin'
                        ? t('roles.system_admin')
                        : t('roles.supermanager')}
                    </Badge>

                    {/* 🆕 Allowed Modules Display for Supermanagers */}
                    {user.role === 'supermanager' && (
                      <Badge
                        variant={(user as any).allowed_modules?.length > 0 ? "outline" : "destructive"}
                        className="gap-1.5"
                      >
                        <Layers className="h-3 w-3" />
                        {(user as any).allowed_modules?.length || 0} modules
                      </Badge>
                    )}

                    {/* Custom Roles (if any) */}
                    {user.dealer_memberships?.map((membership: any) =>
                      membership.dealer_custom_roles && membership.is_active ? (
                        <Badge key={membership.custom_role_id} variant="outline">
                          {membership.dealer_custom_roles.display_name}
                          {membership.dealer_custom_roles.dealer_id && (
                            <span className="ml-1 text-xs opacity-70">
                              (Dealer {membership.dealer_id})
                            </span>
                          )}
                        </Badge>
                      ) : null
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Edit Modules - Only for supermanagers */}
                      {user.role === 'supermanager' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditModulesUser(user)}
                          className="gap-2"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          Edit Modules
                        </Button>
                      )}

                      {/* Only allow deleting if not current user and not last system_admin */}
                      {user.id !== enhancedUser?.id && user.role !== 'system_admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // TODO: Implement delete confirmation
                            console.log('Delete system user:', user.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card - Role Differences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {t('admin.system_roles_info')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* System Admin Info */}
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{t('roles.system_admin')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('admin.system_admin_description')}
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>{t('admin.can_manage_platform_settings')}</li>
                  <li>{t('admin.can_create_system_admins')}</li>
                  <li>{t('admin.full_access_all_dealerships')}</li>
                  <li>{t('admin.can_view_global_audit_logs')}</li>
                </ul>
              </div>
            </div>

            {/* Supermanager Info */}
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{t('roles.supermanager')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('admin.supermanager_description')}
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>{t('admin.can_manage_dealerships')}</li>
                  <li>{t('admin.can_manage_users')}</li>
                  <li>{t('admin.can_view_audit_logs')}</li>
                  <li className="text-destructive font-medium">
                    {t('admin.cannot_manage_platform_settings')}
                  </li>
                  <li className="text-destructive font-medium">
                    {t('admin.cannot_create_system_admins')}
                  </li>
                </ul>
              </div>
            </div>

            {/* User Info */}
            <div className="flex gap-3">
              <UserCog className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">{t('roles.user')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('admin.user_description')}
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>{t('admin.permissions_via_custom_role')}</li>
                  <li>{t('admin.tied_to_specific_dealership')}</li>
                  <li>{t('admin.created_via_invitation')}</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create System User Modal */}
      <CreateSystemUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Refetch system users after creation
          queryClient.invalidateQueries({ queryKey: ['system-users'] });
        }}
      />

      {/* 🆕 Edit Allowed Modules Modal */}
      <EditAllowedModulesModal
        open={!!editModulesUser}
        onClose={() => setEditModulesUser(null)}
        user={editModulesUser}
        onSuccess={() => {
          // Refetch system users after editing modules
          queryClient.invalidateQueries({ queryKey: ['system-users'] });
          // Also clear permissions cache to force reload
          queryClient.invalidateQueries({ queryKey: ['user_profile_permissions'] });
        }}
      />
    </div>
  );
}
