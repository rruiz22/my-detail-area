/**
 * Report Templates
 *
 * Pre-configured report templates for common DetailHub reports.
 * Converts analytics data into structured report format for export.
 *
 * Features:
 * - Payroll report template
 * - Attendance report template
 * - Department hours report template
 * - Hours breakdown report template
 *
 * @module reportTemplates
 */

import { format } from 'date-fns';
import type { ReportData } from './reportExporters';
import { formatDateRange, formatHours, formatCurrency, sum } from './reportExporters';
import type {
  EmployeeHoursData,
  DepartmentHoursData,
  AttendancePatternData,
  ProductivityMetrics,
  DateRange
} from '@/hooks/useDetailHubAnalytics';

// =====================================================
// PAYROLL REPORT TEMPLATE
// =====================================================

/**
 * Create payroll report from employee hours data
 *
 * Generates a comprehensive payroll report with:
 * - Employee breakdown (name, number, department)
 * - Regular hours and overtime hours
 * - Total hours per employee
 * - Summary section with totals
 *
 * @param employeeHours - Employee hours data from analytics
 * @param dateRange - Report date range
 * @param dealershipName - Dealership name
 * @returns Formatted report data ready for export
 *
 * @example
 * ```tsx
 * const reportData = createPayrollReport(
 *   employeeHours,
 *   { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
 *   'ABC Motors'
 * );
 * exportReportToPDF(reportData);
 * ```
 */
export function createPayrollReport(
  employeeHours: EmployeeHoursData[],
  dateRange: DateRange,
  dealershipName: string
): ReportData {
  // Calculate totals
  const totalRegularHours = sum(employeeHours.map(e => e.regular_hours));
  const totalOvertimeHours = sum(employeeHours.map(e => e.overtime_hours));
  const totalHours = sum(employeeHours.map(e => e.total_hours));
  const totalEmployees = employeeHours.length;

  // Build table rows
  const rows = employeeHours.map(employee => [
    employee.employee_name,
    employee.employee_number,
    formatDepartmentName(employee.department),
    formatHours(employee.regular_hours),
    formatHours(employee.overtime_hours),
    formatHours(employee.total_hours)
  ]);

  // Add totals row
  rows.push([
    'TOTAL',
    '',
    `${totalEmployees} employees`,
    formatHours(totalRegularHours),
    formatHours(totalOvertimeHours),
    formatHours(totalHours)
  ]);

  return {
    title: 'Payroll Report',
    subtitle: `${format(dateRange.from, 'MMMM dd')} - ${format(dateRange.to, 'MMMM dd, yyyy')}`,
    dateRange: formatDateRange(dateRange.from, dateRange.to),
    dealershipName,
    generatedAt: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    headers: [
      'Employee Name',
      'Employee #',
      'Department',
      'Regular Hours',
      'Overtime Hours',
      'Total Hours'
    ],
    rows,
    summary: [
      { label: 'Total Employees', value: totalEmployees },
      { label: 'Total Regular Hours', value: formatHours(totalRegularHours) },
      { label: 'Total Overtime Hours', value: formatHours(totalOvertimeHours) },
      { label: 'Grand Total Hours', value: formatHours(totalHours) }
    ]
  };
}

// =====================================================
// ATTENDANCE REPORT TEMPLATE
// =====================================================

/**
 * Create attendance report from daily attendance patterns
 *
 * Generates a daily attendance tracking report with:
 * - Date-by-date breakdown
 * - Unique employees per day
 * - Total time entries per day
 * - Average hours per employee per day
 *
 * @param attendance - Daily attendance pattern data
 * @param dateRange - Report date range
 * @param dealershipName - Dealership name
 * @returns Formatted report data ready for export
 *
 * @example
 * ```tsx
 * const reportData = createAttendanceReport(
 *   attendanceData,
 *   { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
 *   'ABC Motors'
 * );
 * exportReportToExcel(reportData);
 * ```
 */
export function createAttendanceReport(
  attendance: AttendancePatternData[],
  dateRange: DateRange,
  dealershipName: string
): ReportData {
  // Calculate totals
  const totalDays = attendance.length;
  const totalUniqueEmployees = Math.max(...attendance.map(d => d.unique_employees), 0);
  const totalEntries = sum(attendance.map(d => d.total_entries));
  const totalHours = sum(attendance.map(d => d.total_hours));
  const avgEmployeesPerDay = totalDays > 0
    ? sum(attendance.map(d => d.unique_employees)) / totalDays
    : 0;

  // Build table rows
  const rows = attendance.map(day => [
    format(new Date(day.date), 'EEE, MMM dd, yyyy'),
    day.unique_employees.toString(),
    day.total_entries.toString(),
    formatHours(day.total_hours),
    formatHours(day.avg_hours_per_employee)
  ]);

  // Add totals row
  rows.push([
    'TOTAL / AVERAGE',
    `${Math.round(avgEmployeesPerDay)} avg`,
    totalEntries.toString(),
    formatHours(totalHours),
    formatHours(totalHours / (totalUniqueEmployees || 1))
  ]);

  return {
    title: 'Attendance Report',
    subtitle: `Daily attendance tracking (${totalDays} days)`,
    dateRange: formatDateRange(dateRange.from, dateRange.to),
    dealershipName,
    generatedAt: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    headers: [
      'Date',
      'Unique Employees',
      'Total Punches',
      'Total Hours',
      'Avg Hours/Employee'
    ],
    rows,
    summary: [
      { label: 'Total Days', value: totalDays },
      { label: 'Avg Employees/Day', value: Math.round(avgEmployeesPerDay) },
      { label: 'Total Punches', value: totalEntries },
      { label: 'Total Hours', value: formatHours(totalHours) }
    ]
  };
}

// =====================================================
// DEPARTMENT HOURS REPORT TEMPLATE
// =====================================================

/**
 * Create department hours report
 *
 * Generates a department-level hours breakdown with:
 * - Hours by department
 * - Employee count per department
 * - Average hours per employee per department
 * - Overtime breakdown
 *
 * @param deptHours - Department hours data from analytics
 * @param dateRange - Report date range
 * @param dealershipName - Dealership name
 * @returns Formatted report data ready for export
 *
 * @example
 * ```tsx
 * const reportData = createDepartmentReport(
 *   departmentHours,
 *   { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
 *   'ABC Motors'
 * );
 * exportReportToPDF(reportData);
 * ```
 */
export function createDepartmentReport(
  deptHours: DepartmentHoursData[],
  dateRange: DateRange,
  dealershipName: string
): ReportData {
  // Calculate totals
  const totalHours = sum(deptHours.map(d => d.total_hours));
  const totalEmployees = sum(deptHours.map(d => d.employee_count));
  const totalOvertime = sum(deptHours.map(d => d.total_overtime));
  const totalRegular = totalHours - totalOvertime;

  // Build table rows
  const rows = deptHours.map(dept => {
    const overtimePercentage = dept.total_hours > 0
      ? (dept.total_overtime / dept.total_hours) * 100
      : 0;

    return [
      formatDepartmentName(dept.department),
      dept.employee_count.toString(),
      formatHours(dept.total_hours),
      formatHours(dept.avg_hours_per_employee),
      formatHours(dept.total_overtime),
      `${overtimePercentage.toFixed(1)}%`
    ];
  });

  // Add totals row
  const overallOvertimePercentage = totalHours > 0
    ? (totalOvertime / totalHours) * 100
    : 0;

  rows.push([
    'TOTAL',
    totalEmployees.toString(),
    formatHours(totalHours),
    formatHours(totalHours / (totalEmployees || 1)),
    formatHours(totalOvertime),
    `${overallOvertimePercentage.toFixed(1)}%`
  ]);

  return {
    title: 'Department Hours Report',
    subtitle: `Hours breakdown by department`,
    dateRange: formatDateRange(dateRange.from, dateRange.to),
    dealershipName,
    generatedAt: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    headers: [
      'Department',
      'Employees',
      'Total Hours',
      'Avg Hours/Employee',
      'Overtime Hours',
      'OT %'
    ],
    rows,
    summary: [
      { label: 'Total Departments', value: deptHours.length },
      { label: 'Total Employees', value: totalEmployees },
      { label: 'Total Regular Hours', value: formatHours(totalRegular) },
      { label: 'Total Overtime Hours', value: formatHours(totalOvertime) }
    ]
  };
}

// =====================================================
// PRODUCTIVITY METRICS REPORT TEMPLATE
// =====================================================

/**
 * Create productivity metrics report (KPI summary)
 *
 * Generates a high-level summary report with:
 * - Total hours (regular + overtime)
 * - Employee counts (total and active)
 * - Average metrics
 * - Entries requiring review
 *
 * @param metrics - Productivity metrics from analytics
 * @param dateRange - Report date range
 * @param dealershipName - Dealership name
 * @returns Formatted report data ready for export
 *
 * @example
 * ```tsx
 * const reportData = createProductivityReport(
 *   kpis,
 *   { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
 *   'ABC Motors'
 * );
 * exportReportToPDF(reportData);
 * ```
 */
export function createProductivityReport(
  metrics: ProductivityMetrics,
  dateRange: DateRange,
  dealershipName: string
): ReportData {
  const utilizationRate = metrics.total_employees > 0
    ? (metrics.active_employees / metrics.total_employees) * 100
    : 0;

  const reviewRate = metrics.total_time_entries > 0
    ? (metrics.entries_requiring_review / metrics.total_time_entries) * 100
    : 0;

  // Build summary table
  const rows = [
    ['Total Hours Worked', formatHours(metrics.total_hours)],
    ['Regular Hours', formatHours(metrics.total_regular_hours)],
    ['Overtime Hours', formatHours(metrics.total_overtime_hours)],
    ['Overtime Percentage', `${metrics.overtime_percentage.toFixed(1)}%`],
    ['Total Employees', metrics.total_employees.toString()],
    ['Active Employees', metrics.active_employees.toString()],
    ['Employee Utilization', `${utilizationRate.toFixed(1)}%`],
    ['Avg Hours per Employee', formatHours(metrics.avg_hours_per_employee)],
    ['Total Time Entries', metrics.total_time_entries.toString()],
    ['Entries Requiring Review', metrics.entries_requiring_review.toString()],
    ['Review Rate', `${reviewRate.toFixed(1)}%`]
  ];

  return {
    title: 'Productivity Metrics Report',
    subtitle: `Key Performance Indicators (KPIs)`,
    dateRange: formatDateRange(dateRange.from, dateRange.to),
    dealershipName,
    generatedAt: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    headers: ['Metric', 'Value'],
    rows,
    summary: [
      { label: 'Total Hours', value: formatHours(metrics.total_hours) },
      { label: 'Active Employees', value: metrics.active_employees },
      { label: 'Avg Hours/Employee', value: formatHours(metrics.avg_hours_per_employee) },
      { label: 'Overtime %', value: `${metrics.overtime_percentage.toFixed(1)}%` }
    ]
  };
}

// =====================================================
// EMPLOYEE DETAIL REPORT TEMPLATE
// =====================================================

/**
 * Create detailed report for a single employee
 *
 * @param employeeData - Single employee hours data
 * @param dateRange - Report date range
 * @param dealershipName - Dealership name
 * @returns Formatted report data ready for export
 */
export function createEmployeeDetailReport(
  employeeData: EmployeeHoursData,
  dateRange: DateRange,
  dealershipName: string
): ReportData {
  const overtimePercentage = employeeData.total_hours > 0
    ? (employeeData.overtime_hours / employeeData.total_hours) * 100
    : 0;

  const avgHoursPerEntry = employeeData.total_entries > 0
    ? employeeData.total_hours / employeeData.total_entries
    : 0;

  const rows = [
    ['Employee Name', employeeData.employee_name],
    ['Employee Number', employeeData.employee_number],
    ['Department', formatDepartmentName(employeeData.department)],
    ['Total Hours', formatHours(employeeData.total_hours)],
    ['Regular Hours', formatHours(employeeData.regular_hours)],
    ['Overtime Hours', formatHours(employeeData.overtime_hours)],
    ['Overtime Percentage', `${overtimePercentage.toFixed(1)}%`],
    ['Total Time Entries', employeeData.total_entries.toString()],
    ['Avg Hours per Entry', formatHours(avgHoursPerEntry)]
  ];

  return {
    title: 'Employee Hours Report',
    subtitle: `${employeeData.employee_name} (${employeeData.employee_number})`,
    dateRange: formatDateRange(dateRange.from, dateRange.to),
    dealershipName,
    generatedAt: new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }),
    headers: ['Detail', 'Value'],
    rows,
    summary: [
      { label: 'Total Hours', value: formatHours(employeeData.total_hours) },
      { label: 'Regular Hours', value: formatHours(employeeData.regular_hours) },
      { label: 'Overtime Hours', value: formatHours(employeeData.overtime_hours) },
      { label: 'Time Entries', value: employeeData.total_entries }
    ]
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format department name for display
 */
function formatDepartmentName(
  department: 'detail' | 'car_wash' | 'service' | 'management'
): string {
  const names = {
    detail: 'Detail',
    car_wash: 'Car Wash',
    service: 'Service',
    management: 'Management'
  };

  return names[department] || department;
}
