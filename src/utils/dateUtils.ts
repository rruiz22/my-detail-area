/**
 * Safe date parsing utility to prevent "Invalid time value" errors
 */

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
 * Safely formats a date string to a localized string
 */
export const safeFormatDate = (dateString?: string | null, options?: Intl.DateTimeFormatOptions): string => {
  const date = safeParseDate(dateString);
  
  if (!date) {
    return 'N/A';
  }
  
  try {
    return date.toLocaleString(undefined, options);
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Safely formats a date string to a localized date string
 */
export const safeFormatDateOnly = (dateString?: string | null): string => {
  const date = safeParseDate(dateString);
  
  if (!date) {
    return 'N/A';
  }
  
  try {
    return date.toLocaleDateString();
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'N/A';
  }
};

/**
 * Calculates days between a date string and today
 */
export const calculateDaysFromNow = (dateString?: string | null): number | null => {
  const date = safeParseDate(dateString);
  
  if (!date) {
    return null;
  }
  
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Checks if a date string represents a valid date
 */
export const isValidDateString = (dateString?: string | null): boolean => {
  return safeParseDate(dateString) !== null;
};