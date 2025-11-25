/**
 * Kiosk Configuration Hook
 *
 * Manages kiosk ID from localStorage for time clock operations.
 * Integrates with device fingerprinting for PC-specific kiosk binding.
 *
 * Used by TimeClockButton and PunchClockKioskModal.
 */

import { useEffect, useState } from 'react';
import { useDeviceFingerprint } from './useDeviceFingerprint';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

const KIOSK_ID_KEY = 'kiosk_id';
const KIOSK_FINGERPRINT_KEY = 'kiosk_device_fingerprint';
const KIOSK_CONFIGURED_AT_KEY = 'kiosk_configured_at';
const KIOSK_USERNAME_KEY = 'kiosk_username';
const DEFAULT_KIOSK_ID = 'default-kiosk';

export function useKioskConfig() {
  const { fingerprint, username, isReady } = useDeviceFingerprint();
  const { toast } = useToast();

  const [kioskId, setKioskId] = useState<string | null>(() => {
    const storedId = localStorage.getItem(KIOSK_ID_KEY);
    return storedId && storedId !== DEFAULT_KIOSK_ID ? storedId : null;
  });

  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    return !!localStorage.getItem(KIOSK_ID_KEY) &&
           !!localStorage.getItem(KIOSK_FINGERPRINT_KEY);
  });

  // 🚨 CRITICAL: Monitor localStorage for external changes (browser clear data, extensions, etc.)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      // Storage event fires when localStorage is modified in another tab or cleared
      if (event.key === KIOSK_ID_KEY || event.key === KIOSK_FINGERPRINT_KEY || event.key === null) {
        const wasDeleted = event.key === KIOSK_ID_KEY && event.oldValue !== null && event.newValue === null;
        const wasCleared = event.key === null; // Entire localStorage was cleared

        if (wasDeleted || wasCleared) {
          console.error('[KioskConfig] 🚨 EXTERNAL DELETION DETECTED!', {
            timestamp: new Date().toISOString(),
            detectionMethod: wasCleared ? 'localStorage.clear()' : 'specific key deletion',
            key: event.key || 'ALL KEYS',
            oldValue: event.oldValue ? event.oldValue.substring(0, 20) + '...' : '(null)',
            newValue: event.newValue || '(deleted)',
            url: event.url,
            storageArea: event.storageArea === localStorage ? 'localStorage' : 'sessionStorage',
            possibleCauses: [
              '1. User cleared browser cache/storage (Ctrl+Shift+Del)',
              '2. Privacy extension (CCleaner, Avast, etc.)',
              '3. Browser automatic cleanup',
              '4. Manual deletion via DevTools → Application → Storage',
              '5. Service Worker cache update'
            ],
            remainingKeys: {
              kiosk_id: localStorage.getItem(KIOSK_ID_KEY) || '(deleted)',
              fingerprint: localStorage.getItem(KIOSK_FINGERPRINT_KEY) || '(deleted)',
              configured_at: localStorage.getItem(KIOSK_CONFIGURED_AT_KEY) || '(deleted)',
              username: localStorage.getItem(KIOSK_USERNAME_KEY) || '(deleted)'
            }
          });

          // Update React state to reflect deletion
          setKioskId(null);
          setIsConfigured(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 🔄 AUTOMATIC RECOVERY: Restore config from database if localStorage was cleared
  useEffect(() => {
    if (isReady && fingerprint) {
      const currentKioskId = localStorage.getItem(KIOSK_ID_KEY);

      // Only attempt recovery if localStorage is empty
      if (!currentKioskId) {
        console.log('[KioskConfig] 🔍 No localStorage config found - attempting database recovery...');

        supabase
          .from('detail_hub_kiosk_devices')
          .select('kiosk_id, configured_at, last_seen_username, is_active')
          .eq('device_fingerprint', fingerprint)
          .eq('is_active', true)
          .single()
          .then(({ data, error }) => {
            if (error || !data) {
              console.log('[KioskConfig] ℹ️ No device binding found in database (never configured or deleted)');
              return;
            }

            // Found device binding in database!
            console.log('[KioskConfig] 🎉 RECOVERY SUCCESSFUL - Found device binding in database:', {
              kioskId: data.kiosk_id,
              configuredAt: data.configured_at,
              username: data.last_seen_username,
              fingerprint: fingerprint.substring(0, 12) + '...'
            });

            // Restore configuration to localStorage
            localStorage.setItem(KIOSK_ID_KEY, data.kiosk_id);
            localStorage.setItem(KIOSK_FINGERPRINT_KEY, fingerprint);
            localStorage.setItem(KIOSK_CONFIGURED_AT_KEY, data.configured_at || new Date().toISOString());
            if (data.last_seen_username) {
              localStorage.setItem(KIOSK_USERNAME_KEY, data.last_seen_username);
            }

            // Update React state
            setKioskId(data.kiosk_id);
            setIsConfigured(true);

            console.log('[KioskConfig] ✅ Configuration restored to localStorage successfully');

            // Show success notification to user
            toast({
              title: '✅ Kiosk Configuration Restored',
              description: 'Your kiosk configuration was automatically recovered from the database.',
              duration: 5000,
              className: 'bg-emerald-50 border-emerald-500'
            });

            // Update last_seen timestamp in database
            supabase
              .from('detail_hub_kiosk_devices')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('device_fingerprint', fingerprint)
              .then(({ error: updateError }) => {
                if (updateError) {
                  console.warn('[KioskConfig] ⚠️ Failed to update last_seen timestamp:', updateError);
                }
              });
          });
      }
    }
  }, [isReady, fingerprint, toast]);

  // Validate fingerprint matches stored fingerprint
  useEffect(() => {
    if (isReady && fingerprint) {
      const storedFingerprint = localStorage.getItem(KIOSK_FINGERPRINT_KEY);

      if (storedFingerprint && storedFingerprint !== fingerprint) {
        console.warn('[KioskConfig] ⚠️ Fingerprint mismatch - device may have changed');
        // Optionally: Clear configuration if fingerprint doesn't match
        // clearKioskConfiguration();
      }
    }
  }, [isReady, fingerprint]);

  // Save configuration
  const configureKiosk = (newKioskId: string) => {
    localStorage.setItem(KIOSK_ID_KEY, newKioskId);
    localStorage.setItem(KIOSK_FINGERPRINT_KEY, fingerprint);
    localStorage.setItem(KIOSK_CONFIGURED_AT_KEY, new Date().toISOString());
    localStorage.setItem(KIOSK_USERNAME_KEY, username);

    setKioskId(newKioskId);
    setIsConfigured(true);

    console.log('[KioskConfig] ✅ Kiosk configured:', {
      kioskId: newKioskId,
      fingerprint: fingerprint.substring(0, 12) + '...',
      username
    });
  };

  // Clear configuration
  const clearConfiguration = () => {
    localStorage.removeItem(KIOSK_ID_KEY);
    localStorage.removeItem(KIOSK_FINGERPRINT_KEY);
    localStorage.removeItem(KIOSK_CONFIGURED_AT_KEY);
    localStorage.removeItem(KIOSK_USERNAME_KEY);

    setKioskId(null);
    setIsConfigured(false);

    console.log('[KioskConfig] 🗑️ Configuration cleared');
  };

  return {
    // State
    kioskId: kioskId || null, // ✅ FIX: Return null instead of 'default-kiosk'
    isConfigured,
    fingerprint,
    username,
    isReady,

    // Actions
    configureKiosk,
    clearConfiguration,
    setKioskId
  };
}

// Helper functions exported for convenience
export function isKioskConfigured(): boolean {
  return !!localStorage.getItem(KIOSK_ID_KEY) &&
         !!localStorage.getItem(KIOSK_FINGERPRINT_KEY);
}

export function getConfiguredKioskId(): string | null {
  const kioskId = localStorage.getItem(KIOSK_ID_KEY);
  return kioskId && kioskId !== DEFAULT_KIOSK_ID ? kioskId : null;
}

/**
 * Clear invalid or corrupted kiosk configurations
 *
 * ⚠️ REDUCED AGGRESSIVENESS (v2.0):
 * - Only clears 'default-kiosk' fallback (legacy bug)
 * - Only clears obviously invalid UUIDs (malformed strings)
 * - NO LONGER clears incomplete configs (missing fingerprint)
 * - Automatic recovery will handle restoration from database
 *
 * ⚠️ ENHANCED LOGGING: Tracks every cleanup attempt for diagnostics
 */
export function clearInvalidKioskConfig(): void {
  const kioskId = localStorage.getItem(KIOSK_ID_KEY);
  const fingerprint = localStorage.getItem(KIOSK_FINGERPRINT_KEY);
  const configuredAt = localStorage.getItem(KIOSK_CONFIGURED_AT_KEY);
  const username = localStorage.getItem(KIOSK_USERNAME_KEY);

  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Determine if cleanup is needed (LESS AGGRESSIVE NOW)
  const isDefaultFallback = kioskId === DEFAULT_KIOSK_ID;
  const isInvalidUUID = kioskId && !uuidRegex.test(kioskId);

  // ⚠️ REMOVED: isMissingFingerprint check - automatic recovery will handle this

  // Enhanced logging BEFORE any action
  if (isDefaultFallback || isInvalidUUID) {
    console.error('[KioskConfig] 🚨 INVALID CONFIG DETECTED - WILL DELETE', {
      timestamp: new Date().toISOString(),
      currentState: {
        kioskId: kioskId || '(null)',
        fingerprint: fingerprint ? fingerprint.substring(0, 12) + '...' : '(null)',
        configuredAt: configuredAt || '(null)',
        username: username || '(null)'
      },
      validationResults: {
        isDefaultFallback,
        isInvalidUUID
      },
      deletionReason: isDefaultFallback
        ? 'REASON: default-kiosk fallback detected (legacy bug)'
        : `REASON: invalid UUID format - "${kioskId}" (corrupted data)`,
      callStack: new Error().stack?.split('\n').slice(1, 4).join('\n') || 'unknown'
    });

    // DELETE all kiosk configuration
    localStorage.removeItem(KIOSK_ID_KEY);
    localStorage.removeItem(KIOSK_FINGERPRINT_KEY);
    localStorage.removeItem(KIOSK_CONFIGURED_AT_KEY);
    localStorage.removeItem(KIOSK_USERNAME_KEY);

    console.warn('[KioskConfig] ✅ Configuration deleted successfully - automatic recovery will attempt restoration');
  } else if (kioskId && fingerprint) {
    // Valid configuration exists - log for monitoring
    console.log('[KioskConfig] ✅ Valid configuration found:', {
      timestamp: new Date().toISOString(),
      kioskId: kioskId.substring(0, 8) + '...',
      fingerprint: fingerprint.substring(0, 12) + '...',
      configuredAt: configuredAt || 'unknown',
      ageInDays: configuredAt
        ? Math.floor((Date.now() - new Date(configuredAt).getTime()) / (1000 * 60 * 60 * 24))
        : 'unknown'
    });
  } else if (kioskId && !fingerprint) {
    // Incomplete config - DON'T DELETE, automatic recovery will handle
    console.warn('[KioskConfig] ⚠️ Incomplete configuration detected (missing fingerprint) - automatic recovery will handle', {
      timestamp: new Date().toISOString(),
      kioskId: kioskId.substring(0, 8) + '...',
      note: 'NOT deleting - recovery system will restore or clean up'
    });
  } else {
    // No configuration at all - not an error, just not configured yet
    console.log('[KioskConfig] ℹ️ No kiosk configuration found (device not configured)');
  }
}
