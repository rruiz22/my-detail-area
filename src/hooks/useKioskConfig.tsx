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

const KIOSK_ID_KEY = 'kiosk_id';
const KIOSK_FINGERPRINT_KEY = 'kiosk_device_fingerprint';
const KIOSK_CONFIGURED_AT_KEY = 'kiosk_configured_at';
const KIOSK_USERNAME_KEY = 'kiosk_username';
const DEFAULT_KIOSK_ID = 'default-kiosk';

export function useKioskConfig() {
  const { fingerprint, username, isReady } = useDeviceFingerprint();

  const [kioskId, setKioskId] = useState<string | null>(() => {
    const storedId = localStorage.getItem(KIOSK_ID_KEY);
    return storedId && storedId !== DEFAULT_KIOSK_ID ? storedId : null;
  });

  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    return !!localStorage.getItem(KIOSK_ID_KEY) &&
           !!localStorage.getItem(KIOSK_FINGERPRINT_KEY);
  });

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
    kioskId: kioskId || DEFAULT_KIOSK_ID,
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
