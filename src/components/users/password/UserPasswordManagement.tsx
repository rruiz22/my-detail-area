import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key, Users, Settings, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDealershipContext } from '@/contexts/DealershipContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PasswordSecurityDashboard } from './PasswordSecurityDashboard';
import { PasswordResetActions } from './PasswordResetActions';
import { BulkPasswordOperations } from './BulkPasswordOperations';
import { PasswordPolicyManager } from './PasswordPolicyManager';
import { PasswordActivityLog } from './PasswordActivityLog';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';

export const UserPasswordManagement = () => {
  const { t } = useTranslation();
  const { currentDealership } = useDealershipContext();
  const { hasModulePermission } = usePermissions();

  // Check permissions once to avoid re-renders
  const canWrite = useMemo(() => hasModulePermission('users', 'write'), [hasModulePermission]);
  const canAdmin = useMemo(() => hasModulePermission('users', 'admin'), [hasModulePermission]);

  if (!currentDealership) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            {t('common.no_dealerships_available')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedDealerId = currentDealership.id;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            {t('password_management.title')}
          </CardTitle>
          <CardDescription>
            {t('password_management.description')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className={`grid w-full ${canAdmin ? 'grid-cols-5' : canWrite ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t('password_management.tabs.dashboard')}</span>
            <span className="sm:hidden">{t('common.dashboard', 'Dashboard')}</span>
          </TabsTrigger>

          {canWrite && (
            <TabsTrigger value="reset" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">{t('password_management.tabs.reset')}</span>
              <span className="sm:hidden">{t('common.reset', 'Reset')}</span>
            </TabsTrigger>
          )}

          {canAdmin && (
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('password_management.tabs.bulk')}</span>
              <span className="sm:hidden">{t('common.bulk', 'Bulk')}</span>
            </TabsTrigger>
          )}

          {canAdmin && (
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t('password_management.tabs.policies')}</span>
              <span className="sm:hidden">{t('common.policies', 'Policies')}</span>
            </TabsTrigger>
          )}

          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t('password_management.tabs.activity')}</span>
            <span className="sm:hidden">{t('common.activity', 'Activity')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PasswordSecurityDashboard dealerId={selectedDealerId} />
        </TabsContent>

        <TabsContent value="reset">
          <PermissionGuard module="users" permission="write">
            <PasswordResetActions dealerId={selectedDealerId} />
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="bulk">
          <PermissionGuard module="users" permission="admin">
            <BulkPasswordOperations dealerId={selectedDealerId} />
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="policies">
          <PermissionGuard module="users" permission="admin">
            <PasswordPolicyManager dealerId={selectedDealerId} />
          </PermissionGuard>
        </TabsContent>

        <TabsContent value="activity">
          <PasswordActivityLog dealerId={selectedDealerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};