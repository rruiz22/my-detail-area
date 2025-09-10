import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  T2LStats, 
  T2LTrendData, 
  HoldingCostData 
} from '@/types/recon-hub';

interface UseT2LAnalyticsProps {
  dealerId: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export function useT2LAnalytics({ dealerId, dateRange }: UseT2LAnalyticsProps) {
  const defaultDateRange = {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  };

  const range = dateRange || defaultDateRange;

  /**
   * Get current T2L statistics
   */
  const { 
    data: currentStats,
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ['t2l-current-stats', dealerId],
    queryFn: async (): Promise<T2LStats> => {
      const { data, error } = await supabase
        .rpc('get_dealer_t2l_stats', { p_dealer_id: dealerId });

      if (error) throw error;

      return data[0] || {
        average_t2l_hours: 0,
        best_t2l_hours: 0,
        worst_active_t2l_hours: 0,
        total_vehicles: 0,
        completed_vehicles: 0,
        average_holding_cost: 0
      };
    },
    enabled: !!dealerId
  });

  /**
   * Get T2L trends over time
   */
  const { 
    data: t2lTrends = [],
    isLoading: trendsLoading 
  } = useQuery({
    queryKey: ['t2l-trends', dealerId, range],
    queryFn: async (): Promise<T2LTrendData[]> => {
      const { data, error } = await supabase
        .from('recon_t2l_metrics')
        .select(`
          acquisition_date,
          frontline_ready_date,
          holding_cost_daily,
          orders!inner (
            dealer_id,
            created_at
          )
        `)
        .eq('orders.dealer_id', dealerId)
        .gte('acquisition_date', range.from.toISOString())
        .lte('acquisition_date', range.to.toISOString())
        .not('frontline_ready_date', 'is', null);

      if (error) throw error;

      // Group by week and calculate averages
      const weeklyData = new Map<string, {
        totalT2L: number;
        count: number;
        date: string;
      }>();

      data?.forEach(metric => {
        if (!metric.frontline_ready_date) return;

        const acquisitionDate = new Date(metric.acquisition_date);
        const readyDate = new Date(metric.frontline_ready_date);
        const t2lHours = (readyDate.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60);
        const t2lDays = t2lHours / 24;

        // Group by week (starting Monday)
        const weekStart = new Date(acquisitionDate);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);

        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData.has(weekKey)) {
          weeklyData.set(weekKey, {
            totalT2L: 0,
            count: 0,
            date: weekKey
          });
        }

        const week = weeklyData.get(weekKey)!;
        week.totalT2L += t2lDays;
        week.count += 1;
      });

      return Array.from(weeklyData.values())
        .map(week => ({
          date: week.date,
          average_t2l: Math.round((week.totalT2L / week.count) * 10) / 10,
          completed_vehicles: week.count,
          target_t2l: 3.5 // Industry target
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    enabled: !!dealerId
  });

  /**
   * Get holding cost trends
   */
  const { 
    data: holdingCostTrends = [],
    isLoading: costsLoading 
  } = useQuery({
    queryKey: ['holding-cost-trends', dealerId, range],
    queryFn: async (): Promise<HoldingCostData[]> => {
      const { data, error } = await supabase
        .from('recon_t2l_metrics')
        .select(`
          acquisition_date,
          frontline_ready_date,
          holding_cost_daily,
          orders!inner (
            dealer_id,
            created_at
          )
        `)
        .eq('orders.dealer_id', dealerId)
        .gte('acquisition_date', range.from.toISOString())
        .lte('acquisition_date', range.to.toISOString());

      if (error) throw error;

      // Group by day and calculate daily holding costs
      const dailyData = new Map<string, {
        totalCost: number;
        vehicleCount: number;
        date: string;
      }>();

      data?.forEach(metric => {
        const acquisitionDate = new Date(metric.acquisition_date);
        const endDate = metric.frontline_ready_date ? 
          new Date(metric.frontline_ready_date) : 
          new Date();

        // Calculate days in process
        const daysInProcess = Math.ceil((endDate.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalCost = (metric.holding_cost_daily || 32) * daysInProcess;

        const dateKey = acquisitionDate.toISOString().split('T')[0];

        if (!dailyData.has(dateKey)) {
          dailyData.set(dateKey, {
            totalCost: 0,
            vehicleCount: 0,
            date: dateKey
          });
        }

        const day = dailyData.get(dateKey)!;
        day.totalCost += totalCost;
        day.vehicleCount += 1;
      });

      return Array.from(dailyData.values())
        .map(day => ({
          date: day.date,
          totalCost: Math.round(day.totalCost * 100) / 100,
          vehicleCount: day.vehicleCount,
          avgCostPerVehicle: Math.round((day.totalCost / day.vehicleCount) * 100) / 100
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    enabled: !!dealerId
  });

  /**
   * Calculate T2L performance metrics
   */
  const performanceMetrics = {
    // Target vs Actual
    targetT2L: 3.5, // days
    actualT2L: currentStats ? (currentStats.average_t2l_hours || 0) / 24 : 0,
    performanceGap: currentStats ? 
      ((currentStats.average_t2l_hours || 0) / 24) - 3.5 : 0,
    
    // Efficiency metrics
    onTimeRate: currentStats && currentStats.total_vehicles > 0 ? 
      (currentStats.completed_vehicles / currentStats.total_vehicles) * 100 : 0,
    
    // Cost metrics
    dailyHoldingCost: 32, // industry average
    monthlyHoldingCost: currentStats ? currentStats.average_holding_cost || 0 : 0,
    
    // Trend indicators
    isImproving: t2lTrends.length >= 2 ? 
      t2lTrends[t2lTrends.length - 1].average_t2l < t2lTrends[t2lTrends.length - 2].average_t2l : 
      false
  };

  /**
   * Calculate potential savings
   */
  const calculatePotentialSavings = () => {
    if (!currentStats) return { daily: 0, monthly: 0, annual: 0 };

    const currentAvgDays = (currentStats.average_t2l_hours || 0) / 24;
    const targetDays = 3.5;
    const savingsPerVehicle = Math.max(0, currentAvgDays - targetDays) * 32; // $32/day holding cost
    const vehiclesPerMonth = currentStats.total_vehicles || 0;

    return {
      daily: Math.round(savingsPerVehicle * (vehiclesPerMonth / 30) * 100) / 100,
      monthly: Math.round(savingsPerVehicle * vehiclesPerMonth * 100) / 100,
      annual: Math.round(savingsPerVehicle * vehiclesPerMonth * 12 * 100) / 100
    };
  };

  const potentialSavings = calculatePotentialSavings();

  return {
    // Core data
    currentStats,
    t2lTrends,
    holdingCostTrends,
    performanceMetrics,
    potentialSavings,

    // Loading states
    isLoading: statsLoading || trendsLoading || costsLoading,
    statsLoading,
    trendsLoading,
    costsLoading,

    // Utility functions
    calculateT2L: (acquisitionDate: string, readyDate?: string) => {
      const start = new Date(acquisitionDate);
      const end = readyDate ? new Date(readyDate) : new Date();
      return Math.round(((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) * 10) / 10;
    },

    calculateHoldingCost: (acquisitionDate: string, readyDate?: string, dailyCost = 32) => {
      const start = new Date(acquisitionDate);
      const end = readyDate ? new Date(readyDate) : new Date();
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return Math.round(days * dailyCost * 100) / 100;
    }
  };
}

export default useT2LAnalytics;