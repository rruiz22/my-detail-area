import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Edit,
  UserX,
  UserCheck,
  MoreHorizontal,
  Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { safeFormatDateOnly } from '@/utils/dateUtils';
import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { EditUserRoleModal } from './EditUserRoleModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface DealerUsersProps {
  dealerId: string;
}

interface DealerMembership {
  id: string;
  user_id: string;
  is_active: boolean;
  joined_at: string;
  custom_role_id: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  dealer_custom_roles: {
    id: string;
    role_name: string;
    display_name: string;
  } | null;
}

export const DealerUsers: React.FC<DealerUsersProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [users, setUsers] = useState<DealerMembership[]>([]);
  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManageGroupsModal, setShowManageGroupsModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DealerMembership | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_memberships')
        .select(`
          id,
          user_id,
          is_active,
          joined_at,
          custom_role_id,
          profiles(first_name, last_name, email),
          dealer_membership_groups(
            group_id,
            dealer_groups(id, name, slug)
          ),
          dealer_custom_roles(id, role_name, display_name)
        `)
        .eq('dealer_id', parseInt(dealerId))
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: Error | unknown) {
      console.error('Error fetching users:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.users.error_loading_users'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, t, toast]);

  const fetchGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_groups')
        .select('id, name, slug')
        .eq('dealer_id', parseInt(dealerId))
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error: Error | unknown) {
      console.error('Error fetching groups:', error);
    }
  }, [dealerId]);

  useEffect(() => {
    fetchUsers();
    fetchGroups();
  }, [dealerId, fetchUsers, fetchGroups]);

  const handleToggleUserStatus = async (user: DealerMembership) => {
    try {
      const { error } = await supabase
        .from('dealer_memberships')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: user.is_active 
          ? t('dealer.users.user_deactivated')
          : t('dealer.users.user_activated')
      });

      fetchUsers();
    } catch (error: Error | unknown) {
      console.error('Error updating user status:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.users.error_updating_status'),
        variant: 'destructive'
      });
    }
  };

  const handleManageUserGroups = (user: DealerMembership) => {
    setSelectedUser(user);
    setSelectedGroupIds(
      user.dealer_membership_groups.map(mg => mg.dealer_groups.id)
    );
    setShowManageGroupsModal(true);
  };

  const handleEditUserRole = (user: DealerMembership) => {
    setSelectedUser(user);
    setShowEditRoleModal(true);
  };

  const handleSaveUserGroups = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase.rpc('set_membership_groups', {
        p_membership_id: selectedUser.id,
        p_group_ids: selectedGroupIds
      });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('dealer.users.groups_updated')
      });

      setShowManageGroupsModal(false);
      fetchUsers();
    } catch (error: Error | unknown) {
      console.error('Error updating user groups:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.users.error_updating_groups'),
        variant: 'destructive'
      });
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

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

  const getInitials = (user: DealerMembership) => {
    if (!user.profiles) {
      return '??';
    }
    const { first_name, last_name, email } = user.profiles;
    const initials = `${first_name?.[0] || ''}${last_name?.[0] || ''}`.toUpperCase();
    return initials || email[0].toUpperCase();
  };

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

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dealer.users.table.user')}</TableHead>
                <TableHead>{t('dealer.users.table.email')}</TableHead>
                <TableHead>{t('dealer.users.table.status')}</TableHead>
                <TableHead>{t('dealer.users.table.groups')}</TableHead>
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
                    <TableCell>{user.profiles?.email || t('common.no_email')}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? t('common.active') : t('common.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.dealer_custom_roles && (
                          <Badge variant="default" className="text-xs">
                            {user.dealer_custom_roles.display_name}
                          </Badge>
                        )}
                        {user.dealer_membership_groups.map((mg) => (
                          <Badge key={mg.group_id} variant="outline" className="text-xs">
                            {mg.dealer_groups.name}
                          </Badge>
                        ))}
                        {!user.dealer_custom_roles && user.dealer_membership_groups.length === 0 && (
                          <span className="text-xs text-muted-foreground">{t('dealer.users.no_role')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {safeFormatDateOnly(user.joined_at)}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleManageUserGroups(user)}>
                            <Shield className="h-4 w-4 mr-2" />
                            {t('dealer.users.manage_groups')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleUserStatus(user)}>
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
        dealerId={parseInt(dealerId)} // Fixed dealership from route
        onInvitationSent={fetchUsers}
      />

      {/* Edit User Role Modal */}
      <EditUserRoleModal
        open={showEditRoleModal}
        onClose={() => setShowEditRoleModal(false)}
        user={selectedUser ? {
          id: selectedUser.id,
          user_id: selectedUser.user_id,
          profiles: selectedUser.profiles,
          dealer_custom_roles: selectedUser.dealer_custom_roles
        } : null}
        dealerId={parseInt(dealerId)}
        onRoleUpdated={fetchUsers}
      />

      {/* Manage User Groups Modal */}
      <Dialog open={showManageGroupsModal} onOpenChange={setShowManageGroupsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dealer.users.manage_groups')}</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  {t('dealer.users.manage_groups_desc')} <strong>{getFullName(selectedUser)}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  id={`group-${group.id}`}
                  checked={selectedGroupIds.includes(group.id)}
                  onCheckedChange={() => handleGroupToggle(group.id)}
                />
                <div className="flex-1">
                  <Label htmlFor={`group-${group.id}`} className="font-medium">
                    {group.name}
                  </Label>
                  <p className="text-sm text-muted-foreground">{group.slug}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageGroupsModal(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveUserGroups}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};