import { Invoice } from '@/types/invoices';
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';

export type GroupByOption = 'none' | 'status' | 'department' | 'week';

export interface InvoiceGroup {
  key: string;
  label: string;
  invoices: Invoice[];
  summary: GroupSummary;
  sortOrder: number;
}

export interface GroupSummary {
  count: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
}

/**
 * Status order for grouping (most urgent first)
 */
const STATUS_ORDER: Record<string, number> = {
  overdue: 1,
  partially_paid: 2,
  pending: 3,
  draft: 4,
  paid: 5,
  cancelled: 6,
};

/**
 * Department order for grouping
 */
const DEPARTMENT_ORDER: Record<string, number> = {
  sales: 1,
  service: 2,
  recon: 3,
  car_wash: 4,
  carwash: 4, // Alias
};

/**
 * Groups invoices by status with priority order (Overdue first)
 */
export function groupInvoicesByStatus(invoices: Invoice[]): InvoiceGroup[] {
  const grouped = new Map<string, Invoice[]>();

  invoices.forEach((invoice) => {
    const status = invoice.status || 'draft';
    if (!grouped.has(status)) {
      grouped.set(status, []);
    }
    grouped.get(status)!.push(invoice);
  });

  const groups: InvoiceGroup[] = [];
  grouped.forEach((groupInvoices, status) => {
    groups.push({
      key: status,
      label: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      invoices: groupInvoices,
      summary: calculateGroupSummary(groupInvoices),
      sortOrder: STATUS_ORDER[status] || 999,
    });
  });

  return groups.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Groups invoices by department(s) from metadata
 */
export function groupInvoicesByDepartment(invoices: Invoice[]): InvoiceGroup[] {
  const grouped = new Map<string, Invoice[]>();

  invoices.forEach((invoice) => {
    // Get departments from metadata
    const departments = invoice.metadata?.departments as string[] | undefined;
    const department = invoice.metadata?.department as string | undefined;

    // Handle both array and single department
    const depts = departments || (department ? [department] : ['unknown']);

    depts.forEach((dept) => {
      const normalizedDept = dept.toLowerCase();
      if (!grouped.has(normalizedDept)) {
        grouped.set(normalizedDept, []);
      }
      grouped.get(normalizedDept)!.push(invoice);
    });
  });

  const groups: InvoiceGroup[] = [];
  grouped.forEach((groupInvoices, dept) => {
    groups.push({
      key: dept,
      label: dept === 'car_wash' || dept === 'carwash'
        ? 'Car Wash'
        : dept.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      invoices: groupInvoices,
      summary: calculateGroupSummary(groupInvoices),
      sortOrder: DEPARTMENT_ORDER[dept] || 999,
    });
  });

  return groups.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Groups invoices by week using date range from metadata
 */
export function groupInvoicesByWeek(invoices: Invoice[]): InvoiceGroup[] {
  const grouped = new Map<string, Invoice[]>();

  invoices.forEach((invoice) => {
    // Get date range from metadata (preferred) or fallback to issueDate
    const dateRange = invoice.metadata?.filter_date_range as { start?: string; end?: string } | undefined;
    const referenceDate = dateRange?.start || invoice.issueDate;

    if (!referenceDate) {
      // Fallback to 'unknown' if no date available
      if (!grouped.has('unknown')) {
        grouped.set('unknown', []);
      }
      grouped.get('unknown')!.push(invoice);
      return;
    }

    const date = typeof referenceDate === 'string' ? parseISO(referenceDate) : referenceDate;
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday (lunes)
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Sunday (domingo)

    // Use ISO string as key for sorting
    const weekKey = weekStart.toISOString();
    if (!grouped.has(weekKey)) {
      grouped.set(weekKey, []);
    }
    grouped.get(weekKey)!.push(invoice);
  });

  const groups: InvoiceGroup[] = [];
  grouped.forEach((groupInvoices, weekKey) => {
    if (weekKey === 'unknown') {
      groups.push({
        key: 'unknown',
        label: 'Unknown Date',
        invoices: groupInvoices,
        summary: calculateGroupSummary(groupInvoices),
        sortOrder: 999999,
      });
    } else {
      const weekStart = parseISO(weekKey);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      groups.push({
        key: weekKey,
        label: getWeekLabel(weekStart, weekEnd),
        invoices: groupInvoices,
        summary: calculateGroupSummary(groupInvoices),
        sortOrder: weekStart.getTime(),
      });
    }
  });

  // Sort by week (most recent first)
  return groups.sort((a, b) => b.sortOrder - a.sortOrder);
}

/**
 * Calculates summary statistics for a group of invoices
 */
export function calculateGroupSummary(invoices: Invoice[]): GroupSummary {
  return invoices.reduce(
    (acc, invoice) => ({
      count: acc.count + 1,
      totalAmount: acc.totalAmount + (invoice.totalAmount || 0),
      amountPaid: acc.amountPaid + (invoice.amountPaid || 0),
      amountDue: acc.amountDue + (invoice.amountDue || 0),
    }),
    {
      count: 0,
      totalAmount: 0,
      amountPaid: 0,
      amountDue: 0,
    }
  );
}

/**
 * Generates a human-readable week label
 * Example: "Week of Nov 25 - Dec 01, 2024"
 */
export function getWeekLabel(weekStart: Date, weekEnd: Date): string {
  const startMonth = format(weekStart, 'MMM');
  const startDay = format(weekStart, 'dd');
  const endMonth = format(weekEnd, 'MMM');
  const endDay = format(weekEnd, 'dd');
  const year = format(weekEnd, 'yyyy');

  if (startMonth === endMonth) {
    return `Week of ${startMonth} ${startDay}-${endDay}, ${year}`;
  }

  return `Week of ${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Main grouping function that routes to the appropriate grouping method
 */
export function groupInvoices(
  invoices: Invoice[],
  groupBy: GroupByOption
): InvoiceGroup[] {
  switch (groupBy) {
    case 'status':
      return groupInvoicesByStatus(invoices);
    case 'department':
      return groupInvoicesByDepartment(invoices);
    case 'week':
      return groupInvoicesByWeek(invoices);
    case 'none':
    default:
      return [];
  }
}
