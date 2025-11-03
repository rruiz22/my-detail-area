import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { ManageCustomRolesModal } from '@/components/permissions/ManageCustomRolesModal';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { safeFormatDateOnly } from '@/utils/dateUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Edit,
    MoreHorizontal,
    Plus,
    UserCheck,
    Users,
    UserX
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DealerUsersProps {
  dealerId: string;
}

interface DealerMembership {
  id: string;
  user_id: string;
  is_active: boolean;
  joined_at: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  // Custom roles from user_custom_role_assignments (new system)
  custom_roles: Array<{
    id: string;
    role_name: string;
    display_name: string;
  }>;
}

/**
 * DealerUsers Component
 *
 * Manages users within a dealership using the modern Custom Roles system.
 * Features:
 * - View all users in dealership
 * - Invite new users
 * - Edit user roles
 * - Activate/deactivate users
 * - Uses TanStack Query for efficient caching
 */
export const DealerUsers: React.FC<DealerUsersProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DealerMembership | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [userToToggle, setUserToToggle] = useState<DealerMembership | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // TanStack Query for users with cache and automatic refetch
  const {
    data: users = [],
    isLoading: loading,
    error: usersError
  } = useQuery({
    queryKey: ['dealer_users_with_roles', dealerId],
    queryFn: async () => {
      console.log('🔍 [DealerUsers] Fetching users for dealerId:', dealerId);

      // 1. Fetch basic membership info from dealer_memberships
      const { data: memberships, error: memberError } = await supabase
        .from('dealer_memberships')
        .select(`
          id,
          user_id,
          is_active,
          joined_at,
          profiles!inner(first_name, last_name, email)
        `)
        .eq('dealer_id', parseInt(dealerId))
        .order('joined_at', { ascending: false });

      if (memberError) {
        console.error('❌ [DealerUsers] Query failed:', memberError);
        throw memberError;
      }

      if (!memberships || memberships.length === 0) {
        console.log('✅ [DealerUsers] No users found');
        return [];
      }

      console.log('✅ [DealerUsers] Fetched', memberships.length, 'memberships');

      // 2. For each user, fetch their custom roles from user_custom_role_assignments
      const usersWithRoles = await Promise.all(
        memberships.map(async (member) => {
          const { data: roleAssignments, error: roleError } = await supabase
            .from('user_custom_role_assignments')
            .select(`
              custom_role_id,
              dealer_custom_roles!inner(
                id,
                role_name,
                display_name
              )
            `)
            .eq('user_id', member.user_id)
            .eq('dealer_id', parseInt(dealerId))
            .eq('is_active', true);

          if (roleError) {
            console.warn('⚠️ [DealerUsers] Error fetching roles for user:', member.user_id, roleError);
          }

          // Extract custom roles
          const customRoles = (roleAssignments || [])
            .map(ra => ra.dealer_custom_roles)
            .filter(Boolean) as Array<{ id: string; role_name: string; display_name: string }>;

          console.log(`   📋 User ${member.profiles?.email}: ${customRoles.length} role(s)`);

          return {
            ...member,
            custom_roles: customRoles
          };
        })
      );

      console.log('✅ [DealerUsers] Query complete, enriched', usersWithRoles.length, 'users with roles');
      return usersWithRoles as DealerMembership[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - users don't change frequently
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    enabled: !!dealerId
  });

  // Show error toast if query fails
  React.useEffect(() => {
    if (usersError) {
      console.error('Error fetching users:', usersError);
      toast({
        title: t('common.error'),
        description: t('dealer.users.error_loading_users'),
        variant: 'destructive'
      });
    }
  }, [usersError, t, toast]);

  /**
   * Open confirmation dialog for toggling user status
   */
  const handleToggleUserStatusClick = (user: DealerMembership) => {
    setUserToToggle(user);
    // Only show dialog for deactivation
    if (user.is_active) {
      setShowDeactivateDialog(true);
    } else {
      // Activate immediately without confirmation
      confirmToggleUserStatus(user);
    }
  };

  /**
   * Toggle user active/inactive status
   */
  const confirmToggleUserStatus = async (user: DealerMembership) => {
    console.log('🔵 [DealerUsers] Toggling user status:', user.profiles?.email);

    try {
      setIsToggling(true);

      const { error } = await supabase
        .from('dealer_memberships')
        .update({
          is_active: !user.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id)
        .eq('dealer_id', parseInt(dealerId));

      if (error) {
        console.error('Error details:', error);
        throw error;
      }

      // Invalidate cache to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['dealer_users_with_roles', dealerId] });

      toast({
        title: t('common.success'),
        description: user.is_active
          ? t('dealer.users.user_deactivated')
          : t('dealer.users.user_activated')
      });

      console.log('✅ [DealerUsers] User status updated successfully');
      setShowDeactivateDialog(false);
      setUserToToggle(null);
    } catch (error: any) {
      console.error('💥 [DealerUsers] Error updating user status:', error);
      toast({
        title: t('common.error'),
        description: error?.message || t('dealer.users.error_updating_status'),
        variant: 'destructive'
      });
    } finally {
      setIsToggling(false);
    }
  };

  /**
   * Open edit role modal for user
   */
  const handleEditUserRole = (user: DealerMembership) => {
    setSelectedUser(user);
    setShowEditRoleModal(true);
  };

  /**
   * Get user full name
   */
  const getFullName = (user: DealerMembership) => {
    if (!user.profiles) {
      return t('common.unnamed');
    }
    const { first_name, last_name } = user.profiles;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    return first_name || last_name || t('common.unnamed');
  };

  /**
   * Get user initials for avatar
   */
  const getInitials = (user: DealerMembership) => {
    if (!user.profiles) {
      return '??';
    }
    const { first_name, last_name, email } = user.profiles;
    const initials = `${first_name?.[0] || ''}${last_name?.[0] || ''}`.toUpperCase();
    return initials || email[0].toUpperCase();
  };

  /**
   * Get badge color for role based on role name
   */
  const getRoleBadgeClasses = (roleName: string): string => {
    const lowerRoleName = roleName.toLowerCase();

    // Admin roles - Red
    if (lowerRoleName.includes('admin')) {
      return 'bg-rose-500 hover:bg-rose-600 text-white border-rose-600';
    }

    // Manager roles - Purple
    if (lowerRoleName.includes('manager')) {
      return 'bg-purple-500 hover:bg-purple-600 text-white border-purple-600';
    }

    // Service roles - Blue
    if (lowerRoleName.includes('service') || lowerRoleName.includes('advisor')) {
      return 'bg-blue-500 hover:bg-blue-600 text-white border-blue-600';
    }

    // Sales roles - Emerald
    if (lowerRoleName.includes('sales') || lowerRoleName.includes('salesperson')) {
      return 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600';
    }

    // Technician roles - Orange
    if (lowerRoleName.includes('technician') || lowerRoleName.includes('tech')) {
      return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600';
    }

    // Viewer/Basic roles - Gray
    if (lowerRoleName.includes('viewer') || lowerRoleName.includes('basic')) {
      return 'bg-gray-500 hover:bg-gray-600 text-white border-gray-600';
    }

    // Default - Indigo
    return 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-600';
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('dealer.users.title')}</h2>
          <p className="text-muted-foreground">{t('dealer.users.description')}</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('dealer.users.invite_user')}
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dealer.users.table.user')}</TableHead>
                <TableHead>{t('dealer.users.table.email')}</TableHead>
                <TableHead>{t('dealer.users.table.role')}</TableHead>
                <TableHead>{t('dealer.users.table.status')}</TableHead>
                <TableHead>{t('dealer.users.table.joined')}</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">{t('dealer.users.no_users')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    {/* User Info */}
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{getFullName(user)}</span>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell>{user.profiles?.email || t('common.no_email')}</TableCell>

                    {/* Role */}
                    <TableCell>
                      {user.custom_roles && user.custom_roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.custom_roles.map(role => (
                            <Badge
                              key={role.id}
                              variant="outline"
                              className={`text-xs ${getRoleBadgeClasses(role.role_name)}`}
                            >
                              {role.display_name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-amber-500 hover:bg-amber-600 text-white border-amber-600">
                          {t('dealer.users.no_role')}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={user.is_active
                          ? "bg-green-500 hover:bg-green-600 text-white border-green-600"
                          : "bg-gray-400 hover:bg-gray-500 text-white border-gray-500"
                        }
                      >
                        {user.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell>
                      {safeFormatDateOnly(user.joined_at)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditUserRole(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('dealer.users.edit_role')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleUserStatusClick(user)}
                            disabled={isToggling}
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                {t('dealer.users.deactivate')}
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                {t('dealer.users.activate')}
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invitation Modal */}
      <DealerInvitationModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        dealerId={parseInt(dealerId)}
        onInvitationSent={async () => {
          // Invalidate cache to trigger refetch
          await queryClient.invalidateQueries({ queryKey: ['dealer_users_with_roles', dealerId] });
        }}
      />

      {/* Manage Custom Roles Modal */}
      <ManageCustomRolesModal
        open={showEditRoleModal}
        onClose={() => setShowEditRoleModal(false)}
        user={selectedUser ? {
          id: selectedUser.user_id,
          email: selectedUser.profiles?.email || '',
          first_name: selectedUser.profiles?.first_name || null,
          last_name: selectedUser.profiles?.last_name || null,
          dealership_id: parseInt(dealerId)
        } : null}
        onRolesUpdated={async () => {
          console.log('🔄 [DealerUsers] onRolesUpdated callback triggered');
          // Invalidate cache to trigger refetch
          await queryClient.invalidateQueries({ queryKey: ['dealer_users_with_roles', dealerId] });
          console.log('✅ [DealerUsers] Cache invalidation complete');
        }}
      />

      {/* Deactivate User Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dealer.users.deactivate_user_title', { defaultValue: 'Deactivate User' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('dealer.users.deactivate_user_description', {
                defaultValue: 'Are you sure you want to deactivate {{name}}? They will no longer be able to access the system.',
                name: userToToggle ? getFullName(userToToggle) : ''
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToToggle && confirmToggleUserStatus(userToToggle)}
              disabled={isToggling}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isToggling ? (
                <>
                  <span className="mr-2">⏳</span>
                  {t('common.loading')}
                </>
              ) : (
                t('dealer.users.deactivate')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
