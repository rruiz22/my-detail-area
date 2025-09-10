/**
 * Enterprise-grade localStorage service for My Detail Area
 * Handles JSON serialization, error recovery, namespacing, and cloud sync
 */
import { cloudSync, getSyncConfig, type CloudSyncOptions } from './cloudSync';

export interface StorageOptions {
  expiration?: number; // milliseconds
  compress?: boolean;
  namespace?: string;
  cloudSync?: boolean | CloudSyncOptions; // Enable cloud sync
  syncPriority?: 'critical' | 'important' | 'normal' | 'low';
}

export interface StorageItem<T> {
  data: T;
  timestamp: number;
  expiration?: number;
  version?: string;
  cloudSynced?: boolean;
  lastCloudSync?: number;
}

class LocalStorageService {
  private namespace = 'mda';
  private version = '1.0.0';

  /**
   * Set item in localStorage with enterprise features and cloud sync
   */
  set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    try {
      const namespacedKey = this.getKey(key, options.namespace);
      
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        version: this.version,
        cloudSynced: false,
        ...(options.expiration && { expiration: Date.now() + options.expiration })
      };

      const serialized = JSON.stringify(item);
      localStorage.setItem(namespacedKey, serialized);
      
      console.log(`💾 Stored: ${namespacedKey}`, value);
      
      // Handle cloud sync if enabled
      this.handleCloudSync(key, value, options);
      
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

  // Cloud Sync Methods

  /**
   * Handle cloud sync for stored items
   */
  private async handleCloudSync<T>(key: string, value: T, options: StorageOptions): Promise<void> {
    if (!options.cloudSync) return;

    try {
      const syncOptions = typeof options.cloudSync === 'boolean' 
        ? getSyncConfig(key) 
        : options.cloudSync;

      const result = await cloudSync.syncToCloud(key, value, {
        ...syncOptions,
        priority: options.syncPriority || syncOptions.priority
      });

      if (result.success) {
        this.markCloudSynced(key, options.namespace);
      }
    } catch (error) {
      console.warn(`⚠️ Cloud sync failed for ${key}:`, error);
    }
  }

  /**
   * Mark item as cloud synced
   */
  private markCloudSynced(key: string, namespace?: string): void {
    try {
      const namespacedKey = this.getKey(key, namespace);
      const stored = localStorage.getItem(namespacedKey);
      
      if (stored) {
        const item = JSON.parse(stored);
        item.cloudSynced = true;
        item.lastCloudSync = Date.now();
        localStorage.setItem(namespacedKey, JSON.stringify(item));
      }
    } catch (error) {
      console.warn(`⚠️ Failed to mark ${key} as cloud synced:`, error);
    }
  }

  /**
   * Sync item to cloud manually
   */
  async syncToCloud<T>(key: string, options: StorageOptions = {}): Promise<boolean> {
    try {
      const namespacedKey = this.getKey(key, options.namespace);
      const stored = localStorage.getItem(namespacedKey);
      
      if (!stored) {
        console.warn(`⚠️ No data found for ${key} to sync`);
        return false;
      }

      const item: StorageItem<T> = JSON.parse(stored);
      const syncOptions = getSyncConfig(key);

      const result = await cloudSync.syncToCloud(key, item.data, {
        ...syncOptions,
        priority: options.syncPriority || syncOptions.priority
      });

      if (result.success) {
        this.markCloudSynced(key, options.namespace);
        console.log(`☁️ Successfully synced ${key} to cloud`);
        return true;
      } else {
        console.error(`❌ Failed to sync ${key} to cloud:`, result.error);
        return false;
      }
    } catch (error) {
      console.error(`❌ Cloud sync error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Restore item from cloud
   */
  async restoreFromCloud<T>(key: string, defaultValue: T, options: StorageOptions = {}): Promise<T> {
    try {
      const syncOptions = getSyncConfig(key);
      const result = await cloudSync.restoreFromCloud(key, syncOptions);

      if (result.success && result.data !== undefined) {
        // Store restored data locally
        this.set(key, result.data, options);
        console.log(`☁️ Successfully restored ${key} from cloud`);
        return result.data;
      } else {
        console.warn(`⚠️ Failed to restore ${key} from cloud:`, result.error);
        return this.get(key, defaultValue, options);
      }
    } catch (error) {
      console.error(`❌ Cloud restore error for ${key}:`, error);
      return this.get(key, defaultValue, options);
    }
  }

  /**
   * Setup cloud sync for the application
   */
  async setupCloudSync(): Promise<boolean> {
    try {
      const success = await cloudSync.setupCloudSync();
      if (success) {
        console.log('☁️ Cloud sync initialized successfully');
        
        // Sync critical data on startup
        await this.syncCriticalData();
      }
      return success;
    } catch (error) {
      console.error('❌ Cloud sync setup failed:', error);
      return false;
    }
  }

  /**
   * Sync all critical data to cloud
   */
  async syncCriticalData(): Promise<void> {
    const keys = this.getKeys();
    const criticalKeys = keys.filter(key => 
      key.includes('activeTab') || 
      key.includes('theme') || 
      key.includes('preferences')
    );

    const syncPromises = criticalKeys.map(key => 
      this.syncToCloud(key, { cloudSync: true, syncPriority: 'critical' })
    );

    await Promise.allSettled(syncPromises);
    console.log(`☁️ Synced ${criticalKeys.length} critical items to cloud`);
  }

  /**
   * Get cloud sync status for a key
   */
  getCloudSyncStatus(key: string): { synced: boolean; lastSync?: number; status?: any } {
    try {
      const namespacedKey = this.getKey(key);
      const stored = localStorage.getItem(namespacedKey);
      
      if (stored) {
        const item = JSON.parse(stored);
        const cloudStatus = cloudSync.getSyncStatus(key);
        
        return {
          synced: item.cloudSynced || false,
          lastSync: item.lastCloudSync,
          status: cloudStatus
        };
      }
    } catch (error) {
      console.warn(`⚠️ Failed to get sync status for ${key}:`, error);
    }
    
    return { synced: false };
  }

  /**
   * Force sync all data to cloud
   */
  async forceSyncAll(): Promise<void> {
    await cloudSync.forceSyncAll();
  }

  /**
   * Get network status
   */
  isOnline(): boolean {
    return cloudSync.isNetworkOnline();
  }
}

// Export singleton instance
export const storage = new LocalStorageService();