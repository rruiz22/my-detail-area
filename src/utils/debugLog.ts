/**
 * Debug Logging Utility
 *
 * Provides environment-aware logging that only outputs in development mode.
 * In production builds, these logs are completely removed for performance and security.
 *
 * Usage:
 * ```typescript
 * import { debugLog } from '@/utils/debugLog';
 *
 * debugLog('[Component] Action happening:', data);
 * debugLog.warn('[Component] Warning:', issue);
 * debugLog.error('[Component] Error:', error);
 * ```
 */

const isDevelopment = import.meta.env.DEV;

/**
 * Debug log - only outputs in development mode
 */
export const debugLog = Object.assign(
  (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  {
    /**
     * Debug warn - only outputs in development mode
     */
    warn: (...args: any[]) => {
      if (isDevelopment) {
        console.warn(...args);
      }
    },

    /**
     * Debug error - always outputs (errors should be visible in production too)
     */
    error: (...args: any[]) => {
      console.error(...args);
    },

    /**
     * Debug table - only in development mode
     */
    table: (data: any) => {
      if (isDevelopment) {
        console.table(data);
      }
    },

    /**
     * Debug group - only in development mode
     */
    group: (label: string) => {
      if (isDevelopment) {
        console.group(label);
      }
    },

    /**
     * Debug group end - only in development mode
     */
    groupEnd: () => {
      if (isDevelopment) {
        console.groupEnd();
      }
    }
  }
);

/**
 * Performance mark - only in development mode
 */
export const debugPerf = {
  mark: (label: string) => {
    if (isDevelopment && performance.mark) {
      performance.mark(label);
    }
  },

  measure: (name: string, startMark: string, endMark: string) => {
    if (isDevelopment && performance.measure) {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      debugLog(`[Performance] ${name}:`, `${measure.duration.toFixed(2)}ms`);
    }
  }
};
