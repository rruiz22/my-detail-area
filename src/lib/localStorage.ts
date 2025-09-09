/**
 * Enterprise-grade localStorage service for My Detail Area
 * Handles JSON serialization, error recovery, and namespacing
 */

export interface StorageOptions {
  expiration?: number; // milliseconds
  compress?: boolean;
  namespace?: string;
}

export interface StorageItem<T> {
  data: T;
  timestamp: number;
  expiration?: number;
  version?: string;
}

class LocalStorageService {
  private namespace = 'mda';
  private version = '1.0.0';

  /**
   * Set item in localStorage with enterprise features
   */
  set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      const namespacedKey = this.getKey(key, options.namespace);
      
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        version: this.version,
        ...(options.expiration && { expiration: Date.now() + options.expiration })
      };

      const serialized = JSON.stringify(item);
      localStorage.setItem(namespacedKey, serialized);
      
      console.log(`💾 Stored: ${namespacedKey}`, value);
      return true;
      
    } catch (error) {
      console.error(`❌ localStorage.set failed for ${key}:`, error);
      
      // Try to free space by removing expired items
      this.cleanup();
      
      // Try again
      try {
        const namespacedKey = this.getKey(key, options.namespace);
        const item: StorageItem<T> = {
          data: value,
          timestamp: Date.now(),
          version: this.version
        };
        localStorage.setItem(namespacedKey, JSON.stringify(item));
        return true;
      } catch (retryError) {
        console.error(`❌ localStorage.set retry failed for ${key}:`, retryError);
        return false;
      }
    }
  }

  /**
   * Get item from localStorage with validation
   */
  get<T>(key: string, defaultValue: T, options: StorageOptions = {}): T {
    try {
      const namespacedKey = this.getKey(key, options.namespace);
      const stored = localStorage.getItem(namespacedKey);
      
      if (!stored) {
        console.log(`📭 No stored value for: ${namespacedKey}, using default`);
        return defaultValue;
      }

      const item: StorageItem<T> = JSON.parse(stored);
      
      // Check expiration
      if (item.expiration && Date.now() > item.expiration) {
        console.log(`⏰ Expired value for: ${namespacedKey}, removing`);
        this.remove(key, options);
        return defaultValue;
      }

      // Check version compatibility
      if (item.version && item.version !== this.version) {
        console.log(`🔄 Version mismatch for: ${namespacedKey}, using default`);
        this.remove(key, options);
        return defaultValue;
      }

      console.log(`📦 Retrieved: ${namespacedKey}`, item.data);
      return item.data;
      
    } catch (error) {
      console.error(`❌ localStorage.get failed for ${key}:`, error);
      // Remove corrupted data
      this.remove(key, options);
      return defaultValue;
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: string, options: StorageOptions = {}): boolean {
    try {
      const namespacedKey = this.getKey(key, options.namespace);
      localStorage.removeItem(namespacedKey);
      console.log(`🗑️ Removed: ${namespacedKey}`);
      return true;
    } catch (error) {
      console.error(`❌ localStorage.remove failed for ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all namespaced data
   */
  clear(namespace?: string): boolean {
    try {
      const targetNamespace = namespace || this.namespace;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${targetNamespace}.`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`🧹 Cleared ${keysToRemove.length} items from namespace: ${targetNamespace}`);
      return true;
      
    } catch (error) {
      console.error('❌ localStorage.clear failed:', error);
      return false;
    }
  }

  /**
   * Get all keys in namespace
   */
  getKeys(namespace?: string): string[] {
    const targetNamespace = namespace || this.namespace;
    const keys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${targetNamespace}.`)) {
        keys.push(key.replace(`${targetNamespace}.`, ''));
      }
    }
    
    return keys;
  }

  /**
   * Clean up expired items
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key?.startsWith(`${this.namespace}.`)) continue;
        
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          if (item.expiration && now > item.expiration) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } catch {
          // Remove corrupted items
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    } catch (error) {
      console.error('❌ localStorage.cleanup failed:', error);
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired/corrupted localStorage items`);
    }
    
    return cleaned;
  }

  /**
   * Get storage usage info
   */
  getStorageInfo() {
    const keys = this.getKeys();
    let totalSize = 0;
    
    keys.forEach(key => {
      const value = localStorage.getItem(this.getKey(key));
      if (value) {
        totalSize += value.length;
      }
    });
    
    return {
      keys: keys.length,
      totalSize,
      totalSizeKB: Math.round(totalSize / 1024 * 100) / 100,
      available: this.isStorageAvailable()
    };
  }

  /**
   * Check if localStorage is available
   */
  isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create namespaced key
   */
  private getKey(key: string, namespace?: string): string {
    const ns = namespace || this.namespace;
    return `${ns}.${key}`;
  }
}

// Export singleton instance
export const storage = new LocalStorageService();