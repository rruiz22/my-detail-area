import { DashboardLayout } from '@/components/DashboardLayout';
import { UserDashboard } from '@/components/users/UserDashboard';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { Button } from '@/components/ui/button';
import { UserPlus, Users2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { DirectUserCreationModal } from '@/components/users/DirectUserCreationModal';
import { DealerInvitationModal } from '@/components/dealerships/DealerInvitationModal';

const Users = () => {
  const { t } = useTranslation();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  return (
    <DashboardLayout title={t('pages.user_management')}>
      <div className="space-y-6">
        <div className="border-b pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Users2 className="h-8 w-8 text-primary" />
                {t('pages.user_management')}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t('pages.user_management_desc')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                System users who can log in and access the application
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
              <PermissionGuard module="users" permission="write">
                <Button
                  onClick={() => setShowInviteModal(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('users.invite_user')}
                </Button>
              </PermissionGuard>
              
              <PermissionGuard module="users" permission="admin">
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {t('users.add_new')}
                </Button>
              </PermissionGuard>
            </div>
          </div>
        </div>

        <PermissionGuard module="users" permission="read">
          <UserDashboard />
        </PermissionGuard>

        {/* Modals */}
        <DealerInvitationModal 
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          dealershipId={null} // Will select dealership in modal
        />
        
        <DirectUserCreationModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Trigger refresh of UserDashboard
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default Users;