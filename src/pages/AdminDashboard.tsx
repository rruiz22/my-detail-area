import { DealershipManagement } from '@/components/admin/DealershipManagement';
import { SystemUsersManagement } from '@/components/admin/SystemUsersManagement';
import { UserManagementSection } from '@/components/management/UserManagementSection';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { Building2, Shield, Users, UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useTabPersistence('admin_dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              {t('admin.page_title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('admin.page_description')}
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

      {/* Admin Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dealerships" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.dealerships')}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.dealer_users')}</span>
          </TabsTrigger>
          <TabsTrigger value="system_users" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.system_users')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Dealerships Tab */}
        <TabsContent value="dealerships" className="space-y-6">
          <DealershipManagement />
        </TabsContent>

        {/* Dealer Users Tab - Renamed from "Users" for clarity */}
        <TabsContent value="users" className="space-y-6">
          <PermissionGuard module="users" permission="read">
            <UserManagementSection />
          </PermissionGuard>
        </TabsContent>

        {/* System Users Tab - NEW: Manage system-level users (system_admin, supermanager) */}
        <TabsContent value="system_users" className="space-y-6">
          <SystemUsersManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
