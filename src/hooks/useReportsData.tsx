import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAccessibleDealerships } from './useAccessibleDealerships';

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

      console.log('🔍 get_revenue_analytics params:', params);

      const { data, error } = await supabase.rpc('get_revenue_analytics', params);

      if (error) throw error;

      const result = data[0];
      return result ? {
        ...result,
        period_data: Array.isArray(result.period_data) ? result.period_data as Array<{ period: string; revenue: number; orders: number }> : [],
        top_services: Array.isArray(result.top_services) ? result.top_services as Array<{ name: string; revenue: number }> : []
      } : {
        period_data: [],
        total_revenue: 0,
        avg_revenue_per_period: 0,
        growth_rate: 0,
        top_services: []
      };
    },
    enabled: !!dealerId,
    staleTime: 0, // Temporarily disabled cache for debugging
    cacheTime: 0, // Don't cache at all
  });
};

export const useDepartmentRevenue = (filters: ReportsFilters) => {
  const dealerId = filters.dealerId;

  return useQuery({
    queryKey: ['department-revenue', dealerId, filters],
    queryFn: async () => {
      if (!dealerId) throw new Error('Dealer ID is required');

      // Adjust endDate to end of day (23:59:59.999) to include all orders on that day
      const endOfDay = new Date(filters.endDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Build query with base filters
      let query = supabase
        .from('orders')
        .select('order_type, total_amount, status, created_at, completed_at, due_date, services')
        .eq('dealer_id', dealerId)
        .neq('status', 'cancelled'); // Exclude cancelled orders to match get_revenue_analytics

      // Apply orderType filter if not 'all'
      if (filters.orderType && filters.orderType !== 'all') {
        query = query.eq('order_type', filters.orderType);
      }

      // Apply status filter if not 'all'
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      console.log('🔍 useDepartmentRevenue - Total orders fetched:', orders?.length);
      console.log('🔍 useDepartmentRevenue - Service filter:', filters.serviceIds);

      // Filter orders using EXACT SAME logic as get_revenue_analytics SQL function:
      // - sales/service: COALESCE(due_date, created_at)
      // - recon/carwash: COALESCE(completed_at, created_at)
      // This ensures Financial tab matches Operational tab behavior
      const filteredOrders = orders?.filter(order => {
        let reportDate: Date | null = null;
        const orderTypeLower = order.order_type?.toLowerCase() || 'sales';

        if (orderTypeLower === 'sales' || orderTypeLower === 'service') {
          // Use due_date, fallback to created_at
          reportDate = order.due_date ? new Date(order.due_date) : new Date(order.created_at);
        } else if (orderTypeLower === 'recon' || orderTypeLower === 'carwash') {
          // Use completed_at, fallback to created_at (matches SQL COALESCE logic)
          reportDate = order.completed_at ? new Date(order.completed_at) : new Date(order.created_at);
        } else {
          reportDate = new Date(order.created_at);
        }

        // Check date range
        const inDateRange = reportDate >= filters.startDate && reportDate <= endOfDay;

        // Check service filter (if provided) - MUST match Operational logic exactly
        let matchesServiceFilter = true;
        if (filters.serviceIds && filters.serviceIds.length > 0) {
          const orderServices = order.services || [];

          // Services can be stored as either array of IDs or array of objects with {id, name, price, type}
          // Check both id and type fields to match Operational behavior
          const hasMatchingService = orderServices.some((service: any) => {
            const serviceId = typeof service === 'string' ? service : service?.id;
            const serviceType = typeof service === 'object' ? service?.type : null;
            return filters.serviceIds?.includes(serviceId) ||
                   (serviceType && filters.serviceIds?.includes(serviceType));
          });
          matchesServiceFilter = hasMatchingService;
        }

        return inDateRange && matchesServiceFilter;
      }) || [];

      console.log('🔍 useDepartmentRevenue - After filtering:', filteredOrders.length);
      console.log('🔍 useDepartmentRevenue - Total revenue:', filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0));

      // Group by department
      const departments: Record<string, { revenue: number; orders: number; completed: number }> = {
        sales: { revenue: 0, orders: 0, completed: 0 },
        service: { revenue: 0, orders: 0, completed: 0 },
        recon: { revenue: 0, orders: 0, completed: 0 },
        carwash: { revenue: 0, orders: 0, completed: 0 },
      };

      filteredOrders.forEach(order => {
        // Normalize order_type to lowercase for consistent grouping
        const dept = (order.order_type?.toLowerCase() || 'sales');
        if (departments[dept]) {
          departments[dept].revenue += order.total_amount || 0;
          departments[dept].orders += 1;
          if (order.status === 'completed') {
            departments[dept].completed += 1;
          }
        }
      });

      // Convert to array format for charts
      return Object.entries(departments).map(([name, data]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        revenue: data.revenue,
        orders: data.orders,
        completed: data.completed,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
        completionRate: data.orders > 0 ? (data.completed / data.orders) * 100 : 0,
      }));
    },
    enabled: !!dealerId,
    staleTime: 0, // Temporarily disabled cache for debugging
    cacheTime: 0, // Don't cache at all
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
