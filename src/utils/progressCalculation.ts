import type { WorkItemStatus } from '@/hooks/useVehicleWorkItems';

/**
 * Work Item for progress calculation
 */
export interface WorkItemForProgress {
  status: WorkItemStatus;
}

/**
 * Calculate vehicle progress based on work item completion
 *
 * @param workItems - Array of work items with status
 * @returns Percentage (0-100) representing overall progress
 *
 * @description
 * This function calculates progress using a weighted system:
 * - completed/cancelled: 100% weight (fully resolved)
 * - in_progress: 50% weight (actively being worked on)
 * - blocked/on_hold: 25% weight (started but paused)
 * - pending/awaiting_approval/rejected/scheduled: 0% weight (not started)
 *
 * @example
 * // 2 completed, 1 in_progress, 1 pending = (2*1.0 + 1*0.5 + 1*0) / 4 = 62.5%
 * calculateVehicleProgress([
 *   { status: 'completed' },
 *   { status: 'completed' },
 *   { status: 'in_progress' },
 *   { status: 'pending' }
 * ]) // Returns: 63
 */
export function calculateVehicleProgress(workItems: WorkItemForProgress[] | undefined): number {
  // No work items = 0% progress
  if (!workItems || workItems.length === 0) {
    return 0;
  }

  const totalItems = workItems.length;
  let weightedProgress = 0;

  workItems.forEach((item) => {
    switch (item.status) {
      case 'completed':
      case 'cancelled':  // Cancelled counts as resolved (no longer blocking progress)
        weightedProgress += 1.0;
        break;

      case 'in_progress':
        weightedProgress += 0.5;  // Half complete
        break;

      case 'blocked':
      case 'on_hold':
        weightedProgress += 0.25;  // Partially started
        break;

      // All other statuses (pending, awaiting_approval, rejected, scheduled) = 0%
      default:
        weightedProgress += 0;
    }
  });

  // Calculate percentage and round to nearest integer
  const percentage = (weightedProgress / totalItems) * 100;
  return Math.round(percentage);
}

/**
 * Determine if vehicle is fully complete based on work items
 *
 * @param workItems - Array of work items with status
 * @returns true if ALL work items are completed or cancelled
 */
export function isVehicleComplete(workItems: WorkItemForProgress[] | undefined): boolean {
  if (!workItems || workItems.length === 0) {
    return false;
  }

  return workItems.every(
    (item) => item.status === 'completed' || item.status === 'cancelled'
  );
}

/**
 * Get progress bar color based on percentage
 *
 * @param progress - Progress percentage (0-100)
 * @returns Tailwind color class
 */
export function getProgressColor(progress: number): string {
  if (progress === 100) return 'bg-emerald-500';  // Green for complete
  if (progress >= 76) return 'bg-blue-500';        // Blue for near complete
  if (progress >= 26) return 'bg-amber-500';       // Yellow/Amber for in progress
  return 'bg-gray-400';                            // Gray for just started (0-25%)
}
