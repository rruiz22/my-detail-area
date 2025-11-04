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
  revenue: number;
  createdToday: number;
  completedToday: number;
  last30Days: number;
}

export interface OverallMetrics {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  revenue: number;
  activeVehicles: number;
}

export interface DashboardData {
  overall: OverallMetrics;
  departments: DepartmentMetrics[];
}

export function useDashboardData() {
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
    queryKey: ['dashboard-data', user?.id, selectedDealer],
    queryFn: async (): Promise<DashboardData> => {
      if (!user) {
        return {
          overall: {
            totalOrders: 0,
            pendingOrders: 0,
            completedToday: 0,
            revenue: 0,
            activeVehicles: 0
          },
          departments: []
        };
      }

      try {
        // Fetch all orders data (RLS will automatically filter by user's dealership access)
        const { data: orders, error } = await supabase
          .from('orders')
          .select('order_type, status, total_amount, created_at, updated_at');

        if (error) {
          console.error('Error fetching dashboard data:', error);
          throw error;
        }

        const ordersList = orders || [];

        // Apply dealer filter (after RLS has already filtered by security)
        const filteredOrders = selectedDealer === 'all'
          ? ordersList
          : ordersList.filter(o => o.dealer_id === selectedDealer);

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
          revenue: filteredOrders.reduce((sum, o) =>
            sum + (parseFloat(o.total_amount || '0')), 0
          ),
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
            revenue: deptOrders.reduce((sum, o) =>
              sum + (parseFloat(o.total_amount || '0')), 0
            ),
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
