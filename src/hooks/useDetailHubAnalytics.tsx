/**
 * Detail Hub Analytics - Real Database Integration
 *
 * Comprehensive analytics hooks for DetailHub with real Supabase queries.
 * Provides aggregated data for hours tracking, attendance, productivity, and department metrics.
 *
 * Features:
 * - Hours by employee (regular/overtime breakdown)
 * - Hours by department (detail, car_wash, service, management)
 * - Attendance patterns (daily punch counts)
 * - Productivity metrics (KPIs and aggregated stats)
 *
 * Cache Strategy: CACHE_TIMES.SHORT (1 min) - Analytics data changes frequently
 *
 * PHASE: Real Analytics Integration
 * @module useDetailHubAnalytics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

/**
 * Date range for analytics queries
 */
export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Employee hours breakdown with regular and overtime
 */
export interface EmployeeHoursData {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  department: 'detail' | 'car_wash' | 'service' | 'management';
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  total_entries: number;
}

/**
 * Department hours aggregation
 */
export interface DepartmentHoursData {
  department: 'detail' | 'car_wash' | 'service' | 'management';
  total_hours: number;
  employee_count: number;
  avg_hours_per_employee: number;
  total_overtime: number;
}

/**
 * Daily attendance pattern
 */
export interface AttendancePatternData {
  date: string; // YYYY-MM-DD
  unique_employees: number;
  total_entries: number;
  total_hours: number;
  avg_hours_per_employee: number;
}

/**
 * Overall productivity KPIs
 */
export interface ProductivityMetrics {
  total_hours: number;
  total_regular_hours: number;
  total_overtime_hours: number;
  total_employees: number;
  active_employees: number; // Employees who punched in during period
  avg_hours_per_employee: number;
  overtime_percentage: number;
  total_time_entries: number;
  entries_requiring_review: number;
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  hoursByEmployee: (dealershipId: number | 'all', dateRange: DateRange) =>
    ['detail-hub-analytics', 'hours-by-employee', dealershipId, dateRange.from.toISOString(), dateRange.to.toISOString()],
  hoursByDepartment: (dealershipId: number | 'all', dateRange: DateRange) =>
    ['detail-hub-analytics', 'hours-by-department', dealershipId, dateRange.from.toISOString(), dateRange.to.toISOString()],
  attendancePatterns: (dealershipId: number | 'all', dateRange: DateRange) =>
    ['detail-hub-analytics', 'attendance-patterns', dealershipId, dateRange.from.toISOString(), dateRange.to.toISOString()],
  productivityMetrics: (dealershipId: number | 'all', dateRange: DateRange) =>
    ['detail-hub-analytics', 'productivity-metrics', dealershipId, dateRange.from.toISOString(), dateRange.to.toISOString()],
} as const;

// =====================================================
// ANALYTICS QUERIES
// =====================================================

/**
 * Get hours breakdown by employee for a date range
 *
 * Returns aggregated hours per employee with regular/overtime split.
 * Only includes completed time entries (clock_out not null).
 * Ordered by total hours descending (top performers first).
 *
 * @param dateRange - Date range to analyze
 * @returns Query result with employee hours data
 *
 * @example
 * ```tsx
 * const { data: employeeHours } = useHoursByEmployee({
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31')
 * });
 * ```
 */
export function useHoursByEmployee(dateRange: DateRange) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.hoursByEmployee(selectedDealerId, dateRange),
    queryFn: async (): Promise<EmployeeHoursData[]> => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_time_entries')
        .select(`
          id,
          employee_id,
          total_hours,
          regular_hours,
          overtime_hours,
          detail_hub_employees!inner (
            first_name,
            last_name,
            employee_number,
            department
          )
        `)
        .gte('clock_in', dateRange.from.toISOString())
        .lte('clock_in', dateRange.to.toISOString())
        .not('clock_out', 'is', null) // Only completed entries
        .not('total_hours', 'is', null); // Only entries with calculated hours

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by employee
      const employeeMap = new Map<string, EmployeeHoursData>();

      data?.forEach((entry: any) => {
        const employeeId = entry.employee_id;
        const employee = entry.detail_hub_employees;
        const employeeName = `${employee.first_name} ${employee.last_name}`;

        if (!employeeMap.has(employeeId)) {
          employeeMap.set(employeeId, {
            employee_id: employeeId,
            employee_name: employeeName,
            employee_number: employee.employee_number,
            department: employee.department,
            total_hours: 0,
            regular_hours: 0,
            overtime_hours: 0,
            total_entries: 0,
          });
        }

        const existing = employeeMap.get(employeeId)!;
        existing.total_hours += entry.total_hours || 0;
        existing.regular_hours += entry.regular_hours || 0;
        existing.overtime_hours += entry.overtime_hours || 0;
        existing.total_entries += 1;
      });

      return Array.from(employeeMap.values())
        .sort((a, b) => b.total_hours - a.total_hours);
    },
    enabled: !!user && !!dateRange.from && !!dateRange.to,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - analytics data
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
}

/**
 * Get hours breakdown by department for a date range
 *
 * Returns aggregated hours per department (detail, car_wash, service, management).
 * Includes employee count and average hours per employee.
 *
 * @param dateRange - Date range to analyze
 * @returns Query result with department hours data
 *
 * @example
 * ```tsx
 * const { data: departmentHours } = useHoursByDepartment({
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31')
 * });
 * ```
 */
export function useHoursByDepartment(dateRange: DateRange) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.hoursByDepartment(selectedDealerId, dateRange),
    queryFn: async (): Promise<DepartmentHoursData[]> => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_time_entries')
        .select(`
          id,
          employee_id,
          total_hours,
          overtime_hours,
          detail_hub_employees!inner (
            department
          )
        `)
        .gte('clock_in', dateRange.from.toISOString())
        .lte('clock_in', dateRange.to.toISOString())
        .not('clock_out', 'is', null) // Only completed entries
        .not('total_hours', 'is', null); // Only entries with calculated hours

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Aggregate by department
      const deptMap = new Map<string, {
        total_hours: number;
        total_overtime: number;
        employees: Set<string>
      }>();

      data?.forEach((entry: any) => {
        const dept = entry.detail_hub_employees.department;

        if (!deptMap.has(dept)) {
          deptMap.set(dept, {
            total_hours: 0,
            total_overtime: 0,
            employees: new Set()
          });
        }

        const existing = deptMap.get(dept)!;
        existing.total_hours += entry.total_hours || 0;
        existing.total_overtime += entry.overtime_hours || 0;
        existing.employees.add(entry.employee_id);
      });

      const result = Array.from(deptMap.entries()).map(([department, data]) => ({
        department: department as 'detail' | 'car_wash' | 'service' | 'management',
        total_hours: data.total_hours,
        employee_count: data.employees.size,
        avg_hours_per_employee: data.employees.size > 0
          ? data.total_hours / data.employees.size
          : 0,
        total_overtime: data.total_overtime,
      }));

      // Sort by total hours descending
      result.sort((a, b) => b.total_hours - a.total_hours);

      return result;
    },
    enabled: !!user && !!dateRange.from && !!dateRange.to,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - analytics data
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
}

/**
 * Get attendance patterns (daily punch counts) for a date range
 *
 * Returns daily aggregations showing:
 * - Total clock in punches per day
 * - Unique employees per day
 * - Average hours per employee per day
 *
 * @param dateRange - Date range to analyze
 * @returns Query result with daily attendance data
 *
 * @example
 * ```tsx
 * const { data: attendance } = useAttendancePatterns({
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31')
 * });
 * ```
 */
export function useAttendancePatterns(dateRange: DateRange) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.attendancePatterns(selectedDealerId, dateRange),
    queryFn: async (): Promise<AttendancePatternData[]> => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_time_entries')
        .select('id, employee_id, clock_in, total_hours')
        .gte('clock_in', dateRange.from.toISOString())
        .lte('clock_in', dateRange.to.toISOString());

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by date (YYYY-MM-DD)
      const dateMap = new Map<string, {
        employees: Set<string>;
        entries: number;
        total_hours: number;
      }>();

      data?.forEach((entry: any) => {
        const date = new Date(entry.clock_in).toISOString().split('T')[0]; // YYYY-MM-DD

        if (!dateMap.has(date)) {
          dateMap.set(date, {
            employees: new Set(),
            entries: 0,
            total_hours: 0
          });
        }

        const existing = dateMap.get(date)!;
        existing.employees.add(entry.employee_id);
        existing.entries += 1;
        if (entry.total_hours) {
          existing.total_hours += entry.total_hours;
        }
      });

      return Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          unique_employees: data.employees.size,
          total_entries: data.entries,
          total_hours: data.total_hours,
          avg_hours_per_employee: data.employees.size > 0
            ? data.total_hours / data.employees.size
            : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!user && !!dateRange.from && !!dateRange.to,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - analytics data
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
}

/**
 * Get overall productivity metrics (KPIs) for a date range
 *
 * Returns aggregated KPIs:
 * - Total hours (regular + overtime)
 * - Employee count (total and active)
 * - Average hours per employee
 * - Overtime percentage
 * - Entries requiring manual review
 *
 * @param dateRange - Date range to analyze
 * @returns Query result with productivity KPIs
 *
 * @example
 * ```tsx
 * const { data: kpis } = useProductivityMetrics({
 *   from: new Date('2025-01-01'),
 *   to: new Date('2025-01-31')
 * });
 * ```
 */
export function useProductivityMetrics(dateRange: DateRange) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.productivityMetrics(selectedDealerId, dateRange),
    queryFn: async (): Promise<ProductivityMetrics> => {
      if (!user) throw new Error('User not authenticated');

      // Fetch all time entries in range
      let timeEntriesQuery = supabase
        .from('detail_hub_time_entries')
        .select('id, employee_id, total_hours, regular_hours, overtime_hours, requires_manual_verification')
        .gte('clock_in', dateRange.from.toISOString())
        .lte('clock_in', dateRange.to.toISOString());

      // Fetch all active employees (for total count)
      let employeesQuery = supabase
        .from('detail_hub_employees')
        .select('id')
        .eq('status', 'active');

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        timeEntriesQuery = timeEntriesQuery.eq('dealership_id', selectedDealerId);
        employeesQuery = employeesQuery.eq('dealership_id', selectedDealerId);
      }

      const [timeEntriesResult, employeesResult] = await Promise.all([
        timeEntriesQuery,
        employeesQuery,
      ]);

      if (timeEntriesResult.error) throw timeEntriesResult.error;
      if (employeesResult.error) throw employeesResult.error;

      const entries = timeEntriesResult.data || [];
      const totalEmployees = employeesResult.data?.length || 0;

      // Calculate metrics
      let totalHours = 0;
      let regularHours = 0;
      let overtimeHours = 0;
      let entriesRequiringReview = 0;
      const activeEmployees = new Set<string>();

      entries.forEach((entry: any) => {
        activeEmployees.add(entry.employee_id);

        if (entry.total_hours) totalHours += entry.total_hours;
        if (entry.regular_hours) regularHours += entry.regular_hours;
        if (entry.overtime_hours) overtimeHours += entry.overtime_hours;
        if (entry.requires_manual_verification) entriesRequiringReview += 1;
      });

      const activeEmployeeCount = activeEmployees.size;
      const avgHoursPerEmployee = activeEmployeeCount > 0
        ? totalHours / activeEmployeeCount
        : 0;

      const overtimePercentage = totalHours > 0
        ? (overtimeHours / totalHours) * 100
        : 0;

      const metrics: ProductivityMetrics = {
        total_hours: totalHours,
        total_regular_hours: regularHours,
        total_overtime_hours: overtimeHours,
        total_employees: totalEmployees,
        active_employees: activeEmployeeCount,
        avg_hours_per_employee: avgHoursPerEmployee,
        overtime_percentage: overtimePercentage,
        total_time_entries: entries.length,
        entries_requiring_review: entriesRequiringReview,
      };

      return metrics;
    },
    enabled: !!user && !!dateRange.from && !!dateRange.to,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - analytics data
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Calculate date range for common periods
 */
export const getDateRanges = {
  /** Last 7 days */
  last7Days: (): DateRange => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return { from, to };
  },

  /** Last 30 days */
  last30Days: (): DateRange => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  },

  /** Last 90 days */
  last90Days: (): DateRange => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    return { from, to };
  },

  /** Current month */
  currentMonth: (): DateRange => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from, to };
  },

  /** Previous month */
  previousMonth: (): DateRange => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from, to };
  },

  /** Custom range */
  custom: (from: Date, to: Date): DateRange => ({ from, to }),
};

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  return hours.toFixed(2);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
