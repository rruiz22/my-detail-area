import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  LineChart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OrderVolumeChart } from '../charts/OrderVolumeChart';
import { StatusDistributionChart } from '../charts/StatusDistributionChart';
import { MetricCard } from '../ReportsLayout';
import { useOrdersAnalytics, usePerformanceTrends, type ReportsFilters } from '@/hooks/useReportsData';

interface OperationalReportsProps {
  filters: ReportsFilters;
}

export const OperationalReports: React.FC<OperationalReportsProps> = ({ filters }) => {
  const { t } = useTranslation();
  const { data: orderAnalytics, isLoading: analyticsLoading } = useOrdersAnalytics(filters);
  const { data: performanceTrends, isLoading: trendsLoading } = usePerformanceTrends(filters);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours.toFixed(1)}h`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('reports.metrics.total_orders')}
          value={orderAnalytics?.total_orders || 0}
          icon={<BarChart3 className="h-4 w-4" />}
          loading={analyticsLoading}
        />
        <MetricCard
          title={t('reports.metrics.completion_rate')}
          value={`${orderAnalytics?.completion_rate || 0}%`}
          icon={<CheckCircle className="h-4 w-4" />}
          loading={analyticsLoading}
        />
        <MetricCard
          title={t('reports.metrics.avg_processing_time')}
          value={formatHours(orderAnalytics?.avg_processing_time_hours || 0)}
          icon={<Clock className="h-4 w-4" />}
          loading={analyticsLoading}
        />
        <MetricCard
          title={t('reports.metrics.sla_compliance')}
          value={`${orderAnalytics?.sla_compliance_rate || 0}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={analyticsLoading}
        />
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title={t('reports.metrics.total_revenue')}
          value={formatCurrency(orderAnalytics?.total_revenue || 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={analyticsLoading}
        />
        <MetricCard
          title={t('reports.metrics.avg_order_value')}
          value={formatCurrency(orderAnalytics?.avg_order_value || 0)}
          icon={<BarChart3 className="h-4 w-4" />}
          loading={analyticsLoading}
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="volume">{t('reports.tabs.order_volume')}</TabsTrigger>
          <TabsTrigger value="status">{t('reports.tabs.status_distribution')}</TabsTrigger>
          <TabsTrigger value="performance">{t('reports.tabs.performance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.charts.order_volume_trend')}</CardTitle>
              <CardDescription>
                {t('reports.charts.daily_order_volume_revenue')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : orderAnalytics ? (
                <OrderVolumeChart data={orderAnalytics} type="line" />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.charts.status_distribution')}</CardTitle>
                <CardDescription>
                  {t('reports.charts.order_status_breakdown')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-72 flex items-center justify-center">
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                  </div>
                ) : orderAnalytics ? (
                  <StatusDistributionChart data={orderAnalytics} />
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.charts.status_summary')}</CardTitle>
                <CardDescription>
                  {t('reports.charts.detailed_status_metrics')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : orderAnalytics ? (
                  <>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="font-medium">{t('reports.status.pending')}</span>
                      <Badge variant="secondary">{orderAnalytics.pending_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">{t('reports.status.in_progress')}</span>
                      <Badge variant="default">{orderAnalytics.in_progress_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">{t('reports.status.completed')}</span>
                      <Badge variant="default" className="bg-green-600">{orderAnalytics.completed_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="font-medium">{t('reports.status.cancelled')}</span>
                      <Badge variant="destructive">{orderAnalytics.cancelled_orders}</Badge>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.charts.department_performance')}</CardTitle>
              <CardDescription>
                {t('reports.charts.performance_by_department')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : performanceTrends?.department_performance ? (
                <div className="space-y-4">
                  {performanceTrends.department_performance.map((dept, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium capitalize">{dept.department}</h4>
                        <Badge variant="outline">{dept.total_orders} {t('reports.metrics.orders')}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t('reports.metrics.completion_rate')}</span>
                          <span>{dept.completion_rate}%</span>
                        </div>
                        <Progress value={dept.completion_rate} className="h-2" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{t('reports.metrics.avg_processing_time')}</span>
                          <span>{formatHours(dept.avg_processing_time)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('reports.no_data')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};