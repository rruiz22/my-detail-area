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
  Droplets
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
      const { data, error } = await supabase
        .from('orders')
        .select('order_type')
        .eq('dealer_id', parseInt(dealerId));

      if (error) throw error;

      const counts = data.reduce((acc: OrdersByType, order) => {
        acc[order.order_type as keyof OrdersByType] = (acc[order.order_type as keyof OrdersByType] || 0) + 1;
        return acc;
      }, { sales: 0, service: 0, recon: 0, carwash: 0 });

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dealer.overview.total_orders')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.total_orders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dealer.overview.orders_today')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.orders_today || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dealer.overview.avg_sla_hours')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.avg_sla_hours ? `${Math.round(kpis.avg_sla_hours)}h` : t('dealer.overview.calculating')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dealer.overview.sla_compliance')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.sla_compliance_rate ? `${Math.round(kpis.sla_compliance_rate)}%` : t('dealer.overview.calculating')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dealer.overview.pending_orders')}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.pending_orders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dealer.overview.in_progress_orders')}
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.in_progress_orders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dealer.overview.completed_orders')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.completed_orders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dealer.overview.cancelled_orders')}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.cancelled_orders || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Module and Top Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dealer.overview.orders_by_module')}</CardTitle>
            <CardDescription>
              {t('dealer.overview.orders_by_module_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="flex items-center justify-between p-4 h-auto"
              >
                <div className="flex items-center space-x-2">
                  <Car className="h-5 w-5 text-blue-500" />
                  <span>{t('dealer.overview.sales')}</span>
                </div>
                <Badge variant="secondary">{ordersByType.sales}</Badge>
              </Button>

              <Button 
                variant="outline" 
                className="flex items-center justify-between p-4 h-auto"
              >
                <div className="flex items-center space-x-2">
                  <Wrench className="h-5 w-5 text-green-500" />
                  <span>{t('dealer.overview.service')}</span>
                </div>
                <Badge variant="secondary">{ordersByType.service}</Badge>
              </Button>

              <Button 
                variant="outline" 
                className="flex items-center justify-between p-4 h-auto"
              >
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5 text-purple-500" />
                  <span>{t('dealer.overview.recon')}</span>
                </div>
                <Badge variant="secondary">{ordersByType.recon}</Badge>
              </Button>

              <Button 
                variant="outline" 
                className="flex items-center justify-between p-4 h-auto"
              >
                <div className="flex items-center space-x-2">
                  <Droplets className="h-5 w-5 text-cyan-500" />
                  <span>{t('dealer.overview.carwash')}</span>
                </div>
                <Badge variant="secondary">{ordersByType.carwash}</Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dealer.overview.top_services')}</CardTitle>
            <CardDescription>
              {t('dealer.overview.top_services_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topServices.length > 0 ? (
                topServices.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium truncate max-w-[200px]" title={service.name}>
                        {service.name.length > 24 ? `${service.name.slice(0, 24)}...` : service.name}
                      </span>
                    </div>
                    <Badge variant="outline">{service.count}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <div className="text-muted-foreground text-sm mb-2">
                    {t('dealer.overview.no_services_data')}
                  </div>
                  <p className="text-xs text-muted-foreground">
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