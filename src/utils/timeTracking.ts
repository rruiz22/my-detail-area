import { differenceInMinutes, differenceInDays, isSameDay, format } from 'date-fns';

/**
 * Time tracking utility functions for punch in/out system
 * Handles overnight shifts, long shift detection, and duration calculations
 */

export interface ShiftDuration {
  hours: number;
  minutes: number;
  totalMinutes: number;
  totalHours: number;
  isOvernight: boolean;
  isLongShift: boolean;
  daysDifference: number;
}

/**
 * Detects if a shift crosses midnight (clock in and clock out on different days)
 * @param clockIn - Clock in timestamp
 * @param clockOut - Clock out timestamp
 * @returns true if the shift is overnight (different dates)
 */
export function isOvernightShift(clockIn: string | Date, clockOut: string | Date): boolean {
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);
  return !isSameDay(clockInDate, clockOutDate);
}

/**
 * Calculates the duration between clock in and clock out
 * @param clockIn - Clock in timestamp
 * @param clockOut - Clock out timestamp
 * @returns ShiftDuration object with hours, minutes, and flags
 */
export function getShiftDuration(clockIn: string | Date, clockOut: string | Date): ShiftDuration {
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);

  const totalMinutes = differenceInMinutes(clockOutDate, clockInDate);
  const totalHours = totalMinutes / 60;
  const hours = Math.floor(totalHours);
  const minutes = totalMinutes % 60;

  const overnight = isOvernightShift(clockInDate, clockOutDate);
  const daysDifference = differenceInDays(clockOutDate, clockInDate);
  const longShift = totalHours > 10;

  return {
    hours,
    minutes,
    totalMinutes,
    totalHours,
    isOvernight: overnight,
    isLongShift: longShift,
    daysDifference
  };
}

/**
 * Formats time with optional date display
 * Shows date when requested (typically for overnight shifts)
 * @param date - Date to format
 * @param showDate - Whether to include the date in the output
 * @returns Formatted time string
 */
export function formatTimeWithOptionalDate(date: string | Date, showDate: boolean = false): string {
  const dateObj = new Date(date);

  if (showDate) {
    return format(dateObj, 'MMM d, h:mm a');
  }

  return format(dateObj, 'h:mm a');
}

/**
 * Detects if a shift is considered "long" (>10 hours)
 * @param hours - Number of hours in the shift
 * @returns true if the shift is longer than 10 hours
 */
export function isLongShift(hours: number): boolean {
  return hours > 10;
}

/**
 * Gets the number of calendar days between clock in and clock out
 * @param clockIn - Clock in timestamp
 * @param clockOut - Clock out timestamp
 * @returns Number of days difference
 */
export function getDaysDifference(clockIn: string | Date, clockOut: string | Date): number {
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);
  return differenceInDays(clockOutDate, clockInDate);
}

/**
 * Formats duration in a human-readable format
 * @param hours - Number of hours
 * @param minutes - Number of minutes
 * @param t - Translation function
 * @returns Formatted duration string (e.g., "11h 57m")
 */
export function formatDuration(
  hours: number,
  minutes: number,
  t: (key: string) => string
): string {
  const hoursStr = hours > 0 ? `${hours}${t('detail_hub.time_tracking.hours_abbrev')}` : '';
  const minutesStr = minutes > 0 ? `${minutes}${t('detail_hub.time_tracking.minutes_abbrev')}` : '';

  if (hours > 0 && minutes > 0) {
    return `${hoursStr} ${minutesStr}`;
  }

  return hoursStr || minutesStr || '0m';
}

/**
 * Gets badge variant based on shift characteristics
 * @param isOvernight - Whether the shift is overnight
 * @param isLongShift - Whether the shift is >10 hours
 * @returns Badge variant for styling
 */
export function getShiftBadgeVariant(isOvernight: boolean, isLongShift: boolean): 'warning' | 'destructive' | 'default' {
  if (isLongShift) {
    return 'destructive';
  }
  if (isOvernight) {
    return 'warning';
  }
  return 'default';
}
