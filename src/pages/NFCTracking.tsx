import { DashboardLayout } from '@/components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Radio, 
  Settings, 
  Navigation, 
  TrendingUp,
  Activity,
  Target,
  Nfc
} from 'lucide-react';
import { NFCDashboard } from '@/components/nfc/NFCDashboard';
import { NFCTagManager } from '@/components/nfc/NFCTagManager';
import { NFCVehicleTracker } from '@/components/nfc/NFCVehicleTracker';
import { NFCLocationHeatmap } from '@/components/nfc/NFCLocationHeatmap';
import { NFCWorkflowManager } from '@/components/nfc/NFCWorkflowManager';

export default function NFCTracking() {
  const { t } = useTranslation();

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
              <Nfc className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t('nfc_tracking.title')}
              </h1>
              <p className="text-muted-foreground">
                {t('nfc_tracking.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nfc_tracking.dashboard.title')}</span>
              <span className="sm:hidden">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nfc_tracking.tag_manager.title')}</span>
              <span className="sm:hidden">Tags</span>
            </TabsTrigger>
            <TabsTrigger value="tracker" className="flex items-center gap-2">
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nfc_tracking.vehicle_tracker.title')}</span>
              <span className="sm:hidden">Tracker</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nfc_tracking.location_heatmap.title')}</span>
              <span className="sm:hidden">Heatmap</span>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nfc_tracking.workflows.title')}</span>
              <span className="sm:hidden">Workflows</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <NFCDashboard />
          </TabsContent>

          <TabsContent value="tags" className="space-y-6">
            <NFCTagManager />
          </TabsContent>

          <TabsContent value="tracker" className="space-y-6">
            <NFCVehicleTracker />
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6">
            <NFCLocationHeatmap />
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6">
            <NFCWorkflowManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}