/**
 * Cache Management Utilities
 *
 * Unified cache clearing functionality for:
 * - System updates (aggressive clearing)
 * - Manual cache clear (selective clearing)
 * - Permission invalidation
 * - TanStack Query cache
 */

import { QueryClient } from '@tanstack/react-query';
import { forceInvalidateAllPermissionCache } from './permissionSerialization';

export interface ClearCacheOptions {
  /**
   * Aggressive mode clears ALL storage (localStorage, sessionStorage, IndexedDB)
   * Selective mode only clears app-specific caches (permissions, queries, profile)
   * @default 'selective'
   */
  mode?: 'aggressive' | 'selective';

  /**
   * TanStack Query client instance for cache invalidation
   * Required for selective mode
   */
  queryClient?: QueryClient;

  /**
   * Whether to reload the page after clearing cache
   * @default true
   */
  reload?: boolean;

  /**
   * Delay in ms before reloading (only if reload is true)
   * @default 0
   */
  reloadDelay?: number;
}

/**
 * Clear Service Worker caches
 */
async function clearServiceWorkerCaches(): Promise<void> {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('✅ Service Worker caches cleared');
    } catch (error) {
      console.error('❌ Error clearing Service Worker caches:', error);
    }
  }
}

/**
 * Clear IndexedDB databases
 */
async function clearIndexedDB(): Promise<void> {
  if ('indexedDB' in window) {
    try {
      indexedDB.deleteDatabase('firebaseLocalStorageDb');
      indexedDB.deleteDatabase('REACT_QUERY_OFFLINE_CACHE');
      console.log('✅ IndexedDB cleared');
    } catch (error) {
      console.error('❌ Error clearing IndexedDB:', error);
    }
  }
}

/**
 * Clear app-specific localStorage and sessionStorage items
 */
function clearAppSpecificStorage(): void {
  try {
    // Clear permission and profile caches
    forceInvalidateAllPermissionCache();
    localStorage.removeItem('user_profile_cache');
    console.log('✅ App-specific storage cleared');
  } catch (error) {
    console.error('❌ Error clearing app-specific storage:', error);
  }
}

/**
 * Clear ALL localStorage and sessionStorage (aggressive)
 */
function clearAllStorage(): void {
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ All storage cleared');
  } catch (error) {
    console.error('❌ Error clearing all storage:', error);
  }
}

/**
 * Main cache clearing function
 *
 * @example
 * // Selective clearing (manual clear cache button)
 * await clearAllCaches({
 *   mode: 'selective',
 *   queryClient,
 *   reload: true,
 *   reloadDelay: 1000
 * });
 *
 * @example
 * // Aggressive clearing (system update)
 * await clearAllCaches({
 *   mode: 'aggressive',
 *   reload: true,
 *   reloadDelay: 0
 * });
 */
export async function clearAllCaches(options: ClearCacheOptions = {}): Promise<void> {
  const {
    mode = 'selective',
    queryClient,
    reload = true,
    reloadDelay = 0
  } = options;

  try {
    console.log(`🧹 Starting cache clearing (${mode} mode)...`);

    if (mode === 'aggressive') {
      // Aggressive mode: Clear EVERYTHING (for system updates)
      await Promise.all([
        clearServiceWorkerCaches(),
        clearIndexedDB()
      ]);
      clearAllStorage();
    } else {
      // Selective mode: Clear only app-specific data (for manual clearing)
      await Promise.all([
        clearServiceWorkerCaches(),
        clearIndexedDB()
      ]);
      clearAppSpecificStorage();

      // Reset TanStack Query cache
      if (queryClient) {
        await queryClient.resetQueries();
        console.log('✅ TanStack Query cache cleared');
      }
    }

    console.log('✅ Cache clearing completed');

    // Reload page if requested
    if (reload) {
      setTimeout(() => {
        window.location.reload();
      }, reloadDelay);
    }
  } catch (error) {
    console.error('❌ Error during cache clearing:', error);

    // Still reload if requested, even if there were errors
    if (reload) {
      setTimeout(() => {
        window.location.reload();
      }, reloadDelay);
    }

    throw error;
  }
}

/**
 * Quick helper for aggressive cache clearing (system updates)
 */
export async function clearAllCachesAggressive(): Promise<void> {
  return clearAllCaches({ mode: 'aggressive', reload: true, reloadDelay: 0 });
}

/**
 * Quick helper for selective cache clearing (manual clear)
 */
export async function clearAllCachesSelective(queryClient: QueryClient): Promise<void> {
  return clearAllCaches({
    mode: 'selective',
    queryClient,
    reload: true,
    reloadDelay: 1000
  });
}
