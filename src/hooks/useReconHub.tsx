import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  ReconOrderWithWorkflow,
  T2LStats,
  ColorTriggerAlert,
  ReconHubFilters,
  ReconWorkflow,
  ReconStepInstance
} from '@/types/recon-hub';

interface UseReconHubProps {
  dealerId: number;
  filters?: ReconHubFilters;
}

export function useReconHub({ dealerId, filters }: UseReconHubProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Fetch all recon orders with workflow data
   */
  const { 
    data: reconOrders = [], 
    isLoading: ordersLoading,
    error: ordersError 
  } = useQuery({
    queryKey: ['recon-orders', dealerId, filters],
    queryFn: async (): Promise<ReconOrderWithWorkflow[]> => {
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          vehicle_year,
          vehicle_make,
          vehicle_model,
          vehicle_vin,
          status,
          created_at,
          updated_at,
          recon_t2l_metrics (
            id,
            acquisition_date,
            frontline_ready_date,
            holding_cost_daily
          ),
          recon_vehicle_locations (
            id,
            location_name,
            coordinates,
            qr_code,
            scanned_at
          )
        `)
        .eq('dealer_id', dealerId)
        .eq('order_type', 'recon')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters?.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.from.toISOString())
          .lte('created_at', filters.dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include workflow information
      return (data || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        vehicle_year: order.vehicle_year,
        vehicle_make: order.vehicle_make,
        vehicle_model: order.vehicle_model,
        vehicle_vin: order.vehicle_vin,
        status: order.status,
        t2lMetrics: order.recon_t2l_metrics?.[0] || undefined,
        location: order.recon_vehicle_locations?.[0] || undefined
      } as ReconOrderWithWorkflow));
    },
    enabled: !!dealerId
  });

  /**
   * Fetch T2L statistics
   */
  const { 
    data: t2lStats,
    isLoading: t2lLoading 
  } = useQuery({
    queryKey: ['t2l-stats', dealerId],
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
   * Fetch active workflows
   */
  const { 
    data: workflows = [],
    isLoading: workflowsLoading 
  } = useQuery({
    queryKey: ['recon-workflows', dealerId],
    queryFn: async (): Promise<ReconWorkflow[]> => {
      const { data, error } = await supabase
        .from('recon_workflows')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!dealerId
  });

  /**
   * Generate color trigger alerts
   */
  const generateColorTriggerAlerts = (orders: ReconOrderWithWorkflow[]): ColorTriggerAlert[] => {
    const alerts: ColorTriggerAlert[] = [];

    orders.forEach(order => {
      if (order.status === 'completed' || order.status === 'cancelled') return;

      const daysInProcess = order.t2lMetrics ? 
        Math.ceil((Date.now() - new Date(order.t2lMetrics.acquisition_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      let severity: ColorTriggerAlert['severity'] = 'low';
      let color: ColorTriggerAlert['color'] = 'green';

      if (daysInProcess >= 10) {
        severity = 'critical';
        color = 'red';
      } else if (daysInProcess >= 7) {
        severity = 'high';
        color = 'orange';
      } else if (daysInProcess >= 4) {
        severity = 'medium';
        color = 'yellow';
      }

      if (severity !== 'low') {
        alerts.push({
          id: order.id,
          orderId: order.id,
          vehicleInfo: `${order.vehicle_year || ''} ${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim(),
          stepName: order.status,
          stepType: 'created', // This would be determined by current step
          daysOverdue: Math.max(0, daysInProcess - 3), // Target is 3-4 days
          severity,
          color
        });
      }
    });

    return alerts.sort((a, b) => b.daysOverdue - a.daysOverdue);
  };

  const colorTriggerAlerts = generateColorTriggerAlerts(reconOrders);

  /**
   * Complete a step instance
   */
  const completeStepMutation = useMutation({
    mutationFn: async ({ stepInstanceId, notes }: { stepInstanceId: string; notes?: string }) => {
      const { error } = await supabase
        .from('recon_step_instances')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes 
        })
        .eq('id', stepInstanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-orders', dealerId] });
      queryClient.invalidateQueries({ queryKey: ['t2l-stats', dealerId] });
      toast({
        title: "Step Completed",
        description: "Workflow step has been marked as completed"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to complete step: " + error.message,
        variant: "destructive"
      });
    }
  });

  /**
   * Move vehicle to new location
   */
  const updateLocationMutation = useMutation({
    mutationFn: async ({ 
      orderId, 
      locationName, 
      coordinates 
    }: { 
      orderId: string; 
      locationName: string; 
      coordinates?: { lat: number; lng: number } 
    }) => {
      const { error } = await supabase
        .from('recon_vehicle_locations')
        .upsert({
          order_id: orderId,
          location_name: locationName,
          coordinates: coordinates ? `(${coordinates.lat},${coordinates.lng})` : null,
          scanned_at: new Date().toISOString()
        }, {
          onConflict: 'order_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-orders', dealerId] });
      toast({
        title: "Location Updated",
        description: "Vehicle location has been updated"
      });
    },
    onError: (error) => {
      toast({
        title: "Error", 
        description: "Failed to update location: " + error.message,
        variant: "destructive"
      });
    }
  });

  /**
   * Dashboard summary stats
   */
  const dashboardStats = {
    totalActiveVehicles: reconOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length,
    averageT2L: t2lStats ? Math.round((t2lStats.average_t2l_hours || 0) / 24 * 10) / 10 : 0,
    criticalAlerts: colorTriggerAlerts.filter(a => a.severity === 'critical').length,
    completedThisMonth: reconOrders.filter(o => {
      if (!o.t2lMetrics?.frontline_ready_date) return false;
      const completedDate = new Date(o.t2lMetrics.frontline_ready_date);
      const now = new Date();
      return completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear();
    }).length
  };

  return {
    // Data
    reconOrders,
    t2lStats,
    workflows,
    colorTriggerAlerts,
    dashboardStats,

    // Loading states
    isLoading: ordersLoading || t2lLoading || workflowsLoading || isLoading,
    ordersLoading,
    t2lLoading,
    workflowsLoading,

    // Errors
    ordersError,

    // Actions
    completeStep: completeStepMutation.mutate,
    updateLocation: updateLocationMutation.mutate,
    
    // Mutation states
    completingStep: completeStepMutation.isPending,
    updatingLocation: updateLocationMutation.isPending
  };
}

export default useReconHub;