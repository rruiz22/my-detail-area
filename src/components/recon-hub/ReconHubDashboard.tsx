import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, AlertTriangle, TrendingUp, Car } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { T2LMetricsGrid } from './dashboard/T2LMetricsGrid';
import { ColorTriggerReport } from './dashboard/ColorTriggerReport';
import { WorkflowStatusGrid } from './dashboard/WorkflowStatusGrid';
import { LiveActivityFeed } from './dashboard/LiveActivityFeed';
import useReconHub from '@/hooks/useReconHub';
import useReconAlerts from '@/hooks/useReconAlerts';

interface ReconHubDashboardProps {
  dealerId: number;
}

export function ReconHubDashboard({ dealerId }: ReconHubDashboardProps) {
  const { t } = useTranslation();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const { 
    dashboardStats,
    reconOrders,
    t2lStats,
    isLoading 
  } = useReconHub({ dealerId });

  const { 
    colorTriggerAlerts,
    alertSummary,
    alertsLoading 
  } = useReconAlerts({ dealerId });

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      // Trigger refetch of data
      window.location.reload();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('reconHub.dashboard.title', 'ReconHub Dashboard')}
          </h1>
          <p className="text-muted-foreground">
            {t('reconHub.dashboard.subtitle', 'Real-time reconditioning operations overview')}
          </p>
        </div>
        
        {/* Refresh Controls */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live
          </Badge>
          <select 
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1"
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {alertSummary.critical > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">
                  {t('reconHub.alerts.criticalBanner', 'Critical Alerts Require Attention')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t('reconHub.alerts.criticalCount', '{{count}} vehicles need immediate attention', { 
                    count: alertSummary.critical 
                  })}
                </p>
              </div>
              <Badge variant="destructive">
                {alertSummary.critical}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('reconHub.metrics.activeVehicles', 'Active Vehicles')}
            </CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalActiveVehicles}</div>
            <p className="text-xs text-muted-foreground">
              {t('reconHub.metrics.inProcess', 'Currently in reconditioning')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('reconHub.metrics.averageT2L', 'Average T2L')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.averageT2L}
              <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress 
                value={Math.min((4 / Math.max(dashboardStats.averageT2L, 0.1)) * 100, 100)} 
                className="h-1 flex-1"
              />
              <span className="text-xs text-muted-foreground">Target: 3-4d</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('reconHub.metrics.criticalAlerts', 'Critical Alerts')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {dashboardStats.criticalAlerts}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reconHub.metrics.needsAttention', 'Vehicles need attention')}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('reconHub.metrics.completedMonth', 'Completed This Month')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {dashboardStats.completedThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reconHub.metrics.frontlineReady', 'Ready for front line')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {t('reconHub.tabs.overview', 'Overview')}
          </TabsTrigger>
          <TabsTrigger value="t2l">
            {t('reconHub.tabs.t2lMetrics', 'T2L Metrics')}
          </TabsTrigger>
          <TabsTrigger value="alerts">
            {t('reconHub.tabs.alerts', 'Alerts')}
            {alertSummary.total > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {alertSummary.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="workflow">
            {t('reconHub.tabs.workflow', 'Workflow')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <T2LMetricsGrid dealerId={dealerId} />
            <LiveActivityFeed dealerId={dealerId} />
          </div>
          <WorkflowStatusGrid dealerId={dealerId} orders={reconOrders} />
        </TabsContent>

        <TabsContent value="t2l" className="space-y-4">
          <T2LMetricsGrid dealerId={dealerId} expanded />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <ColorTriggerReport 
            alerts={colorTriggerAlerts}
            summary={alertSummary}
            loading={alertsLoading}
          />
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <WorkflowStatusGrid dealerId={dealerId} orders={reconOrders} expanded />
        </TabsContent>
      </Tabs>
    </div>
  );
}