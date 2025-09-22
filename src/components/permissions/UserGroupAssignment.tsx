import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { UserCheck, Settings, Shield, Users } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  user_type: string;
  dealership_id: number;
}

interface DealerGroup {
  id: string;
  name: string;
  slug: string;
  department: string;
  allowed_order_types: string[];
  permission_level: string;
}

interface UserWithGroups extends User {
  groups: DealerGroup[];
}

interface UserGroupAssignmentProps {
  dealerId: number;
  dealerName: string;
}

export const UserGroupAssignment: React.FC<UserGroupAssignmentProps> = ({
  dealerId,
  dealerName
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();

  const [users, setUsers] = useState<UserWithGroups[]>([]);
  const [availableGroups, setAvailableGroups] = useState<DealerGroup[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithGroups | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Fetch users with their current groups
  const fetchUsersWithGroups = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all users from this dealer
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('dealership_id', dealerId)
        .order('email');

      if (usersError) throw usersError;

      // For each user, fetch their groups
      const usersWithGroups: UserWithGroups[] = await Promise.all(
        (usersData || []).map(async (user) => {
          try {
            const { data: groupsData, error: groupsError } = await supabase
              .from('user_group_memberships')
              .select(`
                dealer_groups (
                  id,
                  name,
                  slug,
                  department,
                  allowed_order_types,
                  permission_level
                )
              `)
              .eq('user_id', user.id)
              .eq('is_active', true);

            const userGroups = groupsError ? [] : (groupsData || [])
              .map(membership => membership.dealer_groups)
              .filter(group => group);

            return {
              ...user,
              groups: userGroups
            };
          } catch (error) {
            console.error(`Error fetching groups for user ${user.id}:`, error);
            return { ...user, groups: [] };
          }
        })
      );

      setUsers(usersWithGroups);
    } catch (error) {
      console.error('Error fetching users with groups:', error);
      toast({
        title: t('common.error'),
        description: t('groups.users_fetch_error'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, t, toast]);

  // Fetch available groups for assignment
  const fetchAvailableGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_groups')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('department', { ascending: true });

      if (error) throw error;
      setAvailableGroups(data || []);
    } catch (error) {
      console.error('Error fetching available groups:', error);
    }
  }, [dealerId]);

  useEffect(() => {
    fetchUsersWithGroups();
    fetchAvailableGroups();
  }, [fetchUsersWithGroups, fetchAvailableGroups]);

  // Handle group assignment
  const handleAssignGroups = async () => {
    if (!selectedUser || !enhancedUser) return;

    try {
      // Remove current group memberships
      await supabase
        .from('user_group_memberships')
        .update({ is_active: false })
        .eq('user_id', selectedUser.id);

      // Add new group memberships
      if (selectedGroups.length > 0) {
        const memberships = selectedGroups.map(groupId => ({
          user_id: selectedUser.id,
          group_id: groupId,
          assigned_by: enhancedUser.id,
          is_active: true
        }));

        const { error } = await supabase
          .from('user_group_memberships')
          .insert(memberships);

        if (error) throw error;
      }

      toast({
        title: t('common.success'),
        description: t('groups.groups_assigned_successfully')
      });

      // Reset and refresh
      setAssignModalOpen(false);
      setSelectedUser(null);
      setSelectedGroups([]);
      fetchUsersWithGroups();

    } catch (error) {
      console.error('Error assigning groups:', error);
      toast({
        title: t('common.error'),
        description: t('groups.group_assignment_error'),
        variant: 'destructive'
      });
    }
  };

  // Open assignment modal
  const handleManageUserGroups = (user: UserWithGroups) => {
    setSelectedUser(user);
    setSelectedGroups(user.groups.map(g => g.id));
    setAssignModalOpen(true);
  };

  const getDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email;
  };

  const getInitials = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase();
    }
    return user.email.slice(0, 2).toUpperCase();
  };

  // Check permissions
  const canManageGroups = enhancedUser?.role === 'manager' || enhancedUser?.role === 'system_admin';

  if (!canManageGroups) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('groups.access_denied')}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('groups.user_group_assignment')}</h2>
        <p className="text-muted-foreground">
          {t('groups.user_assignment_subtitle', { dealerName })}
        </p>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('groups.team_members')} ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('groups.user')}</TableHead>
                <TableHead>{t('groups.role')}</TableHead>
                <TableHead>{t('groups.assigned_groups')}</TableHead>
                <TableHead>{t('groups.effective_permissions')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{getDisplayName(user)}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'system_admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.groups.length === 0 ? (
                        <span className="text-sm text-muted-foreground">{t('groups.no_groups_assigned')}</span>
                      ) : (
                        user.groups.map(group => (
                          <Badge key={group.id} variant="outline" className="text-xs">
                            {group.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.role === 'system_admin' ? (
                        <Badge className="text-xs">ALL PERMISSIONS</Badge>
                      ) : user.groups.length === 0 ? (
                        <span className="text-sm text-muted-foreground">{t('groups.no_permissions')}</span>
                      ) : (
                        user.groups.flatMap(group => group.allowed_order_types).map((orderType, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {orderType.toUpperCase()}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleManageUserGroups(user)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      {t('groups.manage')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Group Assignment Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('groups.manage_groups_for_user', {
                userName: selectedUser ? getDisplayName(selectedUser) : ''
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              {availableGroups.map(group => {
                const isSelected = selectedGroups.includes(group.id);
                return (
                  <div key={group.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={group.id}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedGroups(prev => [...prev, group.id]);
                        } else {
                          setSelectedGroups(prev => prev.filter(id => id !== group.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <label htmlFor={group.id} className="font-medium cursor-pointer">
                          {group.name}
                        </label>
                        <Badge variant="outline" className="text-xs capitalize">
                          {group.department}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {group.allowed_order_types.map(orderType => (
                          <Badge key={orderType} variant="secondary" className="text-xs">
                            {orderType.toUpperCase()}
                          </Badge>
                        ))}
                        <Badge variant="outline" className="text-xs">
                          {group.permission_level.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedUser(null);
                  setSelectedGroups([]);
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAssignGroups}>
                {t('common.save_changes')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};