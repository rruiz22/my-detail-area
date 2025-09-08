import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, Settings, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { RoleAssignmentModal } from './RoleAssignmentModal';
import { PermissionGuard } from './PermissionGuard';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: 'dealer' | 'detail';
  dealership_id?: number;
  role?: string;
}

interface UserRole {
  role_name: string;
  display_name: string;
  expires_at?: string;
}

interface UserWithRoles extends User {
  roles: UserRole[];
}

export const UserRoleManager: React.FC = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'dealer' | 'detail'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, userTypeFilter]);

  const fetchUsersWithRoles = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        toast({
          title: 'Error',
          description: 'Failed to fetch users',
          variant: 'destructive'
        });
        return;
      }

      // Fetch roles for each user
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        (usersData || []).map(async (user) => {
          try {
            const { data: rolesData, error: rolesError } = await supabase
              .rpc('get_user_roles', { user_uuid: user.id });

            if (rolesError) {
              console.error(`Error fetching roles for user ${user.id}:`, rolesError);
              return { ...user, roles: [] };
            }

            return {
              ...user,
              roles: rolesData || []
            };
          } catch (error) {
            console.error(`Error processing user ${user.id}:`, error);
            return { ...user, roles: [] };
          }
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error in fetchUsersWithRoles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by user type
    if (userTypeFilter !== 'all') {
      filtered = filtered.filter(user => user.user_type === userTypeFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleRoleModalClose = () => {
    setIsRoleModalOpen(false);
    setSelectedUser(null);
  };

  const handleRoleModalSuccess = () => {
    fetchUsersWithRoles();
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PermissionGuard module="users" permission="read">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('user_management.title')}
          </CardTitle>
          <CardDescription>
            {t('user_management.manage_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('user_management.search_users')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={userTypeFilter} onValueChange={(value: 'all' | 'dealer' | 'detail') => setUserTypeFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('user_management.all_users')}</SelectItem>
                <SelectItem value="dealer">{t('user_management.dealer_users')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user_management.user')}</TableHead>
                  <TableHead>{t('user_management.type')}</TableHead>
                  <TableHead>{t('user_management.roles')}</TableHead>
                  <TableHead>{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
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
                      <Badge variant={user.user_type === 'dealer' ? 'default' : 'secondary'}>
                        {user.user_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-sm text-muted-foreground">{t('user_management.no_roles')}</span>
                        ) : (
                          user.roles.map((role, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {role.display_name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <PermissionGuard module="users" permission="write">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageRoles(user)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          {t('user_management.manage')}
                        </Button>
                      </PermissionGuard>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchQuery || userTypeFilter !== 'all' 
                          ? t('user_management.no_users_matching_filters')
                          : t('user_management.no_users_found')
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RoleAssignmentModal
        isOpen={isRoleModalOpen}
        onClose={handleRoleModalClose}
        user={selectedUser}
        onSuccess={handleRoleModalSuccess}
      />
    </PermissionGuard>
  );
};