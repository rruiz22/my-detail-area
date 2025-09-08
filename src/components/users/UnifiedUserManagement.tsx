import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { RoleAssignmentModal } from '@/components/permissions/RoleAssignmentModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, UserPlus, Settings, Activity, Building2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: 'dealer' | 'detail';
  dealership_id?: number;
  roles: UserRole[];
}

interface UserRole {
  role_id: string;
  role_name: string;
  display_name: string;
  expires_at?: string;
}

interface DealershipInfo {
  id: number;
  name: string;
}

export const UnifiedUserManagement: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [dealerships, setDealerships] = useState<DealershipInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDealership, setSelectedDealership] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Data fetching functions
  const fetchUsersWithRoles = async () => {
    try {
      setIsLoading(true);

      // Fetch users with their dealer memberships
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          dealer_memberships!inner (
            dealer_id,
            is_active
          )
        `)
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .rpc('get_user_roles', { user_uuid: profile.id });

          // Get the dealership_id from the first active membership
          const activeMembership = profile.dealer_memberships?.find((m: any) => m.is_active);
          
          return {
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            user_type: profile.user_type,
            dealership_id: activeMembership?.dealer_id,
            roles: rolesData || [],
          };
        })
      );

      // Filter to only show dealer users (Phase 1 cleanup)
      const dealerUsers = usersWithRoles.filter(user => user.user_type === 'dealer');

      setUsers(dealerUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error al cargar usuarios',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDealerships = async () => {
    try {
      const { data, error } = await supabase
        .from('dealerships')
        .select('id, name')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setDealerships(data || []);
    } catch (error: any) {
      console.error('Error fetching dealerships:', error);
    }
  };

  // Effects
  useEffect(() => {
    fetchUsersWithRoles();
    fetchDealerships();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, selectedDealership]);

  // Filter function
  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getDisplayName(user).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedDealership) {
      filtered = filtered.filter(user => user.dealership_id === selectedDealership);
    }

    setFilteredUsers(filtered);
  };

  // Helper functions
  const getDisplayName = (user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const getInitials = (user: User) => {
    const name = getDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDealershipName = (dealershipId?: number) => {
    if (!dealershipId) return 'Sin asignar';
    const dealership = dealerships.find(d => d.id === dealershipId);
    return dealership?.name || `Dealership ${dealershipId}`;
  };

  // Event handlers
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
    handleRoleModalClose();
  };

  const handleInvitationSent = () => {
    fetchUsersWithRoles();
    setIsInvitationModalOpen(false);
  };

  // Loading state
  if (isLoading) {
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('user_management.title')}
          </CardTitle>
          <PermissionGuard module="users" permission="write">
            <Button
              onClick={() => setIsInvitationModalOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {t('users.invite_user')}
            </Button>
          </PermissionGuard>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('user_management.search_users')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select 
              value={selectedDealership?.toString() || 'all'} 
              onValueChange={(value) => setSelectedDealership(value === 'all' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('dealerships.select_dealership')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {dealerships.map((dealership) => (
                  <SelectItem key={dealership.id} value={dealership.id.toString()}>
                    {dealership.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user_management.user')}</TableHead>
                  <TableHead>{t('dealerships.dealership')}</TableHead>
                  <TableHead>{t('user_management.roles')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchQuery || selectedDealership 
                          ? t('user_management.no_users_matching_filters')
                          : t('user_management.no_users_found')
                        }
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
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
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{getDealershipName(user.dealership_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role.role_id} variant="outline" className="text-xs">
                                {role.display_name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('user_management.no_roles')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <Badge variant="default" className="text-xs">
                            {t('common.active')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGuard module="users" permission="write">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageRoles(user)}
                            className="flex items-center gap-2"
                          >
                            <Settings className="h-4 w-4" />
                            {t('user_management.manage')}
                          </Button>
                        </PermissionGuard>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            {t('common.showing')} {filteredUsers.length} {t('common.of')} {users.length} {t('user_management.users').toLowerCase()}
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <DealerInvitationModal
        isOpen={isInvitationModalOpen}
        onClose={() => setIsInvitationModalOpen(false)}
        dealerId={selectedDealership || dealerships[0]?.id || 1}
        onInvitationSent={handleInvitationSent}
      />

      {selectedUser && (
        <RoleAssignmentModal
          isOpen={isRoleModalOpen}
          onClose={handleRoleModalClose}
          user={selectedUser}
          onSuccess={handleRoleModalSuccess}
        />
      )}
    </PermissionGuard>
  );
};