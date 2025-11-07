import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { ManageCustomRolesModal } from '@/components/permissions/ManageCustomRolesModal';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { RoleAssignmentModal } from '@/components/permissions/RoleAssignmentModal';
import { UserPasswordManagement } from '@/components/users/password/UserPasswordManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Building2, ExternalLink, Eye, Info, Search, Settings, Shield, UserPlus, Users as UsersIcon } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type: 'dealer' | 'detail' | 'system_admin';
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

interface UnifiedUserManagementProps {
  readOnly?: boolean;
}

export const UnifiedUserManagement: React.FC<UnifiedUserManagementProps> = ({ readOnly = false }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

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
  const [isCustomRoleModalOpen, setIsCustomRoleModalOpen] = useState(false);

  // Data fetching functions
  const fetchUsersWithRoles = async () => {
    try {
      setIsLoading(true);

      // Fetch users with their dealer memberships (using LEFT JOIN to include all users)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          dealer_memberships (
            dealer_id,
            is_active
          )
        `)
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch roles for each user (including custom roles)
      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          // Get custom roles from user_custom_role_assignments table
          const { data: customRolesData } = await supabase
            .from('user_custom_role_assignments')
            .select(`
              custom_role_id,
              dealer_custom_roles (
                id,
                role_name,
                display_name
              )
            `)
            .eq('user_id', profile.id)
            .eq('is_active', true);

          // Transform custom roles to match UserRole interface
          const roles: UserRole[] = (customRolesData || []).map((cr: any) => ({
            role_id: cr.custom_role_id,
            role_name: cr.dealer_custom_roles?.role_name || 'Unknown',
            display_name: cr.dealer_custom_roles?.display_name || cr.dealer_custom_roles?.role_name || 'Unknown'
          }));

          // Get the dealership_id from profile first, then from active membership
          const activeMembership = profile.dealer_memberships?.find((m: { is_active: boolean; dealer_id: number }) => m.is_active);
          const dealershipId = profile.dealership_id || activeMembership?.dealer_id;

          return {
            id: profile.id,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            user_type: profile.user_type,
            dealership_id: dealershipId,
            roles: roles,
          };
        })
      );

      // Show all users but prioritize dealer users
      const sortedUsers = usersWithRoles.sort((a, b) => {
        // Prioritize users with dealership_id and dealer type
        if (a.dealership_id && !b.dealership_id) return -1;
        if (!a.dealership_id && b.dealership_id) return 1;
        if (a.user_type === 'dealer' && b.user_type !== 'dealer') return -1;
        if (a.user_type !== 'dealer' && b.user_type === 'dealer') return 1;
        return 0;
      });

      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers); // Initialize filtered users immediately
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar usuarios';
      toast({
        title: t('common.error'),
        description: errorMessage,
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
    } catch (error: unknown) {
      console.error('Error fetching dealerships:', error);
    }
  };

  // Helper functions (moved before filterUsers)
  const getDisplayName = useCallback((user: User) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email.split('@')[0];
  }, []);

  // Filter function (now after getDisplayName)
  const filterUsers = useCallback(() => {
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
  }, [users, searchQuery, selectedDealership, getDisplayName]);

  // Effects (moved after all function declarations)
  useEffect(() => {
    fetchUsersWithRoles();
    fetchDealerships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    filterUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, searchQuery, selectedDealership]); // Only re-filter when these change

  const getInitials = (user: User) => {
    const name = getDisplayName(user);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDealershipName = (dealershipId?: number) => {
    if (!dealershipId) return t('user_management.no_dealership_assigned');
    const dealership = dealerships.find(d => d.id === dealershipId);
    return dealership?.name || `Dealership ${dealershipId}`;
  };

  // Event handlers
  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setIsRoleModalOpen(true);
  };

  const handleManageCustomRoles = (user: User) => {
    setSelectedUser(user);
    setIsCustomRoleModalOpen(true);
  };

  const handleRoleModalClose = () => {
    setIsRoleModalOpen(false);
    setSelectedUser(null);
  };

  const handleRoleModalSuccess = () => {
    fetchUsersWithRoles();
    handleRoleModalClose();
  };

  const handleCustomRoleModalClose = () => {
    setIsCustomRoleModalOpen(false);
    setSelectedUser(null);
  };

  const handleCustomRoleModalSuccess = () => {
    fetchUsersWithRoles();
  };

  const handleInvitationSent = () => {
    fetchUsersWithRoles();
    setIsInvitationModalOpen(false);
  };

  const handleViewDealerUsers = (dealershipId: number) => {
    navigate(`/dealers/${dealershipId}?tab=users`);
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
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.dealer_users', 'Dealer Users')}</span>
            <span className="sm:hidden">{t('common.users', 'Users')}</span>
          </TabsTrigger>
          <TabsTrigger value="password-management" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('password_management.title')}</span>
            <span className="sm:hidden">{t('common.password', 'Password')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab Content */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {readOnly ? <Eye className="h-5 w-5" /> : <Settings className="h-5 w-5" />}
                  {readOnly ? t('user_management.overview_title') : t('user_management.title')}
                </CardTitle>
                {readOnly && (
                  <CardDescription className="mt-2">
                    {t('user_management.readonly_description')}
                  </CardDescription>
                )}
              </div>
              {!readOnly && (
                <PermissionGuard module="users" permission="write">
                  <Button
                    onClick={() => setIsInvitationModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('users.invite_user')}
                  </Button>
                </PermissionGuard>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
          {/* Read-Only Alert */}
          {readOnly && (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm">
                {t('user_management.readonly_alert')}{' '}
                <span className="font-semibold">{t('user_management.readonly_alert_cta')}</span>
              </AlertDescription>
            </Alert>
          )}

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
                  <TableHead>{t('common.status_label')}</TableHead>
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
                          <Building2 className={`h-4 w-4 ${user.dealership_id ? 'text-muted-foreground' : 'text-destructive'}`} />
                          <span className={`text-sm ${user.dealership_id ? '' : 'text-destructive'}`}>
                            {getDealershipName(user.dealership_id)}
                          </span>
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
                          <Activity className={`h-4 w-4 ${user.dealership_id ? 'text-green-500' : 'text-yellow-500'}`} />
                          <Badge variant={user.dealership_id ? "default" : "secondary"} className="text-xs">
                            {user.dealership_id ? t('common.active') : t('user_management.incomplete_setup')}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {readOnly ? (
                          user.dealership_id ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDealerUsers(user.dealership_id!)}
                              className="flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t('user_management.view_dealer')}
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {t('user_management.no_dealer')}
                            </span>
                          )
                        ) : (
                          <PermissionGuard module="users" permission="write">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageCustomRoles(user)}
                              className="flex items-center gap-2"
                            >
                              <Settings className="h-4 w-4" />
                              {t('user_management.manage')}
                            </Button>
                          </PermissionGuard>
                        )}
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
        </TabsContent>

        {/* Password Management Tab Content */}
        <TabsContent value="password-management">
          <UserPasswordManagement />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <DealerInvitationModal
        isOpen={isInvitationModalOpen}
        onClose={() => setIsInvitationModalOpen(false)}
        dealerId={selectedDealership} // Pass selected dealership or null for selector
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

      {selectedUser && (
        <ManageCustomRolesModal
          open={isCustomRoleModalOpen}
          onClose={handleCustomRoleModalClose}
          user={selectedUser}
          onRolesUpdated={handleCustomRoleModalSuccess}
        />
      )}
    </PermissionGuard>
  );
};
