import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOperationalOrdersList, useOrdersAnalytics, usePerformanceTrends, type ReportsFilters, type VehicleForList } from '@/hooks/useReportsData';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedOrderData } from '@/types/unifiedOrder';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Car,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Package,
  PieChart,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OrderVolumeChart } from '../charts/OrderVolumeChart';
import { StatusDistributionChart } from '../charts/StatusDistributionChart';
import { RecalculateOrderTotals } from '../RecalculateOrderTotals';

interface OperationalReportsProps {
  filters: ReportsFilters;
}

export const OperationalReports: React.FC<OperationalReportsProps> = ({ filters }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { enhancedUser } = usePermissions();
  const { data: orderAnalytics, isLoading: analyticsLoading } = useOrdersAnalytics(filters);
  const { data: performanceTrends, isLoading: trendsLoading } = usePerformanceTrends(filters);

  // Order detail modal state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<'sales' | 'service' | 'recon' | 'carwash'>('sales');
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Handler for when totals are recalculated
  const handleRecalculated = () => {
    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['operational-vehicles-list'] });
    queryClient.invalidateQueries({ queryKey: ['orders-analytics'] });
  };

  // Fetch order details when selected
  const { data: selectedOrderData, isLoading: loadingOrderData } = useQuery({
    queryKey: ['order-details', selectedOrderId],
    queryFn: async (): Promise<UnifiedOrderData | null> => {
      if (!selectedOrderId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', selectedOrderId)
        .single();

      if (error) throw error;
      return data as UnifiedOrderData;
    },
    enabled: !!selectedOrderId && showOrderModal,
  });

  // Fetch vehicles for Orders tab using server-side filtering with timezone awareness
  const { data: vehiclesList = [], isLoading: vehiclesLoading } = useOperationalOrdersList(filters);

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

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate efficiency score (0-100)
  const calculateEfficiencyScore = () => {
    if (!orderAnalytics) return 0;
    const completionWeight = orderAnalytics.completion_rate * 0.4;
    const slaWeight = orderAnalytics.sla_compliance_rate * 0.4;
    const processingWeight = Math.max(0, 100 - orderAnalytics.avg_processing_time_hours * 10) * 0.2;
    return Math.min(100, completionWeight + slaWeight + processingWeight);
  };

  const efficiencyScore = calculateEfficiencyScore();

  // Calculate date range label from filters
  const getDateRangeLabel = () => {
    const start = filters.startDate;
    const end = filters.endDate;
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Calculate days difference
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return `${startStr} - ${endStr} (${diffDays} days)`;
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{t('reports.operational_performance_summary')}</CardTitle>
              <CardDescription className="mt-1">
                {t('reports.key_operational_metrics')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">{t('reports.operational.executive_metrics.efficiency_score')}</div>
                <div className="text-2xl font-bold">{efficiencyScore.toFixed(0)}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('reports.operational.executive_metrics.total_volume')}</span>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{orderAnalytics?.total_volume || 0}</div>
              <div className="text-xs text-muted-foreground">{t('reports.operational.executive_metrics.services_processed')}</div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('reports.metrics.completion_rate')}</span>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatPercentage(orderAnalytics?.completion_rate || 0)}</div>
              <Progress value={orderAnalytics?.completion_rate || 0} className="h-1.5" />
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('reports.metrics.avg_processing_time')}</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatHours(orderAnalytics?.avg_processing_time_hours || 0)}</div>
              <div className="text-xs text-muted-foreground">{t('reports.operational.executive_metrics.per_order')}</div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('reports.metrics.total_revenue')}</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  vehiclesList
                    .filter(v => v.status === 'completed')
                    .reduce((sum, v) => sum + (v.total_amount || 0), 0)
                )}
              </div>
              <div className="text-xs text-muted-foreground">{t('reports.operational.executive_metrics.from_completed_orders')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className={`grid w-full ${enhancedUser?.is_system_admin ? 'grid-cols-4' : 'grid-cols-2'}`}>
          <TabsTrigger value="orders">{t('reports.operational.tabs.orders')}</TabsTrigger>
          {enhancedUser?.is_system_admin && (
            <TabsTrigger value="volume" className="relative">
              {t('reports.operational.tabs.volume')}
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-700 border-amber-300"
              >
                Hidden
              </Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="status">{t('reports.operational.tabs.status')}</TabsTrigger>
          {enhancedUser?.is_system_admin && (
            <TabsTrigger value="performance" className="relative">
              {t('reports.operational.tabs.performance')}
              <Badge
                variant="secondary"
                className="absolute -top-1 -right-1 text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-700 border-amber-300"
              >
                Hidden
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        {enhancedUser?.is_system_admin && (
          <TabsContent value="volume" className="space-y-4">
          {/* Volume Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.volume.total_orders')}</span>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold mb-1">{orderAnalytics?.total_orders || 0}</div>
                <p className="text-xs text-muted-foreground">{t('reports.operational.volume.across_all_departments')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.volume.completed')}</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-1 text-green-600">{orderAnalytics?.completed_orders || 0}</div>
                <p className="text-xs text-muted-foreground">{formatPercentage(orderAnalytics?.completion_rate || 0)} {t('reports.operational.volume.success_rate')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.volume.in_progress')}</span>
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold mb-1 text-blue-600">{orderAnalytics?.in_progress_orders || 0}</div>
                <p className="text-xs text-muted-foreground">{t('reports.operational.volume.currently_active')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.volume.daily_average')}</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold mb-1">
                  {orderAnalytics ? Math.round(orderAnalytics.total_orders / 30) : 0}
                </div>
                <p className="text-xs text-muted-foreground">{t('reports.operational.volume.orders_per_day')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Volume Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('reports.operational.volume.order_volume_trend')}</CardTitle>
                  <CardDescription className="mt-1">
                    {t('reports.operational.volume.daily_correlation')}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="h-fit">
                  {getDateRangeLabel()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {analyticsLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : orderAnalytics ? (
                <div className="space-y-4">
                  <OrderVolumeChart data={orderAnalytics} type="line" />
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">{t('reports.operational.volume.total_orders')}</div>
                      <div className="text-xl font-bold">{orderAnalytics.total_orders}</div>
                    </div>
                    <div className="text-center border-l border-r">
                      <div className="text-sm text-muted-foreground mb-1">{t('reports.metrics.total_revenue')}</div>
                      <div className="text-xl font-bold">{formatCurrency(orderAnalytics.total_revenue)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">{t('reports.metrics.avg_order_value')}</div>
                      <div className="text-xl font-bold">{formatCurrency(orderAnalytics.avg_order_value)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>{t('reports.operational.volume.no_volume_data')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="status" className="space-y-4">
          {/* Status Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.status.completion_rate')}</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-2">{formatPercentage(orderAnalytics?.completion_rate || 0)}</div>
                <Progress value={orderAnalytics?.completion_rate || 0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.status.success_rate')}</span>
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold mb-2">
                  {orderAnalytics ?
                    formatPercentage((orderAnalytics.completed_orders / orderAnalytics.total_orders) * 100)
                    : '0%'}
                </div>
                <Progress value={orderAnalytics ? (orderAnalytics.completed_orders / orderAnalytics.total_orders) * 100 : 0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.status.cancellation_rate')}</span>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-2xl font-bold mb-2">
                  {orderAnalytics ?
                    formatPercentage((orderAnalytics.cancelled_orders / orderAnalytics.total_orders) * 100)
                    : '0%'}
                </div>
                <Progress value={orderAnalytics ? (orderAnalytics.cancelled_orders / orderAnalytics.total_orders) * 100 : 0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.status.active_orders')}</span>
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold mb-2 text-blue-600">
                  {(orderAnalytics?.pending_orders || 0) + (orderAnalytics?.in_progress_orders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">{t('reports.operational.status.pending_plus_in_progress')}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.operational.status.distribution')}</CardTitle>
                <CardDescription>
                  {t('reports.operational.status.visual_breakdown')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                  </div>
                ) : orderAnalytics ? (
                  <StatusDistributionChart data={orderAnalytics} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>{t('reports.operational.status.no_status_data')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.operational.status.detailed_breakdown')}</CardTitle>
                <CardDescription>
                  {t('reports.operational.status.counts_and_percentages')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyticsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : orderAnalytics ? (
                  <>
                    <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg border flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-semibold text-base">{t('reports.operational.status.pending')}</div>
                            <div className="text-xs text-muted-foreground">{t('reports.operational.status.awaiting_processing')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="text-base px-3 py-1 mb-1">{orderAnalytics.pending_orders}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage((orderAnalytics.pending_orders / orderAnalytics.total_orders) * 100)}
                          </div>
                        </div>
                      </div>
                      <Progress value={(orderAnalytics.pending_orders / orderAnalytics.total_orders) * 100} className="h-1.5" />
                    </div>

                    <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg border border-blue-200 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-base">{t('reports.operational.volume.in_progress')}</div>
                            <div className="text-xs text-muted-foreground">{t('reports.operational.status.currently_processing')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="default" className="text-base px-3 py-1 mb-1">{orderAnalytics.in_progress_orders}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage((orderAnalytics.in_progress_orders / orderAnalytics.total_orders) * 100)}
                          </div>
                        </div>
                      </div>
                      <Progress value={(orderAnalytics.in_progress_orders / orderAnalytics.total_orders) * 100} className="h-1.5" />
                    </div>

                    <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg border border-green-200 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-base">{t('reports.operational.volume.completed')}</div>
                            <div className="text-xs text-muted-foreground">{t('reports.operational.status.successfully_finished')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-600 hover:bg-green-700 text-base px-3 py-1 mb-1">{orderAnalytics.completed_orders}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage((orderAnalytics.completed_orders / orderAnalytics.total_orders) * 100)}
                          </div>
                        </div>
                      </div>
                      <Progress value={(orderAnalytics.completed_orders / orderAnalytics.total_orders) * 100} className="h-1.5" />
                    </div>

                    <div className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-lg border border-red-200 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-base">{t('reports.status.cancelled')}</div>
                            <div className="text-xs text-muted-foreground">{t('reports.operational.status.not_completed')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="destructive" className="text-base px-3 py-1 mb-1">{orderAnalytics.cancelled_orders}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage((orderAnalytics.cancelled_orders / orderAnalytics.total_orders) * 100)}
                          </div>
                        </div>
                      </div>
                      <Progress value={(orderAnalytics.cancelled_orders / orderAnalytics.total_orders) * 100} className="h-1.5" />
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Status Insights */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.operational.insights.title')}</CardTitle>
              <CardDescription>
                {t('reports.operational.insights.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg border border-green-200 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">{t('reports.operational.insights.high_completion_rate')}</div>
                      <p className="text-sm text-muted-foreground">
                        {formatPercentage(orderAnalytics?.completion_rate || 0)} {t('reports.operational.insights.successfully_completed')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg border border-blue-200 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">{t('reports.operational.insights.processing_efficiency')}</div>
                      <p className="text-sm text-muted-foreground">
                        {orderAnalytics?.in_progress_orders || 0} {t('reports.operational.insights.actively_processing')}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg border border-amber-200 flex items-center justify-center flex-shrink-0">
                      <Target className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">{t('reports.operational.insights.pending_queue')}</div>
                      <p className="text-sm text-muted-foreground">
                        {orderAnalytics?.pending_orders || 0} {t('reports.operational.insights.waiting_for_processing')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {enhancedUser?.is_system_admin && (
          <TabsContent value="performance" className="space-y-4">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.performance.avg_processing_time')}</span>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold mb-1">{formatHours(orderAnalytics?.avg_processing_time_hours || 0)}</div>
                <p className="text-xs text-muted-foreground">{t('reports.operational.performance.per_order_average')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.performance.sla_compliance')}</span>
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-2">{formatPercentage(orderAnalytics?.sla_compliance_rate || 0)}</div>
                <Progress value={orderAnalytics?.sla_compliance_rate || 0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.performance.efficiency_score')}</span>
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold mb-1">{efficiencyScore.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">{t('reports.operational.performance.out_of_100')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{t('reports.operational.performance.revenue_per_hour')}</span>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatCurrency(
                    orderAnalytics?.avg_processing_time_hours
                      ? (orderAnalytics.avg_order_value / orderAnalytics.avg_processing_time_hours)
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t('reports.operational.performance.productivity_metric')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('reports.operational.performance.department_analysis')}</CardTitle>
                  <CardDescription className="mt-1">
                    {t('reports.operational.performance.detailed_kpis')}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="h-fit">
                  {performanceTrends?.department_performance?.length || 0} {t('reports.operational.performance.departments')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : performanceTrends?.department_performance && performanceTrends.department_performance.length > 0 ? (
                <div className="space-y-4">
                  {performanceTrends.department_performance.map((dept, index) => {
                    const isHighPerformer = dept.completion_rate >= 90;
                    const isFastProcessor = dept.avg_processing_time <= 2;
                    return (
                      <div key={index} className="p-6 border rounded-lg hover:border-primary/50 transition-colors">
                        {/* Department Header */}
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                          <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-lg border flex items-center justify-center flex-shrink-0">
                              <Users className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-lg capitalize">{dept.department}</h4>
                                {isHighPerformer && (
                                  <Badge variant="outline" className="text-green-600 border-green-200">
                                    {t('reports.operational.performance.high_performer')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{dept.total_orders} {t('reports.operational.performance.orders_processed')}</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="px-4 py-2 border rounded-lg text-center min-w-[100px]">
                              <div className="text-xs text-muted-foreground mb-1">{t('reports.operational.performance.completion')}</div>
                              <div className="text-xl font-bold">{dept.completion_rate}%</div>
                            </div>
                            <div className="px-4 py-2 border rounded-lg text-center min-w-[100px]">
                              <div className="text-xs text-muted-foreground mb-1">{t('reports.operational.performance.avg_time')}</div>
                              <div className="text-xl font-bold">{formatHours(dept.avg_processing_time)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">{t('reports.operational.status.completion_rate')}</span>
                              <span className="font-semibold">{dept.completion_rate}%</span>
                            </div>
                            <Progress value={dept.completion_rate} className="h-2" />
                          </div>

                          {/* Performance Indicators */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
                            <div className="flex items-center gap-2">
                              {dept.completion_rate >= 90 ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {dept.completion_rate >= 90 ? t('reports.operational.performance.excellent_completion') : t('reports.operational.performance.room_for_improvement')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {dept.avg_processing_time <= 2 ? (
                                <Zap className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-600" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {isFastProcessor ? t('reports.operational.performance.fast_processing') : t('reports.operational.performance.average_speed')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                {dept.total_orders} {t('reports.operational.performance.total_orders')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="mb-1">{t('reports.operational.performance.no_department_data')}</p>
                  <p className="text-sm">{t('reports.operational.performance.data_will_appear')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.operational.performance_insights.title')}</CardTitle>
              <CardDescription>
                {t('reports.operational.performance_insights.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg border border-green-200 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold mb-2">{t('reports.operational.performance_insights.strong_performance')}</div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {formatPercentage(orderAnalytics?.sla_compliance_rate || 0)} {t('reports.operational.performance_insights.sla_compliance_demonstrates')}
                      </p>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        {t('reports.operational.performance_insights.meeting_targets')}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="p-5 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg border border-blue-200 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold mb-2">{t('reports.operational.performance_insights.processing_efficiency')}</div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {formatHours(orderAnalytics?.avg_processing_time_hours || 0)} {t('reports.operational.performance_insights.shows_good_pace')}
                      </p>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        {t('reports.operational.performance_insights.optimized_workflow')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        <TabsContent value="orders" className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{t('reports.operational.orders_table.total_orders')}</span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold mb-1">{orderAnalytics?.total_orders || 0}</div>
                <p className="text-xs text-muted-foreground">{t('reports.operational.orders_table.in_selected_period')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{t('reports.operational.orders_table.pending')}</span>
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-3xl font-bold mb-1 text-amber-600">
                  {orderAnalytics?.pending_orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {orderAnalytics && orderAnalytics.total_orders > 0
                    ? `${Math.round((orderAnalytics.pending_orders / orderAnalytics.total_orders) * 100)}%`
                    : '0%'} {t('reports.operational.orders_table.of_total')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{t('reports.operational.volume.in_progress')}</span>
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-3xl font-bold mb-1 text-blue-600">
                  {orderAnalytics?.in_progress_orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {orderAnalytics && orderAnalytics.total_orders > 0
                    ? `${Math.round((orderAnalytics.in_progress_orders / orderAnalytics.total_orders) * 100)}%`
                    : '0%'} {t('reports.operational.orders_table.of_total')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{t('reports.operational.volume.completed')}</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-3xl font-bold mb-1 text-green-600">
                  {orderAnalytics?.completed_orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {orderAnalytics && orderAnalytics.total_orders > 0
                    ? `${Math.round((orderAnalytics.completed_orders / orderAnalytics.total_orders) * 100)}%`
                    : '0%'} {t('reports.operational.orders_table.completion_rate')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">{t('reports.status.cancelled')}</span>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div className="text-3xl font-bold mb-1 text-red-600">
                  {orderAnalytics?.cancelled_orders || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {orderAnalytics && orderAnalytics.total_orders > 0
                    ? `${Math.round((orderAnalytics.cancelled_orders / orderAnalytics.total_orders) * 100)}%`
                    : '0%'} {t('reports.operational.orders_table.of_total')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Orders List */}
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    {t('reports.operational.orders_table.title')}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t('reports.operational.orders_table.description')}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {filters.dealerId && (
                    <RecalculateOrderTotals
                      dealerId={filters.dealerId}
                      onRecalculated={handleRecalculated}
                    />
                  )}
                  <Badge variant="secondary" className="h-fit font-semibold">
                    {orderAnalytics?.total_orders || 0} {t('reports.metrics.orders')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {vehiclesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : vehiclesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Car className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-1">{t('reports.operational.orders_table.no_orders_found')}</p>
                  <p className="text-sm text-muted-foreground">{t('reports.operational.orders_table.try_adjusting_filters')}</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader className="bg-slate-100 sticky top-0 z-10">
                      <TableRow className="border-b-2 border-slate-300">
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">{t('reports.operational.orders_table.order_number')}</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">
                          {filters.orderType === 'service' ? t('reports.operational.orders_table.po_ro_tag') : filters.orderType === 'carwash' ? t('reports.operational.orders_table.stock_tag') : t('reports.operational.orders_table.stock')}
                        </TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">{t('reports.operational.orders_table.vehicle')}</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">{t('reports.operational.orders_table.vin')}</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">{t('reports.operational.orders_table.dept')}</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">{t('reports.operational.orders_table.status')}</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">{t('reports.operational.orders_table.invoice')}</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">{t('reports.operational.orders_table.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehiclesList.map((vehicle, index) => {
                        let stockDisplay = 'N/A';
                        if (vehicle.order_type === 'service') {
                          const parts = [];
                          if (vehicle.ro) parts.push(`RO: ${vehicle.ro}`);
                          if (vehicle.po) parts.push(`PO: ${vehicle.po}`);
                          if (vehicle.tag) parts.push(`Tag: ${vehicle.tag}`);
                          stockDisplay = parts.length > 0 ? parts.join(', ') : 'N/A';
                        } else if (vehicle.order_type === 'carwash') {
                          const parts = [];
                          if (vehicle.stock_number) parts.push(vehicle.stock_number);
                          if (vehicle.tag) parts.push(vehicle.tag);
                          stockDisplay = parts.length > 0 ? parts.join(' / ') : 'N/A';
                        } else {
                          stockDisplay = vehicle.stock_number || 'N/A';
                        }

                        const vehicleDescription = `${vehicle.vehicle_year || ''} ${vehicle.vehicle_make || ''} ${vehicle.vehicle_model || ''}`.trim() || 'N/A';

                        return (
                          <TableRow
                            key={vehicle.id}
                            className={`cursor-pointer border-b transition-colors ${
                              index % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100/50'
                            }`}
                            onClick={() => {
                              setSelectedOrderId(vehicle.id);
                              setSelectedOrderType(vehicle.order_type as 'sales' | 'service' | 'recon' | 'carwash');
                              setShowOrderModal(true);
                            }}
                          >
                            <TableCell className="text-center">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline text-sm"
                                >
                                  {vehicle.order_number}
                                </button>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(
                                    vehicle.order_type === 'sales' || vehicle.order_type === 'service'
                                      ? (vehicle.due_date || vehicle.created_at)
                                      : (vehicle.completed_at || vehicle.created_at)
                                  ), 'MM/dd/yyyy')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-sm text-center">
                              {vehicle.order_type === 'service' ? (
                                <div className="flex flex-col gap-0.5">
                                  {vehicle.po && <span className="text-xs text-muted-foreground">PO: {vehicle.po}</span>}
                                  {vehicle.ro && <span className="text-xs text-muted-foreground">RO: {vehicle.ro}</span>}
                                  {vehicle.tag && <span className="text-xs font-medium">Tag: {vehicle.tag}</span>}
                                  {!vehicle.po && !vehicle.ro && !vehicle.tag && 'N/A'}
                                </div>
                              ) : vehicle.order_type === 'carwash' ? (
                                <div className="flex flex-col gap-0.5">
                                  {vehicle.stock_number && <span className="text-xs font-medium">Stock: {vehicle.stock_number}</span>}
                                  {vehicle.tag && <span className="text-xs font-medium">Tag: {vehicle.tag}</span>}
                                  {!vehicle.stock_number && !vehicle.tag && 'N/A'}
                                </div>
                              ) : (
                                vehicle.stock_number || 'N/A'
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              {vehicleDescription}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-semibold text-center">
                              {vehicle.vehicle_vin || 'N/A'}
                            </TableCell>
                            <TableCell className="text-center">
                              {(() => {
                                const orderType = vehicle.order_type.toLowerCase().trim();
                                let translatedDept = '';
                                let colorClasses = '';

                                switch (orderType) {
                                  case 'sales':
                                    translatedDept = t('services.departments.sales_dept');
                                    colorClasses = 'bg-blue-100 text-blue-700 border-blue-200';
                                    break;
                                  case 'service':
                                    translatedDept = t('services.departments.service_dept');
                                    colorClasses = 'bg-green-100 text-green-700 border-green-200';
                                    break;
                                  case 'recon':
                                    translatedDept = t('services.departments.recon_dept');
                                    colorClasses = 'bg-orange-100 text-orange-700 border-orange-200';
                                    break;
                                  case 'carwash':
                                  case 'car_wash':
                                  case 'car wash':
                                    translatedDept = t('services.departments.carwash_dept');
                                    colorClasses = 'bg-cyan-100 text-cyan-700 border-cyan-200';
                                    break;
                                  default:
                                    translatedDept = vehicle.order_type.charAt(0).toUpperCase() + vehicle.order_type.slice(1);
                                    colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';
                                }

                                return (
                                  <Badge variant="outline" className={`text-xs whitespace-nowrap ${colorClasses}`}>
                                    {translatedDept}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={
                                vehicle.status === 'completed' ? 'default' :
                                vehicle.status === 'in_progress' ? 'secondary' :
                                vehicle.status === 'pending' ? 'outline' :
                                'destructive'
                              } className={`text-xs capitalize ${
                                vehicle.status === 'completed' ? 'bg-green-600 hover:bg-green-700' : ''
                              }`}>
                                {vehicle.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {vehicle.invoice_number ? (
                                <Badge variant="default" className="text-[11px] bg-blue-600 hover:bg-blue-700 whitespace-nowrap px-2 py-0.5">
                                  {vehicle.invoice_number}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">{t('reports.operational.orders_table.no_invoice_yet')}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {formatCurrency(vehicle.total_amount || 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrderData && (
        <UnifiedOrderDetailModal
          orderType={selectedOrderType}
          order={selectedOrderData}
          open={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          isLoadingData={loadingOrderData}
        />
      )}
    </div>
  );
};
