import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionGuard } from './PermissionGuard';
import { UserRoleManager } from './UserRoleManager';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface DealerMembership {
  id: string;
  user_id: string;
  dealer_id: number;
  is_active: boolean;
  joined_at: string;
  user_email?: string;
  user_name?: string;
  roles?: string[];
}

interface SimplifiedPermissionManagerProps {
  dealerId: number;
  className?: string;
}

export const SimplifiedPermissionManager: React.FC<SimplifiedPermissionManagerProps> = ({
  dealerId,
  className,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshPermissions } = usePermissions();

  const [memberships, setMemberships] = useState<DealerMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && dealerId) {
      fetchMemberships();
    }
  }, [user, dealerId, fetchMemberships]);

  const fetchMemberships = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('dealer_memberships')
        .select(`
          id,
          user_id,
          dealer_id,
          is_active,
          joined_at
        `)
        .eq('dealer_id', dealerId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Fetch user details
      const userIds = data.map(m => m.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);

        const profileMap = profiles?.reduce((acc, profile) => {
          acc[profile.id] = {
            email: profile.email,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
          };
          return acc;
        }, {} as Record<string, { email: string; name: string }>) || {};

        // Fetch roles for each user
        const enrichedMemberships = await Promise.all(
          data.map(async (membership) => {
            try {
              const { data: userRoles } = await supabase
                .rpc('get_user_roles', { user_uuid: membership.user_id });

              return {
                ...membership,
                user_email: profileMap[membership.user_id]?.email,
                user_name: profileMap[membership.user_id]?.name,
                roles: userRoles?.map((role: any) => role.display_name) || [],
              };
            } catch (error) {
              console.error('Error fetching roles for user:', membership.user_id, error);
              return {
                ...membership,
                user_email: profileMap[membership.user_id]?.email,
                user_name: profileMap[membership.user_id]?.name,
                roles: [],
              };
            }
          })
        );

        setMemberships(enrichedMemberships);
      } else {
        setMemberships([]);
      }
    } catch (error) {
      console.error('Error fetching memberships:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar las membresías',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, toast]);

  const handleToggleMembership = async (membershipId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('dealer_memberships')
        .update({ is_active: !isActive })
        .eq('id', membershipId);

      if (error) throw error;

      toast({
        title: 'Membresía actualizada',
        description: `La membresía ha sido ${!isActive ? 'activada' : 'desactivada'}`,
      });

      fetchMemberships();
      refreshPermissions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar la membresía',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse">Cargando gestión de permisos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PermissionGuard module="users" permission="write" fallback={
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">
            No tienes permisos para gestionar usuarios
          </div>
        </CardContent>
      </Card>
    }>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestión de Permisos del Concesionario
          </CardTitle>
          <CardDescription>
            Administra miembros y roles del concesionario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="memberships" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="memberships">
                <Users className="h-4 w-4 mr-2" />
                Miembros ({memberships.length})
              </TabsTrigger>
              <TabsTrigger value="roles">
                <Shield className="h-4 w-4 mr-2" />
                Roles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="memberships" className="space-y-4">
              {memberships.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hay miembros en este concesionario</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Roles Asignados</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha de Unión</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberships.map((membership) => (
                      <TableRow key={membership.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{membership.user_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {membership.user_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {membership.roles && membership.roles.length > 0 ? (
                              membership.roles.map((role, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Sin roles asignados
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {membership.is_active ? (
                            <Badge variant="default">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(membership.joined_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <PermissionGuard module="users" permission="admin">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleMembership(membership.id, membership.is_active)}
                            >
                              {membership.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                          </PermissionGuard>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="roles">
              <UserRoleManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PermissionGuard>
  );
};