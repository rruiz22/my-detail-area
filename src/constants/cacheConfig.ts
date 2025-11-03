/**
 * Cache Configuration Constants
 *
 * Centralized cache timing configuration for TanStack Query.
 * Use these constants to ensure consistency across the application.
 *
 * @module cacheConfig
 */

/**
 * Standard cache times (staleTime) for queries
 *
 * - INSTANT: Data is always considered stale (0ms) - refetch on every mount
 * - SHORT: 1 minute - For frequently changing data (dashboards, analytics)
 * - MEDIUM: 5 minutes - Standard for most application data
 * - LONG: 15 minutes - For semi-static data (memberships, dealerships)
 * - VERY_LONG: 30 minutes - For rarely changing data (platform config, system settings)
 */
export const CACHE_TIMES = {
  /** Always fetch fresh data - 0ms */
  INSTANT: 0,

  /** Short cache - 1 minute */
  SHORT: 60 * 1000,

  /** Medium cache (DEFAULT) - 5 minutes */
  MEDIUM: 5 * 60 * 1000,

  /** Long cache - 15 minutes */
  LONG: 15 * 60 * 1000,

  /** Very long cache - 30 minutes */
  VERY_LONG: 30 * 60 * 1000,
} as const;

/**
 * Garbage collection times (gcTime) for queries
 *
 * Time before unused cached data is garbage collected.
 * Should typically be 2x the staleTime.
 *
 * - SHORT: 5 minutes
 * - MEDIUM: 10 minutes (DEFAULT)
 * - LONG: 30 minutes
 * - VERY_LONG: 1 hour
 */
export const GC_TIMES = {
  /** Short GC - 5 minutes */
  SHORT: 5 * 60 * 1000,

  /** Medium GC (DEFAULT) - 10 minutes */
  MEDIUM: 10 * 60 * 1000,

  /** Long GC - 30 minutes */
  LONG: 30 * 60 * 1000,

  /** Very long GC - 1 hour */
  VERY_LONG: 60 * 60 * 1000,
} as const;

/**
 * Recommended cache configurations by data type
 *
 * Use these as guidelines when configuring new queries:
 *
 * @example
 * ```typescript
 * // Real-time data (deleted vehicles, live orders)
 * useQuery({
 *   queryKey: ['live-data'],
 *   staleTime: CACHE_TIMES.INSTANT,
 *   gcTime: GC_TIMES.SHORT
 * });
 *
 * // Dashboard metrics
 * useQuery({
 *   queryKey: ['dashboard-metrics'],
 *   staleTime: CACHE_TIMES.SHORT,
 *   gcTime: GC_TIMES.MEDIUM
 * });
 *
 * // User lists, orders
 * useQuery({
 *   queryKey: ['users'],
 *   staleTime: CACHE_TIMES.MEDIUM,
 *   gcTime: GC_TIMES.MEDIUM
 * });
 *
 * // Memberships, dealerships
 * useQuery({
 *   queryKey: ['memberships'],
 *   staleTime: CACHE_TIMES.LONG,
 *   gcTime: GC_TIMES.LONG
 * });
 *
 * // Platform config, system settings
 * useQuery({
 *   queryKey: ['platform-config'],
 *   staleTime: CACHE_TIMES.VERY_LONG,
 *   gcTime: GC_TIMES.VERY_LONG
 * });
 * ```
 */
export const CACHE_RECOMMENDATIONS = {
  /** Real-time data that changes frequently */
  REALTIME: {
    staleTime: CACHE_TIMES.INSTANT,
    gcTime: GC_TIMES.SHORT,
    description: 'Live data, deleted items, real-time feeds'
  },

  /** Dashboard and analytics data */
  DASHBOARD: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: GC_TIMES.MEDIUM,
    description: 'Metrics, charts, analytics dashboards'
  },

  /** Standard application data */
  STANDARD: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
    description: 'Orders, contacts, users, vehicles'
  },

  /** Semi-static organizational data */
  ORGANIZATIONAL: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: GC_TIMES.LONG,
    description: 'Memberships, dealerships, permissions'
  },

  /** Rarely changing system data */
  SYSTEM: {
    staleTime: CACHE_TIMES.VERY_LONG,
    gcTime: GC_TIMES.VERY_LONG,
    description: 'Platform config, system settings, static data'
  }
} as const;

/**
 * Type exports for TypeScript support
 */
export type CacheTime = typeof CACHE_TIMES[keyof typeof CACHE_TIMES];
export type GCTime = typeof GC_TIMES[keyof typeof GC_TIMES];
export type CacheRecommendation = keyof typeof CACHE_RECOMMENDATIONS;
