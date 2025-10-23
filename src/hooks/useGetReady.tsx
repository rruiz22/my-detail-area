import { mockVehicles } from '@/data/mockVehicles';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { BottleneckAlert, GetReadyKPIs, GetReadyStep, SLAAlert } from '@/types/getReady';
import { validateDealershipObject } from '@/utils/dealerValidation';

import { useOrderPolling } from '@/hooks/useSmartPolling';

export function useGetReadySteps() {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);

  return useOrderPolling(
    ['get-ready-steps', currentDealership?.id],
    async (): Promise<GetReadyStep[]> => {
      if (!dealerId) {
        console.warn('No dealership selected, using mock data');
        // Fallback to mock data
        const vehicleCounts = mockVehicles.reduce((acc, vehicle) => {
          acc[vehicle.step_id] = (acc[vehicle.step_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const totalVehicles = mockVehicles.length;

        // Return mock steps
        return [
        {
          id: 'all',
          name: 'All',
          description: 'All vehicles in the reconditioning process',
          order_index: 0,
          color: '#6B7280',
          icon: 'grid',
          vehicle_count: totalVehicles,
          is_default: true,
          days_in_step_avg: 5.2,
          days_to_frontline_avg: 12.5,
          // Get Ready fields
          sla_hours: 24,
          target_throughput: 5,
          bottleneck_threshold: 48,
          parallel_capable: true,
          express_lane_eligible: true,
          cost_per_day: 35
        },
        {
          id: 'inspection',
          name: 'Inspection',
          description: 'Initial vehicle inspection and assessment',
          order_index: 1,
          color: '#3B82F6',
          icon: 'search',
          vehicle_count: vehicleCounts['inspection'] || 0,
          is_default: false,
          days_in_step_avg: 3.1,
          days_to_frontline_avg: 15.2,
          // Get Ready fields
          sla_hours: 48,
          target_throughput: 4,
          bottleneck_threshold: 72,
          parallel_capable: false,
          express_lane_eligible: true,
          cost_per_day: 25
        },
        {
          id: 'mechanical',
          name: 'Mechanical',
          description: 'Mechanical repairs and maintenance',
          order_index: 2,
          color: '#10B981',
          icon: 'wrench',
          vehicle_count: vehicleCounts['mechanical'] || 0,
          is_default: false,
          days_in_step_avg: 7.4,
          days_to_frontline_avg: 8.1,
          // Get Ready fields
          sla_hours: 120,
          target_throughput: 2,
          bottleneck_threshold: 168,
          parallel_capable: true,
          express_lane_eligible: false,
          cost_per_day: 45
        },
        {
          id: 'body_work',
          name: 'Body Work',
          description: 'Body and paint repairs',
          order_index: 3,
          color: '#F59E0B',
          icon: 'hammer',
          vehicle_count: vehicleCounts['body_work'] || 0,
          is_default: false,
          days_in_step_avg: 4.8,
          days_to_frontline_avg: 6.3,
          // Get Ready fields
          sla_hours: 96,
          target_throughput: 1,
          bottleneck_threshold: 144,
          parallel_capable: false,
          express_lane_eligible: false,
          cost_per_day: 55
        },
        {
          id: 'detailing',
          name: 'Detailing',
          description: 'Final cleaning and detailing',
          order_index: 4,
          color: '#8B5CF6',
          icon: 'sparkles',
          vehicle_count: vehicleCounts['detailing'] || 0,
          is_default: false,
          days_in_step_avg: 2.5,
          days_to_frontline_avg: 2.5,
          // Get Ready fields
          sla_hours: 24,
          target_throughput: 3,
          bottleneck_threshold: 48,
          parallel_capable: true,
          express_lane_eligible: true,
          cost_per_day: 30
        },
        {
          id: 'ready',
          name: 'Ready',
          description: 'Ready for front line',
          order_index: 5,
          color: '#059669',
          icon: 'check',
          vehicle_count: vehicleCounts['ready'] || 0,
          is_default: false,
          days_in_step_avg: 0,
          days_to_frontline_avg: 0,
          // Get Ready fields
          sla_hours: 0,
          target_throughput: 10,
          bottleneck_threshold: 0,
          parallel_capable: true,
          express_lane_eligible: true,
          cost_per_day: 0
        }
      ];
      }

      // Use RPC function to get steps with vehicle counts
      const { data, error } = await supabase.rpc('get_step_vehicle_counts', {
        p_dealer_id: dealerId,
      });

      // If RPC function doesn't exist yet (migration not applied), use mock data
      if (error && error.code === 'PGRST202') {
        console.warn('⚠️ RPC function not found, using mock data. Please apply the database migration.');
        // Return mock data instead
        const vehicleCounts = mockVehicles.reduce((acc, vehicle) => {
          acc[vehicle.step_id] = (acc[vehicle.step_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const totalVehicles = mockVehicles.length;

        // Return mock steps with counts
        return [
          {
            id: 'all',
            name: 'All',
            description: 'All vehicles in the reconditioning process',
            order_index: 0,
            color: '#6B7280',
            icon: 'grid',
            vehicle_count: totalVehicles,
            is_default: true,
            days_in_step_avg: 5.2,
            days_to_frontline_avg: 12.5,
            sla_hours: 24,
            target_throughput: 5,
            bottleneck_threshold: 48,
            parallel_capable: true,
            express_lane_eligible: true,
            cost_per_day: 35
          },
          {
            id: 'inspection',
            name: 'Inspection',
            description: 'Initial vehicle inspection and assessment',
            order_index: 1,
            color: '#3B82F6',
            icon: 'search',
            vehicle_count: vehicleCounts['inspection'] || 0,
            is_default: false,
            days_in_step_avg: 3.1,
            days_to_frontline_avg: 15.2,
            sla_hours: 48,
            target_throughput: 4,
            bottleneck_threshold: 72,
            parallel_capable: false,
            express_lane_eligible: true,
            cost_per_day: 25
          },
          {
            id: 'mechanical',
            name: 'Mechanical',
            description: 'Mechanical repairs and maintenance',
            order_index: 2,
            color: '#10B981',
            icon: 'wrench',
            vehicle_count: vehicleCounts['mechanical'] || 0,
            is_default: false,
            days_in_step_avg: 7.4,
            days_to_frontline_avg: 8.1,
            sla_hours: 120,
            target_throughput: 2,
            bottleneck_threshold: 168,
            parallel_capable: true,
            express_lane_eligible: false,
            cost_per_day: 45
          },
          {
            id: 'body_work',
            name: 'Body Work',
            description: 'Body and paint repairs',
            order_index: 3,
            color: '#F59E0B',
            icon: 'hammer',
            vehicle_count: vehicleCounts['body_work'] || 0,
            is_default: false,
            days_in_step_avg: 4.8,
            days_to_frontline_avg: 6.3,
            sla_hours: 96,
            target_throughput: 1,
            bottleneck_threshold: 144,
            parallel_capable: false,
            express_lane_eligible: false,
            cost_per_day: 55
          },
          {
            id: 'detailing',
            name: 'Detailing',
            description: 'Final cleaning and detailing',
            order_index: 4,
            color: '#8B5CF6',
            icon: 'sparkles',
            vehicle_count: vehicleCounts['detailing'] || 0,
            is_default: false,
            days_in_step_avg: 2.5,
            days_to_frontline_avg: 2.5,
            sla_hours: 24,
            target_throughput: 3,
            bottleneck_threshold: 48,
            parallel_capable: true,
            express_lane_eligible: true,
            cost_per_day: 30
          },
          {
            id: 'ready',
            name: 'Ready',
            description: 'Ready for front line',
            order_index: 5,
            color: '#059669',
            icon: 'check',
            vehicle_count: vehicleCounts['ready'] || 0,
            is_default: false,
            days_in_step_avg: 0,
            days_to_frontline_avg: 0,
            sla_hours: 0,
            target_throughput: 10,
            bottleneck_threshold: 0,
            parallel_capable: true,
            express_lane_eligible: true,
            cost_per_day: 0
          }
        ];
      }

      if (error) {
        console.error('Error fetching steps:', error);
        throw error;
      }

      // Use new RPC function with vehicles grouped by days
      const { data: vehiclesByDays, error: daysError } = await supabase.rpc('get_vehicles_by_days_in_step', {
        p_dealer_id: dealerId,
        p_step_id: null, // Get all steps
      });

      if (daysError) {
        console.warn('get_vehicles_by_days_in_step not available, falling back to basic counts:', daysError);
        // Fallback to basic step data
        const { data: stepsData } = await supabase
          .from('get_ready_steps')
          .select('*')
          .eq('dealer_id', dealerId)
          .eq('is_active', true)
          .order('order_index');

        if (!stepsData) return [];

        return stepsData.map(step => {
          const countData = data?.find((d: any) => d.step_id === step.id);
          return {
            ...step,
            vehicle_count: countData?.vehicle_count || 0,
            days_in_step_avg: countData?.avg_days_in_step || 0,
            days_to_frontline_avg: 0,
          };
        });
      }

      // Transform vehiclesByDays data to GetReadyStep format
      const { data: stepsData } = await supabase
        .from('get_ready_steps')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('order_index');

      if (!stepsData) return [];

      // Merge step data with vehicle counts and day groupings
      return stepsData.map(step => {
        const daysData = vehiclesByDays?.find((d: any) => d.step_id === step.id);
        const countData = data?.find((d: any) => d.step_id === step.id);

        return {
          ...step,
          vehicle_count: daysData?.total_vehicles || 0,
          vehicles_1_day: daysData?.vehicles_1_day || 0,
          vehicles_2_3_days: daysData?.vehicles_2_3_days || 0,
          vehicles_4_plus_days: daysData?.vehicles_4_plus_days || 0,
          days_in_step_avg: daysData?.avg_days_in_step || countData?.avg_days_in_step || 0,
          days_to_frontline_avg: 0,
        };
      });
    },
    !!dealerId
  );
}

export function useGetReadyKPIs() {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);

  return useOrderPolling(
    ['get-ready-kpis', currentDealership?.id],
    async (): Promise<GetReadyKPIs> => {
      if (!dealerId) {
        console.warn('No dealership selected, using mock KPIs');
        // Fallback to mock data
        const totalVehicles = mockVehicles.length;
        const avgHoldingCost = mockVehicles.reduce((sum, v) => sum + v.holding_cost, 0) / totalVehicles;
        const totalHoldingCosts = mockVehicles.reduce((sum, v) => sum + v.holding_cost, 0);

        return {
          avgT2L: 8.5,
          targetT2L: 7.0,
          t2lVariance: 2.1,
          dailyThroughput: totalVehicles * 0.4,
          weeklyCapacity: totalVehicles * 2.75,
          utilizationRate: Math.min(0.95, totalVehicles / 10),
          slaCompliance: 0.85,
          reworkRate: 0.12,
          customerSatisfaction: 4.2,
          avgHoldingCost: Math.round(avgHoldingCost),
          totalHoldingCosts: totalHoldingCosts,
          roiImprovement: 0.23
        };
      }

      // Use RPC function to get real KPIs
      const { data, error } = await supabase.rpc('get_ready_kpis', {
        p_dealer_id: dealerId,
      });

      // If RPC function doesn't exist yet (migration not applied), use mock data
      if (error && error.code === 'PGRST202') {
        console.warn('⚠️ RPC function not found, using mock KPIs. Please apply the database migration.');
        const totalVehicles = mockVehicles.length;
        const avgHoldingCost = mockVehicles.reduce((sum, v) => sum + v.holding_cost, 0) / totalVehicles;
        const totalHoldingCosts = mockVehicles.reduce((sum, v) => sum + v.holding_cost, 0);

        return {
          avgT2L: 8.5,
          targetT2L: 7.0,
          t2lVariance: 2.1,
          dailyThroughput: totalVehicles * 0.4,
          weeklyCapacity: totalVehicles * 2.75,
          utilizationRate: Math.min(0.95, totalVehicles / 10),
          slaCompliance: 0.85,
          reworkRate: 0.12,
          customerSatisfaction: 4.2,
          avgHoldingCost: Math.round(avgHoldingCost),
          totalHoldingCosts: totalHoldingCosts,
          roiImprovement: 0.23
        };
      }

      if (error) {
        console.error('Error fetching KPIs:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        // Return default values if no data
        return {
          avgT2L: 0,
          targetT2L: 7.0,
          t2lVariance: 0,
          dailyThroughput: 0,
          weeklyCapacity: 0,
          utilizationRate: 0,
          slaCompliance: 0,
          reworkRate: 0,
          customerSatisfaction: 0,
          avgHoldingCost: 0,
          totalHoldingCosts: 0,
          roiImprovement: 0
        };
      }

      // Transform RPC data to GetReadyKPIs format
      const kpiData = data[0];
      return {
        avgT2L: parseFloat(kpiData.avg_t2l || 0),
        targetT2L: parseFloat(kpiData.target_t2l || 7.0),
        t2lVariance: 0, // Calculate if needed
        dailyThroughput: parseFloat(kpiData.daily_throughput || 0),
        weeklyCapacity: parseInt(kpiData.weekly_capacity || 0),
        utilizationRate: parseFloat(kpiData.utilization_rate || 0),
        slaCompliance: parseFloat(kpiData.sla_compliance || 0),
        reworkRate: 0, // Add to RPC function if needed
        customerSatisfaction: 0, // Add to RPC function if needed
        avgHoldingCost: parseFloat(kpiData.avg_holding_cost || 0),
        totalHoldingCosts: parseFloat(kpiData.total_holding_costs || 0),
        roiImprovement: 0 // Calculate if needed
      };
    },
    !!dealerId
  );
}

export function useBottleneckAlerts() {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);

  return useOrderPolling(
    ['bottleneck-alerts', currentDealership?.id],
    async (): Promise<BottleneckAlert[]> => {
      if (!dealerId) {
        return [];
      }

      // Use real RPC function
      const { data, error } = await supabase.rpc('get_bottleneck_alerts', {
        p_dealer_id: dealerId,
      });

      if (error) {
        console.error('Error fetching bottleneck alerts:', error);
        return [];
      }

      return data || [];
    },
    !!dealerId
  );
}

export function useSLAAlerts() {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = validateDealershipObject(currentDealership);

  return useOrderPolling(
    ['sla-alerts', currentDealership?.id],
    async (): Promise<SLAAlert[]> => {
      if (!dealerId) {
        return [];
      }

      // Use real RPC function
      const { data, error } = await supabase.rpc('get_sla_alerts', {
        p_dealer_id: dealerId,
      });

      if (error) {
        console.error('Error fetching SLA alerts:', error);
        return [];
      }

      return data || [];
    },
    !!dealerId
  );
}

// Main hook that combines all Get Ready functionality
export function useGetReady() {
  const steps = useGetReadySteps();
  const kpis = useGetReadyKPIs();
  const bottleneckAlerts = useBottleneckAlerts();
  const slaAlerts = useSLAAlerts();

  return {
    // Data
    steps: steps.data || [],
    kpis: kpis.data,
    bottleneckAlerts: bottleneckAlerts.data || [],
    slaAlerts: slaAlerts.data || [],

    // Loading states
    isLoading: steps.isLoading || kpis.isLoading,
    isLoadingAlerts: bottleneckAlerts.isLoading || slaAlerts.isLoading,

    // Error states
    hasError: steps.error || kpis.error || bottleneckAlerts.error || slaAlerts.error,

    // Refetch functions
    refetchSteps: steps.refetch,
    refetchKPIs: kpis.refetch,
    refetchAlerts: () => {
      bottleneckAlerts.refetch();
      slaAlerts.refetch();
    }
  };
}
