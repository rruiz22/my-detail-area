/**
 * Employee Current State Hook
 *
 * Real-time employee state management for the intelligent kiosk system.
 * Tracks clock-in status, breaks, and weekly hour calculations.
 *
 * Features:
 * - Current state detection (not_clocked_in | clocked_in | on_break)
 * - Active time entry tracking with elapsed time
 * - Break duration monitoring
 * - Weekly statistics (total/regular/overtime hours, days worked)
 * - Auto-refresh every 30 seconds for real-time accuracy
 *
 * @module useEmployeeCurrentState
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek } from 'date-fns';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// =====================================================
// TYPES
// =====================================================

/**
 * Employee current state data structure
 */
export interface EmployeeCurrentState {
  /** Current employee state */
  state: 'not_clocked_in' | 'clocked_in' | 'on_break';

  /** Active time entry details (if clocked in) */
  currentEntry?: {
    id: string;
    clock_in: string;
    break_start?: string;
    break_end?: string;
    elapsed_minutes: number;
    break_elapsed_minutes?: number;
  };

  /** Current week statistics */
  weekStats: {
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    days_worked: number;
  };
}

/**
 * Database time entry structure
 */
interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  break_start: string | null;
  break_end: string | null;
  total_hours: number | null;
  regular_hours: number | null;
  overtime_hours: number | null;
  status: string;
}

// =====================================================
// HOOK
// =====================================================

/**
 * Get employee's current clock-in state and weekly statistics
 *
 * @param employeeId - Employee UUID (null if no employee selected)
 * @returns Query result with employee current state
 *
 * @example
 * ```typescript
 * const { data: currentState, isLoading } = useEmployeeCurrentState(employeeId);
 *
 * if (currentState?.state === 'clocked_in') {
 *   console.log('Employee is working');
 *   console.log('Elapsed time:', currentState.currentEntry.elapsed_minutes);
 *   console.log('Week hours:', currentState.weekStats.total_hours);
 * }
 * ```
 */
export function useEmployeeCurrentState(employeeId: string | null) {
  return useQuery({
    queryKey: ['detail-hub', 'employee-state', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;

      // ===================================================
      // QUERY 1: Get active time entry (if any)
      // ===================================================
      const { data: activeEntry, error: entryError } = await supabase
        .from('detail_hub_time_entries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('status', 'active')
        .maybeSingle();

      if (entryError) throw entryError;

      // ===================================================
      // QUERY 2: Get week stats (current week Monday-Sunday)
      // ===================================================
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday

      const { data: weekEntries, error: weekError } = await supabase
        .from('detail_hub_time_entries')
        .select('total_hours, regular_hours, overtime_hours, clock_in')
        .eq('employee_id', employeeId)
        .gte('clock_in', weekStart.toISOString())
        .lte('clock_in', weekEnd.toISOString())
        .not('total_hours', 'is', null); // Only completed entries

      if (weekError) throw weekError;

      // ===================================================
      // CALCULATE WEEK STATS
      // ===================================================
      const weekStats = {
        total_hours: weekEntries?.reduce((sum, e) => sum + (e.total_hours || 0), 0) || 0,
        regular_hours: weekEntries?.reduce((sum, e) => sum + (e.regular_hours || 0), 0) || 0,
        overtime_hours: weekEntries?.reduce((sum, e) => sum + (e.overtime_hours || 0), 0) || 0,
        days_worked: new Set(weekEntries?.map(e => new Date(e.clock_in).toDateString())).size || 0
      };

      // ===================================================
      // DETERMINE CURRENT STATE
      // ===================================================
      let state: EmployeeCurrentState['state'] = 'not_clocked_in';
      let currentEntryData = undefined;

      if (activeEntry) {
        // Calculate elapsed time since clock-in
        const clockInTime = new Date(activeEntry.clock_in);
        const now = new Date();
        const elapsed_minutes = Math.floor((now.getTime() - clockInTime.getTime()) / 60000);

        // Check if currently on break
        if (activeEntry.break_start && !activeEntry.break_end) {
          state = 'on_break';
          const breakStartTime = new Date(activeEntry.break_start);
          const break_elapsed_minutes = Math.floor((now.getTime() - breakStartTime.getTime()) / 60000);

          currentEntryData = {
            id: activeEntry.id,
            clock_in: activeEntry.clock_in,
            break_start: activeEntry.break_start,
            break_end: activeEntry.break_end,
            elapsed_minutes,
            break_elapsed_minutes
          };
        } else {
          // Clocked in but not on break
          state = 'clocked_in';
          currentEntryData = {
            id: activeEntry.id,
            clock_in: activeEntry.clock_in,
            break_start: activeEntry.break_start,
            break_end: activeEntry.break_end,
            elapsed_minutes,
            break_elapsed_minutes: 0
          };
        }
      }

      return {
        state,
        currentEntry: currentEntryData,
        weekStats
      } as EmployeeCurrentState;
    },
    enabled: !!employeeId,
    staleTime: CACHE_TIMES.INSTANT, // Real-time state - always fetch fresh
    gcTime: GC_TIMES.SHORT, // 5 minutes garbage collection
    refetchInterval: 30000, // Refresh every 30 seconds for live updates
  });
}
