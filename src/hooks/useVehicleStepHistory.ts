import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface VehicleStepTime {
  step_id: string;
  step_name: string;
  total_hours: number;
  total_days: number;
  visit_count: number;
  is_current_step: boolean;
}

export interface StepHistoryEntry {
  id: string;
  vehicle_id: string;
  step_id: string;
  entry_date: string;
  exit_date: string | null;
  hours_accumulated: number;
  visit_number: number;
  is_current_visit: boolean;
  created_at: string;
}

/**
 * Get accumulated time for each step a vehicle has been through
 */
export function useVehicleStepTimes(vehicleId: string | null) {
  return useQuery({
    queryKey: ['vehicle-step-times', vehicleId],
    queryFn: async (): Promise<VehicleStepTime[]> => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .rpc('get_vehicle_step_times', { p_vehicle_id: vehicleId });

      if (error) {
        console.error('Error fetching vehicle step times:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!vehicleId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Get detailed history of all step visits for a vehicle
 */
export function useVehicleStepHistory(vehicleId: string | null) {
  return useQuery({
    queryKey: ['vehicle-step-history', vehicleId],
    queryFn: async (): Promise<StepHistoryEntry[]> => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('vehicle_step_history')
        .select(`
          id,
          vehicle_id,
          step_id,
          entry_date,
          exit_date,
          hours_accumulated,
          visit_number,
          is_current_visit,
          created_at
        `)
        .eq('vehicle_id', vehicleId)
        .order('entry_date', { ascending: true });

      if (error) {
        console.error('Error fetching vehicle step history:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!vehicleId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Get accumulated hours for a specific step
 */
export async function getAccumulatedHoursInStep(
  vehicleId: string,
  stepId: string
): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_accumulated_hours_in_step', {
      p_vehicle_id: vehicleId,
      p_step_id: stepId
    });

  if (error) {
    console.error('Error fetching accumulated hours:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Calculate total time from first entry to completion (T2L - Time to Line)
 */
export function useVehicleTimeToLine(vehicleId: string | null) {
  return useQuery({
    queryKey: ['vehicle-time-to-line', vehicleId],
    queryFn: async (): Promise<{
      total_hours: number;
      total_days: number;
      first_entry: string;
      last_exit: string | null;
      is_completed: boolean;
    }> => {
      if (!vehicleId) {
        return {
          total_hours: 0,
          total_days: 0,
          first_entry: new Date().toISOString(),
          last_exit: null,
          is_completed: false,
        };
      }

      // Get vehicle data
      const { data: vehicle, error: vehicleError } = await supabase
        .from('get_ready_vehicles')
        .select('created_at, completed_at, status')
        .eq('id', vehicleId)
        .single();

      if (vehicleError) {
        console.error('Error fetching vehicle:', vehicleError);
        throw vehicleError;
      }

      const firstEntry = new Date(vehicle.created_at);
      const lastExit = vehicle.completed_at ? new Date(vehicle.completed_at) : new Date();
      const isCompleted = vehicle.status === 'completed';

      const diffMs = lastExit.getTime() - firstEntry.getTime();
      const totalHours = diffMs / (1000 * 60 * 60);
      const totalDays = diffMs / (1000 * 60 * 60 * 24);

      return {
        total_hours: Math.round(totalHours * 100) / 100,
        total_days: Math.round(totalDays * 10) / 10,
        first_entry: vehicle.created_at,
        last_exit: vehicle.completed_at,
        is_completed: isCompleted,
      };
    },
    enabled: !!vehicleId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Get current visit info for a vehicle
 */
export function useCurrentStepVisit(vehicleId: string | null) {
  return useQuery({
    queryKey: ['current-step-visit', vehicleId],
    queryFn: async (): Promise<{
      step_id: string;
      step_name: string;
      entry_date: string;
      current_visit_hours: number;
      current_visit_days: number;
      visit_number: number;
      previous_visits_hours: number;
      total_accumulated_hours: number;
      total_accumulated_days: number;
    } | null> => {
      if (!vehicleId) return null;

      const { data, error } = await supabase
        .from('vehicle_step_times_current')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .single();

      if (error) {
        console.error('Error fetching current step visit:', error);
        return null;
      }

      if (!data) return null;

      const totalHours = data.current_visit_hours + (data.previous_visits_hours || 0);

      return {
        step_id: data.current_step_name,
        step_name: data.current_step_name,
        entry_date: data.current_step_entry,
        current_visit_hours: data.current_visit_hours,
        current_visit_days: data.current_visit_days,
        visit_number: data.visit_number,
        previous_visits_hours: data.previous_visits_hours || 0,
        total_accumulated_hours: totalHours,
        total_accumulated_days: Math.round((totalHours / 24) * 10) / 10,
      };
    },
    enabled: !!vehicleId,
    staleTime: 1000 * 10, // 10 seconds (more frequent for current visit)
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}
