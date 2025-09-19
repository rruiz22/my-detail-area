import { calculateTimeStatus, type TimeStatusInfo } from './dueDateUtils';

/**
 * Determines the animation class for an order based on its status and due date
 * Only applies animations to active orders (pending, in_progress)
 *
 * @param orderStatus - The current status of the order
 * @param dueDate - The due date string or null
 * @returns CSS class string for animation or empty string if no animation needed
 */
export const getOrderAnimationClass = (
  orderStatus: string,
  dueDate: string | null
): string => {
  // Only animate active orders (pending, in_progress)
  const activeStatuses = ['pending', 'in_progress'];
  const normalizedStatus = orderStatus.toLowerCase().replace(/[^a-z]/g, '_');

  // Don't animate if status is not active or no due date
  if (!activeStatuses.includes(normalizedStatus) || !dueDate) {
    return '';
  }

  // Calculate time status for urgency level
  const timeStatus: TimeStatusInfo = calculateTimeStatus(dueDate);

  // Don't animate if there's no time urgency
  if (!timeStatus || timeStatus.status === 'no-due-date') {
    return '';
  }

  // Determine animation class based on attention level
  if (timeStatus.attentionLevel === 'high') {
    // Overdue or very urgent - fast pulse
    return `${normalizedStatus} pulse-danger order-row-animated`;
  }

  if (timeStatus.attentionLevel === 'medium') {
    // Due soon - slower pulse
    return `${normalizedStatus} pulse-warning order-row-animated`;
  }

  // Low attention level - no animation needed
  return '';
};

/**
 * Determines if an order should have animated due date indicators
 * Used specifically for DueDateIndicator component
 *
 * @param orderStatus - The current status of the order
 * @param timeStatus - The calculated time status information
 * @returns boolean indicating if animation should be applied
 */
export const shouldAnimateDueDate = (
  orderStatus: string,
  timeStatus: TimeStatusInfo | null
): boolean => {
  if (!timeStatus) return false;

  const activeStatuses = ['pending', 'in_progress'];
  const normalizedStatus = orderStatus.toLowerCase().replace(/[^a-z]/g, '_');

  // Only animate active orders with high or medium attention
  return activeStatuses.includes(normalizedStatus) &&
         ['high', 'medium'].includes(timeStatus.attentionLevel);
};

/**
 * Gets the priority level for sorting animated orders
 * Higher numbers indicate higher priority/urgency
 *
 * @param orderStatus - The current status of the order
 * @param dueDate - The due date string or null
 * @returns number representing priority (higher = more urgent)
 */
export const getOrderPriority = (
  orderStatus: string,
  dueDate: string | null
): number => {
  const activeStatuses = ['pending', 'in_progress'];
  const normalizedStatus = orderStatus.toLowerCase().replace(/[^a-z]/g, '_');

  // Non-active orders have lowest priority
  if (!activeStatuses.includes(normalizedStatus) || !dueDate) {
    return 0;
  }

  const timeStatus = calculateTimeStatus(dueDate);
  if (!timeStatus) return 0;

  // Priority scoring based on status and urgency
  const statusMultiplier = normalizedStatus === 'in_progress' ? 10 : 5;
  const attentionScore = {
    'high': 3,
    'medium': 2,
    'low': 1
  }[timeStatus.attentionLevel] || 0;

  return statusMultiplier + attentionScore;
};

/**
 * Type guard to check if a status should be animated
 * @param status - The order status to check
 * @returns boolean indicating if the status is eligible for animation
 */
export const isAnimatedStatus = (status: string): boolean => {
  const activeStatuses = ['pending', 'in_progress'];
  return activeStatuses.includes(status.toLowerCase().replace(/[^a-z]/g, '_'));
};

/**
 * Gets animation delay for staggered animations when multiple orders are animated
 * @param index - The index of the order in the list
 * @param maxDelay - Maximum delay in milliseconds (default: 500ms)
 * @returns CSS animation-delay value
 */
export const getAnimationDelay = (index: number, maxDelay: number = 500): string => {
  const delay = Math.min(index * 100, maxDelay);
  return `${delay}ms`;
};