/**
 * Employee Current State Hook (Real-time Version)
 *
 * Returns real-time employee state using Supabase real-time subscriptions:
 * - Current status (not_clocked_in | clocked_in | on_break)
 * - Active time entry with elapsed time
 * - Week statistics (total hours, overtime, days worked)
 * - Break time tracking
 *
 * Updates automatically via Supabase real-time subscriptions instead of polling.
 * Drop-in replacement for useEmployeeCurrentState.ts
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DetailHubTimeEntry } from './useDetailHubDatabase';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

export type EmployeeState = 'not_clocked_in' | 'clocked_in' | 'on_break';

export interface EmployeeCurrentStateData {
  state: EmployeeState;
  currentEntry: (DetailHubTimeEntry & {
    elapsed_minutes: number;
    break_elapsed_minutes: number | null;
  }) | null;
  weekStats: {
    total_hours: number;
    regular_hours: number;
    overtime_hours: number;
    days_worked: number;
  };
}

/**
 * Fetches and returns the current state of an employee
 * @param employeeId - The employee's UUID
 * @returns Employee state data including current entry and week statistics
 */
async function fetchEmployeeState(employeeId: string | null): Promise<EmployeeCurrentStateData> {
  if (!employeeId) {
    return {
      state: 'not_clocked_in',
      currentEntry: null,
      weekStats: { total_hours: 0, regular_hours: 0, overtime_hours: 0, days_worked: 0 }
    };
  }

  // Get active time entry
  const { data: activeEntry, error: entryError } = await supabase
    .from('detail_hub_time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('status', 'active')
    .maybeSingle();

  if (entryError) throw entryError;

  // Calculate elapsed time
  let currentEntryWithElapsed = null;
  let state: EmployeeState = 'not_clocked_in';

  if (activeEntry) {
    const clockInTime = new Date(activeEntry.clock_in);
    const now = new Date();
    const elapsedMs = now.getTime() - clockInTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    let breakElapsedMinutes = null;
    if (activeEntry.break_start && !activeEntry.break_end) {
      const breakStartTime = new Date(activeEntry.break_start);
      const breakElapsedMs = now.getTime() - breakStartTime.getTime();
      breakElapsedMinutes = Math.floor(breakElapsedMs / 60000);
      state = 'on_break';
    } else {
      state = 'clocked_in';
    }

    currentEntryWithElapsed = {
      ...activeEntry,
      elapsed_minutes: elapsedMinutes,
      break_elapsed_minutes: breakElapsedMinutes
    } as DetailHubTimeEntry & {
      elapsed_minutes: number;
      break_elapsed_minutes: number | null;
    };
  }

  // Get week statistics (Monday - Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const { data: weekEntries, error: weekError } = await supabase
    .from('detail_hub_time_entries')
    .select('total_hours, regular_hours, overtime_hours, clock_in')
    .eq('employee_id', employeeId)
    .gte('clock_in', monday.toISOString())
    .lte('clock_in', sunday.toISOString())
    .eq('status', 'complete');

  if (weekError) throw weekError;

  const weekStats = {
    total_hours: weekEntries?.reduce((sum, entry) => sum + (entry.total_hours || 0), 0) || 0,
    regular_hours: weekEntries?.reduce((sum, entry) => sum + (entry.regular_hours || 0), 0) || 0,
    overtime_hours: weekEntries?.reduce((sum, entry) => sum + (entry.overtime_hours || 0), 0) || 0,
    days_worked: new Set(weekEntries?.map(entry => new Date(entry.clock_in).toDateString())).size || 0
  };

  return {
    state,
    currentEntry: currentEntryWithElapsed,
    weekStats
  };
}

/**
 * Hook that provides real-time employee state tracking using Supabase subscriptions
 *
 * @param employeeId - The employee's UUID to track
 * @returns Query result with employee state data
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useEmployeeCurrentStateRealtime(employeeId);
 *
 * if (data) {
 *   console.log(data.state); // 'clocked_in' | 'on_break' | 'not_clocked_in'
 *   console.log(data.currentEntry?.elapsed_minutes);
 *   console.log(data.weekStats.total_hours);
 * }
 * ```
 */
export function useEmployeeCurrentStateRealtime(employeeId: string | null) {
  const queryClient = useQueryClient();

  // Real-time subscription to detail_hub_time_entries changes
  useEffect(() => {
    if (!employeeId) return;

    const channel = supabase
      .channel(`employee-state-${employeeId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'detail_hub_time_entries',
          filter: `employee_id=eq.${employeeId}`
        },
        (payload) => {
          console.log('[Real-time] Time entry change detected:', payload);

          // Invalidate the query to trigger a refetch
          queryClient.invalidateQueries({
            queryKey: ['detail-hub', 'employee-state', employeeId]
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Real-time] Subscribed to employee ${employeeId} state changes`);
        } else if (status === 'CLOSED') {
          console.log(`[Real-time] Subscription closed for employee ${employeeId}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Real-time] Subscription error for employee ${employeeId}`);
        }
      });

    // Cleanup subscription on unmount or when employeeId changes
    return () => {
      console.log(`[Real-time] Unsubscribing from employee ${employeeId} state changes`);
      supabase.removeChannel(channel);
    };
  }, [employeeId, queryClient]);

  // Query with proper cache configuration (no polling needed)
  return useQuery({
    queryKey: ['detail-hub', 'employee-state', employeeId],
    queryFn: () => fetchEmployeeState(employeeId),
    enabled: !!employeeId,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes - data is kept fresh via real-time subscriptions
    gcTime: GC_TIMES.MEDIUM, // 10 minutes - garbage collect after 10 minutes of no usage

    // No refetchInterval needed - real-time subscriptions handle updates
    // No staleTime: 0 needed - cache is properly configured

    // Optional: Refetch on window focus for stale data
    refetchOnWindowFocus: 'stale',

    // Optional: Refetch only if data is stale on mount
    refetchOnMount: 'stale'
  });
}
