import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from './useAccessibleDealerships';

export interface ReportsFilters {
  startDate: Date;
  endDate: Date;
  orderType: string;
  status: string;
  dealerId?: number;
}

export interface OrderAnalytics {
  total_orders: number;
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

      const { data, error } = await supabase.rpc('get_orders_analytics', {
        p_dealer_id: dealerId,
        p_start_date: filters.startDate.toISOString(),
        p_end_date: filters.endDate.toISOString(),
        p_order_type: filters.orderType,
        p_status: filters.status
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

      const { data, error } = await supabase.rpc('get_revenue_analytics', {
        p_dealer_id: dealerId,
        p_start_date: filters.startDate.toISOString(),
        p_end_date: filters.endDate.toISOString(),
        p_grouping: grouping
      });

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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePerformanceTrends = (filters: ReportsFilters) => {
  const dealerId = filters.dealerId;

  return useQuery({
    queryKey: ['performance-trends', dealerId, filters],
    queryFn: async (): Promise<PerformanceTrends> => {
      if (!dealerId) throw new Error('Dealer ID is required');

      const { data, error } = await supabase.rpc('get_performance_trends', {
        p_dealer_id: dealerId,
        p_start_date: filters.startDate.toISOString(),
        p_end_date: filters.endDate.toISOString()
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