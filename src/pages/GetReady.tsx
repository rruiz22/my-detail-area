import { DashboardLayout } from '@/components/DashboardLayout';
import { ReconHubDashboard } from '@/components/recon-hub/ReconHubDashboard';
import { useTranslation } from 'react-i18next';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

export default function GetReady() {
  const { t } = useTranslation();
  const { dealerships } = useAccessibleDealerships();
  
  // Get dealer ID from first accessible dealership or default to 5
  const dealerId = dealerships.length > 0 ? dealerships[0].id : 5;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {t('navigation.get_ready')}
            </h1>
            <p className="text-muted-foreground">
              {t('get_ready.subtitle')}
            </p>
          </div>
        </div>

        {/* ReconHub Dashboard Component */}
        <ReconHubDashboard dealerId={dealerId} />
      </div>
    </DashboardLayout>
  );
}