/**
 * Report Date Utilities
 *
 * Centralized date selection logic for reports and analytics.
 * Different departments use different date fields for reporting.
 *
 * @module reportDateUtils
 */

/**
 * Order type for date selection
 */
export type OrderType = 'sales' | 'service' | 'recon' | 'carwash' | string;

/**
 * Order data interface with date fields
 */
export interface OrderDateFields {
  order_type?: string | null;
  created_at: string;
  completed_at?: string | null;
  due_date?: string | null;
}

/**
 * Get the appropriate report date for an order based on its type
 *
 * **Date Selection Logic:**
 * - **Sales/Service**: Uses `due_date` (when work is scheduled/due)
 *   - Fallback: `created_at` if no due date set
 * - **Recon/CarWash**: Uses `completed_at` (when work was finished)
 *   - Fallback: `created_at` if not yet completed
 * - **Other types**: Uses `created_at` as default
 *
 * This ensures consistent date filtering across:
 * - Financial reports (revenue analytics)
 * - Operational reports (order lists, performance metrics)
 * - Invoices (billing periods)
 *
 * @param order - Order with date fields
 * @returns Date object for reporting
 *
 * @example
 * ```typescript
 * const order = {
 *   order_type: 'sales',
 *   created_at: '2024-01-01',
 *   due_date: '2024-01-15',
 *   completed_at: null
 * };
 *
 * const reportDate = getReportDateForOrder(order);
 * // Returns: Date('2024-01-15') - uses due_date for sales orders
 * ```
 */
export function getReportDateForOrder(order: OrderDateFields): Date {
  const orderTypeLower = (order.order_type?.toLowerCase() || 'sales') as OrderType;

  // Sales and Service departments: use due_date (when work is scheduled)
  // Fallback to created_at if no due date is set yet
  if (orderTypeLower === 'sales' || orderTypeLower === 'service') {
    return order.due_date
      ? new Date(order.due_date)
      : new Date(order.created_at);
  }

  // Recon and CarWash departments: use completed_at (when work is done)
  // Fallback to created_at if work is not yet completed
  if (orderTypeLower === 'recon' || orderTypeLower === 'carwash') {
    return order.completed_at
      ? new Date(order.completed_at)
      : new Date(order.created_at);
  }

  // Default: use created_at for unknown order types
  return new Date(order.created_at);
}

/**
 * Check if an order falls within a date range using the appropriate report date
 *
 * @param order - Order with date fields
 * @param startDate - Range start (inclusive)
 * @param endDate - Range end (inclusive)
 * @returns True if order's report date is within range
 *
 * @example
 * ```typescript
 * const order = {
 *   order_type: 'recon',
 *   created_at: '2024-01-01',
 *   completed_at: '2024-01-15',
 *   due_date: null
 * };
 *
 * const inRange = isOrderInDateRange(
 *   order,
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31')
 * );
 * // Returns: true - completed_at (2024-01-15) is within range
 * ```
 */
export function isOrderInDateRange(
  order: OrderDateFields,
  startDate: Date,
  endDate: Date
): boolean {
  const reportDate = getReportDateForOrder(order);
  return reportDate >= startDate && reportDate <= endDate;
}

/**
 * Get a human-readable explanation of which date field is used for an order type
 *
 * @param orderType - Order type (sales, service, recon, carwash)
 * @returns Description of date field selection
 *
 * @example
 * ```typescript
 * getDateFieldExplanation('sales');
 * // Returns: "Uses due_date (fallback: created_at)"
 *
 * getDateFieldExplanation('recon');
 * // Returns: "Uses completed_at (fallback: created_at)"
 * ```
 */
export function getDateFieldExplanation(orderType: OrderType): string {
  const orderTypeLower = orderType.toLowerCase();

  if (orderTypeLower === 'sales' || orderTypeLower === 'service') {
    return 'Uses due_date (fallback: created_at)';
  }

  if (orderTypeLower === 'recon' || orderTypeLower === 'carwash') {
    return 'Uses completed_at (fallback: created_at)';
  }

  return 'Uses created_at';
}

/**
 * Adjust a date to end of day (23:59:59.999) for inclusive date range queries
 *
 * @param date - Date to adjust
 * @returns New date set to end of day
 *
 * @example
 * ```typescript
 * const endDate = toEndOfDay(new Date('2024-01-15'));
 * // Returns: Date('2024-01-15T23:59:59.999Z')
 * ```
 */
export function toEndOfDay(date: Date): Date {
  const adjusted = new Date(date);
  adjusted.setHours(23, 59, 59, 999);
  return adjusted;
}
