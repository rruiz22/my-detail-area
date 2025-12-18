/**
 * Invoice Sorting Utilities
 *
 * Provides consistent sorting for invoice items with department prioritization
 * and date-based secondary sorting within each department
 */

import type { InvoiceItem } from '@/types/invoices';

/**
 * Department priority order for invoice sorting
 * Lower numbers = higher priority (appear first)
 */
export const DEPARTMENT_PRIORITY: Record<string, number> = {
  sales: 1,
  service: 2,
  recon: 3,
  carwash: 4,
};

/**
 * Get display name for department
 */
export const DEPARTMENT_DISPLAY_NAMES: Record<string, string> = {
  sales: 'Sales Orders',
  service: 'Service Orders',
  recon: 'Recon Orders',
  carwash: 'Car Wash Orders',
};

/**
 * Sorts invoice items by department priority, then by date within each department
 *
 * @param items - Array of invoice items to sort
 * @param getDateFn - Function to extract the correct date from an item
 * @returns Sorted array of invoice items
 *
 * @example
 * const sortedItems = sortInvoiceItemsByDepartment(
 *   invoice.items,
 *   (item) => getCorrectItemDate(item)
 * );
 */
export function sortInvoiceItemsByDepartment<T extends InvoiceItem>(
  items: T[],
  getDateFn: (item: T) => string
): T[] {
  return [...items].sort((a, b) => {
    // First: Sort by department priority
    const deptA = (a.metadata?.order_type as string) || 'unknown';
    const deptB = (b.metadata?.order_type as string) || 'unknown';

    const priorityA = DEPARTMENT_PRIORITY[deptA] || 99;
    const priorityB = DEPARTMENT_PRIORITY[deptB] || 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Second: Sort by date within same department (ascending)
    const dateA = getDateFn(a);
    const dateB = getDateFn(b);

    const timeA = new Date(dateA).getTime();
    const timeB = new Date(dateB).getTime();

    // If dates are invalid, push to end
    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;

    return timeA - timeB;
  });
}

/**
 * Groups invoice items by department for display purposes
 *
 * @param items - Array of invoice items to group
 * @returns Map of department to items
 */
export function groupItemsByDepartment<T extends InvoiceItem>(
  items: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  // Initialize map with all possible departments in order
  Object.keys(DEPARTMENT_PRIORITY).forEach((dept) => {
    grouped.set(dept, []);
  });

  // Group items by department
  items.forEach((item) => {
    const dept = (item.metadata?.order_type as string) || 'unknown';
    const existing = grouped.get(dept) || [];
    grouped.set(dept, [...existing, item]);
  });

  // Remove empty groups
  grouped.forEach((value, key) => {
    if (value.length === 0) {
      grouped.delete(key);
    }
  });

  return grouped;
}

/**
 * Calculates subtotal for a group of invoice items
 *
 * @param items - Array of invoice items
 * @returns Total amount
 */
export function calculateGroupSubtotal<T extends InvoiceItem>(items: T[]): number {
  return items.reduce((sum, item) => sum + (item.amount || 0), 0);
}

/**
 * Checks if department grouping should be shown
 * (only for multi-department invoices)
 *
 * @param items - Array of invoice items
 * @returns True if department headers should be shown
 */
export function shouldShowDepartmentGrouping<T extends InvoiceItem>(items: T[]): boolean {
  const departments = new Set<string>();

  items.forEach((item) => {
    const dept = (item.metadata?.order_type as string) || 'unknown';
    departments.add(dept);
  });

  return departments.size > 1;
}