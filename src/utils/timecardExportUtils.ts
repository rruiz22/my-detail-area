/**
 * Timecard Export Utilities
 *
 * Enterprise-grade export functionality for Timecard System.
 * Generates professional PDF and Excel reports with comprehensive data.
 *
 * Features:
 * - Employee time entries with clock in/out, breaks, hours, pay
 * - Summary statistics (total hours, overtime, payroll, employees)
 * - Date range filtering
 * - Professional formatting matching MyDetailArea design system
 *
 * @module timecardExportUtils
 */

import { format } from 'date-fns';
import type { ReportData } from '@/utils/reportExporters';

/**
 * Time entry data structure for export
 */
export interface TimecardEntry {
  /** Employee number/ID */
  employeeId: string;

  /** Employee full name */
  employeeName: string;

  /** Dealership/Location name where punch occurred */
  dealershipName: string;

  /** Date of time entry (formatted string) */
  date: string;

  /** Clock in time (formatted string) */
  clockIn: string;

  /** Clock out time (formatted string or "--") */
  clockOut: string;

  /** Break times (formatted string) */
  breakTimes: string;

  /** Total hours worked */
  totalHours: number;

  /** Regular hours (non-overtime) */
  regularHours: number;

  /** Overtime hours */
  overtimeHours: number;

  /** Hourly rate */
  hourlyRate: number;

  /** Total pay (regular + overtime) */
  totalPay: number;

  /** Entry status */
  status: string;
}

/**
 * Summary statistics for timecard report
 */
export interface TimecardSummary {
  /** Total hours worked across all entries */
  totalHours: number;

  /** Total regular hours */
  totalRegularHours: number;

  /** Total overtime hours */
  totalOvertimeHours: number;

  /** Total payroll amount */
  totalPayroll: number;

  /** Number of unique employees */
  totalEmployees: number;

  /** Number of active employees */
  activeEmployees: number;

  /** Number of entries */
  totalEntries: number;

  /** Average hours per employee */
  averageHoursPerEmployee: number;
}

/**
 * Create timecard report data for export
 *
 * Transforms timecard entries into a structured report format
 * suitable for PDF and Excel export.
 *
 * @param entries - Array of timecard entries
 * @param summary - Summary statistics
 * @param dateRange - Date range object with start/end dates
 * @param dealershipName - Name of dealership
 * @returns ReportData object ready for export
 *
 * @example
 * ```tsx
 * const reportData = createTimecardReport(
 *   timecards,
 *   stats,
 *   { start: new Date(), end: new Date() },
 *   'ABC Motors'
 * );
 * exportReportToPDF(reportData);
 * ```
 */
export function createTimecardReport(
  entries: TimecardEntry[],
  summary: TimecardSummary,
  dateRange: { start: Date; end: Date },
  dealershipName: string
): ReportData {
  // Format date range for display
  const dateRangeStr = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
  const generatedAt = format(new Date(), 'MMM dd, yyyy h:mm a');

  // Define table headers
  const headers = [
    'Employee',
    'Date',
    'Location',
    'Clock In',
    'Clock Out',
    'Break',
    'Total Hours',
    'Regular',
    'Overtime',
    'Rate',
    'Pay',
    'Status'
  ];

  // Transform entries to table rows
  const rows: (string | number)[][] = entries.map((entry) => [
    `${entry.employeeName} (${entry.employeeId})`,
    entry.date,
    entry.dealershipName,
    entry.clockIn,
    entry.clockOut,
    entry.breakTimes,
    entry.totalHours,
    entry.regularHours,
    entry.overtimeHours,
    entry.hourlyRate,
    entry.totalPay,
    entry.status
  ]);

  // Add totals row
  rows.push([
    `TOTALS (${summary.totalEntries} entries)`,
    '',
    '', // Location (empty for totals)
    '',
    '',
    '',
    summary.totalHours,
    summary.totalRegularHours,
    summary.totalOvertimeHours,
    '', // No average rate
    summary.totalPayroll,
    ''
  ]);

  // Create summary metrics
  const summaryMetrics = [
    { label: 'Total Hours', value: `${summary.totalHours.toFixed(2)}h` },
    { label: 'Regular Hours', value: `${summary.totalRegularHours.toFixed(2)}h` },
    { label: 'Overtime Hours', value: `${summary.totalOvertimeHours.toFixed(2)}h` },
    { label: 'Total Payroll', value: `$${summary.totalPayroll.toFixed(2)}` },
    { label: 'Total Employees', value: summary.totalEmployees },
    { label: 'Active Employees', value: summary.activeEmployees },
    { label: 'Avg Hours/Employee', value: `${summary.averageHoursPerEmployee.toFixed(2)}h` },
    { label: 'Total Entries', value: summary.totalEntries }
  ];

  return {
    title: 'Timecard Report',
    subtitle: `Employee Time & Attendance`,
    dateRange: dateRangeStr,
    dealershipName,
    generatedAt,
    headers,
    rows,
    summary: summaryMetrics
  };
}

/**
 * Create weekly summary report
 *
 * Groups timecard entries by employee and shows weekly totals.
 * Ideal for payroll processing.
 *
 * @param entries - Array of timecard entries
 * @param summary - Summary statistics
 * @param dateRange - Date range object
 * @param dealershipName - Name of dealership
 * @returns ReportData object ready for export
 */
export function createWeeklySummaryReport(
  entries: TimecardEntry[],
  summary: TimecardSummary,
  dateRange: { start: Date; end: Date },
  dealershipName: string
): ReportData {
  const dateRangeStr = `${format(dateRange.start, 'MMM dd, yyyy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`;
  const generatedAt = format(new Date(), 'MMM dd, yyyy h:mm a');

  // Group by employee
  const employeeMap = new Map<string, {
    name: string;
    employeeId: string;
    daysWorked: number;
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    hourlyRate: number;
    totalPay: number;
  }>();

  entries.forEach((entry) => {
    const key = entry.employeeId;
    const existing = employeeMap.get(key);

    if (existing) {
      existing.daysWorked += 1;
      existing.totalHours += entry.totalHours;
      existing.regularHours += entry.regularHours;
      existing.overtimeHours += entry.overtimeHours;
      existing.totalPay += entry.totalPay;
    } else {
      employeeMap.set(key, {
        name: entry.employeeName,
        employeeId: entry.employeeId,
        daysWorked: 1,
        totalHours: entry.totalHours,
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        hourlyRate: entry.hourlyRate,
        totalPay: entry.totalPay
      });
    }
  });

  // Define headers
  const headers = [
    'Employee',
    'Days Worked',
    'Regular Hours',
    'Overtime Hours',
    'Total Hours',
    'Hourly Rate',
    'Total Pay'
  ];

  // Convert to rows (sorted by total hours descending)
  const employeeData = Array.from(employeeMap.values())
    .sort((a, b) => b.totalHours - a.totalHours);

  const rows: (string | number)[][] = employeeData.map((emp) => [
    `${emp.name} (${emp.employeeId})`,
    emp.daysWorked,
    emp.regularHours,
    emp.overtimeHours,
    emp.totalHours,
    emp.hourlyRate,
    emp.totalPay
  ]);

  // Add totals row
  rows.push([
    `TOTALS (${employeeData.length} employees)`,
    '', // No days total
    summary.totalRegularHours,
    summary.totalOvertimeHours,
    summary.totalHours,
    '', // No average rate
    summary.totalPayroll
  ]);

  // Summary metrics
  const summaryMetrics = [
    { label: 'Total Employees', value: employeeData.length },
    { label: 'Total Hours', value: `${summary.totalHours.toFixed(2)}h` },
    { label: 'Regular Hours', value: `${summary.totalRegularHours.toFixed(2)}h` },
    { label: 'Overtime Hours', value: `${summary.totalOvertimeHours.toFixed(2)}h` },
    { label: 'Total Payroll', value: `$${summary.totalPayroll.toFixed(2)}` },
    { label: 'Avg Hours/Employee', value: `${summary.averageHoursPerEmployee.toFixed(2)}h` }
  ];

  return {
    title: 'Weekly Employee Summary',
    subtitle: 'Payroll-Ready Report',
    dateRange: dateRangeStr,
    dealershipName,
    generatedAt,
    headers,
    rows,
    summary: summaryMetrics
  };
}
