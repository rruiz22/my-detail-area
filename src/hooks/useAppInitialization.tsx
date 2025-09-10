import { useEffect, useState } from 'react';
import { storage } from '@/lib/localStorage';
import { setupSessionRecovery } from '@/lib/sessionRecovery';
import { toast } from 'sonner';

/**
 * Hook for application initialization with cloud sync setup
 */
export function useAppInitialization() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing My Detail Area with cloud sync...');
        
        // Setup cloud sync
        const cloudSyncSuccess = await storage.setupCloudSync();
        setCloudSyncEnabled(cloudSyncSuccess);
        
        if (cloudSyncSuccess) {
          console.log('☁️ Cloud sync enabled');
          
          // Setup session recovery
          await setupSessionRecovery();
          console.log('🔄 Session recovery initialized');
          
          // Show subtle notification for successful cloud sync
          toast.success('Enterprise features enabled', {
            description: 'Cloud sync and session recovery are active',
            duration: 3000
          });
        } else {
          console.warn('⚠️ Cloud sync unavailable, running in offline mode');
          toast.warning('Running in offline mode', {
            description: 'Cloud sync will activate when connection is restored',
            duration: 3000
          });
        }

        console.log('✅ App initialization complete');
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setInitializationError(errorMessage);
        
        toast.error('Initialization failed', {
          description: errorMessage,
          duration: 5000
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  return {
    isInitializing,
    cloudSyncEnabled,
    initializationError
  };
}

/**
 * Hook for monitoring app health and sync status
 */
export function useAppHealth() {
  const [healthStatus, setHealthStatus] = useState({
    localStorage: true,
    cloudSync: false,
    sessionRecovery: false,
    lastCheck: Date.now()
  });

  useEffect(() => {
    const checkHealth = () => {
      const status = {
        localStorage: storage.isStorageAvailable(),
        cloudSync: storage.isOnline(),
        sessionRecovery: true, // Always available as it uses localStorage
        lastCheck: Date.now()
      };
      
      setHealthStatus(status);
    };

    // Initial check
    checkHealth();
    
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    // Listen for network changes
    window.addEventListener('online', checkHealth);
    window.addEventListener('offline', checkHealth);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', checkHealth);
      window.removeEventListener('offline', checkHealth);
    };
  }, []);

  return healthStatus;
}