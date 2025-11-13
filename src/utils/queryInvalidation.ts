/**
 * Query Invalidation Utilities
 *
 * Centralized query invalidation helpers for consistent cache management.
 * Use these helpers instead of manual invalidation to ensure all related
 * queries are properly refreshed.
 *
 * @module queryInvalidation
 */

import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate all invoice-related queries
 *
 * Use this after any invoice mutation (create, update, delete, add payment).
 * Ensures all invoice views and counts are refreshed.
 *
 * **Invalidates:**
 * - Invoice list
 * - Invoice summary/stats
 * - Vehicle counts (all vehicles, vehicles without invoice)
 *
 * @param queryClient - TanStack Query client instance
 *
 * @example
 * ```typescript
 * // After creating an invoice
 * await createInvoice(invoiceData);
 * invalidateInvoiceQueries(queryClient);
 *
 * // Or in a mutation onSuccess
 * useMutation({
 *   mutationFn: createInvoice,
 *   onSuccess: () => invalidateInvoiceQueries(queryClient)
 * });
 * ```
 */
export function invalidateInvoiceQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['invoices'] });
  queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
  queryClient.invalidateQueries({ queryKey: ['all-vehicles-for-counts'] });
  queryClient.invalidateQueries({ queryKey: ['vehicles-without-invoice'] });
}

/**
 * Invalidate all order-related queries
 *
 * Use this after any order mutation (create, update, delete, status change).
 * Ensures all order views and analytics are refreshed.
 *
 * **Invalidates:**
 * - Order lists
 * - Order analytics
 * - Dashboard metrics
 *
 * @param queryClient - TanStack Query client instance
 *
 * @example
 * ```typescript
 * await updateOrderStatus(orderId, 'completed');
 * invalidateOrderQueries(queryClient);
 * ```
 */
export function invalidateOrderQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: ['orders-analytics'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
}

/**
 * Invalidate all report-related queries
 *
 * Use this when data changes that affect reports/analytics.
 * More granular than invalidating everything.
 *
 * **Invalidates:**
 * - Revenue analytics
 * - Department revenue
 * - Performance trends
 *
 * @param queryClient - TanStack Query client instance
 *
 * @example
 * ```typescript
 * await updateOrderTotal(orderId, newTotal);
 * invalidateReportQueries(queryClient);
 * ```
 */
export function invalidateReportQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['revenue-analytics'] });
  queryClient.invalidateQueries({ queryKey: ['department-revenue'] });
  queryClient.invalidateQueries({ queryKey: ['performance-trends'] });
}

/**
 * Invalidate a specific invoice by ID
 *
 * Use this when updating a single invoice to avoid
 * re-fetching the entire invoice list.
 *
 * @param queryClient - TanStack Query client instance
 * @param invoiceId - Invoice ID to invalidate
 *
 * @example
 * ```typescript
 * await recordPayment(invoiceId, paymentData);
 * invalidateInvoiceById(queryClient, invoiceId);
 * ```
 */
export function invalidateInvoiceById(queryClient: QueryClient, invoiceId: string): void {
  queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
  // Also invalidate list to update counts/totals
  queryClient.invalidateQueries({ queryKey: ['invoices'] });
  queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
}

/**
 * Invalidate all queries
 *
 * **WARNING**: Only use this for major data changes that affect
 * multiple unrelated entities. Prefer specific invalidations.
 *
 * @param queryClient - TanStack Query client instance
 *
 * @example
 * ```typescript
 * // After bulk import
 * await importBulkData(csvData);
 * invalidateAllQueries(queryClient);
 * ```
 */
export function invalidateAllQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries();
}

/**
 * Create a reusable invalidation function for specific entities
 *
 * @param queryKeys - Array of query keys to invalidate
 * @returns Function that invalidates the specified queries
 *
 * @example
 * ```typescript
 * const invalidateContacts = createInvalidationHelper(['contacts', 'contact-groups']);
 *
 * await createContact(contactData);
 * invalidateContacts(queryClient);
 * ```
 */
export function createInvalidationHelper(queryKeys: string[]) {
  return (queryClient: QueryClient): void => {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };
}
