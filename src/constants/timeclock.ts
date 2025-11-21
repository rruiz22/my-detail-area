/**
 * Time Clock System Constants
 *
 * Centralized configuration for the enterprise time clock/punch clock system.
 * All time values, thresholds, and limits for the kiosk modal and related components.
 *
 * @module constants/timeclock
 */

/**
 * Break duration constraints
 */
export const BREAK_CONSTRAINTS = {
  /**
   * Minimum break duration in minutes required before employee can end break
   * Used to enforce labor law compliance and company policy
   */
  MINIMUM_MINUTES: 30,

  /**
   * Minimum break duration in seconds (calculated for convenience)
   * Used in real-time countdown timers
   */
  MINIMUM_SECONDS: 30 * 60, // 1800 seconds
} as const;

/**
 * Inactivity timeout settings for kiosk mode
 */
export const INACTIVITY_TIMEOUTS = {
  /**
   * Timeout duration in seconds for employee_detail and photo_capture views
   * After this period of no user activity, system returns to search view
   * Ensures kiosk security by preventing unauthorized access to employee data
   */
  KIOSK_TIMEOUT_SECONDS: 10,

  /**
   * Visual warning thresholds for countdown display
   */
  WARNING_THRESHOLD_SECONDS: 5, // Show amber warning
  CRITICAL_THRESHOLD_SECONDS: 3, // Show red warning with pulse animation
} as const;

/**
 * Face recognition scan settings
 */
export const FACE_SCAN_CONFIG = {
  /**
   * Maximum duration in seconds for facial recognition attempt
   * Auto-stops scan if no face is recognized within this time
   */
  SCAN_TIMEOUT_SECONDS: 15,

  /**
   * Interval in milliseconds between face detection attempts
   * Balances performance with recognition accuracy
   */
  SCAN_INTERVAL_MS: 2000,

  /**
   * Face descriptor array length for validation
   * face-api.js generates 128-dimensional descriptors
   */
  DESCRIPTOR_LENGTH: 128,

  /**
   * Visual countdown warning thresholds
   */
  WARNING_THRESHOLD_SECONDS: 5, // Show red countdown warning
} as const;

/**
 * PIN authentication security settings
 */
export const PIN_SECURITY = {
  /**
   * Maximum number of incorrect PIN attempts before lockout
   * Security measure to prevent brute force attacks
   */
  MAX_ATTEMPTS: 3,

  /**
   * Lockout duration in seconds after max failed attempts
   * Prevents immediate retry of PIN guessing
   */
  LOCKOUT_DURATION_SECONDS: 30,

  /**
   * Minimum PIN length required for submission
   */
  MIN_LENGTH: 4,

  /**
   * Maximum PIN length allowed
   */
  MAX_LENGTH: 6,
} as const;

/**
 * Camera and photo capture settings
 */
export const CAMERA_CONFIG = {
  /**
   * Ideal camera resolution for photo capture
   * Balances quality with performance and storage
   */
  IDEAL_WIDTH: 1280,
  IDEAL_HEIGHT: 720,

  /**
   * JPEG compression quality (0-1 scale)
   * 0.9 provides excellent quality with reasonable file size
   */
  PHOTO_QUALITY: 0.9,

  /**
   * Preferred camera facing mode
   * 'user' = front-facing camera for self-capture
   */
  FACING_MODE: 'user' as const,

  /**
   * Face guide overlay dimensions (CSS pixels)
   */
  FACE_GUIDE_WIDTH: 264, // w-64 = 256px + border
  FACE_GUIDE_HEIGHT: 336, // h-80 = 320px + border
} as const;

/**
 * UI update intervals
 */
export const UPDATE_INTERVALS = {
  /**
   * Clock display update interval in milliseconds
   * Updates current time display every second
   */
  CLOCK_UPDATE_MS: 1000,

  /**
   * Break timer update interval in milliseconds
   * Updates countdown display for minimum break requirement
   */
  BREAK_TIMER_UPDATE_MS: 1000,

  /**
   * Inactivity countdown update interval in milliseconds
   */
  INACTIVITY_COUNTDOWN_MS: 1000,

  /**
   * Face scan countdown update interval in milliseconds
   */
  FACE_SCAN_COUNTDOWN_MS: 1000,
} as const;

/**
 * Search and filtering settings
 */
export const SEARCH_CONFIG = {
  /**
   * Minimum search query length before triggering search
   * Prevents excessive database queries on single characters
   */
  MIN_QUERY_LENGTH: 2,

  /**
   * Maximum number of punch history entries to display
   */
  PUNCH_HISTORY_LIMIT: 5,
} as const;

/**
 * Kiosk identification
 */
export const KIOSK_CONFIG = {
  /**
   * Default kiosk ID when not configured
   * Fallback value for testing and development
   */
  DEFAULT_KIOSK_ID: 'default-kiosk',

  /**
   * localStorage key for persisted kiosk ID
   */
  STORAGE_KEY: 'kiosk_id',
} as const;

/**
 * Complete time clock constants collection
 * Provides a single import point for all timeclock-related configuration
 */
export const TIMECLOCK_CONSTANTS = {
  BREAK_CONSTRAINTS,
  INACTIVITY_TIMEOUTS,
  FACE_SCAN_CONFIG,
  PIN_SECURITY,
  CAMERA_CONFIG,
  UPDATE_INTERVALS,
  SEARCH_CONFIG,
  KIOSK_CONFIG,
} as const;

/**
 * Type-safe constant types
 */
export type TimeclockConstants = typeof TIMECLOCK_CONSTANTS;
export type BreakConstraints = typeof BREAK_CONSTRAINTS;
export type InactivityTimeouts = typeof INACTIVITY_TIMEOUTS;
export type FaceScanConfig = typeof FACE_SCAN_CONFIG;
export type PinSecurity = typeof PIN_SECURITY;
export type CameraConfig = typeof CAMERA_CONFIG;
export type UpdateIntervals = typeof UPDATE_INTERVALS;
export type SearchConfig = typeof SEARCH_CONFIG;
export type KioskConfig = typeof KIOSK_CONFIG;

/**
 * Helper functions for time formatting
 */
export const TimeclockHelpers = {
  /**
   * Formats break timer countdown (MM:SS format)
   */
  formatBreakTimer: (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Formats elapsed time (Xh Ym format)
   */
  formatElapsedTime: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  },

  /**
   * Formats time for display (HH:MM:SS AM/PM format)
   */
  formatTime: (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  },

  /**
   * Validates UUID format
   */
  isValidUUID: (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  },
} as const;
