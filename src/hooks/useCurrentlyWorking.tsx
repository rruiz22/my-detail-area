/**
 * Detail Hub - Currently Working Employees
 *
 * Real-time dashboard showing employees currently clocked in
 *
 * Features:
 * - Live updates every 30 seconds
 * - Elapsed time calculations
 * - Break status tracking
 * - Schedule compliance indicators
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// =====================================================
// TYPES
// =====================================================

export interface CurrentlyWorkingEmployee {
  employee_id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  employee_name: string;
  department: string;
  role: string;
  profile_photo_url: string | null;

  // Time tracking
  time_entry_id: string;
  clock_in: string;
  kiosk_id: string | null;
  photo_in_url: string | null; // Clock in photo

  // Elapsed time
  elapsed_hours: number;
  elapsed_time_formatted: string; // HH:MM format

  // Break status
  is_on_break: boolean;
  break_start: string | null;
  break_elapsed_minutes: number | null;

  // Schedule compliance
  schedule_id: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  schedule_variance_minutes: number | null;
  early_punch_approved: boolean | null;

  // Kiosk info
  kiosk_name: string | null;
  kiosk_code: string | null;

  // Dealership
  dealership_id: number;
}

export interface LiveDashboardStats {
  total_clocked_in: number;
  total_on_break: number;
  total_hours_today: number;
  unique_departments: number;
  avg_elapsed_hours: number;
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  currentlyWorking: (dealershipId: number | 'all') => ['detail-hub', 'currently-working', dealershipId],
  liveStats: (dealershipId: number | 'all') => ['detail-hub', 'live-stats', dealershipId],
} as const;

// =====================================================
// CURRENTLY WORKING EMPLOYEES
// =====================================================

export function useCurrentlyWorking() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.currentlyWorking(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_currently_working')
        .select('*');

      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error} = await query;

      if (error) throw error;
      return data as CurrentlyWorkingEmployee[];
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.INSTANT, // 0ms - always fetch fresh
    gcTime: GC_TIMES.SHORT,
    refetchInterval: 30000, // Update every 30 seconds for live dashboard
  });
}

export function useLiveDashboardStats() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.liveStats(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      if (selectedDealerId === 'all') {
        // Aggregate from view for all dealerships
        const { data: employees, error } = await supabase
          .from('detail_hub_currently_working')
          .select('*');

        if (error) throw error;

        const stats: LiveDashboardStats = {
          total_clocked_in: employees.length,
          total_on_break: employees.filter(e => e.is_on_break).length,
          total_hours_today: employees.reduce((sum, e) => sum + e.elapsed_hours, 0),
          unique_departments: new Set(employees.map(e => e.department)).size,
          avg_elapsed_hours: employees.length > 0
            ? employees.reduce((sum, e) => sum + e.elapsed_hours, 0) / employees.length
            : 0
        };

        return stats;
      }

      // Use RPC function for specific dealership
      const { data, error } = await supabase.rpc('get_live_dashboard_stats', {
        p_dealership_id: selectedDealerId
      });

      if (error) throw error;
      return data[0] as LiveDashboardStats;
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.INSTANT,
    gcTime: GC_TIMES.SHORT,
    refetchInterval: 30000, // Update every 30 seconds
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Calculate elapsed time in HH:MM:SS format that updates every second
 */
export function useElapsedTime(clockInTime: string) {
  const [elapsed, setElapsed] = React.useState('00:00:00');

  React.useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(clockInTime);
      const now = new Date();
      const diff = now.getTime() - start.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsed(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    calculateElapsed(); // Initial calculation
    const interval = setInterval(calculateElapsed, 1000); // Update every second

    return () => clearInterval(interval);
  }, [clockInTime]);

  return elapsed;
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
    console.error('Error detecting schedule conflicts:', error);
    return false;
  }

  return data as boolean;
}

import React from 'react';
