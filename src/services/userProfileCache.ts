/**
 * User Profile Cache Service
 * Enterprise-grade caching for user profile data to eliminate UI flash
 * Maintains real-time business data while caching static user preferences
 */

// Use safe console methods instead of logger to avoid circular dependencies
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
const safeLog = (...args: any[]) => isDev && console.log('📦', ...args);
const safeWarn = (...args: any[]) => console.warn('⚠️', ...args);

export interface CachedUserProfile {
  userId: string;
  user_type: string;
  role: string;
  first_name: string;
  last_name: string;
  email: string;
  dealershipId?: number;
  dealership_name?: string;
  avatar_seed?: string;
  avatar_variant?: string;
  avatar_colors?: string[];
  cached_at: string;
  version: number;
}

export class UserProfileCacheService {
  private readonly CACHE_KEY = 'user_profile_cache';
  private readonly CACHE_VERSION = 1;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached user profile if valid, otherwise return null
   */
  getCachedProfile(userId: string): CachedUserProfile | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const profile: CachedUserProfile = JSON.parse(cached);

      // Validate cache
      if (
        profile.userId !== userId ||
        profile.version !== this.CACHE_VERSION ||
        Date.now() - new Date(profile.cached_at).getTime() > this.CACHE_TTL
      ) {
        safeLog('Cache invalid or expired, clearing');
        this.clearCache();
        return null;
      }

      safeLog('Loaded user profile from cache (instant)');
      return profile;

    } catch (error) {
      safeWarn('Cache read error, clearing:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Cache user profile data
   */
  cacheProfile(profile: Omit<CachedUserProfile, 'cached_at' | 'version'>): void {
    try {
      const cacheData: CachedUserProfile = {
        ...profile,
        cached_at: new Date().toISOString(),
        version: this.CACHE_VERSION
      };

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
      safeLog('User profile cached successfully');

    } catch (error) {
      safeWarn('Failed to cache profile:', error);
      // Don't throw error - caching is enhancement, not requirement
    }
  }

  /**
   * Update specific fields in cache
   */
  updateCacheField<K extends keyof CachedUserProfile>(
    userId: string,
    field: K,
    value: CachedUserProfile[K]
  ): void {
    try {
      const cached = this.getCachedProfile(userId);
      if (!cached) return;

      cached[field] = value;
      cached.cached_at = new Date().toISOString();

      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cached));
      safeLog(`Cache updated: ${field}`, value);

    } catch (error) {
      safeWarn('Failed to update cache field:', error);
    }
  }

  /**
   * Clear cache (when user logs out or cache becomes invalid)
   */
  clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      safeLog('User profile cache cleared');
    } catch (error) {
      safeWarn('Failed to clear cache:', error);
    }
  }

  /**
   * Check if cache needs refresh (for background sync)
   */
  needsRefresh(userId: string): boolean {
    const cached = this.getCachedProfile(userId);
    if (!cached) return true;

    const cacheAge = Date.now() - new Date(cached.cached_at).getTime();
    return cacheAge > this.SYNC_INTERVAL;
  }

  /**
   * Get cache age for debugging
   */
  getCacheAge(userId: string): number | null {
    const cached = this.getCachedProfile(userId);
    if (!cached) return null;

    return Date.now() - new Date(cached.cached_at).getTime();
  }

  /**
   * Validate cache integrity
   */
  validateCache(): { valid: boolean; reason?: string } {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return { valid: false, reason: 'No cache found' };

      const profile = JSON.parse(cached);

      // Check required fields
      const requiredFields = ['userId', 'user_type', 'role', 'email'];
      for (const field of requiredFields) {
        if (!profile[field]) {
          return { valid: false, reason: `Missing required field: ${field}` };
        }
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, reason: `Parse error: ${error.message}` };
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(userId: string) {
    const cached = this.getCachedProfile(userId);
    const validation = this.validateCache();

    return {
      exists: !!cached,
      valid: validation.valid,
      age: this.getCacheAge(userId),
      ttl: this.CACHE_TTL,
      needsRefresh: cached ? this.needsRefresh(userId) : true,
      version: cached?.version,
      reason: validation.reason
    };
  }
}

// Export singleton instance
export const userProfileCache = new UserProfileCacheService();