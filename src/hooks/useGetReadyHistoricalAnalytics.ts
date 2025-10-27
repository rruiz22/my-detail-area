import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export type TimeRange = '7d' | '30d' | '90d' | 'custom';

export interface HistoricalKPI {
  date: string;
  avg_t2l: number;
  daily_throughput: number;
  sla_compliance: number;
  active_vehicles: number;
  vehicles_completed: number;
}

export interface StepAnalytics {
  step_id: string;
  step_name: string;
  total_vehicles: number;
  revisit_rate: number;
  avg_time_first_visit: number;
  avg_time_revisits: number;
  avg_total_time: number;
  max_revisits: number;
  backtrack_count: number;
}

export interface BacktrackDetails {
  vehicle_id: string;
  vehicle_vin: string;
  from_step: string;
  to_step: string;
  backtrack_date: string;
  hours_lost: number;
}

export interface StepPerformanceTrend {
  step_id: string;
  step_name: string;
  current_avg_time: number;
  previous_avg_time: number;
  trend: 'improving' | 'declining' | 'stable';
  percent_change: number;
}

export interface WorkflowEfficiency {
  workflow_type: 'standard' | 'express' | 'priority';
  vehicle_count: number;
  avg_t2l: number;
  previous_avg_t2l: number;
  success_rate: number;
  trend: 'improving' | 'declining' | 'stable';
  percent_change: number;
}

export interface PeriodComparison {
  current: {
    avg_t2l: number;
    throughput: number;
    sla_compliance: number;
    active_vehicles: number;
  };
  previous: {
    avg_t2l: number;
    throughput: number;
    sla_compliance: number;
    active_vehicles: number;
  };
  changes: {
    t2l_change: number;
    throughput_change: number;
    sla_change: number;
    active_change: number;
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const getTimeRangeDays = (timeRange: TimeRange): number => {
  switch (timeRange) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    default: return 30;
  }
};

const getDateRange = (timeRange: TimeRange, customStart?: Date, customEnd?: Date) => {
  if (timeRange === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - getTimeRangeDays(timeRange));

  return { start, end };
};

const calculateTrend = (current: number, previous: number): 'improving' | 'declining' | 'stable' => {
  const percentChange = ((current - previous) / previous) * 100;
  if (Math.abs(percentChange) < 5) return 'stable';
  return current < previous ? 'improving' : 'declining'; // Lower is better for time metrics
};

// =====================================================
// HOOK 1: Historical KPIs (Time Series Data)
// =====================================================

export function useHistoricalKPIs(
  timeRange: TimeRange = '30d',
  customStart?: Date,
  customEnd?: Date
) {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id;

  const { start, end } = getDateRange(timeRange, customStart, customEnd);

  // FIX: Use stable date strings for queryKey to prevent infinite loops
  const startDateKey = start.toISOString().split('T')[0]; // Just the date part
  const endDateKey = end.toISOString().split('T')[0];

  return useQuery<HistoricalKPI[]>({
    queryKey: ['get-ready-historical-kpis', dealerId, timeRange, startDateKey, endDateKey],
    queryFn: async () => {
      if (!dealerId) throw new Error('No dealer selected');

      console.log('🔍 [get_historical_kpis] Calling RPC with params:', {
        p_dealer_id: dealerId,
        p_dealer_id_type: typeof dealerId,
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
        dealership: currentDealership
      });

      const { data, error } = await supabase.rpc('get_historical_kpis', {
        p_dealer_id: dealerId,
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
      });

      if (error) {
        console.error('❌ [get_historical_kpis] RPC Error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          params_sent: {
            p_dealer_id: dealerId,
            p_start_date: start.toISOString(),
            p_end_date: end.toISOString(),
          }
        });
        throw error;
      }

      console.log('✅ [get_historical_kpis] Success:', {
        records_returned: data?.length || 0,
        sample_data: data?.[0] || null
      });

      return data || [];
    },
    enabled: !!dealerId, // RE-ENABLED with stable queryKey to prevent loops
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

// =====================================================
// HOOK 2: Step Revisit Analytics
// =====================================================

export function useStepRevisitAnalytics(timeRange: TimeRange = '30d') {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id;
  const daysBack = getTimeRangeDays(timeRange);

  return useQuery<StepAnalytics[]>({
    queryKey: ['get-ready-step-analytics', dealerId, daysBack],
    queryFn: async () => {
      if (!dealerId) throw new Error('No dealer selected');

      console.log('🔍 [get_dealer_step_analytics] Calling RPC with params:', {
        p_dealer_id: dealerId,
        p_dealer_id_type: typeof dealerId,
        p_days_back: daysBack,
        p_days_back_type: typeof daysBack,
        dealership: currentDealership
      });

      const { data, error } = await supabase.rpc('get_dealer_step_analytics', {
        p_dealer_id: dealerId,
        p_days_back: daysBack,
      });

      if (error) {
        console.error('❌ [get_dealer_step_analytics] RPC Error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          params_sent: {
            p_dealer_id: dealerId,
            p_days_back: daysBack,
          }
        });
        throw error;
      }

      console.log('✅ [get_dealer_step_analytics] Success:', {
        records_returned: data?.length || 0,
        sample_data: data?.[0] || null
      });

      return data || [];
    },
    enabled: !!dealerId, // RE-ENABLED with better cache config
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
}

// =====================================================
// HOOK 3: Backtrack Analysis
// =====================================================

export function useBacktrackAnalysis(timeRange: TimeRange = '30d') {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id;
  const daysBack = getTimeRangeDays(timeRange);

  return useQuery<BacktrackDetails[]>({
    queryKey: ['get-ready-backtrack-analysis', dealerId, daysBack],
    queryFn: async () => {
      if (!dealerId) throw new Error('No dealer selected');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Query vehicle step history for backtracks
      const { data, error } = await supabase
        .from('vehicle_step_history')
        .select(`
          vehicle_id,
          step_id,
          step_name,
          entry_date,
          hours_accumulated,
          is_backtrack,
          metadata,
          vehicle:get_ready_vehicles!inner(
            vin,
            stock_number
          )
        `)
        .eq('dealer_id', dealerId)
        .eq('is_backtrack', true)
        .gte('entry_date', startDate.toISOString())
        .order('entry_date', { ascending: false });

      if (error) throw error;

      // Transform data
      return (data || []).map((record: any) => ({
        vehicle_id: record.vehicle_id,
        vehicle_vin: record.vehicle?.vin || 'N/A',
        from_step: record.metadata?.previous_step_name || 'Unknown',
        to_step: record.step_name,
        backtrack_date: record.entry_date,
        hours_lost: record.hours_accumulated || 0,
      }));
    },
    enabled: !!dealerId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOK 4: Step Performance Trends
// =====================================================

export function useStepPerformanceTrends(timeRange: TimeRange = '30d') {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id;
  const daysBack = getTimeRangeDays(timeRange);

  return useQuery<StepPerformanceTrend[]>({
    queryKey: ['get-ready-step-performance-trends', dealerId, daysBack],
    queryFn: async () => {
      if (!dealerId) throw new Error('No dealer selected');

      // Get current period analytics
      const currentDays = Math.floor(daysBack / 2);
      const { data: currentData, error: currentError } = await supabase.rpc(
        'get_dealer_step_analytics',
        {
          p_dealer_id: dealerId,
          p_days_back: currentDays,
        }
      );

      if (currentError) throw currentError;

      // Get previous period analytics
      const { data: previousData, error: previousError } = await supabase.rpc(
        'get_dealer_step_analytics',
        {
          p_dealer_id: dealerId,
          p_days_back: daysBack,
        }
      );

      if (previousError) throw previousError;

      // Calculate trends
      const trends: StepPerformanceTrend[] = (currentData || []).map((current: StepAnalytics) => {
        const previous = (previousData || []).find((p: StepAnalytics) => p.step_id === current.step_id);
        const previousAvg = previous?.avg_total_time || current.avg_total_time;
        const percentChange = previousAvg > 0
          ? ((current.avg_total_time - previousAvg) / previousAvg) * 100
          : 0;

        return {
          step_id: current.step_id,
          step_name: current.step_name,
          current_avg_time: current.avg_total_time,
          previous_avg_time: previousAvg,
          trend: calculateTrend(current.avg_total_time, previousAvg),
          percent_change: Math.round(percentChange * 10) / 10,
        };
      });

      return trends;
    },
    enabled: !!dealerId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOK 5: Workflow Efficiency Trends
// =====================================================

export function useWorkflowEfficiencyTrends(timeRange: TimeRange = '30d') {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id;
  const daysBack = getTimeRangeDays(timeRange);

  return useQuery<WorkflowEfficiency[]>({
    queryKey: ['get-ready-workflow-efficiency', dealerId, daysBack],
    queryFn: async () => {
      if (!dealerId) throw new Error('No dealer selected');

      const currentDate = new Date();
      const currentStartDate = new Date();
      currentStartDate.setDate(currentStartDate.getDate() - Math.floor(daysBack / 2));

      const previousStartDate = new Date();
      previousStartDate.setDate(previousStartDate.getDate() - daysBack);

      // Get current period data
      const { data: currentVehicles, error: currentError } = await supabase
        .from('get_ready_vehicles')
        .select('workflow_type, actual_t2l, status')
        .eq('dealer_id', dealerId)
        .gte('created_at', currentStartDate.toISOString())
        .is('deleted_at', null);

      if (currentError) throw currentError;

      // Get previous period data
      const { data: previousVehicles, error: previousError } = await supabase
        .from('get_ready_vehicles')
        .select('workflow_type, actual_t2l, status')
        .eq('dealer_id', dealerId)
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', currentStartDate.toISOString())
        .is('deleted_at', null);

      if (previousError) throw previousError;

      // Calculate efficiency by workflow type
      const workflowTypes = ['standard', 'express', 'priority'] as const;
      const efficiency: WorkflowEfficiency[] = workflowTypes.map(type => {
        // Current period stats
        const currentFiltered = (currentVehicles || []).filter(v => v.workflow_type === type);
        const currentAvgT2L = currentFiltered.length > 0
          ? currentFiltered.reduce((sum, v) => sum + (v.actual_t2l || 0), 0) / currentFiltered.length
          : 0;
        const currentCompleted = currentFiltered.filter(v => v.status === 'completed').length;
        const currentSuccessRate = currentFiltered.length > 0
          ? (currentCompleted / currentFiltered.length) * 100
          : 0;

        // Previous period stats
        const previousFiltered = (previousVehicles || []).filter(v => v.workflow_type === type);
        const previousAvgT2L = previousFiltered.length > 0
          ? previousFiltered.reduce((sum, v) => sum + (v.actual_t2l || 0), 0) / previousFiltered.length
          : currentAvgT2L;

        const percentChange = previousAvgT2L > 0
          ? ((currentAvgT2L - previousAvgT2L) / previousAvgT2L) * 100
          : 0;

        return {
          workflow_type: type,
          vehicle_count: currentFiltered.length,
          avg_t2l: Math.round(currentAvgT2L * 10) / 10,
          previous_avg_t2l: Math.round(previousAvgT2L * 10) / 10,
          success_rate: Math.round(currentSuccessRate * 10) / 10,
          trend: calculateTrend(currentAvgT2L, previousAvgT2L),
          percent_change: Math.round(percentChange * 10) / 10,
        };
      });

      return efficiency;
    },
    enabled: !!dealerId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOK 6: Period-over-Period Comparison
// =====================================================

export function usePeriodComparison(timeRange: TimeRange = '30d') {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id;
  const daysBack = getTimeRangeDays(timeRange);

  return useQuery<PeriodComparison>({
    queryKey: ['get-ready-period-comparison', dealerId, daysBack],
    queryFn: async () => {
      if (!dealerId) throw new Error('No dealer selected');

      const currentDate = new Date();
      const currentStartDate = new Date();
      currentStartDate.setDate(currentStartDate.getDate() - daysBack);

      const previousStartDate = new Date();
      previousStartDate.setDate(previousStartDate.getDate() - (daysBack * 2));

      // Current period KPIs
      const { data: currentKPIs, error: currentError } = await supabase.rpc(
        'get_historical_kpis',
        {
          p_dealer_id: dealerId,
          p_start_date: currentStartDate.toISOString(),
          p_end_date: currentDate.toISOString(),
        }
      );

      if (currentError) throw currentError;

      // Previous period KPIs
      const { data: previousKPIs, error: previousError } = await supabase.rpc(
        'get_historical_kpis',
        {
          p_dealer_id: dealerId,
          p_start_date: previousStartDate.toISOString(),
          p_end_date: currentStartDate.toISOString(),
        }
      );

      if (previousError) throw previousError;

      // Calculate averages
      const currentAvg = {
        avg_t2l: currentKPIs?.length > 0
          ? currentKPIs.reduce((sum: number, d: any) => sum + (d.avg_t2l || 0), 0) / currentKPIs.length
          : 0,
        throughput: currentKPIs?.reduce((sum: number, d: any) => sum + (d.daily_throughput || 0), 0) || 0,
        sla_compliance: currentKPIs?.length > 0
          ? currentKPIs.reduce((sum: number, d: any) => sum + (d.sla_compliance || 0), 0) / currentKPIs.length
          : 0,
        active_vehicles: currentKPIs?.length > 0
          ? currentKPIs[currentKPIs.length - 1]?.active_vehicles || 0
          : 0,
      };

      const previousAvg = {
        avg_t2l: previousKPIs?.length > 0
          ? previousKPIs.reduce((sum: number, d: any) => sum + (d.avg_t2l || 0), 0) / previousKPIs.length
          : 0,
        throughput: previousKPIs?.reduce((sum: number, d: any) => sum + (d.daily_throughput || 0), 0) || 0,
        sla_compliance: previousKPIs?.length > 0
          ? previousKPIs.reduce((sum: number, d: any) => sum + (d.sla_compliance || 0), 0) / previousKPIs.length
          : 0,
        active_vehicles: previousKPIs?.length > 0
          ? previousKPIs[previousKPIs.length - 1]?.active_vehicles || 0
          : 0,
      };

      const changes = {
        t2l_change: previousAvg.avg_t2l > 0
          ? ((currentAvg.avg_t2l - previousAvg.avg_t2l) / previousAvg.avg_t2l) * 100
          : 0,
        throughput_change: previousAvg.throughput > 0
          ? ((currentAvg.throughput - previousAvg.throughput) / previousAvg.throughput) * 100
          : 0,
        sla_change: previousAvg.sla_compliance > 0
          ? ((currentAvg.sla_compliance - previousAvg.sla_compliance) / previousAvg.sla_compliance) * 100
          : 0,
        active_change: previousAvg.active_vehicles > 0
          ? ((currentAvg.active_vehicles - previousAvg.active_vehicles) / previousAvg.active_vehicles) * 100
          : 0,
      };

      return {
        current: currentAvg,
        previous: previousAvg,
        changes,
      };
    },
    enabled: !!dealerId,
    staleTime: 5 * 60 * 1000,
  });
}

// =====================================================
// HOOK 7: Bottleneck Detection (IMPROVED - Current + Historical)
// =====================================================

export function useBottleneckDetection(timeRange: TimeRange = '30d', topN: number = 3) {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id;
  const stepAnalytics = useStepRevisitAnalytics(timeRange);

  return useQuery({
    queryKey: ['get-ready-bottleneck-detection', dealerId, stepAnalytics.data, topN],
    queryFn: async () => {
      if (!dealerId || !stepAnalytics.data) return [];

      // Get current state of vehicles per step
      const { data: currentState, error } = await supabase.rpc('get_current_vehicles_per_step', {
        p_dealer_id: dealerId
      });

      if (error) {
        console.error('Error fetching current vehicles per step:', error);
        // Fallback to historical data only
        return stepAnalytics.data
          .map(step => ({
            ...step,
            current_vehicle_count: 0,
            vehicles_over_sla: 0,
            bottleneck_score: 0,
            severity: 'medium' as const
          }))
          .slice(0, topN);
      }

      // Combine historical analytics with current state
      const scoredSteps = stepAnalytics.data.map(step => {
        const currentData = currentState?.find(c => c.step_id === step.step_id);
        const currentVehicles = currentData?.current_vehicle_count || 0;
        const vehiclesOverSLA = currentData?.vehicles_over_sla || 0;

        // IMPROVED BOTTLENECK FORMULA:
        // Focus on what's slowing down the process to frontline RIGHT NOW

        // 1. Current backlog (40%) - Most important: vehicles stuck NOW
        const backlogScore = Math.min(100, (currentVehicles / 5) * 100); // Normalize to 5 vehicles

        // 2. Average time in step (30%) - How slow is this step
        const avgDays = step.avg_total_time / 24;
        const timeScore = Math.min(100, (avgDays / 3) * 100); // Normalize to 3 days

        // 3. Revisit rate (20%) - Quality issues causing rework
        const revisitScore = step.revisit_rate || 0;

        // 4. SLA violations (10%) - Vehicles at risk
        const slaScore = currentVehicles > 0
          ? (vehiclesOverSLA / currentVehicles) * 100
          : 0;

        const totalScore = (backlogScore * 0.4) + (timeScore * 0.3) + (revisitScore * 0.2) + (slaScore * 0.1);

        return {
          ...step,
          current_vehicle_count: currentVehicles,
          vehicles_over_sla: vehiclesOverSLA,
          avg_days_in_step: avgDays,
          bottleneck_score: Math.round(totalScore * 10) / 10,
          severity: totalScore > 60 ? 'critical' : totalScore > 35 ? 'high' : 'medium',
        };
      });

      // Sort by score and return top N
      return scoredSteps
        .sort((a, b) => b.bottleneck_score - a.bottleneck_score)
        .slice(0, topN);
    },
    enabled: !!dealerId && !!stepAnalytics.data && stepAnalytics.data.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

// =====================================================
// HOOK 8: Step Visit History for a Vehicle
// =====================================================

export function useVehicleStepHistory(vehicleId: string | null) {
  return useQuery({
    queryKey: ['vehicle-step-history', vehicleId],
    queryFn: async () => {
      if (!vehicleId) throw new Error('No vehicle ID provided');

      const { data, error } = await supabase
        .from('vehicle_step_history')
        .select(`
          *,
          step:get_ready_steps(name, color, order_index)
        `)
        .eq('vehicle_id', vehicleId)
        .order('entry_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!vehicleId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
