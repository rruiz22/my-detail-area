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
  BarChart3,
  Palette,
  Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { ThemeStudio } from '@/components/theme/ThemeStudio';
import { OrderNumberMigrationTool } from '@/components/dev/OrderNumberMigrationTool';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { UserManagementSection } from '@/components/management/UserManagementSection';
import { DealershipManagementSection } from '@/components/management/DealershipManagementSection';
import { ManagementOverview } from '@/components/management/ManagementOverview';

const Management = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useTabPersistence('management');

  return (
    <DashboardLayout title={t('management.title')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                {t('management.title')}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t('management.description')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                <Shield className="h-3 w-3 mr-1" />
                {t('management.admin_access')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('management.overview')}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('management.users')}
            </TabsTrigger>
            <TabsTrigger value="dealerships" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('management.dealerships')}
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('management.permissions')}
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t('management.theme_studio')}
            </TabsTrigger>
            {import.meta.env.DEV && (
              <TabsTrigger value="migration" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Order Migration
              </TabsTrigger>
            )}
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
                    {t('management.permission_management')}
                  </CardTitle>
                  <CardDescription>
                    Configuración avanzada de roles y permisos del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">{t('management.role_configuration')}</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Configura roles del sistema y sus permisos asociados
                        </p>
                        <Button variant="outline" size="sm">
                          Configurar Roles
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-semibold mb-2">{t('management.bulk_operations')}</h3>
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

          <TabsContent value="theme" className="space-y-6">
            <PermissionGuard module="management" permission="admin">
              <ThemeStudio />
            </PermissionGuard>
          </TabsContent>

          {import.meta.env.DEV && (
            <TabsContent value="migration" className="space-y-6">
              <PermissionGuard module="management" permission="admin">
                <OrderNumberMigrationTool />
              </PermissionGuard>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Management;