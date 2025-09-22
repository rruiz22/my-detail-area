import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { usePermissions } from '@/hooks/usePermissions';

// Import existing components
import { UserDashboard } from '@/components/users/UserDashboard';
import { ManagementOverview } from '@/components/management/ManagementOverview';
import { IntegrationSettings } from '@/components/settings/IntegrationSettings';

// Import dealership components
import { DealershipStatsCard } from '@/components/dealerships/DealershipStatsCard';
import { DealershipModal } from '@/components/dealerships/DealershipModal';
import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';
import { DealershipManagement } from '@/components/admin/DealershipManagement';

import {
  Shield,
  Building2,
  Users,
  BarChart3,
  Settings,
  UserPlus,
  Plus
} from 'lucide-react';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { enhancedUser } = usePermissions();
  const [activeTab, setActiveTab] = useTabPersistence('admin_dashboard');

  return (
    <PermissionGuard module="management" permission="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                {t('admin.dashboard_title')}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t('admin.dashboard_description')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-3 py-1">
                <Shield className="h-3 w-3 mr-1" />
                {t('admin.system_administrator')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Unified Admin Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dealerships" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.dealerships')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.users_groups')}</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.reports')}</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('admin.system')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Dealerships Management */}
          <TabsContent value="dealerships" className="space-y-6">
            {/* Dealership Stats Overview */}
            {enhancedUser?.dealership_id && (
              <DealershipStatsCard dealerId={enhancedUser.dealership_id} />
            )}

            {/* Integrated Dealership Management */}
            <DealershipManagement />
          </TabsContent>

          {/* Users & Groups Management */}
          <TabsContent value="users" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{t('admin.users_and_groups')}</h2>
              <p className="text-muted-foreground">{t('admin.users_groups_description')}</p>
            </div>

            {/* Integrated User Management */}
            <UserDashboard />
          </TabsContent>

          {/* Reports & Analytics */}
          <TabsContent value="reports" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{t('admin.system_reports')}</h2>
              <p className="text-muted-foreground">{t('admin.system_reports_description')}</p>
            </div>

            {/* Reports Content */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('reports.user_activity')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                    <p>{t('reports.coming_soon')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('reports.dealership_performance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4" />
                    <p>{t('reports.coming_soon')}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('reports.system_health')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4" />
                    <p>{t('reports.coming_soon')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Settings & Tools */}
          <TabsContent value="system" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">{t('admin.system_settings')}</h2>
              <p className="text-muted-foreground">{t('admin.system_settings_description')}</p>
            </div>

            {/* System Integrations */}
            <IntegrationSettings />

            {/* System Management Overview */}
            <ManagementOverview />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
};

export default AdminDashboard;