import { useCallback, useEffect, useState } from 'react';
import { storage } from '@/lib/localStorage';
import { cloudSync } from '@/lib/cloudSync';
import { toast } from 'sonner';

/**
 * Hook for cloud-synced persisted state with enterprise features
 */
export function useCloudSyncedState<T>(
  key: string,
  defaultValue: T,
  options: {
    priority?: 'critical' | 'important' | 'normal' | 'low';
    autoSync?: boolean;
    restoreOnMount?: boolean;
    showNotifications?: boolean;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void, {
  syncing: boolean;
  synced: boolean;
  lastSync?: number;
  error?: string;
}] {
  const {
    priority = 'normal',
    autoSync = true,
    restoreOnMount = true,
    showNotifications = false
  } = options;

  const [state, setState] = useState<T>(defaultValue);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [lastSync, setLastSync] = useState<number>();
  const [error, setError] = useState<string>();

  // Load initial value and optionally restore from cloud
  useEffect(() => {
    const loadInitialValue = async () => {
      try {
        if (restoreOnMount && cloudSync.isNetworkOnline()) {
          setSyncing(true);
          const restored = await storage.restoreFromCloud(key, defaultValue, {
            cloudSync: true,
            syncPriority: priority
          });
          setState(restored);
          
          if (showNotifications && restored !== defaultValue) {
            toast.success(`Restored ${key} from cloud`, {
              description: 'Your data has been synced across devices'
            });
          }
        } else {
          // Load from localStorage only
          const stored = storage.get(key, defaultValue, {
            cloudSync: autoSync,
            syncPriority: priority
          });
          setState(stored);
        }

        // Update sync status
        const syncStatus = storage.getCloudSyncStatus(key);
        setSynced(syncStatus.synced);
        setLastSync(syncStatus.lastSync);
      } catch (err) {
        console.error(`Failed to load ${key}:`, err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setSyncing(false);
      }
    };

    loadInitialValue();
  }, [key, defaultValue, restoreOnMount, priority, autoSync, showNotifications]);

  // Cloud-synced setter
  const setCloudSyncedState = useCallback(async (value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;
      
      // Save to localStorage with cloud sync
      const success = storage.set(key, newValue, {
        cloudSync: autoSync,
        syncPriority: priority
      });

      if (success && autoSync) {
        // Async cloud sync
        setSyncing(true);
        storage.syncToCloud(key, {
          cloudSync: true,
          syncPriority: priority
        }).then(syncSuccess => {
          setSynced(syncSuccess);
          setLastSync(Date.now());
          setError(undefined);
          
          if (showNotifications && syncSuccess) {
            toast.success(`Synced ${key} to cloud`);
          }
        }).catch(err => {
          setError(err.message);
          if (showNotifications) {
            toast.error(`Failed to sync ${key}`, {
              description: err.message
            });
          }
        }).finally(() => {
          setSyncing(false);
        });
      }

      return newValue;
    });
  }, [key, autoSync, priority, showNotifications]);

  return [state, setCloudSyncedState, { syncing, synced, lastSync, error }];
}

/**
 * Enhanced tab persistence with cloud sync
 */
export function useCloudSyncedTabPersistence(
  pageKey: string,
  defaultTab: string,
  validTabs: string[],
  dealerId?: string
) {
  const storageKey = dealerId 
    ? `pages.${pageKey}.${dealerId}.activeTab`
    : `pages.${pageKey}.activeTab`;

  const [activeTab, setActiveTab, syncStatus] = useCloudSyncedState(
    storageKey,
    defaultTab,
    {
      priority: 'critical',
      autoSync: true,
      restoreOnMount: true,
      showNotifications: false
    }
  );

  const setValidatedTab = useCallback((tab: string) => {
    if (validTabs.includes(tab)) {
      setActiveTab(tab);
    } else {
      console.warn(`⚠️ Invalid tab ${tab}, ignoring`);
    }
  }, [validTabs, setActiveTab]);

  return [activeTab, setValidatedTab, syncStatus] as const;
}

/**
 * Hook for cloud sync status monitoring
 */
export function useCloudSyncStatus() {
  const [isOnline, setIsOnline] = useState(cloudSync.isNetworkOnline());
  const [syncStatuses, setSyncStatuses] = useState(new Map());

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(cloudSync.isNetworkOnline());
      setSyncStatuses(cloudSync.getAllSyncStatuses());
    };

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);
    
    // Update on network status change
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const forceSyncAll = useCallback(async () => {
    try {
      await storage.forceSyncAll();
      setSyncStatuses(cloudSync.getAllSyncStatuses());
      toast.success('All data synced to cloud');
    } catch (error) {
      toast.error('Failed to sync data', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, []);

  return {
    isOnline,
    syncStatuses,
    forceSyncAll
  };
}

/**
 * Hook for enterprise session recovery
 */
export function useSessionRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);

  useEffect(() => {
    // Check if recovery data is available
    const checkRecovery = async () => {
      try {
        const hasCloudData = cloudSync.isNetworkOnline();
        setRecoveryAvailable(hasCloudData);
      } catch (error) {
        console.warn('Recovery check failed:', error);
      }
    };

    checkRecovery();
  }, []);

  const recoverSession = useCallback(async () => {
    if (!recoveryAvailable) return false;

    setIsRecovering(true);
    try {
      // Setup cloud sync and restore critical data
      const success = await storage.setupCloudSync();
      
      if (success) {
        toast.success('Session recovered from cloud', {
          description: 'Your workspace has been restored'
        });
        return true;
      } else {
        toast.error('Failed to recover session');
        return false;
      }
    } catch (error) {
      toast.error('Session recovery failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [recoveryAvailable]);

  return {
    isRecovering,
    recoveryAvailable,
    recoverSession
  };
}

/**
 * Hook for theme cloud sync
 */
export function useCloudSyncedTheme() {
  return useCloudSyncedState('theme.custom', null, {
    priority: 'important',
    autoSync: true,
    restoreOnMount: true,
    showNotifications: true
  });
}

/**
 * Hook for user preferences cloud sync
 */
export function useCloudSyncedPreferences<T extends Record<string, any>>(
  defaultPreferences: T
) {
  return useCloudSyncedState('user.preferences', defaultPreferences, {
    priority: 'critical',
    autoSync: true,
    restoreOnMount: true,
    showNotifications: false
  });
}