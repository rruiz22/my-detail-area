import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { ManageCustomRolesModal } from '@/components/permissions/ManageCustomRolesModal';
import { UserPasswordManagement } from '@/components/users/password/UserPasswordManagement';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    Shield,
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
  const [showArchivedModal, setShowArchivedModal] = useState(false);

  // TanStack Query for ACTIVE users with cache and automatic refetch
  const {
    data: allUsers = [],
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

  // Filter active and inactive users
  const activeUsers = allUsers.filter(user => user.is_active);
  const archivedUsers = allUsers.filter(user => !user.is_active);

  // Show error toast if query fails
  React.useEffect(() => {
    if (usersError) {
      console.error('Error fetching users:', usersError);
      toast({
        title: t('common.error'),
        description: t('dealer.view.users.error_loading_users'),
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
    const timestamp = new Date().toISOString();
    const newStatus = !user.is_active;

    console.log('🔵 [DealerUsers] Toggling user status:', {
      email: user.profiles?.email,
      currentStatus: user.is_active ? 'active' : 'inactive',
      newStatus: newStatus ? 'active' : 'inactive',
      timestamp
    });

    try {
      setIsToggling(true);

      // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
      queryClient.setQueryData(['dealer_users_with_roles', dealerId], (oldData: DealerMembership[] | undefined) => {
        if (!oldData) return oldData;
        return oldData.map(u =>
          u.user_id === user.user_id
            ? { ...u, is_active: newStatus }
            : u
        );
      });

      // Execute database update
      const { error } = await supabase
        .from('dealer_memberships')
        .update({
          is_active: newStatus,
          updated_at: timestamp
        })
        .eq('user_id', user.user_id)
        .eq('dealer_id', parseInt(dealerId));

      if (error) {
        console.error('❌ [UserDeactivation] Database update failed:', {
          timestamp,
          user_id: user.user_id,
          user_email: user.profiles?.email,
          dealer_id: dealerId,
          attempted_status: newStatus ? 'active' : 'inactive',
          error: error.message,
          error_code: error.code,
          error_details: error.details
        });

        // Revert optimistic update on error
        await queryClient.invalidateQueries({ queryKey: ['dealer_users_with_roles', dealerId] });
        throw error;
      }

      console.log('✅ [UserDeactivation] Database update successful:', {
        timestamp,
        user_email: user.profiles?.email,
        new_status: newStatus ? 'active' : 'inactive'
      });

      // Wait for database transaction to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // Force immediate refetch to ensure UI is in sync with database
      await queryClient.refetchQueries({
        queryKey: ['dealer_users_with_roles', dealerId],
        type: 'active'
      });

      toast({
        title: t('common.success'),
        description: user.is_active
          ? t('dealer.view.users.user_deactivated')
          : t('dealer.view.users.user_activated')
      });

      setShowDeactivateDialog(false);
      setUserToToggle(null);
    } catch (error: any) {
      console.error('💥 [UserDeactivation] Operation failed:', {
        timestamp,
        error_message: error?.message,
        error_code: error?.code,
        error_hint: error?.hint
      });

      toast({
        title: t('common.error'),
        description: error?.message || t('dealer.view.users.error_updating_status'),
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
   * Get badge color for role based on role name (soft colors for better UI)
   */
  const getRoleBadgeClasses = (roleName: string): string => {
    const lowerRoleName = roleName.toLowerCase();

    // Admin roles - Red
    if (lowerRoleName.includes('admin')) {
      return 'bg-red-100 hover:bg-red-200 text-red-700 border-red-200';
    }

    // Manager roles - Purple
    if (lowerRoleName.includes('manager')) {
      return 'bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200';
    }

    // Service roles - Blue
    if (lowerRoleName.includes('service') || lowerRoleName.includes('advisor')) {
      return 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200';
    }

    // Sales roles - Emerald
    if (lowerRoleName.includes('sales') || lowerRoleName.includes('salesperson')) {
      return 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200';
    }

    // Technician roles - Orange
    if (lowerRoleName.includes('technician') || lowerRoleName.includes('tech')) {
      return 'bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200';
    }

    // Lot/Detail roles - Cyan
    if (lowerRoleName.includes('lot') || lowerRoleName.includes('detail')) {
      return 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border-cyan-200';
    }

    // Viewer/Basic roles - Slate
    if (lowerRoleName.includes('viewer') || lowerRoleName.includes('basic')) {
      return 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200';
    }

    // Car Wash roles - Teal
    if (lowerRoleName.includes('wash') || lowerRoleName.includes('carwash')) {
      return 'bg-teal-100 hover:bg-teal-200 text-teal-700 border-teal-200';
    }

    // Default - Indigo
    return 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border-indigo-200';
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
      <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t('dealer.view.users.dealership_users', 'Dealership Users')}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('dealer.view.users.manage_access_description', 'Manage user memberships and access for this dealership')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowArchivedModal(true)}
                disabled={archivedUsers.length === 0}
              >
                <UserX className="h-4 w-4 mr-2" />
                {t('dealer.view.users.view_archived')} ({archivedUsers.length})
              </Button>
              <Button onClick={() => setShowInviteModal(true)} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                {t('dealer.view.users.invite_user')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{t('dealer.view.users.tab_users', 'Users')}</span>
          </TabsTrigger>
          <TabsTrigger value="password-management" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>{t('password_management.title')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab Content */}
        <TabsContent value="users" className="space-y-6">
          {/* Users Table */}
          <Card className="shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2">
                <TableHead className="font-semibold">{t('dealer.view.users.table.user')}</TableHead>
                <TableHead className="font-semibold">{t('dealer.view.users.table.email')}</TableHead>
                <TableHead className="font-semibold">{t('dealer.view.users.table.role')}</TableHead>
                <TableHead className="font-semibold">{t('dealer.view.users.table.status')}</TableHead>
                <TableHead className="font-semibold">{t('dealer.view.users.table.joined')}</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">{t('dealer.view.users.no_active_users')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                activeUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    {/* User Info */}
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 border-2 border-gray-100">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-sm font-semibold">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{getFullName(user)}</span>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{user.profiles?.email || t('common.no_email')}</span>
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      {user.custom_roles && user.custom_roles.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {user.custom_roles.map(role => (
                            <span
                              key={role.id}
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border ${getRoleBadgeClasses(role.role_name)}`}
                            >
                              {role.display_name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200">
                          {t('dealer.view.users.no_role')}
                        </span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${user.is_active
                          ? "bg-green-100 hover:bg-green-200 text-green-700 border border-green-200"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                        }`}
                      >
                        {user.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {safeFormatDateOnly(user.joined_at)}
                      </span>
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
                            {t('dealer.view.users.edit_role')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleUserStatusClick(user)}
                            disabled={isToggling}
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                {t('dealer.view.users.deactivate')}
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                {t('dealer.view.users.activate')}
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
        </TabsContent>

        {/* Password Management Tab Content */}
        <TabsContent value="password-management">
          <UserPasswordManagement />
        </TabsContent>
      </Tabs>

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
            <AlertDialogTitle className="flex items-center gap-2">
              {userToToggle?.is_active ? (
                <>
                  <UserX className="h-5 w-5 text-rose-600" />
                  {t('dealer.view.users.deactivate_user_title', { defaultValue: 'Deactivate User' })}
                </>
              ) : (
                <>
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  {t('dealer.view.users.activate_user_title', { defaultValue: 'Activate User' })}
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.is_active ? (
                t('dealer.view.users.deactivate_user_description', {
                  defaultValue: 'Are you sure you want to deactivate {{name}}? They will no longer be able to access the system.',
                  name: userToToggle ? getFullName(userToToggle) : ''
                })
              ) : (
                t('dealer.view.users.activate_user_description', {
                  defaultValue: 'Are you sure you want to activate {{name}}? They will regain access to the system.',
                  name: userToToggle ? getFullName(userToToggle) : ''
                })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToToggle && confirmToggleUserStatus(userToToggle)}
              disabled={isToggling}
              className={userToToggle?.is_active
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
              }
            >
              {isToggling ? (
                <>
                  <span className="mr-2">⏳</span>
                  {t('common.loading')}
                </>
              ) : userToToggle?.is_active ? (
                t('dealer.view.users.deactivate')
              ) : (
                t('dealer.view.users.activate')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archived Users Modal */}
      <Dialog open={showArchivedModal} onOpenChange={setShowArchivedModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              {t('dealer.view.users.archived_users_title')}
            </DialogTitle>
            <DialogDescription>
              {t('dealer.view.users.archived_users_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {archivedUsers.length === 0 ? (
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">{t('dealer.view.users.no_archived_users')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dealer.view.users.table.user')}</TableHead>
                    <TableHead>{t('dealer.view.users.table.email')}</TableHead>
                    <TableHead>{t('dealer.view.users.table.role')}</TableHead>
                    <TableHead>{t('dealer.view.users.table.joined')}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedUsers.map((user) => (
                    <TableRow key={user.id} className="opacity-60">
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
                      <TableCell className="text-muted-foreground">
                        {user.profiles?.email || t('common.no_email')}
                      </TableCell>

                      {/* Roles */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.custom_roles && user.custom_roles.length > 0 ? (
                            user.custom_roles.map((role) => (
                              <Badge
                                key={role.id}
                                variant="outline"
                                className={getRoleBadgeClasses(role.role_name)}
                              >
                                {role.display_name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {t('dealer.view.users.no_role')}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Joined Date */}
                      <TableCell className="text-sm text-muted-foreground">
                        {safeFormatDateOnly(user.joined_at)}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatusClick(user)}
                          disabled={isToggling}
                          className="w-full"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          {t('dealer.view.users.activate')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
