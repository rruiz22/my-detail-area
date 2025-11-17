/**
 * Detail Hub Schedules Integration
 *
 * Employee shift scheduling with kiosk assignment and punch validation
 *
 * Features:
 * - CRUD operations for employee schedules
 * - Schedule conflict detection
 * - Punch time validation (5 min early window)
 * - Weekly schedule views
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useToast } from '@/hooks/use-toast';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// =====================================================
// TYPES
// =====================================================

export interface DetailHubSchedule {
  id: string;
  employee_id: string;
  dealership_id: number;

  // Schedule details
  shift_date: string; // Date
  shift_start_time: string; // Time
  shift_end_time: string; // Time

  // Break policy
  required_break_minutes: number;
  break_is_paid: boolean;

  // Kiosk assignment
  assigned_kiosk_id: string | null;

  // Punch window
  early_punch_allowed_minutes: number;
  late_punch_grace_minutes: number;

  // Status
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'missed' | 'cancelled';

  // Linked time entry
  time_entry_id: string | null;

  // Metadata
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PunchValidationResult {
  allowed: boolean;
  reason: string;
  schedule_id: string | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  minutes_until_allowed: number | null;
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  schedules: (dealershipId: number | 'all') => ['detail-hub', 'schedules', dealershipId],
  employeeSchedules: (employeeId: string) => ['detail-hub', 'employee-schedules', employeeId],
  weeklySchedules: (dealershipId: number | 'all', weekStart: string) =>
    ['detail-hub', 'weekly-schedules', dealershipId, weekStart],
  scheduleValidation: (employeeId: string, kioskId: string) =>
    ['detail-hub', 'schedule-validation', employeeId, kioskId],
} as const;

// =====================================================
// SCHEDULES QUERIES
// =====================================================

export function useDetailHubSchedules() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.schedules(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_schedules')
        .select('*')
        .order('shift_date', { ascending: false });

      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DetailHubSchedule[];
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute
    gcTime: GC_TIMES.MEDIUM,
  });
}

export function useEmployeeSchedules(employeeId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.employeeSchedules(employeeId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('detail_hub_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('shift_date', new Date().toISOString().split('T')[0]) // Future schedules
        .order('shift_date', { ascending: true });

      if (error) throw error;
      return data as DetailHubSchedule[];
    },
    enabled: !!user && !!employeeId,
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
  });
}

export function useWeeklySchedules(weekStartDate: string) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.weeklySchedules(selectedDealerId, weekStartDate),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (selectedDealerId === 'all') throw new Error('Please select a dealership');

      const { data, error } = await supabase.rpc('get_weekly_schedules', {
        p_dealership_id: selectedDealerId,
        p_week_start_date: weekStartDate
      });

      if (error) throw error;
      return data as DetailHubSchedule[];
    },
    enabled: !!user && selectedDealerId !== 'all',
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (scheduleData: Partial<DetailHubSchedule>) => {
      if (!user) throw new Error('User not authenticated');

      // Check for conflicts first
      const hasConflict = await detectScheduleConflict(
        scheduleData.employee_id!,
        scheduleData.shift_date!,
        scheduleData.shift_start_time!,
        scheduleData.shift_end_time!
      );

      if (hasConflict) {
        throw new Error('Schedule conflict detected. Employee already has a shift scheduled for this date.');
      }

      const { data, error } = await supabase
        .from('detail_hub_schedules')
        .insert({
          ...scheduleData,
          dealership_id: scheduleData.dealership_id || selectedDealerId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules(selectedDealerId) });
      toast({
        title: "Schedule Created",
        description: "Employee shift has been scheduled successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create schedule',
        variant: "destructive"
      });
    }
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DetailHubSchedule> }) => {
      const { data, error } = await supabase
        .from('detail_hub_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules(selectedDealerId) });
      toast({
        title: "Schedule Updated",
        description: "Shift has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update schedule',
        variant: "destructive"
      });
    }
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('detail_hub_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedules(selectedDealerId) });
      toast({
        title: "Schedule Deleted",
        description: "Shift has been removed successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete schedule',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// VALIDATION QUERIES
// =====================================================

export function usePunchValidation(employeeId: string, kioskId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.scheduleValidation(employeeId, kioskId),
    queryFn: async () => {
      const { data, error} = await supabase.rpc('can_punch_in_now', {
        p_employee_id: employeeId,
        p_kiosk_id: kioskId,
        p_current_time: new Date().toISOString()
      });

      if (error) throw error;
      return data[0] as PunchValidationResult;
    },
    enabled: !!employeeId && !!kioskId,
    staleTime: 10000, // 10 seconds - revalidate frequently
    gcTime: GC_TIMES.SHORT,
    refetchInterval: 30000, // Refresh every 30s (time-based validation changes)
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export async function detectScheduleConflict(
  employeeId: string,
  shiftDate: string,
  shiftStartTime: string,
  shiftEndTime: string,
  excludeScheduleId?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('detect_schedule_conflicts', {
    p_employee_id: employeeId,
    p_shift_date: shiftDate,
    p_shift_start_time: shiftStartTime,
    p_shift_end_time: shiftEndTime,
    p_exclude_schedule_id: excludeScheduleId || null
  });

  if (error) {
    console.error('Error detecting conflicts:', error);
    return false;
  }

  return data as boolean;
}

export async function getEmployeeTodaySchedule(employeeId: string): Promise<DetailHubSchedule | null> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('detail_hub_schedules')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('shift_date', today)
    .in('status', ['scheduled', 'confirmed', 'in_progress'])
    .maybeSingle();

  if (error) {
    console.error('Error fetching today schedule:', error);
    return null;
  }

  return data;
}
