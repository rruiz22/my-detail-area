import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ColorTriggerAlert,
  ReconStepInstance,
  WorkflowStepType
} from '@/types/recon-hub';

interface UseReconAlertsProps {
  dealerId: number;
  alertThresholds?: {
    yellow: number; // days
    orange: number; // days  
    red: number; // days
  };
}

export function useReconAlerts({ 
  dealerId, 
  alertThresholds = { yellow: 4, orange: 7, red: 10 } 
}: UseReconAlertsProps) {

  /**
   * Fetch active recon orders with their step instances and T2L metrics
   */
  const { 
    data: alertData = [],
    isLoading: alertsLoading,
    error: alertsError 
  } = useQuery({
    queryKey: ['recon-alerts', dealerId],
    queryFn: async () => {
      const { data, error } = await supabase
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
          recon_t2l_metrics (
            id,
            acquisition_date,
            frontline_ready_date,
            holding_cost_daily
          ),
          recon_step_instances (
            id,
            status,
            started_at,
            completed_at,
            created_at,
            recon_workflow_steps (
              id,
              step_name,
              step_type,
              sla_hours,
              order_index
            )
          )
        `)
        .eq('dealer_id', dealerId)
        .eq('order_type', 'recon')
        .in('status', ['pending', 'in_progress'])  // Only active orders
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!dealerId,
    refetchInterval: 60000 // Refresh every minute
  });

  /**
   * Generate color trigger alerts based on T2L and step SLA violations
   */
  const colorTriggerAlerts: ColorTriggerAlert[] = useMemo(() => {
    const alerts: ColorTriggerAlert[] = [];
    const now = new Date();

    alertData.forEach(order => {
      const t2lMetrics = order.recon_t2l_metrics?.[0];
      const stepInstances = order.recon_step_instances || [];
      const vehicleInfo = `${order.vehicle_year || ''} ${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim() || order.order_number;

      // Calculate days since acquisition
      const acquisitionDate = t2lMetrics ? new Date(t2lMetrics.acquisition_date) : new Date(order.created_at);
      const daysInProcess = Math.ceil((now.getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24));

      // T2L-based alerts (overall vehicle time)
      if (daysInProcess >= alertThresholds.red) {
        alerts.push({
          id: `t2l-${order.id}`,
          orderId: order.id,
          vehicleInfo,
          stepName: 'Overall T2L',
          stepType: 'created',
          daysOverdue: daysInProcess - alertThresholds.yellow,
          severity: 'critical',
          color: 'red'
        });
      } else if (daysInProcess >= alertThresholds.orange) {
        alerts.push({
          id: `t2l-${order.id}`,
          orderId: order.id,
          vehicleInfo,
          stepName: 'Overall T2L',
          stepType: 'created',
          daysOverdue: daysInProcess - alertThresholds.yellow,
          severity: 'high',
          color: 'orange'
        });
      } else if (daysInProcess >= alertThresholds.yellow) {
        alerts.push({
          id: `t2l-${order.id}`,
          orderId: order.id,
          vehicleInfo,
          stepName: 'Overall T2L',
          stepType: 'created',
          daysOverdue: daysInProcess - alertThresholds.yellow,
          severity: 'medium',
          color: 'yellow'
        });
      }

      // Step-level SLA alerts
      stepInstances.forEach(instance => {
        if (instance.status === 'completed') return;

        const step = instance.recon_workflow_steps;
        if (!step) return;

        const stepStartDate = instance.started_at ? 
          new Date(instance.started_at) : 
          new Date(instance.created_at);

        const hoursInStep = (now.getTime() - stepStartDate.getTime()) / (1000 * 60 * 60);
        const slaHours = step.sla_hours || 24;
        const hoursOverdue = Math.max(0, hoursInStep - slaHours);

        if (hoursOverdue > 0) {
          const daysOverdue = Math.ceil(hoursOverdue / 24);
          
          let severity: ColorTriggerAlert['severity'] = 'low';
          let color: ColorTriggerAlert['color'] = 'green';

          if (hoursOverdue >= 72) { // 3+ days overdue
            severity = 'critical';
            color = 'red';
          } else if (hoursOverdue >= 48) { // 2+ days overdue
            severity = 'high';
            color = 'orange';
          } else if (hoursOverdue >= 24) { // 1+ day overdue
            severity = 'medium';
            color = 'yellow';
          }

          if (severity !== 'low') {
            alerts.push({
              id: `step-${instance.id}`,
              orderId: order.id,
              vehicleInfo,
              stepName: step.step_name,
              stepType: step.step_type,
              daysOverdue,
              severity,
              color
            });
          }
        }
      });
    });

    // Sort by severity (critical first) and then by days overdue
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      
      if (severityDiff !== 0) return severityDiff;
      return b.daysOverdue - a.daysOverdue;
    });
  }, [alertData, alertThresholds]);

  /**
   * Get alerts grouped by severity
   */
  const alertsBySeverity = useMemo(() => {
    return {
      critical: colorTriggerAlerts.filter(a => a.severity === 'critical'),
      high: colorTriggerAlerts.filter(a => a.severity === 'high'),
      medium: colorTriggerAlerts.filter(a => a.severity === 'medium'),
      low: colorTriggerAlerts.filter(a => a.severity === 'low')
    };
  }, [colorTriggerAlerts]);

  /**
   * Get alerts grouped by type (T2L vs Step)
   */
  const alertsByType = useMemo(() => {
    return {
      t2l: colorTriggerAlerts.filter(a => a.id.startsWith('t2l-')),
      step: colorTriggerAlerts.filter(a => a.id.startsWith('step-'))
    };
  }, [colorTriggerAlerts]);

  /**
   * Get summary statistics
   */
  const alertSummary = useMemo(() => {
    return {
      total: colorTriggerAlerts.length,
      critical: alertsBySeverity.critical.length,
      high: alertsBySeverity.high.length,
      medium: alertsBySeverity.medium.length,
      low: alertsBySeverity.low.length,
      
      // By type
      t2lAlerts: alertsByType.t2l.length,
      stepAlerts: alertsByType.step.length,
      
      // Most overdue
      mostOverdue: colorTriggerAlerts[0] || null,
      
      // Average days overdue
      averageDaysOverdue: colorTriggerAlerts.length > 0 ?
        Math.round(colorTriggerAlerts.reduce((sum, alert) => sum + alert.daysOverdue, 0) / colorTriggerAlerts.length) : 0
    };
  }, [colorTriggerAlerts, alertsBySeverity, alertsByType]);

  /**
   * Get alerts for a specific order
   */
  const getAlertsForOrder = (orderId: string) => {
    return colorTriggerAlerts.filter(alert => alert.orderId === orderId);
  };

  /**
   * Get alerts for a specific step type
   */
  const getAlertsByStepType = (stepType: WorkflowStepType) => {
    return colorTriggerAlerts.filter(alert => alert.stepType === stepType);
  };

  /**
   * Check if an order has critical alerts
   */
  const hasCriticalAlerts = (orderId: string) => {
    return getAlertsForOrder(orderId).some(alert => alert.severity === 'critical');
  };

  /**
   * Get the highest severity alert for an order
   */
  const getHighestSeverityAlert = (orderId: string) => {
    const orderAlerts = getAlertsForOrder(orderId);
    if (orderAlerts.length === 0) return null;
    
    return orderAlerts[0]; // Already sorted by severity
  };

  return {
    // Data
    colorTriggerAlerts,
    alertsBySeverity,
    alertsByType,
    alertSummary,

    // Loading states
    alertsLoading,
    
    // Errors
    alertsError,

    // Utility functions
    getAlertsForOrder,
    getAlertsByStepType,
    hasCriticalAlerts,
    getHighestSeverityAlert,

    // Configuration
    alertThresholds
  };
}

export default useReconAlerts;