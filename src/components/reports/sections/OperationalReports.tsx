import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Users,
  Target,
  Zap,
  Activity,
  Package,
  DollarSign,
  PieChart,
  Car,
  FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OrderVolumeChart } from '../charts/OrderVolumeChart';
import { StatusDistributionChart } from '../charts/StatusDistributionChart';
import { MetricCard } from '../ReportsLayout';
import { useOrdersAnalytics, usePerformanceTrends, type ReportsFilters } from '@/hooks/useReportsData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import type { UnifiedOrderData } from '@/types/unifiedOrder';
import { RecalculateOrderTotals } from '../RecalculateOrderTotals';

interface OperationalReportsProps {
  filters: ReportsFilters;
}

interface VehicleForList {
  id: string;
  order_number: string;
  custom_order_number: string | null;
  order_type: string;
  customer_name: string;
  stock_number: string | null;
  po: string | null;
  ro: string | null;
  tag: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_vin: string | null;
  total_amount: number;
  services: any[] | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  assigned_group_id: string | null;
  assigned_to_name: string | null;
  invoice_number: string | null;
}

export const OperationalReports: React.FC<OperationalReportsProps> = ({ filters }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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

  // Fetch vehicles for Orders tab
  const { data: vehiclesList = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['operational-vehicles-list', filters.dealerId, filters.orderType, filters.startDate, filters.endDate, filters.status],
    queryFn: async (): Promise<VehicleForList[]> => {
      if (!filters.dealerId) return [];

      const startDateTime = filters.startDate.toISOString();
      const endDateTime = (() => {
        const dt = new Date(filters.endDate);
        dt.setHours(23, 59, 59, 999);
        return dt.toISOString();
      })();

      // Build query with proper filters - explicitly select fields we need
      let ordersQuery = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          custom_order_number,
          order_type,
          customer_name,
          stock_number,
          po,
          ro,
          tag,
          vehicle_make,
          vehicle_model,
          vehicle_year,
          vehicle_vin,
          total_amount,
          services,
          status,
          created_at,
          completed_at,
          assigned_group_id
        `)
        .eq('dealer_id', filters.dealerId)
        .gte('created_at', startDateTime)
        .lte('created_at', endDateTime)
        .order('created_at', { ascending: false })
        .limit(1000);

      // Apply order type filter
      if (filters.orderType !== 'all') {
        ordersQuery = ordersQuery.eq('order_type', filters.orderType);
      }

      // Apply status filter
      if (filters.status !== 'all') {
        ordersQuery = ordersQuery.eq('status', filters.status);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) throw ordersError;

      // Fetch user profiles to get assigned names (assigned_group_id actually contains user IDs)
      const { data: userProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }

      // Fetch invoice information for all orders
      const orderIds = (orders || []).map(o => o.id);
      const { data: invoiceItems, error: invoiceItemsError } = await supabase
        .from('invoice_items')
        .select(`
          service_reference,
          invoice:invoices(invoice_number)
        `)
        .in('service_reference', orderIds);

      if (invoiceItemsError) {
        console.error('Error fetching invoice items:', invoiceItemsError);
      }

      // Create lookup map for user names
      const userMap = new Map(userProfiles?.map(u => [
        u.id,
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      ]) || []);

      // Create lookup map for invoice numbers (order_id -> invoice_number)
      const invoiceMap = new Map(
        invoiceItems?.map(item => [
          item.service_reference,
          (item.invoice as any)?.invoice_number || null
        ]) || []
      );

      // Enrich orders with user names and invoice numbers
      const enrichedOrders = (orders || []).map(order => ({
        ...order,
        assigned_to_name: order.assigned_group_id ? userMap.get(order.assigned_group_id) || null : null,
        invoice_number: invoiceMap.get(order.id) || null
      }));

      return enrichedOrders as VehicleForList[];
    },
    enabled: !!filters.dealerId,
    staleTime: 30 * 1000,
  });

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
              <CardTitle className="text-xl">Operational Performance Summary</CardTitle>
              <CardDescription className="mt-1">
                Key operational metrics and efficiency indicators
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Efficiency Score</div>
                <div className="text-2xl font-bold">{efficiencyScore.toFixed(0)}</div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Volume</span>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{orderAnalytics?.total_orders || 0}</div>
              <div className="text-xs text-muted-foreground">orders processed</div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatPercentage(orderAnalytics?.completion_rate || 0)}</div>
              <Progress value={orderAnalytics?.completion_rate || 0} className="h-1.5" />
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Avg Processing Time</span>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatHours(orderAnalytics?.avg_processing_time_hours || 0)}</div>
              <div className="text-xs text-muted-foreground">per order</div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">SLA Compliance</span>
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatPercentage(orderAnalytics?.sla_compliance_rate || 0)}</div>
              <Progress value={orderAnalytics?.sla_compliance_rate || 0} className="h-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="volume">Order Volume</TabsTrigger>
          <TabsTrigger value="status">Status Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          {/* Volume Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Orders</span>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold mb-1">{orderAnalytics?.total_orders || 0}</div>
                <p className="text-xs text-muted-foreground">Across all departments</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-1 text-green-600">{orderAnalytics?.completed_orders || 0}</div>
                <p className="text-xs text-muted-foreground">{formatPercentage(orderAnalytics?.completion_rate || 0)} success rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">In Progress</span>
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold mb-1 text-blue-600">{orderAnalytics?.in_progress_orders || 0}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Daily Average</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold mb-1">
                  {orderAnalytics ? Math.round(orderAnalytics.total_orders / 30) : 0}
                </div>
                <p className="text-xs text-muted-foreground">Orders per day</p>
              </CardContent>
            </Card>
          </div>

          {/* Volume Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Order Volume Trend</CardTitle>
                  <CardDescription className="mt-1">
                    Daily order volume and revenue correlation over time
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
                      <div className="text-sm text-muted-foreground mb-1">Total Orders</div>
                      <div className="text-xl font-bold">{orderAnalytics.total_orders}</div>
                    </div>
                    <div className="text-center border-l border-r">
                      <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                      <div className="text-xl font-bold">{formatCurrency(orderAnalytics.total_revenue)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Avg Order Value</div>
                      <div className="text-xl font-bold">{formatCurrency(orderAnalytics.avg_order_value)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No volume data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          {/* Status Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-2">{formatPercentage(orderAnalytics?.completion_rate || 0)}</div>
                <Progress value={orderAnalytics?.completion_rate || 0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
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
                  <span className="text-sm text-muted-foreground">Cancellation Rate</span>
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
                  <span className="text-sm text-muted-foreground">Active Orders</span>
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold mb-2 text-blue-600">
                  {(orderAnalytics?.pending_orders || 0) + (orderAnalytics?.in_progress_orders || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Pending + In Progress</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>
                  Visual breakdown of order statuses
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
                    <p>No status data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Status Breakdown</CardTitle>
                <CardDescription>
                  Order counts and percentages by status
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
                            <div className="font-semibold text-base">Pending</div>
                            <div className="text-xs text-muted-foreground">Awaiting processing</div>
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
                            <div className="font-semibold text-base">In Progress</div>
                            <div className="text-xs text-muted-foreground">Currently processing</div>
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
                            <div className="font-semibold text-base">Completed</div>
                            <div className="text-xs text-muted-foreground">Successfully finished</div>
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
                            <div className="font-semibold text-base">Cancelled</div>
                            <div className="text-xs text-muted-foreground">Not completed</div>
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
              <CardTitle>Status Insights & Recommendations</CardTitle>
              <CardDescription>
                AI-powered insights based on status distribution
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
                      <div className="font-semibold mb-1">High Completion Rate</div>
                      <p className="text-sm text-muted-foreground">
                        {formatPercentage(orderAnalytics?.completion_rate || 0)} of orders successfully completed
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
                      <div className="font-semibold mb-1">Processing Efficiency</div>
                      <p className="text-sm text-muted-foreground">
                        {orderAnalytics?.in_progress_orders || 0} orders actively being processed
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
                      <div className="font-semibold mb-1">Pending Queue</div>
                      <p className="text-sm text-muted-foreground">
                        {orderAnalytics?.pending_orders || 0} orders waiting for processing
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg Processing Time</span>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold mb-1">{formatHours(orderAnalytics?.avg_processing_time_hours || 0)}</div>
                <p className="text-xs text-muted-foreground">Per order average</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">SLA Compliance</span>
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-2">{formatPercentage(orderAnalytics?.sla_compliance_rate || 0)}</div>
                <Progress value={orderAnalytics?.sla_compliance_rate || 0} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Efficiency Score</span>
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold mb-1">{efficiencyScore.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">Out of 100</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Revenue per Hour</span>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-1">
                  {formatCurrency(
                    orderAnalytics?.avg_processing_time_hours
                      ? (orderAnalytics.avg_order_value / orderAnalytics.avg_processing_time_hours)
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Productivity metric</p>
              </CardContent>
            </Card>
          </div>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Department Performance Analysis</CardTitle>
                  <CardDescription className="mt-1">
                    Detailed metrics and KPIs by department
                  </CardDescription>
                </div>
                <Badge variant="outline" className="h-fit">
                  {performanceTrends?.department_performance?.length || 0} Departments
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
                                    High Performer
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{dept.total_orders} orders processed</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="px-4 py-2 border rounded-lg text-center min-w-[100px]">
                              <div className="text-xs text-muted-foreground mb-1">Completion</div>
                              <div className="text-xl font-bold">{dept.completion_rate}%</div>
                            </div>
                            <div className="px-4 py-2 border rounded-lg text-center min-w-[100px]">
                              <div className="text-xs text-muted-foreground mb-1">Avg Time</div>
                              <div className="text-xl font-bold">{formatHours(dept.avg_processing_time)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Performance Metrics */}
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Completion Rate</span>
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
                                {dept.completion_rate >= 90 ? 'Excellent completion' : 'Room for improvement'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {dept.avg_processing_time <= 2 ? (
                                <Zap className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-amber-600" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {isFastProcessor ? 'Fast processing' : 'Average speed'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="text-sm text-muted-foreground">
                                {dept.total_orders} total orders
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
                  <p className="mb-1">No department performance data available</p>
                  <p className="text-sm">Data will appear once departments start processing orders</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>
                Key takeaways and optimization opportunities
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
                      <div className="font-semibold mb-2">Strong Performance</div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {formatPercentage(orderAnalytics?.sla_compliance_rate || 0)} SLA compliance demonstrates reliable service delivery
                      </p>
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        Meeting targets
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
                      <div className="font-semibold mb-2">Processing Efficiency</div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Average processing time of {formatHours(orderAnalytics?.avg_processing_time_hours || 0)} shows good operational pace
                      </p>
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        Optimized workflow
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Total Orders</span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold mb-1">{vehiclesList.length}</div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold mb-1 text-green-600">
                  {formatCurrency(vehiclesList.reduce((sum, v) => sum + (v.total_amount || 0), 0))}
                </div>
                <p className="text-xs text-muted-foreground">From all orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Avg Order Value</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold mb-1 text-blue-600">
                  {vehiclesList.length > 0
                    ? formatCurrency(vehiclesList.reduce((sum, v) => sum + (v.total_amount || 0), 0) / vehiclesList.length)
                    : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">Per order</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Completed</span>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold mb-1 text-green-600">
                  {vehiclesList.filter(v => v.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {vehiclesList.length > 0
                    ? `${Math.round((vehiclesList.filter(v => v.status === 'completed').length / vehiclesList.length) * 100)}%`
                    : '0%'} completion rate
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
                    Orders Report
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Detailed vehicle orders matching your filters
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
                    {vehiclesList.length} orders
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
                  <p className="text-muted-foreground mb-1">No orders found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader className="bg-slate-100 sticky top-0 z-10">
                      <TableRow className="border-b-2 border-slate-300">
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">Order #</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">
                          {filters.orderType === 'service' ? 'PO / RO / Tag' : filters.orderType === 'carwash' ? 'Stock / Tag' : 'Stock'}
                        </TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">Vehicle</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">VIN</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">Assigned</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">Dept</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">Status</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">Invoice</TableHead>
                        <TableHead className="text-center font-bold text-slate-700 bg-slate-100">Amount</TableHead>
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
                                  {format(parseISO(vehicle.completed_at || vehicle.created_at), 'MM/dd/yyyy')}
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
                            <TableCell className="text-sm text-center">
                              {vehicle.assigned_to_name ? (
                                <Badge variant="secondary" className="text-xs">
                                  {vehicle.assigned_to_name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">Unassigned</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs capitalize">
                                {vehicle.order_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={
                                vehicle.status === 'completed' ? 'default' :
                                vehicle.status === 'in_progress' ? 'secondary' :
                                vehicle.status === 'pending' ? 'outline' :
                                'destructive'
                              } className="text-xs capitalize">
                                {vehicle.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {vehicle.invoice_number ? (
                                <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                                  {vehicle.invoice_number}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No invoice yet</span>
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
