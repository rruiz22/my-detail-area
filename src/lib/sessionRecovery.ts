/**
 * Enterprise Session Recovery Service for My Detail Area
 * Handles automatic session restoration from cloud sync
 */

import { storage } from './localStorage';
import { cloudSync, SYNC_CONFIG } from './cloudSync';
import { toast } from 'sonner';

export interface SessionData {
  tabStates: Record<string, string>;
  userPreferences: Record<string, any>;
  themeSettings: Record<string, any>;
  viewModes: Record<string, string>;
  searchTerms: Record<string, string>;
  timestamp: number;
  version: string;
}

export interface RecoveryOptions {
  showNotifications?: boolean;
  restoreAll?: boolean;
  skipExpired?: boolean;
  maxAge?: number; // milliseconds
}

class SessionRecoveryService {
  private readonly SESSION_KEY = 'session.recovery';
  private readonly MAX_SESSION_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

  /**
   * Create session snapshot for recovery
   */
  async createSessionSnapshot(): Promise<boolean> {
    try {
      const sessionData: SessionData = {
        tabStates: this.extractTabStates(),
        userPreferences: this.extractUserPreferences(),
        themeSettings: this.extractThemeSettings(),
        viewModes: this.extractViewModes(),
        searchTerms: this.extractSearchTerms(),
        timestamp: Date.now(),
        version: '1.0.0'
      };

      // Save to localStorage and cloud
      const success = storage.set(this.SESSION_KEY, sessionData, {
        cloudSync: true,
        syncPriority: 'critical',
        expiration: this.MAX_SESSION_AGE
      });

      if (success) {
        console.log('📸 Session snapshot created successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to create session snapshot:', error);
      return false;
    }
  }

  /**
   * Restore session from cloud or localStorage
   */
  async restoreSession(options: RecoveryOptions = {}): Promise<boolean> {
    const {
      showNotifications = true,
      restoreAll = true,
      skipExpired = true,
      maxAge = this.MAX_SESSION_AGE
    } = options;

    try {
      if (showNotifications) {
        toast.loading('Restoring your workspace...', { id: 'session-restore' });
      }

      // Try to restore from cloud first
      let sessionData: SessionData | null = null;
      
      if (cloudSync.isNetworkOnline()) {
        try {
          sessionData = await storage.restoreFromCloud(this.SESSION_KEY, null, {
            cloudSync: true,
            syncPriority: 'critical'
          });
        } catch (error) {
          console.warn('⚠️ Failed to restore session from cloud:', error);
        }
      }

      // Fallback to localStorage
      if (!sessionData) {
        sessionData = storage.get(this.SESSION_KEY, null, {
          cloudSync: true,
          syncPriority: 'critical'
        });
      }

      if (!sessionData) {
        if (showNotifications) {
          toast.dismiss('session-restore');
          toast.info('No session to restore');
        }
        return false;
      }

      // Check if session is expired
      const sessionAge = Date.now() - sessionData.timestamp;
      if (skipExpired && sessionAge > maxAge) {
        if (showNotifications) {
          toast.dismiss('session-restore');
          toast.warning('Session expired', {
            description: 'Previous session is too old to restore'
          });
        }
        return false;
      }

      // Restore session data
      let restoredCount = 0;

      if (restoreAll || options.showNotifications) {
        restoredCount += this.restoreTabStates(sessionData.tabStates);
        restoredCount += this.restoreUserPreferences(sessionData.userPreferences);
        restoredCount += this.restoreThemeSettings(sessionData.themeSettings);
        restoredCount += this.restoreViewModes(sessionData.viewModes);
        restoredCount += this.restoreSearchTerms(sessionData.searchTerms);
      }

      if (showNotifications) {
        toast.dismiss('session-restore');
        if (restoredCount > 0) {
          toast.success(`Session restored`, {
            description: `Restored ${restoredCount} workspace settings`
          });
        } else {
          toast.info('No changes to restore');
        }
      }

      console.log(`🔄 Session restored: ${restoredCount} items`);
      return restoredCount > 0;

    } catch (error) {
      console.error('❌ Session restore failed:', error);
      
      if (showNotifications) {
        toast.dismiss('session-restore');
        toast.error('Failed to restore session', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      return false;
    }
  }

  /**
   * Check if session recovery is available
   */
  async isRecoveryAvailable(): Promise<boolean> {
    try {
      // Check localStorage first
      const localData = storage.get(this.SESSION_KEY, null);
      if (localData) return true;

      // Check cloud if online
      if (cloudSync.isNetworkOnline()) {
        const cloudData = await storage.restoreFromCloud(this.SESSION_KEY, null);
        return cloudData !== null;
      }

      return false;
    } catch (error) {
      console.warn('⚠️ Recovery availability check failed:', error);
      return false;
    }
  }

  /**
   * Clear session recovery data
   */
  clearRecoveryData(): boolean {
    try {
      storage.remove(this.SESSION_KEY);
      console.log('🧹 Session recovery data cleared');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear recovery data:', error);
      return false;
    }
  }

  /**
   * Get session info
   */
  getSessionInfo(): { age?: number; hasData: boolean; cloudSynced: boolean } {
    try {
      const sessionData = storage.get(this.SESSION_KEY, null);
      const syncStatus = storage.getCloudSyncStatus(this.SESSION_KEY);
      
      if (sessionData) {
        return {
          age: Date.now() - sessionData.timestamp,
          hasData: true,
          cloudSynced: syncStatus.synced
        };
      }

      return {
        hasData: false,
        cloudSynced: false
      };
    } catch (error) {
      console.warn('⚠️ Failed to get session info:', error);
      return { hasData: false, cloudSynced: false };
    }
  }

  // Private helper methods

  private extractTabStates(): Record<string, string> {
    const tabStates: Record<string, string> = {};
    const keys = storage.getKeys();
    
    keys.forEach(key => {
      if (key.includes('activeTab')) {
        const value = storage.get(key, '');
        if (value) {
          tabStates[key] = value;
        }
      }
    });

    return tabStates;
  }

  private extractUserPreferences(): Record<string, any> {
    const preferences: Record<string, any> = {};
    const keys = storage.getKeys();
    
    keys.forEach(key => {
      if (key.includes('preferences') || key.includes('settings')) {
        const value = storage.get(key, null);
        if (value !== null) {
          preferences[key] = value;
        }
      }
    });

    return preferences;
  }

  private extractThemeSettings(): Record<string, any> {
    const themeSettings: Record<string, any> = {};
    const keys = storage.getKeys();
    
    keys.forEach(key => {
      if (key.includes('theme')) {
        const value = storage.get(key, null);
        if (value !== null) {
          themeSettings[key] = value;
        }
      }
    });

    return themeSettings;
  }

  private extractViewModes(): Record<string, string> {
    const viewModes: Record<string, string> = {};
    const keys = storage.getKeys();
    
    keys.forEach(key => {
      if (key.includes('viewMode')) {
        const value = storage.get(key, '');
        if (value) {
          viewModes[key] = value;
        }
      }
    });

    return viewModes;
  }

  private extractSearchTerms(): Record<string, string> {
    const searchTerms: Record<string, string> = {};
    const keys = storage.getKeys();
    
    keys.forEach(key => {
      if (key.includes('searchTerm')) {
        const value = storage.get(key, '');
        if (value) {
          searchTerms[key] = value;
        }
      }
    });

    return searchTerms;
  }

  private restoreTabStates(tabStates: Record<string, string>): number {
    let restored = 0;
    
    Object.entries(tabStates).forEach(([key, value]) => {
      try {
        storage.set(key, value, {
          cloudSync: true,
          syncPriority: 'critical'
        });
        restored++;
      } catch (error) {
        console.warn(`⚠️ Failed to restore tab state ${key}:`, error);
      }
    });

    return restored;
  }

  private restoreUserPreferences(preferences: Record<string, any>): number {
    let restored = 0;
    
    Object.entries(preferences).forEach(([key, value]) => {
      try {
        storage.set(key, value, {
          cloudSync: true,
          syncPriority: 'critical'
        });
        restored++;
      } catch (error) {
        console.warn(`⚠️ Failed to restore preference ${key}:`, error);
      }
    });

    return restored;
  }

  private restoreThemeSettings(themeSettings: Record<string, any>): number {
    let restored = 0;
    
    Object.entries(themeSettings).forEach(([key, value]) => {
      try {
        storage.set(key, value, {
          cloudSync: true,
          syncPriority: 'important'
        });
        restored++;
      } catch (error) {
        console.warn(`⚠️ Failed to restore theme setting ${key}:`, error);
      }
    });

    return restored;
  }

  private restoreViewModes(viewModes: Record<string, string>): number {
    let restored = 0;
    
    Object.entries(viewModes).forEach(([key, value]) => {
      try {
        storage.set(key, value, {
          cloudSync: true,
          syncPriority: 'important'
        });
        restored++;
      } catch (error) {
        console.warn(`⚠️ Failed to restore view mode ${key}:`, error);
      }
    });

    return restored;
  }

  private restoreSearchTerms(searchTerms: Record<string, string>): number {
    let restored = 0;
    
    Object.entries(searchTerms).forEach(([key, value]) => {
      try {
        storage.set(key, value, {
          cloudSync: false, // Search terms are usually temporary
          syncPriority: 'low'
        });
        restored++;
      } catch (error) {
        console.warn(`⚠️ Failed to restore search term ${key}:`, error);
      }
    });

    return restored;
  }
}

// Export singleton instance
export const sessionRecovery = new SessionRecoveryService();

/**
 * Auto-setup session recovery on app start
 */
export async function setupSessionRecovery(): Promise<void> {
  try {
    // Setup cloud sync first
    await storage.setupCloudSync();
    
    // Check if recovery is available
    const isAvailable = await sessionRecovery.isRecoveryAvailable();
    
    if (isAvailable) {
      // Attempt automatic recovery
      await sessionRecovery.restoreSession({
        showNotifications: false,
        restoreAll: true,
        skipExpired: true
      });
    }

    // Create initial snapshot for future recovery
    await sessionRecovery.createSessionSnapshot();
    
    // Setup periodic snapshots (every 5 minutes)
    setInterval(() => {
      sessionRecovery.createSessionSnapshot();
    }, 5 * 60 * 1000);

    console.log('🔄 Session recovery system initialized');
  } catch (error) {
    console.error('❌ Session recovery setup failed:', error);
  }
}

/**
 * Manual session recovery trigger
 */
export async function recoverSessionManually(): Promise<boolean> {
  return sessionRecovery.restoreSession({
    showNotifications: true,
    restoreAll: true,
    skipExpired: false
  });
}