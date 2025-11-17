import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAccessibleDealerships } from './useAccessibleDealerships';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { QUERY_LIMITS } from '@/constants/queryLimits';
import { getReportDateForOrder, isOrderInDateRange, toEndOfDay } from '@/utils/reportDateUtils';

export interface ReportsFilters {
  startDate: Date;
  endDate: Date;
  orderType: string;
  status: string;
  serviceIds?: string[]; // Changed from serviceId to serviceIds (array)
  dealerId?: number;
}

export interface OrderAnalytics {
  total_orders: number;
  total_volume: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  avg_order_value: number;
  completion_rate: number;
  avg_processing_time_hours: number;
  sla_compliance_rate: number;
  daily_data: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  status_distribution: Array<{
    name: string;
    value: number;
  }>;
  type_distribution: Array<{
    name: string;
    value: number;
  }>;
}

export interface RevenueAnalytics {
  period_data: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
  total_revenue: number;
  total_orders: number;
  avg_revenue_per_period: number;
  growth_rate: number;
  top_services: Array<{
    name: string;
    revenue: number;
  }>;
}

export interface PerformanceTrends {
  efficiency_trends: Array<{
    week: string;
    efficiency: number;
  }>;
  sla_trends: Array<{
    week: string;
    sla_rate: number;
  }>;
  volume_trends: Array<{
    week: string;
    volume: number;
  }>;
  department_performance: Array<{
    department: string;
    total_orders: number;
    completion_rate: number;
    avg_processing_time: number;
  }>;
}

export const useReportsData = () => {
  const { dealerships } = useAccessibleDealerships();
  const defaultDealerId = dealerships[0]?.id;

  return {
    dealerships,
    defaultDealerId
  };
};

export const useOrdersAnalytics = (filters: ReportsFilters) => {
  const dealerId = filters.dealerId;

  return useQuery({
    queryKey: ['orders-analytics', dealerId, filters],
    queryFn: async (): Promise<OrderAnalytics> => {
      if (!dealerId) throw new Error('Dealer ID is required');

      // Adjust endDate to end of day (23:59:59.999) to include all orders on that day
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase.rpc('get_orders_analytics', {
        p_dealer_id: dealerId,
        p_start_date: filters.startDate.toISOString(),
        p_end_date: endOfDay.toISOString(),
        p_order_type: filters.orderType,
        p_status: filters.status,
        p_service_ids: filters.serviceIds && filters.serviceIds.length > 0 ? filters.serviceIds : null
      });

      if (error) throw error;

      const result = data[0];
      return result ? {
        ...result,
        daily_data: Array.isArray(result.daily_data) ? result.daily_data as Array<{ date: string; orders: number; revenue: number }> : [],
        status_distribution: Array.isArray(result.status_distribution) ? result.status_distribution as Array<{ name: string; value: number }> : [],
        type_distribution: Array.isArray(result.type_distribution) ? result.type_distribution as Array<{ name: string; value: number }> : []
      } : {
        total_orders: 0,
        total_volume: 0,
        pending_orders: 0,
        in_progress_orders: 0,
        completed_orders: 0,
        cancelled_orders: 0,
        total_revenue: 0,
        avg_order_value: 0,
        completion_rate: 0,
        avg_processing_time_hours: 0,
        sla_compliance_rate: 0,
        daily_data: [],
        status_distribution: [],
        type_distribution: []
      };
    },
    enabled: !!dealerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useRevenueAnalytics = (filters: ReportsFilters, grouping: 'daily' | 'weekly' | 'monthly' = 'monthly') => {
  const dealerId = filters.dealerId;

  return useQuery({
    queryKey: ['revenue-analytics', dealerId, filters, grouping],
    queryFn: async (): Promise<RevenueAnalytics> => {
      if (!dealerId) throw new Error('Dealer ID is required');

      // Adjust endDate to end of day (23:59:59.999) to include all orders on that day
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const params = {
        p_dealer_id: dealerId,
        p_start_date: filters.startDate.toISOString(),
        p_end_date: endOfDay.toISOString(),
        p_grouping: grouping,
        p_order_type: filters.orderType || 'all',
        p_status: filters.status || 'all',
        p_service_ids: filters.serviceIds && filters.serviceIds.length > 0 ? filters.serviceIds : null
      };

      console.log('🔍 get_revenue_analytics params:', JSON.stringify(params, null, 2));

      const { data, error } = await supabase.rpc('get_revenue_analytics', params);

      if (error) throw error;

      const result = data[0];
      console.log('📊 get_revenue_analytics result:', {
        total_revenue: result?.total_revenue,
        total_orders: result?.total_orders,
        period_data_length: result?.period_data?.length,
        summed_orders_from_periods: result?.period_data?.reduce((sum: number, p: any) => sum + (p.orders || 0), 0)
      });
      return result ? {
        ...result,
        period_data: Array.isArray(result.period_data) ? result.period_data as Array<{ period: string; revenue: number; orders: number }> : [],
        top_services: Array.isArray(result.top_services) ? result.top_services as Array<{ name: string; revenue: number }> : []
      } : {
        period_data: [],
        total_revenue: 0,
        total_orders: 0,
        avg_revenue_per_period: 0,
        growth_rate: 0,
        top_services: []
      };
    },
    enabled: !!dealerId,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - Dashboard/analytics data
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
};

export const useDepartmentRevenue = (filters: ReportsFilters) => {
  const dealerId = filters.dealerId;

  return useQuery({
    queryKey: ['department-revenue', dealerId, filters],
    queryFn: async () => {
      if (!dealerId) throw new Error('Dealer ID is required');

      // Adjust endDate to end of day (23:59:59.999) to include all orders on that day
      const endOfDay = toEndOfDay(filters.endDate);

      // Use server-side RPC for department revenue aggregation
      // This eliminates client-side LIMIT issues and ensures consistency with get_revenue_analytics
      const { data, error } = await supabase.rpc('get_department_revenue', {
        p_dealer_id: dealerId,
        p_start_date: filters.startDate.toISOString(),
        p_end_date: endOfDay.toISOString(),
        p_order_type: filters.orderType || 'all',
        p_status: filters.status || 'all',
        p_service_ids: filters.serviceIds && filters.serviceIds.length > 0 ? filters.serviceIds : null
      });

      if (error) throw error;

      // Transform RPC result to match expected format
      return (data || []).map((row: any) => ({
        name: row.department.charAt(0).toUpperCase() + row.department.slice(1),
        revenue: parseFloat(row.revenue || 0),
        orders: row.orders || 0,
        completed: row.completed || 0,
        avgOrderValue: parseFloat(row.avg_order_value || 0),
        completionRate: parseFloat(row.completion_rate || 0)
      }));
    },
    enabled: !!dealerId,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - Dashboard/analytics data
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
};

export const usePerformanceTrends = (filters: ReportsFilters) => {
  const dealerId = filters.dealerId;

  return useQuery({
    queryKey: ['performance-trends', dealerId, filters],
    queryFn: async (): Promise<PerformanceTrends> => {
      if (!dealerId) throw new Error('Dealer ID is required');

      // Adjust endDate to end of day (23:59:59.999) to include all orders on that day
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase.rpc('get_performance_trends', {
        p_dealer_id: dealerId,
        p_start_date: filters.startDate.toISOString(),
        p_end_date: endOfDay.toISOString(),
        p_service_ids: filters.serviceIds && filters.serviceIds.length > 0 ? filters.serviceIds : null
      });

      if (error) throw error;

      const result = data[0];
      return result ? {
        ...result,
        efficiency_trends: Array.isArray(result.efficiency_trends) ? result.efficiency_trends as Array<{ week: string; efficiency: number }> : [],
        sla_trends: Array.isArray(result.sla_trends) ? result.sla_trends as Array<{ week: string; sla_rate: number }> : [],
        volume_trends: Array.isArray(result.volume_trends) ? result.volume_trends as Array<{ week: string; volume: number }> : [],
        department_performance: Array.isArray(result.department_performance) ? result.department_performance as Array<{ department: string; total_orders: number; completion_rate: number; avg_processing_time: number }> : []
      } : {
        efficiency_trends: [],
        sla_trends: [],
        volume_trends: [],
        department_performance: []
      };
    },
    enabled: !!dealerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export interface VehicleForList {
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
  due_date: string | null;
  assigned_group_id: string | null;
  assigned_to_name: string | null;
  invoice_number: string | null;
}

export const useOperationalOrdersList = (filters: ReportsFilters) => {
  const dealerId = filters.dealerId;

  return useQuery({
    queryKey: ['operational-orders-list', dealerId, filters],
    queryFn: async (): Promise<VehicleForList[]> => {
      if (!dealerId) throw new Error('Dealer ID is required');

      // Adjust endDate to end of day (23:59:59.999) to include all orders on that day
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Try RPC first (server-side filtering with timezone awareness)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_operational_orders_list', {
        p_dealer_id: dealerId,
        p_start_date: filters.startDate.toISOString(),
        p_end_date: endOfDay.toISOString(),
        p_order_type: filters.orderType,
        p_status: filters.status,
        p_service_ids: filters.serviceIds && filters.serviceIds.length > 0 ? filters.serviceIds : null
      });

      // If RPC succeeds, use it (better performance)
      if (!rpcError && rpcData) {
        return rpcData;
      }

      // FALLBACK: Client-side filtering (silent fallback - PostgREST may not have detected RPC yet)

      const startDateTime = filters.startDate.toISOString();
      const endDateTime = endOfDay.toISOString();

      let ordersQuery = supabase
        .from('orders')
        .select('id, order_number, custom_order_number, order_type, customer_name, stock_number, po, ro, tag, vehicle_make, vehicle_model, vehicle_year, vehicle_vin, total_amount, services, status, created_at, completed_at, due_date, assigned_group_id')
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false })
        .limit(100000);

      if (filters.orderType !== 'all') {
        ordersQuery = ordersQuery.eq('order_type', filters.orderType);
      }

      if (filters.status !== 'all') {
        ordersQuery = ordersQuery.eq('status', filters.status);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      const filteredOrders = (orders || []).filter(order => {
        let reportDate: Date;
        if (order.order_type === 'sales' || order.order_type === 'service') {
          reportDate = order.due_date ? new Date(order.due_date) : new Date(order.created_at);
        } else if (order.order_type === 'recon' || order.order_type === 'carwash') {
          reportDate = order.completed_at ? new Date(order.completed_at) : new Date(order.created_at);
        } else {
          reportDate = new Date(order.created_at);
        }

        const start = new Date(startDateTime);
        const end = new Date(endDateTime);
        const dateMatch = reportDate >= start && reportDate <= end;

        if (filters.serviceIds && filters.serviceIds.length > 0) {
          const orderServices = order.services || [];
          const hasMatchingService = orderServices.some((service: any) => {
            const serviceId = typeof service === 'string' ? service : service?.id;
            const serviceType = typeof service === 'object' ? service?.type : null;
            return filters.serviceIds?.includes(serviceId) || (serviceType && filters.serviceIds?.includes(serviceType));
          });
          return dateMatch && hasMatchingService;
        }

        return dateMatch;
      });

      const { data: userProfiles } = await supabase.from('profiles').select('id, first_name, last_name, email');
      const orderIds = filteredOrders.map(o => o.id);
      const { data: invoiceItems } = await supabase.from('invoice_items').select('service_reference, invoice:invoices(invoice_number)').in('service_reference', orderIds);

      const userMap = new Map(userProfiles?.map(u => [u.id, `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email]) || []);
      const invoiceMap = new Map(invoiceItems?.map(item => [item.service_reference, (item.invoice as any)?.invoice_number || null]) || []);

      return filteredOrders.map(order => ({
        ...order,
        assigned_to_name: order.assigned_group_id ? userMap.get(order.assigned_group_id) || null : null,
        invoice_number: invoiceMap.get(order.id) || null
      })) as VehicleForList[];
    },
    enabled: !!dealerId,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - Dashboard/analytics data
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
};
 