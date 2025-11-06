/**
 * ✅ PHASE 2.1: Permission Serialization Utility
 *
 * Handles serialization and deserialization of permission data for localStorage caching.
 * Converts Map/Set objects to arrays for JSON storage and back.
 *
 * Enterprise-grade caching strategy:
 * - 5-minute TTL (balance between freshness and performance)
 * - Version-based cache invalidation
 * - Graceful fallback on errors
 * - User-specific cache validation
 */

import type { EnhancedUserGranular } from '@/types/permissions';
import type { ModulePermissionKey, SystemPermissionKey } from '@/types/permissions';
import type { AppModule } from '@/hooks/usePermissions';

interface SerializedPermissions {
  id: string;
  email: string;
  dealership_id: number | null;
  is_system_admin: boolean;
  is_supermanager: boolean;  // UPDATED: Renamed from is_manager for role system redesign
  allowed_modules?: string[];  // 🆕 NEW: Global allowed modules for supermanagers
  system_permissions: SystemPermissionKey[];
  module_permissions: [AppModule, ModulePermissionKey[]][];
  custom_roles: any[];
  cached_at: number;
  version: number;
}

const CACHE_VERSION = 5;  // 🆕 INCREMENTED: Force cache invalidation for allowed_modules feature
const CACHE_KEY = 'permissions_cache_v1';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes (increased from 5 to reduce re-fetches)

/**
 * Serialize permissions from Map/Set to arrays for JSON storage
 *
 * @param user - Enhanced user with permission Maps and Sets
 * @returns Serialized permissions object ready for localStorage
 */
export function serializePermissions(user: EnhancedUserGranular): SerializedPermissions {
  return {
    id: user.id,
    email: user.email,
    dealership_id: user.dealership_id,
    is_system_admin: user.is_system_admin,
    is_supermanager: user.is_supermanager,  // UPDATED: Renamed from is_manager
    allowed_modules: user.allowed_modules,  // 🆕 NEW: Include allowed modules in cache
    system_permissions: Array.from(user.system_permissions),
    module_permissions: Array.from(user.module_permissions.entries()).map(
      ([module, perms]) => [module, Array.from(perms)]
    ),
    custom_roles: user.custom_roles,
    cached_at: Date.now(),
    version: CACHE_VERSION
  };
}

/**
 * Deserialize permissions from arrays back to Map/Set objects
 * Validates cache version and TTL before deserialization
 *
 * @param cached - Cached permissions object from localStorage
 * @returns EnhancedUserGranular object or null if cache invalid
 */
export function deserializePermissions(cached: SerializedPermissions): EnhancedUserGranular | null {
  try {
    // Validate cache version
    if (cached.version !== CACHE_VERSION) {
      console.log('⚠️ Permission cache version mismatch, invalidating');
      return null;
    }

    // Validate TTL
    const age = Date.now() - cached.cached_at;
    if (age > CACHE_TTL) {
      console.log(`⚠️ Permission cache expired (age: ${Math.round(age / 1000)}s, TTL: ${CACHE_TTL / 1000}s)`);
      return null;
    }

    // Deserialize Map and Set objects
    return {
      id: cached.id,
      email: cached.email,
      dealership_id: cached.dealership_id,
      is_system_admin: cached.is_system_admin,
      is_supermanager: cached.is_supermanager,  // UPDATED: Renamed from is_manager
      allowed_modules: cached.allowed_modules,  // 🆕 NEW: Restore allowed modules from cache
      system_permissions: new Set(cached.system_permissions),
      module_permissions: new Map(
        cached.module_permissions.map(([module, perms]) => [module, new Set(perms)])
      ),
      custom_roles: cached.custom_roles
    };
  } catch (error) {
    console.error('❌ Permission deserialization error:', error);
    return null;
  }
}

/**
 * Save permissions to localStorage cache
 *
 * @param user - Enhanced user with permissions to cache
 */
export function cachePermissions(user: EnhancedUserGranular): void {
  try {
    const serialized = serializePermissions(user);
    localStorage.setItem(CACHE_KEY, JSON.stringify(serialized));
    console.log(`✅ Permissions cached for user ${user.email}`);
  } catch (error) {
    // Don't throw - caching is enhancement, not requirement
    console.warn('⚠️ Failed to cache permissions (localStorage full?):', error);
  }
}

/**
 * Load permissions from localStorage cache
 * Validates user ID to prevent cross-user cache leaks
 *
 * @param userId - User ID to validate against cache
 * @returns Cached permissions or null if not found/invalid
 */
export function getCachedPermissions(userId: string): EnhancedUserGranular | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      console.log('📦 No permission cache found');
      return null;
    }

    const parsed: SerializedPermissions = JSON.parse(cached);

    // Validate user ID (security: prevent using wrong user's cache)
    if (parsed.id !== userId) {
      console.warn('⚠️ Permission cache user ID mismatch, clearing');
      clearPermissionsCache();
      return null;
    }

    const deserialized = deserializePermissions(parsed);

    if (deserialized) {
      const cacheAge = Math.round((Date.now() - parsed.cached_at) / 1000);
      console.log(`⚡ Permissions loaded from cache (age: ${cacheAge}s)`);
    }

    return deserialized;
  } catch (error) {
    console.warn('⚠️ Failed to load cached permissions (corrupted?):', error);
    clearPermissionsCache(); // Clear corrupted cache
    return null;
  }
}

/**
 * Clear permission cache from localStorage
 * Called on logout or when cache becomes invalid
 */
export function clearPermissionsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
    // Also clear any legacy cache keys
    localStorage.removeItem('permissions_cache_v2');
    localStorage.removeItem('permissions_cache_v3');
    // Clear user profile cache too
    localStorage.removeItem('user_profile_cache');
    console.log('🗑️ Permission cache cleared completely');
  } catch (error) {
    console.warn('⚠️ Failed to clear permission cache:', error);
  }
}

/**
 * Force clear ALL permission-related cache
 * Use this when you need to ensure complete cache invalidation
 */
export function forceInvalidateAllPermissionCache(): void {
  try {
    // Clear all permission cache keys
    const keysToRemove = [
      CACHE_KEY,
      'permissions_cache_v1',
      'permissions_cache_v2',
      'permissions_cache_v3',
      'user_profile_cache',
      'dealership_cache',
      'accessible_dealerships_cache'
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear all sessionStorage too
    sessionStorage.clear();

    console.log('🧹 FORCE: All permission cache cleared');
  } catch (error) {
    console.warn('⚠️ Failed to force clear cache:', error);
  }
}

/**
 * Get cache statistics for debugging and monitoring
 *
 * @param userId - User ID to check cache for
 * @returns Cache statistics object
 */
export function getPermissionCacheStats(userId: string) {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return {
        exists: false,
        valid: false,
        age: null,
        ttl: CACHE_TTL,
        version: null,
        reason: 'No cache found'
      };
    }

    const parsed: SerializedPermissions = JSON.parse(cached);
    const age = Date.now() - parsed.cached_at;
    const valid = parsed.version === CACHE_VERSION &&
                  age <= CACHE_TTL &&
                  parsed.id === userId;

    return {
      exists: true,
      valid,
      age,
      ttl: CACHE_TTL,
      version: parsed.version,
      userId: parsed.id,
      reason: !valid ? (
        parsed.version !== CACHE_VERSION ? 'Version mismatch' :
        age > CACHE_TTL ? 'Expired' :
        parsed.id !== userId ? 'User ID mismatch' :
        'Unknown'
      ) : 'Valid'
    };
  } catch (error) {
    return {
      exists: true,
      valid: false,
      age: null,
      ttl: CACHE_TTL,
      version: null,
      reason: `Parse error: ${error.message}`
    };
  }
}
