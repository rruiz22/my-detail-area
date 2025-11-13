/**
 * Query Limits Configuration
 *
 * Centralized limit configuration for Supabase queries.
 *
 * IMPORTANT: These limits are temporary workarounds for client-side filtering.
 * TODO: Implement proper pagination or move filters to server-side RPCs.
 *
 * @module queryLimits
 */

/**
 * Maximum number of records to fetch in a single query
 *
 * WARNING: High limits can impact performance. Consider these factors:
 * - Network bandwidth
 * - Browser memory
 * - Time to first render
 * - User experience
 *  *
 * RECOMMENDATION: Implement pagination for better UX and performance.
 */
export const QUERY_LIMITS = {
  /**
   * Standard limit for most list views
   * Use for: Order lists, contact lists, vehicle lists
   */
  STANDARD: 5000,

  /**
   * Extended limit for reports and analytics
   * Use for: Report generation, export functions, analytics
   *
   * WARNING: Only use for authenticated, filtered queries
   */
  EXTENDED: 50000,

  /**
   * Maximum safe limit before pagination becomes critical
   * Use for: Edge cases with known large datasets
   *
   * CRITICAL: At this limit, pagination is STRONGLY recommended
   */
  MAXIMUM: 100000,
} as const;

/**
 * Recommended pagination sizes for different data types
 */
export const PAGINATION = {
  /** Small lists (10 items per page) */
  SMALL: 10,

  /** Medium lists (25 items per page) */
  MEDIUM: 25,

  /** Large lists (50 items per page) */
  LARGE: 50,

  /** Extra large lists (100 items per page) */
  XLARGE: 100,
} as const;

/**
 * Type exports for TypeScript support
 */
export type QueryLimit = typeof QUERY_LIMITS[keyof typeof QUERY_LIMITS];
export type PaginationSize = typeof PAGINATION[keyof typeof PAGINATION];
