/**
 * useNotificationSoundPreferences Hook
 *
 * Manages notification sound preferences for system admins
 * Persists settings to localStorage with debounced writes
 *
 * Features:
 * - Enable/disable sound globally
 * - Configure sound per priority level
 * - Volume control (0-100%)
 * - Auto-save with debounce
 * - Default preferences
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'mda_notification_sound_preferences';
const DEBOUNCE_MS = 500;

export interface NotificationSoundPreferences {
  enabled: boolean;
  volume: number; // 0-1 (0% - 100%)
  playForUrgent: boolean;
  playForHigh: boolean;
  playForNormal: boolean;
  playForLow: boolean;
}

const DEFAULT_PREFERENCES: NotificationSoundPreferences = {
  enabled: true,
  volume: 0.3, // 30% default
  playForUrgent: true,
  playForHigh: true,
  playForNormal: false, // Normal and low disabled by default
  playForLow: false,
};

export interface UseNotificationSoundPreferencesReturn {
  preferences: NotificationSoundPreferences;
  isLoading: boolean;
  updatePreference: <K extends keyof NotificationSoundPreferences>(
    key: K,
    value: NotificationSoundPreferences[K]
  ) => void;
  savePreferences: () => Promise<void>;
  resetToDefaults: () => void;
}

/**
 * Hook to manage notification sound preferences
 */
export function useNotificationSoundPreferences(): UseNotificationSoundPreferencesReturn {
  const [preferences, setPreferences] = useState<NotificationSoundPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('[useNotificationSoundPreferences] Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced save to localStorage
  const debouncedSave = useCallback((newPreferences: NotificationSoundPreferences) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
        console.log('[useNotificationSoundPreferences] Preferences saved:', newPreferences);
      } catch (error) {
        console.error('[useNotificationSoundPreferences] Error saving preferences:', error);
      }
    }, DEBOUNCE_MS);

    setSaveTimeout(timeout);
  }, [saveTimeout]);

  // Update single preference
  const updatePreference = useCallback(
    <K extends keyof NotificationSoundPreferences>(
      key: K,
      value: NotificationSoundPreferences[K]
    ) => {
      setPreferences((prev) => {
        const updated = { ...prev, [key]: value };
        debouncedSave(updated);
        return updated;
      });
    },
    [debouncedSave]
  );

  // Save preferences immediately (for "Save" button)
  const savePreferences = useCallback(async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      console.log('[useNotificationSoundPreferences] Preferences saved immediately');
    } catch (error) {
      console.error('[useNotificationSoundPreferences] Error saving preferences:', error);
      throw error;
    }
  }, [preferences]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
  }, []);

  return {
    preferences,
    isLoading,
    updatePreference,
    savePreferences,
    resetToDefaults,
  };
}

/**
 * Get notification sound preferences (synchronous)
 * Used by playNotificationSound to check if sound should play
 */
export function getNotificationSoundPreferences(): NotificationSoundPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_PREFERENCES, ...parsed };
    }
  } catch (error) {
    console.error('[getNotificationSoundPreferences] Error loading preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}
