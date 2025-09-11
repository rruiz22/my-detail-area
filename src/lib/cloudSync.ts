/**
 * Enterprise Cloud Sync Service for My Detail Area
 * Integrates with Railway memory sync API for cross-device persistence
 */
import { developmentConfig, shouldEnableCloudSync } from '@/config/development';

export interface CloudSyncOptions {
  namespace?: string;
  priority?: 'critical' | 'important' | 'normal' | 'low';
  autoSync?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

export interface CloudSyncResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp?: number;
}

export interface SyncStatus {
  lastSync: number;
  lastAttempt: number;
  status: 'synced' | 'pending' | 'error' | 'offline';
  errorCount: number;
  nextRetry?: number;
}

class CloudSyncService {
  private baseUrl = developmentConfig.api.baseUrl;
  private defaultNamespace = developmentConfig.storage.namespace;
  private retryDelays = [1000, 3000, 5000, 10000]; // Progressive retry delays
  private syncQueue: Map<string, any> = new Map();
  private syncStatus: Map<string, SyncStatus> = new Map();
  private isOnline = navigator.onLine;
  private cloudSyncEnabled = shouldEnableCloudSync();

  constructor() {
    this.setupNetworkListeners();
    this.startBackgroundSync();
  }

  /**
   * Sync critical data to cloud immediately
   */
  async syncToCloud(key: string, data: any, options: CloudSyncOptions = {}): Promise<CloudSyncResponse> {
    // Skip cloud sync - disabled globally for stability
    if (!this.cloudSyncEnabled) {
      // Silently fail without console noise
      return { success: false, error: 'Cloud sync disabled' };
    }

    const {
      namespace = this.defaultNamespace,
      priority = 'normal',
      autoSync = true,
      retryAttempts = developmentConfig.cloudSync.retryAttempts,
      timeout = developmentConfig.api.timeout
    } = options;

    if (!this.isOnline) {
      this.queueForLaterSync(key, data, options);
      return { success: false, error: 'Offline - queued for sync' };
    }

    try {
      const response = await Promise.race([
        fetch(`${this.baseUrl}/api/memory/store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memory_key: key,
            memory_value: JSON.stringify(data),
            namespace: namespace,
            priority: priority,
            timestamp: Date.now()
          })
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      this.updateSyncStatus(key, 'synced');
      console.log(`☁️ Synced to cloud: ${key} (${priority})`);
      
      return { 
        success: true, 
        data: result,
        timestamp: Date.now()
      };

    } catch (error) {
      if (developmentConfig.cloudSync.showWarnings) {
        console.error(`❌ Cloud sync failed for ${key}:`, error);
      }
      
      if (retryAttempts > 0) {
        return this.retrySync(key, data, { ...options, retryAttempts: retryAttempts - 1 });
      }

      this.updateSyncStatus(key, 'error');
      this.queueForLaterSync(key, data, options);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Restore data from cloud
   */
  async restoreFromCloud(key: string, options: CloudSyncOptions = {}): Promise<CloudSyncResponse> {
    // Skip cloud sync - disabled globally for stability
    if (!this.cloudSyncEnabled) {
      // Silently fail without console noise
      return { success: false, error: 'Cloud restore disabled' };
    }

    const {
      namespace = this.defaultNamespace,
      timeout = developmentConfig.api.timeout
    } = options;

    if (!this.isOnline) {
      return { success: false, error: 'Offline - cannot restore from cloud' };
    }

    try {
      const response = await Promise.race([
        fetch(`${this.baseUrl}/api/memory/retrieve/${encodeURIComponent(key)}?namespace=${encodeURIComponent(namespace)}`),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
      ]);

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Data not found in cloud' };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.memory_value) {
        const data = JSON.parse(result.memory_value);
        console.log(`☁️ Restored from cloud: ${key}`);
        
        return { 
          success: true, 
          data: data,
          timestamp: result.timestamp || Date.now()
        };
      }

      return { success: false, error: 'No data found' };

    } catch (error) {
      console.error(`❌ Cloud restore failed for ${key}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Setup cloud sync for enterprise features
   */
  async setupCloudSync(): Promise<boolean> {
    try {
      // Health check
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) {
        throw new Error('Cloud sync service unavailable');
      }

      console.log('☁️ Cloud sync service connected');
      
      // Sync any queued items
      await this.processQueuedSyncs();
      
      return true;
    } catch (error) {
      console.error('❌ Cloud sync setup failed:', error);
      return false;
    }
  }

  /**
   * Get sync status for a key
   */
  getSyncStatus(key: string): SyncStatus | null {
    return this.syncStatus.get(key) || null;
  }

  /**
   * Get all sync statuses
   */
  getAllSyncStatuses(): Map<string, SyncStatus> {
    return new Map(this.syncStatus);
  }

  /**
   * Force sync all queued items
   */
  async forceSyncAll(): Promise<void> {
    if (!this.isOnline) {
      console.warn('Cannot force sync - offline');
      return;
    }

    const syncPromises = Array.from(this.syncQueue.entries()).map(([key, item]) =>
      this.syncToCloud(key, item.data, item.options)
    );

    await Promise.allSettled(syncPromises);
    this.syncQueue.clear();
  }

  /**
   * Clear sync queue
   */
  clearSyncQueue(): void {
    this.syncQueue.clear();
    console.log('🧹 Sync queue cleared');
  }

  /**
   * Get network status
   */
  isNetworkOnline(): boolean {
    return this.isOnline;
  }

  // Private methods

  private async retrySync(key: string, data: any, options: CloudSyncOptions): Promise<CloudSyncResponse> {
    const delay = this.retryDelays[3 - (options.retryAttempts || 0)] || 1000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`🔄 Retrying sync for ${key} (${options.retryAttempts} attempts left)`);
    return this.syncToCloud(key, data, options);
  }

  private queueForLaterSync(key: string, data: any, options: CloudSyncOptions): void {
    this.syncQueue.set(key, { data, options, timestamp: Date.now() });
    this.updateSyncStatus(key, 'pending');
    console.log(`📋 Queued for sync: ${key}`);
  }

  private updateSyncStatus(key: string, status: SyncStatus['status']): void {
    const current = this.syncStatus.get(key) || {
      lastSync: 0,
      lastAttempt: 0,
      status: 'pending',
      errorCount: 0
    };

    this.syncStatus.set(key, {
      ...current,
      status,
      lastAttempt: Date.now(),
      ...(status === 'synced' && { lastSync: Date.now(), errorCount: 0 }),
      ...(status === 'error' && { errorCount: current.errorCount + 1 })
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Back online - processing queued syncs');
      this.processQueuedSyncs();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📴 Gone offline - queueing syncs');
    });
  }

  private async processQueuedSyncs(): Promise<void> {
    if (!this.isOnline || this.syncQueue.size === 0) return;

    console.log(`📤 Processing ${this.syncQueue.size} queued syncs`);
    
    // Process critical items first
    const sortedEntries = Array.from(this.syncQueue.entries()).sort(([, a], [, b]) => {
      const priorityOrder = { critical: 0, important: 1, normal: 2, low: 3 };
      const aPriority = priorityOrder[a.options.priority || 'normal'];
      const bPriority = priorityOrder[b.options.priority || 'normal'];
      return aPriority - bPriority;
    });

    for (const [key, item] of sortedEntries) {
      try {
        await this.syncToCloud(key, item.data, item.options);
        this.syncQueue.delete(key);
      } catch (error) {
        console.error(`Failed to sync queued item ${key}:`, error);
      }
    }
  }

  private startBackgroundSync(): void {
    // Periodic sync every 5 minutes for queued items
    setInterval(() => {
      if (this.isOnline && this.syncQueue.size > 0) {
        this.processQueuedSyncs();
      }
    }, 5 * 60 * 1000);

    // Cleanup old sync statuses every hour
    setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      for (const [key, status] of this.syncStatus.entries()) {
        if (status.lastAttempt < cutoff) {
          this.syncStatus.delete(key);
        }
      }
    }, 60 * 60 * 1000);
  }
}

// Export singleton instance
export const cloudSync = new CloudSyncService();

/**
 * Selective sync configuration for different data types
 */
export const SYNC_CONFIG = {
  // Critical user workflow state - always sync
  critical: {
    tabPersistence: {
      priority: 'critical' as const,
      autoSync: true,
      namespace: 'mda-tabs'
    },
    userPreferences: {
      priority: 'critical' as const,
      autoSync: true,
      namespace: 'mda-preferences'
    },
    themeSettings: {
      priority: 'important' as const,
      autoSync: true,
      namespace: 'mda-themes'
    }
  },
  // Important but not critical
  important: {
    searchHistory: {
      priority: 'important' as const,
      autoSync: true,
      namespace: 'mda-search'
    },
    viewModes: {
      priority: 'important' as const,
      autoSync: true,
      namespace: 'mda-views'
    }
  },
  // Optional user data
  optional: {
    scannerHistory: {
      priority: 'normal' as const,
      autoSync: false, // User controlled
      namespace: 'mda-scanner'
    },
    temporaryFilters: {
      priority: 'low' as const,
      autoSync: false,
      namespace: 'mda-temp'
    }
  }
} as const;

/**
 * Helper function to get sync config for a data type
 */
export function getSyncConfig(dataType: string): CloudSyncOptions {
  // Flatten config and find matching data type
  for (const category of Object.values(SYNC_CONFIG)) {
    for (const [key, config] of Object.entries(category)) {
      if (key === dataType) {
        return config;
      }
    }
  }
  
  // Default config for unknown data types
  return {
    priority: 'normal',
    autoSync: false,
    namespace: 'mda-default'
  };
}