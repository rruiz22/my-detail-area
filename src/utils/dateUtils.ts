/**
 * Safe date parsing utility to prevent "Invalid time value" errors
 * All date operations should use consistent timezone
 */

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