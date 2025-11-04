import { useCallback } from 'react';
import { usePlatformSettings } from './usePlatformSettings';
import { format } from 'date-fns';

/**
 * useDateCalculations Hook
 *
 * Provides timezone-aware date calculation utilities that respect
 * the platform's configured timezone from Settings → Platform → General.
 *
 * Features:
 * - Dynamic timezone from system_settings (not hardcoded)
 * - Week calculations (Monday-Sunday)
 * - Date range presets (today, this week, last week, etc.)
 * - Consistent with OperationalReports date handling
 *
 * Usage:
 * const { timezone, calculateDateRange, getWeekDates } = useDateCalculations();
 * const { startDate, endDate } = calculateDateRange('last_week');
 */
export function useDateCalculations() {
  const { settings } = usePlatformSettings();
  const timezone = settings?.timezone || 'America/New_York';

  /**
   * Get week start (Monday) and end (Sunday) for a given date
   * Respects configured timezone
   */
  const getWeekDates = useCallback((date: Date) => {
    const current = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    current.setHours(0, 0, 0, 0);

    const day = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = day === 0 ? -6 : 1 - day; // Sunday: -6, Monday: 0, Tuesday: -1, etc.

    const monday = new Date(current);
    monday.setDate(current.getDate() + daysToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  }, [timezone]);

  /**
   * Get today's date in the configured timezone
   */
  const getTodayInTimezone = useCallback(() => {
    const now = new Date();
    const todayInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    todayInTimezone.setHours(0, 0, 0, 0);
    return todayInTimezone;
  }, [timezone]);

  /**
   * Calculate date range for common presets
   * Returns { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
   */
  const calculateDateRange = useCallback((
    rangeType: 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_3_months'
  ) => {
    const now = new Date();
    const todayInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    todayInTz.setHours(0, 0, 0, 0);

    switch (rangeType) {
      case 'today':
        return {
          startDate: format(todayInTz, 'yyyy-MM-dd'),
          endDate: format(todayInTz, 'yyyy-MM-dd')
        };

      case 'this_week': {
        const { monday, sunday } = getWeekDates(todayInTz);
        return {
          startDate: format(monday, 'yyyy-MM-dd'),
          endDate: format(sunday, 'yyyy-MM-dd')
        };
      }

      case 'last_week': {
        const lastWeekDate = new Date(todayInTz);
        lastWeekDate.setDate(lastWeekDate.getDate() - 7);
        const { monday, sunday } = getWeekDates(lastWeekDate);
        return {
          startDate: format(monday, 'yyyy-MM-dd'),
          endDate: format(sunday, 'yyyy-MM-dd')
        };
      }

      case 'this_month': {
        const firstDay = new Date(todayInTz.getFullYear(), todayInTz.getMonth(), 1);
        return {
          startDate: format(firstDay, 'yyyy-MM-dd'),
          endDate: format(todayInTz, 'yyyy-MM-dd')
        };
      }

      case 'last_month': {
        const firstDay = new Date(todayInTz.getFullYear(), todayInTz.getMonth() - 1, 1);
        const lastDay = new Date(todayInTz.getFullYear(), todayInTz.getMonth(), 0);
        return {
          startDate: format(firstDay, 'yyyy-MM-dd'),
          endDate: format(lastDay, 'yyyy-MM-dd')
        };
      }

      case 'last_3_months': {
        const threeMonthsAgo = new Date(todayInTz.getFullYear(), todayInTz.getMonth() - 3, 1);
        return {
          startDate: format(threeMonthsAgo, 'yyyy-MM-dd'),
          endDate: format(todayInTz, 'yyyy-MM-dd')
        };
      }

      default:
        return {
          startDate: format(todayInTz, 'yyyy-MM-dd'),
          endDate: format(todayInTz, 'yyyy-MM-dd')
        };
    }
  }, [timezone, getWeekDates]);

  return {
    timezone,
    getWeekDates,
    getTodayInTimezone,
    calculateDateRange
  };
}
