/**
 * Safe date parsing utility to prevent "Invalid time value" errors
 * All date operations should use consistent timezone
 */

import { format as formatTz, toZonedTime } from 'date-fns-tz';

// System-wide timezone configuration
export const SYSTEM_TIMEZONE = 'America/New_York';

/**
 * Get system timezone (user's local timezone or fallback to Eastern)
 */
export const getSystemTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || SYSTEM_TIMEZONE;
  } catch (error) {
    return SYSTEM_TIMEZONE;
  }
};

/**
 * Safely parses a date string and returns a Date object or null
 */
export const safeParseDate = (dateString?: string | null): Date | null => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  
  // Handle empty strings and common invalid values
  if (dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
    return null;
  }
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
};

/**
 * Safely formats a date string to a localized string with consistent timezone
 */
export const safeFormatDate = (dateString?: string | null, options?: Intl.DateTimeFormatOptions): string => {
  const date = safeParseDate(dateString);

  if (!date) {
    return 'N/A';
  }

  try {
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: getSystemTimezone(),
      ...options
    };
    return date.toLocaleString('en-US', formatOptions);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Safely formats a date string to a localized date string with consistent timezone
 */
export const safeFormatDateOnly = (dateString?: string | null): string => {
  const date = safeParseDate(dateString);

  if (!date) {
    return 'N/A';
  }

  try {
    return date.toLocaleDateString('en-US', {
      timeZone: getSystemTimezone(),
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Calculates days between a date string and today using consistent timezone
 */
export const calculateDaysFromNow = (dateString?: string | null): number | null => {
  const date = safeParseDate(dateString);

  if (!date) {
    return null;
  }

  // Get current date in the same timezone as the target date
  const today = new Date();
  const timezone = getSystemTimezone();

  // Format both dates to same timezone for accurate comparison
  const todayInTimezone = new Date(today.toLocaleString('en-US', { timeZone: timezone }));
  const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

  // Normalize both dates to start of day (00:00:00) for consistent day-based comparison
  todayInTimezone.setHours(0, 0, 0, 0);
  dateInTimezone.setHours(0, 0, 0, 0);

  const diffTime = dateInTimezone.getTime() - todayInTimezone.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Checks if a date string represents a valid date
 */
export const isValidDateString = (dateString?: string | null): boolean => {
  return safeParseDate(dateString) !== null;
};

/**
 * Formats a Date object in a specific timezone with custom format
 * Uses date-fns-tz for reliable timezone conversion
 *
 * @param date - Date object to format
 * @param timezone - IANA timezone (default: America/New_York)
 * @param formatString - Format string (default: 'yyyy-MM-dd')
 * @returns Formatted date string in specified timezone
 *
 * @example
 * formatDateInTimezone(new Date(), 'America/New_York', 'yyyy-MM-dd') // '2025-01-15'
 * formatDateInTimezone(new Date(), 'America/New_York', 'yyyy-MM-dd HH:mm:ss') // '2025-01-15 14:30:00'
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string = SYSTEM_TIMEZONE,
  formatString: string = 'yyyy-MM-dd'
): string {
  const zonedDate = toZonedTime(date, timezone);
  return formatTz(zonedDate, formatString, { timeZone: timezone });
}

/**
 * Gets the hour (0-23) of a Date object in a specific timezone
 * Critical for appointment slot operations that must use consistent timezone
 *
 * @param date - Date object
 * @param timezone - IANA timezone (default: America/New_York)
 * @returns Hour in specified timezone (0-23)
 *
 * @example
 * // User in California (PST) selects 2:00 PM local time
 * // But we need to know what hour that is in New York (5:00 PM EST)
 * const localDate = new Date('2025-01-15T14:00:00-08:00'); // 2 PM PST
 * getHourInTimezone(localDate, 'America/New_York') // Returns 17 (5 PM EST)
 */
export function getHourInTimezone(
  date: Date,
  timezone: string = SYSTEM_TIMEZONE
): number {
  const zonedDate = toZonedTime(date, timezone);
  return zonedDate.getHours();
}

/**
 * Converts a Date object to the system timezone (America/New_York)
 * Useful for ensuring all date operations use consistent timezone
 *
 * @param date - Date object to convert
 * @returns New Date object representing the same instant in New York timezone
 *
 * @example
 * const utcDate = new Date('2025-01-15T19:00:00Z'); // 7 PM UTC
 * const nyDate = toNewYorkTime(utcDate); // 2 PM EST (same instant, different representation)
 */
export function toNewYorkTime(date: Date): Date {
  return toZonedTime(date, SYSTEM_TIMEZONE);
}

/**
 * Gets the date part (YYYY-MM-DD) of a Date in New York timezone
 * Essential for database queries that use DATE type (not TIMESTAMPTZ)
 *
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format in New York timezone
 *
 * @example
 * // At 11 PM PST on Jan 15, it's already 2 AM EST on Jan 16
 * const lateNight = new Date('2025-01-15T23:00:00-08:00'); // 11 PM PST Jan 15
 * getNewYorkDateString(lateNight) // '2025-01-16' (already Jan 16 in NY)
 */
export function getNewYorkDateString(date: Date): string {
  return formatDateInTimezone(date, SYSTEM_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Creates a Date object with specific hour in New York timezone
 * Useful for generating appointment slots with correct timezone
 *
 * @param date - Base date
 * @param hour - Hour to set (0-23)
 * @returns New Date object with specified hour in NY timezone
 */
export function createNewYorkDateTime(date: Date, hour: number): Date {
  const nyDate = toZonedTime(date, SYSTEM_TIMEZONE);
  nyDate.setHours(hour, 0, 0, 0);
  return nyDate;
}