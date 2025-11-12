import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DepartmentMetrics {
  order_type: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  // revenue field REMOVED - no financial data in dashboard
  createdToday: number;
  completedToday: number;
  last30Days: number;
}

export interface OverallMetrics {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  // revenue field REMOVED - no financial data in dashboard
  activeVehicles: number;
}

export interface DashboardData {
  overall: OverallMetrics;
  departments: DepartmentMetrics[];
}

export function useDashboardData(allowedOrderTypes?: string[]) {
  const { user } = useAuth();
  const [selectedDealer, setSelectedDealer] = useState<number | 'all'>('all');

  // Load dealer filter from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedDealerFilter');
    if (saved) {
      setSelectedDealer(saved === 'all' ? 'all' : parseInt(saved));
    }
  }, []);

  // Listen to dealerFilterChanged event
  useEffect(() => {
    const handleFilterChange = (e: CustomEvent) => {
      setSelectedDealer(e.detail.dealerId);
    };

    window.addEventListener('dealerFilterChanged', handleFilterChange as EventListener);
    return () => window.removeEventListener('dealerFilterChanged', handleFilterChange as EventListener);
  }, []);

  return useQuery({
    queryKey: ['dashboard-data', user?.id, selectedDealer, allowedOrderTypes],
    queryFn: async (): Promise<DashboardData> => {
      if (!user) {
        return {
          overall: {
            totalOrders: 0,
            pendingOrders: 0,
            completedToday: 0,
            // revenue field removed
            activeVehicles: 0
          },
          departments: []
        };
      }

      try {
        // Build query with optional order_type filter for permission-based filtering
        let query = supabase
          .from('orders')
          .select('order_type, status, created_at, updated_at, dealer_id');
          // total_amount removed - no financial calculations needed

        // If allowedOrderTypes provided, filter query to only those types (permission filtering)
        if (allowedOrderTypes && allowedOrderTypes.length > 0) {
          query = query.in('order_type', allowedOrderTypes);
        }

        const { data: orders, error } = await query;

        if (error) {
          console.error('Error fetching dashboard data:', error);
          throw error;
        }

        const ordersList = orders || [];

        // Apply dealer filter (after RLS has already filtered by security)
        const filteredOrders = selectedDealer === 'all'
          ? ordersList
          : ordersList.filter((o: any) => o.dealer_id === selectedDealer);

        // Calculate overall metrics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const today = new Date().toISOString().split('T')[0];

        const recentOrders = filteredOrders.filter(o =>
          new Date(o.created_at) >= thirtyDaysAgo
        );

        const overall: OverallMetrics = {
          totalOrders: recentOrders.length,
          pendingOrders: filteredOrders.filter(o => o.status === 'pending').length,
          completedToday: filteredOrders.filter(o =>
            o.status === 'completed' &&
            o.updated_at?.startsWith(today)
          ).length,
          // revenue calculation removed - no financial data
          activeVehicles: filteredOrders.filter(o =>
            o.status === 'pending' || o.status === 'in_progress'
          ).length
        };

        // Calculate per-department metrics (using filtered orders)
        const orderTypes = ['sales', 'service', 'recon', 'carwash'];
        const departments: DepartmentMetrics[] = orderTypes.map(orderType => {
          const deptOrders = filteredOrders.filter(o => o.order_type === orderType);
          const recentDeptOrders = recentOrders.filter(o => o.order_type === orderType);

          return {
            order_type: orderType,
            total: deptOrders.length,
            pending: deptOrders.filter(o => o.status === 'pending').length,
            inProgress: deptOrders.filter(o => o.status === 'in_progress').length,
            completed: deptOrders.filter(o => o.status === 'completed').length,
            // revenue calculation removed - no financial data
            createdToday: deptOrders.filter(o =>
              o.created_at?.startsWith(today)
            ).length,
            completedToday: deptOrders.filter(o =>
              o.status === 'completed' &&
              o.updated_at?.startsWith(today)
            ).length,
            last30Days: recentDeptOrders.length
          };
        });

        return {
          overall,
          departments
        };
      } catch (error) {
        console.error('Error in useDashboardData:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
}
