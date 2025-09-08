import { DashboardLayout } from '@/components/DashboardLayout';
import { UnifiedUserManagement } from '@/components/users/UnifiedUserManagement';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useTranslation } from 'react-i18next';

const Users = () => {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout title={t('pages.user_management')}>
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight">{t('pages.user_management')}</h1>
          <p className="text-muted-foreground">
            {t('pages.user_management_desc')}
          </p>
        </div>

        <PermissionGuard module="users" permission="read">
          <UnifiedUserManagement />
        </PermissionGuard>
      </div>
    </DashboardLayout>
  );
};

export default Users;