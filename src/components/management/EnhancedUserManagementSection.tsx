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
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus, Settings, Activity } from 'lucide-react';

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

export const EnhancedUserManagementSection: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [dealerships, setDealerships] = useState<DealershipInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all');
  const [selectedDealership, setSelectedDealership] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const fetchUsersWithRoles = async () => {
    try {
      setIsLoading(true);

      // Fetch users from profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .rpc('get_user_roles', { user_uuid: profile.id });

          return {
            ...profile,
            roles: rolesData || [],
          };
        })
      );

      setUsers(usersWithRoles);
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
        .order('name');

      if (error) throw error;
      setDealerships(data || []);
    } catch (error: any) {
      console.error('Error fetching dealerships:', error);
    }
  };

  useEffect(() => {
    fetchUsersWithRoles();
    fetchDealerships();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, userTypeFilter, selectedDealership]);

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (userTypeFilter !== 'all') {
      filtered = filtered.filter(user => user.user_type === userTypeFilter);
    }

    if (selectedDealership) {
      filtered = filtered.filter(user => user.dealership_id === selectedDealership);
    }

    setFilteredUsers(filtered);
  };

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
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
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
            Gestión de Usuarios
          </CardTitle>
          <PermissionGuard module="users" permission="write">
            <Button
              onClick={() => setIsInvitationModalOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Invitar Usuario
            </Button>
          </PermissionGuard>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="dealer">Dealer</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={selectedDealership?.toString() || 'all'} 
              onValueChange={(value) => setSelectedDealership(value === 'all' ? null : parseInt(value))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Dealership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
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
                  <TableHead>Usuario</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dealership</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No se encontraron usuarios
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
                        <Badge variant="default">
                          Dealer
                        </Badge>
                      </TableCell>
                      <TableCell>{getDealershipName(user.dealership_id)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role.role_id} variant="outline" className="text-xs">
                                {role.display_name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin roles</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <span className="text-sm">Activo</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGuard module="users" permission="write">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManageRoles(user)}
                          >
                            Gestionar
                          </Button>
                        </PermissionGuard>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invitation Modal */}
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
    </PermissionGuard>
  );
};