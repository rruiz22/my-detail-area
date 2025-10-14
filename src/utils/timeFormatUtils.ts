/**
 * Format time duration from milliseconds to "XD XH Xmin" format
 * @param ms - Milliseconds to format
 * @returns Formatted string like "2D 10H 33min"
 */
export function formatTimeDuration(ms: number): string {
  if (ms < 0) return '0min';

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}D`);
  }

  if (hours > 0) {
    parts.push(`${hours}H`);
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}min`);
  }

  return parts.join(' ');
}

/**
 * Format time duration from a start date to now
 * @param startDate - Start date string or Date object
 * @returns Formatted string like "2D 10H 33min"
 */
export function formatTimeFromDate(startDate: string | Date): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const now = new Date();
  const diffInMs = now.getTime() - start.getTime();
  return formatTimeDuration(diffInMs);
}

/**
 * Calculate Time to Line (T2L) - time from vehicle creation to current moment
 * @param createdAt - Vehicle creation date
 * @returns Formatted string like "13D 4H 23min"
 */
export function calculateT2L(createdAt: string): string {
  return formatTimeFromDate(createdAt);
}

/**
 * Calculate Days in Step (DIS) - time from entering current step to now
 * @param intakeDate - Date when vehicle entered current step
 * @returns Formatted string like "0D 1H 45min"
 */
export function calculateDIS(intakeDate: string): string {
  return formatTimeFromDate(intakeDate);
}

/**
 * Calculate Days to Frontline (DTF) - estimated time remaining based on average
 * For now, this returns 0 as we need more data to calculate properly
 * @param currentStepOrder - Current step order
 * @param totalSteps - Total number of steps
 * @param avgTimePerStep - Average time per remaining step in hours
 * @returns Formatted string like "3D 12H 0min"
 */
export function calculateDTF(
  currentStepOrder: number = 0,
  totalSteps: number = 8,
  avgTimePerStep: number = 24
): string {
  const remainingSteps = Math.max(0, totalSteps - currentStepOrder);
  const estimatedHours = remainingSteps * avgTimePerStep;
  const estimatedMs = estimatedHours * 60 * 60 * 1000;
  return formatTimeDuration(estimatedMs);
}
