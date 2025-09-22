import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Users, UserPlus, Search, UserMinus, ShieldCheck } from 'lucide-react';

interface DealerGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  department: string;
  allowed_order_types: string[];
  permission_level: string;
  dealer_id: number;
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  user_type: string;
}

interface GroupMember extends User {
  assigned_at: string;
  assigned_by: string;
}

interface GroupMembershipManagementProps {
  dealerId: number;
  dealerName: string;
}

export const GroupMembershipManagement: React.FC<GroupMembershipManagementProps> = ({
  dealerId,
  dealerName
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();

  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<DealerGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Fetch groups for this dealer
  const fetchGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_groups')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('department', { ascending: true });

      if (error) throw error;
      setGroups(data || []);

      // Auto-select first group
      if (data && data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: t('common.error'),
        description: t('groups.fetch_error'),
        variant: 'destructive'
      });
    }
  }, [dealerId, selectedGroup, t, toast]);

  // Fetch members of selected group
  const fetchGroupMembers = useCallback(async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('user_group_memberships')
        .select(`
          assigned_at,
          assigned_by,
          profiles (
            id,
            email,
            first_name,
            last_name,
            role,
            user_type
          )
        `)
        .eq('group_id', selectedGroup.id)
        .eq('is_active', true);

      if (error) throw error;

      const members: GroupMember[] = (data || []).map(membership => ({
        ...membership.profiles,
        assigned_at: membership.assigned_at,
        assigned_by: membership.assigned_by
      }));

      setGroupMembers(members);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast({
        title: t('common.error'),
        description: t('groups.members_fetch_error'),
        variant: 'destructive'
      });
    }
  }, [selectedGroup, t, toast]);

  // Fetch available users (not in current group)
  const fetchAvailableUsers = useCallback(async () => {
    if (!selectedGroup) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, user_type')
        .eq('dealership_id', dealerId)
        .not('id', 'in', `(${groupMembers.map(m => `'${m.id}'`).join(',') || "''"})`)
        .order('email');

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  }, [selectedGroup, dealerId, groupMembers]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers();
    }
  }, [selectedGroup, fetchGroupMembers]);

  useEffect(() => {
    fetchAvailableUsers();
  }, [fetchAvailableUsers]);

  // Assign user to group
  const handleAssignUser = async (userId: string) => {
    if (!selectedGroup || !enhancedUser) return;

    try {
      const { error } = await supabase
        .from('user_group_memberships')
        .insert({
          user_id: userId,
          group_id: selectedGroup.id,
          assigned_by: enhancedUser.id,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('groups.user_assigned_successfully')
      });

      // Refresh data
      fetchGroupMembers();
      setAssignModalOpen(false);
    } catch (error) {
      console.error('Error assigning user:', error);
      toast({
        title: t('common.error'),
        description: t('groups.user_assignment_error'),
        variant: 'destructive'
      });
    }
  };

  // Remove user from group
  const handleRemoveUser = async (userId: string) => {
    if (!selectedGroup) return;

    if (!confirm(t('groups.confirm_remove_user'))) return;

    try {
      const { error } = await supabase
        .from('user_group_memberships')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('group_id', selectedGroup.id);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('groups.user_removed_successfully')
      });

      fetchGroupMembers();
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: t('common.error'),
        description: t('groups.user_removal_error'),
        variant: 'destructive'
      });
    }
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

  // Filter available users based on search
  const filteredAvailableUsers = availableUsers.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getDisplayName(user).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check permissions
  const canManageGroups = enhancedUser?.role === 'manager' || enhancedUser?.role === 'system_admin';

  if (!canManageGroups) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('groups.access_denied')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">{t('groups.membership_management')}</h2>
        <p className="text-muted-foreground">
          {t('groups.membership_subtitle', { dealerName })}
        </p>
      </div>

      <div className="grid lg:grid-cols-[300px,1fr] gap-6">
        {/* Groups Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('groups.departments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {groups.map(group => (
                <Button
                  key={group.id}
                  variant={selectedGroup?.id === group.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="text-left">
                    <div className="font-medium">{group.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {group.department}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Group Members Management */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  {selectedGroup ? selectedGroup.name : t('groups.select_group')}
                </CardTitle>
                {selectedGroup && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedGroup.allowed_order_types.map(orderType => (
                      <Badge key={orderType} variant="outline" className="text-xs">
                        {orderType.toUpperCase()}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="text-xs">
                      {selectedGroup.permission_level.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>

              {selectedGroup && (
                <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      {t('groups.assign_user')}
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('groups.assign_to_group', { groupName: selectedGroup.name })}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Input
                          placeholder={t('groups.search_users')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {filteredAvailableUsers.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                            <Button
                              size="sm"
                              onClick={() => handleAssignUser(user.id)}
                            >
                              {t('groups.assign')}
                            </Button>
                          </div>
                        ))}
                        {filteredAvailableUsers.length === 0 && (
                          <p className="text-center text-muted-foreground py-4">
                            {t('groups.no_available_users')}
                          </p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {selectedGroup ? (
              <div>
                {groupMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('groups.no_members')}</p>
                    <p className="text-sm text-muted-foreground">{t('groups.assign_first_member')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('groups.member')}</TableHead>
                        <TableHead>{t('groups.role')}</TableHead>
                        <TableHead>{t('groups.assigned_date')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupMembers.map(member => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {getInitials(member)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{getDisplayName(member)}</div>
                                <div className="text-sm text-muted-foreground">{member.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={member.role === 'system_admin' ? 'default' : 'secondary'}>
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(member.assigned_at).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveUser(member.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t('groups.select_group_to_manage')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      {selectedGroup && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('groups.group_summary')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{groupMembers.length}</div>
                <div className="text-sm text-muted-foreground">{t('groups.total_members')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedGroup.allowed_order_types.length}</div>
                <div className="text-sm text-muted-foreground">{t('groups.order_types')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold capitalize">{selectedGroup.permission_level}</div>
                <div className="text-sm text-muted-foreground">{t('groups.permission_level')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold capitalize">{selectedGroup.department}</div>
                <div className="text-sm text-muted-foreground">{t('groups.department')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};