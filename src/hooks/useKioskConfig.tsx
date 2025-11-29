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
import * as logger from '@/utils/logger';

const KIOSK_ID_KEY = 'kiosk_id';
const KIOSK_FINGERPRINT_KEY = 'kiosk_device_fingerprint';
const KIOSK_CONFIGURED_AT_KEY = 'kiosk_configured_at';
const KIOSK_USERNAME_KEY = 'kiosk_username';
const KIOSK_REGISTRATION_CODE_KEY = 'kiosk_registration_code'; // ✅ NEW: Permanent device identifier
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

  // 🔄 AUTOMATIC RECOVERY: Triple-layered recovery system (registration code → fingerprint → history)
  useEffect(() => {
    if (isReady && fingerprint) {
      const currentKioskId = localStorage.getItem(KIOSK_ID_KEY);

      // Only attempt recovery if localStorage is empty
      if (!currentKioskId) {
        console.log('[KioskConfig] 🔍 No localStorage config found - attempting triple-recovery...');

        const attemptRecovery = async () => {
          const registrationCode = localStorage.getItem(KIOSK_REGISTRATION_CODE_KEY);

          try {
            // STEP 1: Try recovery by registration code (highest priority - survives fingerprint changes)
            if (registrationCode) {
              console.log('[KioskConfig] 🔑 Attempting recovery by registration code:', registrationCode);

              const { data: codeData, error: codeError } = await supabase
                .from('detail_hub_kiosk_devices')
                .select('*, detail_hub_kiosks!inner(*)')
                .eq('registration_code', registrationCode)
                .eq('is_active', true)
                .single();

              if (!codeError && codeData) {
                await logRecoveryAttempt('registration_code', 'success', codeData, registrationCode);
                await restoreConfiguration(codeData, 'registration_code', registrationCode);
                return;
              } else {
                await logRecoveryAttempt('registration_code', 'failed_no_binding', null, registrationCode);
                console.log('[KioskConfig] ⚠️ Registration code not found in database');
              }
            }

            // STEP 2: Try recovery by exact fingerprint match
            console.log('[KioskConfig] 🔍 Attempting recovery by fingerprint:', fingerprint.substring(0, 12) + '...');

            const { data: fingerprintData, error: fingerprintError } = await supabase
              .from('detail_hub_kiosk_devices')
              .select('*, detail_hub_kiosks!inner(*)')
              .eq('device_fingerprint', fingerprint)
              .eq('is_active', true)
              .single();

            if (!fingerprintError && fingerprintData) {
              await logRecoveryAttempt('fingerprint', 'success', fingerprintData, registrationCode);
              await restoreConfiguration(fingerprintData, 'fingerprint', registrationCode);
              return;
            } else {
              await logRecoveryAttempt('fingerprint', 'failed_no_binding', null, registrationCode);
              console.log('[KioskConfig] ⚠️ Fingerprint not found in database');
            }

            // STEP 3: Try recovery by searching fingerprint history (JSONB array)
            console.log('[KioskConfig] 🕵️ Attempting recovery by fingerprint history...');

            const { data: historyData, error: historyError } = await supabase
              .from('detail_hub_kiosk_devices')
              .select('*, detail_hub_kiosks!inner(*)')
              .contains('device_fingerprint_history', [fingerprint])
              .eq('is_active', true)
              .single();

            if (!historyError && historyData) {
              await logRecoveryAttempt('fingerprint_history', 'success', historyData, registrationCode);
              await restoreConfiguration(historyData, 'fingerprint_history', registrationCode);

              // Update current fingerprint in device binding
              await supabase
                .from('detail_hub_kiosk_devices')
                .update({
                  device_fingerprint: fingerprint,
                  last_seen_at: new Date().toISOString()
                })
                .eq('id', historyData.id);

              console.log('[KioskConfig] ✅ Fingerprint updated from history');
              return;
            } else {
              await logRecoveryAttempt('fingerprint_history', 'failed_no_binding', null, registrationCode);
              console.log('[KioskConfig] ℹ️ Device not found in history (never configured or all methods failed)');
            }

          } catch (error) {
            console.error('[KioskConfig] ❌ Recovery failed with error:', error);
            await logRecoveryAttempt('manual', 'failed_error', null, registrationCode, error);
          }
        };

        // Helper: Restore configuration to localStorage
        const restoreConfiguration = async (deviceData: any, method: string, registrationCode: string | null) => {
          const kiosk = deviceData.detail_hub_kiosks;

          // Check if kiosk is archived
          if (kiosk.archived) {
            console.warn('[KioskConfig] ⚠️ Kiosk is archived - configuration cannot be restored');
            await logRecoveryAttempt(method, 'failed_kiosk_archived', deviceData, registrationCode);

            toast({
              title: '⚠️ Kiosk Archived',
              description: 'This kiosk has been archived by an administrator. Please reconfigure this device with an active kiosk.',
              duration: 8000,
              variant: 'destructive'
            });
            return;
          }

          // Restore all localStorage keys
          localStorage.setItem(KIOSK_ID_KEY, deviceData.kiosk_id);
          localStorage.setItem(KIOSK_FINGERPRINT_KEY, fingerprint);
          localStorage.setItem(KIOSK_CONFIGURED_AT_KEY, deviceData.configured_at || new Date().toISOString());
          localStorage.setItem(KIOSK_REGISTRATION_CODE_KEY, deviceData.registration_code);

          if (deviceData.last_seen_username) {
            localStorage.setItem(KIOSK_USERNAME_KEY, deviceData.last_seen_username);
          }

          // Update React state
          setKioskId(deviceData.kiosk_id);
          setIsConfigured(true);

          console.log('[KioskConfig] 🎉 RECOVERY SUCCESSFUL via', method, {
            kioskId: deviceData.kiosk_id,
            kioskCode: kiosk.kiosk_code,
            registrationCode: deviceData.registration_code,
            configuredAt: deviceData.configured_at
          });

          // Show success notification
          toast({
            title: `✅ Configuration Restored (${method})`,
            description: `Kiosk "${kiosk.name}" recovered successfully.`,
            duration: 5000,
            className: 'bg-emerald-50 border-emerald-500'
          });

          // Update last_seen timestamp
          await supabase
            .from('detail_hub_kiosk_devices')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', deviceData.id);
        };

        // Helper: Log recovery attempt to audit table
        const logRecoveryAttempt = async (
          method: string,
          status: string,
          deviceData: any | null,
          registrationCode: string | null,
          errorDetails?: any
        ) => {
          try {
            await supabase.rpc('log_kiosk_recovery', {
              p_device_fingerprint: fingerprint,
              p_registration_code: registrationCode,
              p_recovery_method: method,
              p_recovery_status: status,
              p_kiosk_id: deviceData?.kiosk_id || null,
              p_device_binding_id: deviceData?.id || null,
              p_error_details: errorDetails ? JSON.parse(JSON.stringify(errorDetails)) : null,
              p_user_agent: navigator.userAgent,
              p_ip_address: null // Will be detected by backend if needed
            });
          } catch (logError) {
            console.warn('[KioskConfig] ⚠️ Failed to log recovery attempt:', logError);
          }
        };

        attemptRecovery();
      }
    }
  }, [isReady, fingerprint, toast]);

  // Validate fingerprint and update history if changed
  useEffect(() => {
    if (isReady && fingerprint && kioskId) {
      const storedFingerprint = localStorage.getItem(KIOSK_FINGERPRINT_KEY);
      const registrationCode = localStorage.getItem(KIOSK_REGISTRATION_CODE_KEY);

      if (storedFingerprint && storedFingerprint !== fingerprint) {
        logger.dev('[KioskConfig] ⚠️ Fingerprint changed - updating device binding...', {
          old: storedFingerprint.substring(0, 12) + '...',
          new: fingerprint.substring(0, 12) + '...',
          registrationCode
        });

        // Update fingerprint in localStorage
        localStorage.setItem(KIOSK_FINGERPRINT_KEY, fingerprint);

        // Update fingerprint in database and add to history
        if (registrationCode) {
          supabase
            .from('detail_hub_kiosk_devices')
            .select('device_fingerprint_history')
            .eq('registration_code', registrationCode)
            .single()
            .then(({ data }) => {
              const history = data?.device_fingerprint_history || [];

              // Add old fingerprint to history if not already present
              if (!history.includes(storedFingerprint)) {
                history.push(storedFingerprint);
              }

              // Update device binding with new fingerprint and history
              return supabase
                .from('detail_hub_kiosk_devices')
                .update({
                  device_fingerprint: fingerprint,
                  device_fingerprint_history: history,
                  last_seen_at: new Date().toISOString()
                })
                .eq('registration_code', registrationCode);
            })
            .then(({ error }) => {
              if (error) {
                console.error('[KioskConfig] ❌ Failed to update fingerprint:', error);
              } else {
                console.log('[KioskConfig] ✅ Fingerprint updated successfully in database');
              }
            });
        }
      }
    }
  }, [isReady, fingerprint, kioskId]);

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
    localStorage.removeItem(KIOSK_REGISTRATION_CODE_KEY); // ✅ NEW

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
  const registrationCode = localStorage.getItem(KIOSK_REGISTRATION_CODE_KEY); // ✅ NEW

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
        username: username || '(null)',
        registrationCode: registrationCode || '(null)' // ✅ NEW
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
    localStorage.removeItem(KIOSK_REGISTRATION_CODE_KEY); // ✅ NEW

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

// Export localStorage keys for use in other modules
export { KIOSK_REGISTRATION_CODE_KEY };
