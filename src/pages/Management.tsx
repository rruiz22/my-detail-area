import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Building2, 
  Shield, 
  TrendingUp, 
  UserPlus, 
  Settings,
  ArrowRight,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { UserManagementSection } from '@/components/management/UserManagementSection';
import { DealershipManagementSection } from '@/components/management/DealershipManagementSection';
import { ManagementOverview } from '@/components/management/ManagementOverview';

const Management = () => {
  const navigate = useNavigate();

  return (
    <DashboardLayout title="System Management">
      <div className="space-y-6">
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                System Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Centro de control integral para usuarios, concesionarios y administración del sistema
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                <Shield className="h-3 w-3 mr-1" />
                Acceso Admin
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="dealerships" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Concesionarios
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Permisos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <ManagementOverview />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <PermissionGuard module="users" permission="read">
              <UserManagementSection />
            </PermissionGuard>
          </TabsContent>

          <TabsContent value="dealerships" className="space-y-6">
            <PermissionGuard module="dealerships" permission="read">
              <DealershipManagementSection />
            </PermissionGuard>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <PermissionGuard module="users" permission="admin">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Gestión de Permisos
                  </CardTitle>
                  <CardDescription>
                    Configuración avanzada de roles y permisos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">Configuración de Roles</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Configura roles del sistema y sus permisos
                        </p>
                        <Button variant="outline" size="sm">
                          Configurar Roles
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">Operaciones Masivas</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Realizar operaciones masivas de usuarios y permisos
                        </p>
                        <Button variant="outline" size="sm">
                          Acciones Masivas
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </PermissionGuard>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Management;