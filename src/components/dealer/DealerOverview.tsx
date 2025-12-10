import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Car,
  Wrench,
  RefreshCw,
  Droplets,
  BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DealerOverviewProps {
  dealerId: string;
}

interface KPIData {
  total_orders: number;
  orders_today: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  avg_sla_hours: number;
  sla_compliance_rate: number;
}

interface OrdersByType {
  sales: number;
  service: number;
  recon: number;
  carwash: number;
}

interface ServiceItem {
  name: string;
  price?: number;
  description?: string;
}

export const DealerOverview: React.FC<DealerOverviewProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [ordersByType, setOrdersByType] = useState<OrdersByType>({
    sales: 0,
    service: 0,
    recon: 0,
    carwash: 0
  });
  const [topServices, setTopServices] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchKPIs = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_dealer_kpis', {
        p_dealer_id: parseInt(dealerId)
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0]) {
        setKpis(data[0]);
      }
    } catch (error: Error | unknown) {
      console.error('Error fetching KPIs:', error);
      toast({
        title: t('common.error'),
        description: t('dealer.overview.error_loading_kpis'),
        variant: 'destructive'
      });
    }
  }, [dealerId, t, toast]);

  const fetchOrdersByType = useCallback(async () => {
    try {
      // Fetch counts for each order type separately to avoid 1000 row limit
      const orderTypes = ['sales', 'service', 'recon', 'carwash'] as const;
      const counts: OrdersByType = { sales: 0, service: 0, recon: 0, carwash: 0 };

      await Promise.all(
        orderTypes.map(async (type) => {
          const { count, error } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('dealer_id', parseInt(dealerId))
            .eq('order_type', type);

          if (error) {
            console.error(`Error fetching ${type} orders:`, error);
            return;
          }

          counts[type] = count || 0;
        })
      );

      console.log(`Orders by type for dealer ${dealerId}:`, counts);
      setOrdersByType(counts);
    } catch (error: Error | unknown) {
      console.error('Error fetching orders by type:', error);
    }
  }, [dealerId]);

  const fetchTopServices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('services')
        .eq('dealer_id', parseInt(dealerId))
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const serviceCounts: Record<string, number> = {};

      data.forEach(order => {
        if (order.services && Array.isArray(order.services)) {
          order.services.forEach((service: string | ServiceItem) => {
            // Handle both string and object service formats
            const serviceName = typeof service === 'string' ? service : service.name;
            serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
          });
        }
      });

      const topThree = Object.entries(serviceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      setTopServices(topThree);
    } catch (error: Error | unknown) {
      console.error('Error fetching top services:', error);
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  useEffect(() => {
    fetchKPIs();
    fetchOrdersByType();
    fetchTopServices();
  }, [dealerId, fetchKPIs, fetchOrdersByType, fetchTopServices]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading Header */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="w-24 h-6 bg-muted rounded mb-1.5 animate-pulse"></div>
                <div className="w-48 h-4 bg-muted rounded animate-pulse"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse border-l-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="w-24 h-4 bg-muted rounded"></div>
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
              </CardHeader>
              <CardContent>
                <div className="w-16 h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse border-l-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="w-24 h-4 bg-muted rounded"></div>
                <div className="w-10 h-10 bg-muted rounded-lg"></div>
              </CardHeader>
              <CardContent>
                <div className="w-16 h-8 bg-muted rounded mb-2"></div>
                <div className="w-20 h-5 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Bottom Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b">
                <div className="w-32 h-5 bg-muted rounded mb-2"></div>
                <div className="w-48 h-3 bg-muted rounded"></div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="w-full h-16 bg-muted rounded-xl"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional Header */}
      <Card className="border-none shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t('dealer.overview.title', 'Overview')}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t('dealer.overview.subtitle', 'Key metrics and performance indicators')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {t('dealer.overview.total_orders')}
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{kpis?.total_orders || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {t('dealer.overview.orders_today')}
            </CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Calendar className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{kpis?.orders_today || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {t('dealer.overview.avg_sla_hours')}
            </CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {kpis?.avg_sla_hours ? `${Math.round(kpis.avg_sla_hours)}h` : <span className="text-xl text-gray-500">{t('dealer.overview.calculating')}</span>}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {t('dealer.overview.sla_compliance')}
            </CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {kpis?.sla_compliance_rate ? `${Math.round(kpis.sla_compliance_rate)}%` : <span className="text-xl text-gray-500">{t('dealer.overview.calculating')}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {t('dealer.overview.pending_orders')}
            </CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{kpis?.pending_orders || 0}</div>
            <Badge className="mt-2 bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-200 text-xs font-semibold">
              Pending
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {t('dealer.overview.in_progress_orders')}
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{kpis?.in_progress_orders || 0}</div>
            <Badge className="mt-2 bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200 text-xs font-semibold">
              In Progress
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {t('dealer.overview.completed_orders')}
            </CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{kpis?.completed_orders || 0}</div>
            <Badge className="mt-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200 text-xs font-semibold">
              Completed
            </Badge>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700">
              {t('dealer.overview.cancelled_orders')}
            </CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{kpis?.cancelled_orders || 0}</div>
            <Badge className="mt-2 bg-red-100 hover:bg-red-200 text-red-700 border-red-200 text-xs font-semibold">
              Cancelled
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Module and Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b">
            <CardTitle className="text-lg font-bold text-gray-900">{t('dealer.overview.orders_by_module')}</CardTitle>
            <CardDescription className="text-sm">
              {t('dealer.overview.orders_by_module_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-all hover:shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{t('dealer.overview.sales')}</span>
                </div>
                <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200 text-sm font-bold px-3 py-1">
                  {ordersByType.sales}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-transparent transition-all hover:shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Wrench className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{t('dealer.overview.service')}</span>
                </div>
                <Badge className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border-emerald-200 text-sm font-bold px-3 py-1">
                  {ordersByType.service}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent transition-all hover:shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <RefreshCw className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{t('dealer.overview.recon')}</span>
                </div>
                <Badge className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200 text-sm font-bold px-3 py-1">
                  {ordersByType.recon}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl hover:bg-gradient-to-r hover:from-cyan-50 hover:to-transparent transition-all hover:shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-cyan-100 rounded-lg">
                    <Droplets className="h-5 w-5 text-cyan-600" />
                  </div>
                  <span className="font-semibold text-gray-900">{t('dealer.overview.carwash')}</span>
                </div>
                <Badge className="bg-cyan-100 hover:bg-cyan-200 text-cyan-700 border-cyan-200 text-sm font-bold px-3 py-1">
                  {ordersByType.carwash}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b">
            <CardTitle className="text-lg font-bold text-gray-900">{t('dealer.overview.top_services')}</CardTitle>
            <CardDescription className="text-sm">
              {t('dealer.overview.top_services_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {topServices.length > 0 ? (
                topServices.map((service, index) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        'bg-orange-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-semibold text-gray-900 truncate max-w-[200px]" title={service.name}>
                        {service.name.length > 28 ? `${service.name.slice(0, 28)}...` : service.name}
                      </span>
                    </div>
                    <Badge className="bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200 text-sm font-bold px-3 py-1">
                      {service.count}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="text-gray-600 font-medium text-sm mb-1">
                    {t('dealer.overview.no_services_data')}
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('dealer.overview.no_data')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};