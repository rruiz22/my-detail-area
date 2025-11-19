/**
 * Employee Current State Hook
 *
 * Returns real-time employee state including:
 * - Current status (not_clocked_in | clocked_in | on_break)
 * - Active time entry with elapsed time
 * - Week statistics (total hours, overtime, days worked)
 * - Break time tracking
 *
 * Auto-updates every 30 seconds for real-time elapsed time
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DetailHubTimeEntry } from './useDetailHubDatabase';

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

export function useEmployeeCurrentState(employeeId: string | null) {
  return useQuery({
    queryKey: ['detail-hub', 'employee-state', employeeId],
    queryFn: async (): Promise<EmployeeCurrentStateData> => {
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
    },
    enabled: !!employeeId,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time elapsed time
    staleTime: 0, // Always fetch fresh data
    gcTime: 60000, // 1 minute
  });
}
