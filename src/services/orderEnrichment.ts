/**
 * Order Enrichment Service - Enterprise-Grade Data Enhancement
 *
 * This service provides reusable, type-safe functions to enrich order data
 * with related information from lookup tables (dealerships, users, groups).
 *
 * **Architecture Benefits:**
 * - DRY Principle: Single source of truth for enrichment logic
 * - Performance: O(1) lookups using Map data structures
 * - Type Safety: Strict TypeScript interfaces with no `any` types
 * - Pure Functions: No side effects, easy to test
 * - Scalability: Supports all order types (sales, service, recon, carwash)
 *
 * **Usage Example:**
 * ```typescript
 * const lookups = await fetchEnrichmentLookups();
 * const enrichedOrder = enrichOrderWithLookups(rawOrder, lookups);
 * const enrichedOrders = enrichOrdersArray(rawOrders, lookups);
 * ```
 *
 * @module services/orderEnrichment
 * @since 2025-01
 * @author My Detail Area - React Architect
 */

import type { Database } from '@/integrations/supabase/types';

// ==================== TYPE DEFINITIONS ====================

/**
 * Base Supabase order row type from database schema
 */
type SupabaseOrderRow = Database['public']['Tables']['orders']['Row'];

/**
 * Dealership lookup data with location information
 */
export interface DealershipLookup {
  name: string;
  city?: string;
  state?: string;
}

/**
 * User profile lookup data for assignment tracking
 */
export interface UserLookup {
  name: string;
  email: string;
}

/**
 * Dealer group lookup data for team organization
 */
export interface GroupLookup {
  name: string;
}

/**
 * Comprehensive lookup maps for order enrichment
 * Uses Map for O(1) lookups instead of array.find() O(n)
 */
export interface EnrichmentLookups {
  /** Map of dealership_id → dealership data */
  dealerships: Map<number, DealershipLookup>;
  /** Map of user_id → user profile data */
  users: Map<string, UserLookup>;
  /** Map of group_id → group data (optional, for permission-based filtering) */
  groups?: Map<string, GroupLookup>;
}

/**
 * Enriched order with populated relationship fields
 * Extends base order with denormalized data for UI display
 */
export interface EnrichedOrder extends SupabaseOrderRow {
  /** Dealership name from JOIN (UI display) */
  dealershipName: string;
  /** Assigned user name from JOIN (UI display) */
  assignedTo: string;
  /** Assigned group name from JOIN (UI display, optional) */
  assignedGroupName?: string;
  /** Creator group name from JOIN (UI display, optional) */
  createdByGroupName?: string;
  /** Formatted due time for display (HH:MM AM/PM) */
  dueTime?: string;
  /** Comment count from aggregation (default: 0) */
  comments?: number;
}

// ==================== CORE ENRICHMENT FUNCTIONS ====================

/**
 * Enriches a single order with related lookup data
 *
 * **Process:**
 * 1. Lookup dealership name by dealer_id
 * 2. Lookup assigned user name by assigned_group_id (note: field contains user IDs)
 * 3. Lookup group names for assigned/created groups
 * 4. Format due time for UI display
 *
 * **Performance:** O(1) lookups using Map data structures
 *
 * @param order - Raw order from Supabase query
 * @param lookups - Pre-fetched lookup maps for relationships
 * @returns Enriched order with populated relationship fields
 *
 * @example
 * ```typescript
 * const lookups = {
 *   dealerships: new Map([[5, { name: 'ABC Motors' }]]),
 *   users: new Map([['user-123', { name: 'John Doe', email: 'john@example.com' }]]),
 *   groups: new Map([['group-456', { name: 'Sales Team' }]])
 * };
 * const enriched = enrichOrderWithLookups(rawOrder, lookups);
 * console.log(enriched.dealershipName); // 'ABC Motors'
 * console.log(enriched.assignedTo); // 'John Doe'
 * ```
 */
export function enrichOrderWithLookups(
  order: SupabaseOrderRow,
  lookups: EnrichmentLookups
): EnrichedOrder {
  // Dealership name lookup (required field)
  const dealershipName = lookups.dealerships.get(order.dealer_id)?.name || 'Unknown Dealer';

  // Assigned user lookup (assigned_group_id actually contains user IDs, not group IDs)
  // This is a legacy naming issue in the schema
  const assignedTo = order.assigned_group_id
    ? lookups.users.get(order.assigned_group_id)?.name || 'Unknown User'
    : 'Unassigned';

  // Group name lookups (optional, depends on permission system)
  const assignedGroupName = order.assigned_group_id && lookups.groups
    ? lookups.groups.get(order.assigned_group_id)?.name
    : undefined;

  const createdByGroupName = order.created_by_group_id && lookups.groups
    ? lookups.groups.get(order.created_by_group_id)?.name
    : undefined;

  // Format due time for UI display (handles both due_date and sla_deadline)
  const primaryDate = order.due_date || order.sla_deadline;
  const dueTime = primaryDate
    ? new Date(primaryDate).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    : undefined;

  // Comment count from aggregation (fallback to 0 if missing)
  const comments = extractCommentCount(order);

  // Return enriched order with all populated fields
  return {
    ...order,
    dealershipName,
    assignedTo,
    assignedGroupName,
    createdByGroupName,
    dueTime,
    comments
  };
}

/**
 * Enriches an array of orders with related lookup data
 *
 * **Performance Optimization:**
 * - Single batch fetch for all lookups (3 queries total)
 * - O(1) lookups per order using Map
 * - Total complexity: O(n) where n = number of orders
 * - Much faster than N×3 individual queries per order
 *
 * @param orders - Array of raw orders from Supabase query
 * @param lookups - Pre-fetched lookup maps for relationships
 * @returns Array of enriched orders with populated relationship fields
 *
 * @example
 * ```typescript
 * const rawOrders = await supabase.from('orders').select('*');
 * const lookups = await fetchEnrichmentLookups(supabase);
 * const enrichedOrders = enrichOrdersArray(rawOrders, lookups);
 * ```
 */
export function enrichOrdersArray(
  orders: SupabaseOrderRow[],
  lookups: EnrichmentLookups
): EnrichedOrder[] {
  return orders.map(order => enrichOrderWithLookups(order, lookups));
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Extracts comment count from order with aggregated comments
 * Handles multiple aggregation formats from Supabase
 *
 * @param order - Order with potential order_comments aggregation
 * @returns Comment count (default: 0)
 *
 * @internal
 */
function extractCommentCount(order: SupabaseOrderRow): number {
  // Type assertion needed since order_comments is not in base type
  const orderWithComments = order as SupabaseOrderRow & {
    order_comments?: Array<{ count: number }>;
  };

  // Handle aggregation result format: order_comments: [{ count: 5 }]
  if (
    Array.isArray(orderWithComments.order_comments) &&
    orderWithComments.order_comments.length > 0 &&
    typeof orderWithComments.order_comments[0]?.count === 'number'
  ) {
    return orderWithComments.order_comments[0].count;
  }

  // Default: no comments
  return 0;
}

/**
 * Formats a date as time string for UI display
 * Handles null/undefined dates gracefully
 *
 * @param dateString - ISO date string or null
 * @returns Formatted time string (HH:MM AM/PM) or undefined
 *
 * @example
 * ```typescript
 * formatDueTime('2025-01-15T14:30:00Z') // '02:30 PM'
 * formatDueTime(null) // undefined
 * ```
 */
export function formatDueTime(dateString: string | null | undefined): string | undefined {
  if (!dateString) return undefined;

  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    // Invalid date string - return undefined
    return undefined;
  }
}

/**
 * Creates a user display name from profile data
 * Prioritizes full name, falls back to email
 *
 * @param profile - User profile with name and email
 * @returns Formatted display name
 *
 * @example
 * ```typescript
 * createUserDisplayName({ first_name: 'John', last_name: 'Doe', email: 'john@example.com' })
 * // Returns: 'John Doe'
 *
 * createUserDisplayName({ first_name: null, last_name: null, email: 'john@example.com' })
 * // Returns: 'john@example.com'
 * ```
 */
export function createUserDisplayName(profile: {
  first_name: string | null;
  last_name: string | null;
  email: string;
}): string {
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return fullName || profile.email;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard to check if an order has been enriched
 * Useful for runtime validation in components
 *
 * @param order - Order object to check
 * @returns True if order has enrichment fields
 *
 * @example
 * ```typescript
 * if (isEnrichedOrder(order)) {
 *   console.log(order.dealershipName); // TypeScript knows this exists
 * }
 * ```
 */
export function isEnrichedOrder(order: SupabaseOrderRow | EnrichedOrder): order is EnrichedOrder {
  return 'dealershipName' in order && 'assignedTo' in order;
}

/**
 * Type guard to check if lookups are complete
 * Ensures all required maps are populated
 *
 * @param lookups - Partial lookup object
 * @returns True if all required lookups exist
 */
export function hasCompleteLookups(lookups: Partial<EnrichmentLookups>): lookups is EnrichmentLookups {
  return (
    lookups.dealerships instanceof Map &&
    lookups.users instanceof Map
  );
}

// ==================== EXPORTS ====================

/**
 * Default export for convenience
 */
export default {
  enrichOrderWithLookups,
  enrichOrdersArray,
  formatDueTime,
  createUserDisplayName,
  isEnrichedOrder,
  hasCompleteLookups
};
