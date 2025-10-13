/**
 * Week Utilities
 * Helper functions for week-based filtering and navigation
 */

/**
 * Get the start of week for a given offset
 * @param weekOffset 0 = current week, -1 = last week, -2 = 2 weeks ago
 */
export function getWeekStart(weekOffset: number = 0): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Start week on Monday

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + daysToMonday + (weekOffset * 7));
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

/**
 * Get the end of week for a given offset
 * @param weekOffset 0 = current week, -1 = last week, -2 = 2 weeks ago
 */
export function getWeekEnd(weekOffset: number = 0): Date {
  const weekStart = getWeekStart(weekOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday
  weekEnd.setHours(23, 59, 59, 999);

  return weekEnd;
}

/**
 * Format week range for display
 * @param weekOffset 0 = current week, -1 = last week
 */
export function formatWeekRange(weekOffset: number = 0): string {
  const start = getWeekStart(weekOffset);
  const end = getWeekEnd(weekOffset);

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric'
  };

  const startStr = start.toLocaleDateString('en-US', formatOptions);
  const endStr = end.toLocaleDateString('en-US', formatOptions);

  // Add year if different year
  if (start.getFullYear() !== new Date().getFullYear()) {
    return `${startStr} - ${endStr}, ${start.getFullYear()}`;
  }

  return `${startStr} - ${endStr}`;
}

/**
 * Get week label for display
 * @param weekOffset 0 = current week, -1 = last week
 */
export function getWeekLabel(weekOffset: number = 0): string {
  if (weekOffset === 0) return 'Current Week';
  if (weekOffset === -1) return 'Last Week';
  return `${Math.abs(weekOffset)} weeks ago`;
}

/**
 * Check if a date falls within the week range
 * @param date Date to check
 * @param weekOffset Week offset
 */
export function isDateInWeek(date: Date | string, weekOffset: number = 0): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  const weekStart = getWeekStart(weekOffset);
  const weekEnd = getWeekEnd(weekOffset);

  return checkDate >= weekStart && checkDate <= weekEnd;
}
