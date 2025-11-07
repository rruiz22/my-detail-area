import { lazy, Suspense } from 'react';
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
  Nfc,
  Loader2
} from 'lucide-react';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTabPersistence } from '@/hooks/useTabPersistence';

// Lazy load components to prevent all tabs from mounting simultaneously
const NFCDashboard = lazy(() => import('@/components/nfc/NFCDashboard').then(m => ({ default: m.NFCDashboard })));
const NFCTagManager = lazy(() => import('@/components/nfc/NFCTagManager').then(m => ({ default: m.NFCTagManager })));
const NFCVehicleTracker = lazy(() => import('@/components/nfc/NFCVehicleTracker').then(m => ({ default: m.NFCVehicleTracker })));
const NFCLocationHeatmap = lazy(() => import('@/components/nfc/NFCLocationHeatmap').then(m => ({ default: m.NFCLocationHeatmap })));
const NFCWorkflowManager = lazy(() => import('@/components/nfc/NFCWorkflowManager').then(m => ({ default: m.NFCWorkflowManager })));

// Loading component for Suspense
const TabLoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

export default function NFCTracking() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useTabPersistence('nfc_tracking', 'dashboard');

  return (
    <PermissionGuard module="nfc_tracking" permission="view_nfc_dashboard">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
              <Nfc className="w-6 h-6 text-primary" />
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

          <TabsContent value="dashboard" className="space-y-6" forceMount={activeTab === 'dashboard'}>
            <ErrorBoundary fallback={<TabLoadingFallback />}>
              <Suspense fallback={<TabLoadingFallback />}>
                <NFCDashboard />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="tags" className="space-y-6" forceMount={activeTab === 'tags'}>
            <ErrorBoundary fallback={<TabLoadingFallback />}>
              <Suspense fallback={<TabLoadingFallback />}>
                <NFCTagManager />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="tracker" className="space-y-6" forceMount={activeTab === 'tracker'}>
            <ErrorBoundary fallback={<TabLoadingFallback />}>
              <Suspense fallback={<TabLoadingFallback />}>
                <NFCVehicleTracker />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="heatmap" className="space-y-6" forceMount={activeTab === 'heatmap'}>
            <ErrorBoundary fallback={<TabLoadingFallback />}>
              <Suspense fallback={<TabLoadingFallback />}>
                <NFCLocationHeatmap />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6" forceMount={activeTab === 'workflows'}>
            <ErrorBoundary fallback={<TabLoadingFallback />}>
              <Suspense fallback={<TabLoadingFallback />}>
                <NFCWorkflowManager />
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}