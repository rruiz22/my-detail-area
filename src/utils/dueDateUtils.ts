/**
 * Due Date Utilities for Time-Based Order Management
 * Handles time calculations for Sales and Service orders
 */

export type TimeStatus = 'on-time' | 'need-attention' | 'delayed' | 'no-due-date';
export type AttentionLevel = 'none' | 'attention' | 'delayed';

export interface TimeStatusInfo {
  status: TimeStatus;
  timeRemaining: number; // milliseconds
  formattedTime: string;
  attentionLevel: AttentionLevel;
  badge: string;
  color: string;
  bgColor: string;
}

/**
 * Calculate the time status for an order based on its due date
 */
export function calculateTimeStatus(dueDate: string | null): TimeStatusInfo {
  if (!dueDate) {
    return {
      status: 'no-due-date',
      timeRemaining: 0,
      formattedTime: '',
      attentionLevel: 'none',
      badge: '',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50'
    };
  }

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  // Format time remaining or overdue
  const formatTime = (ms: number, isOverdue: boolean = false): string => {
    const totalMinutes = Math.abs(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    
    if (isOverdue) {
      return hours > 0 ? `${hours}h ${minutes}m overdue` : `${minutes}m overdue`;
    }
    return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
  };

  if (diffHours > 4) {
    // More than 4 hours remaining - On Time
    return {
      status: 'on-time',
      timeRemaining: diffMs,
      formattedTime: formatTime(diffMs),
      attentionLevel: 'none',
      badge: 'On-Time',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    };
  } else if (diffHours > 0) {
    // Less than 4 hours but still time remaining - Need Attention
    return {
      status: 'need-attention',
      timeRemaining: diffMs,
      formattedTime: formatTime(diffMs),
      attentionLevel: 'attention',
      badge: 'Need Attention',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    };
  } else {
    // Past due date - Delayed
    return {
      status: 'delayed',
      timeRemaining: diffMs,
      formattedTime: formatTime(diffMs, true),
      attentionLevel: 'delayed',
      badge: 'Delayed',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    };
  }
}

/**
 * Check if an order is from the same day (today)
 */
export function isSameDayOrder(orderDate: string | null, dueDate: string | null): boolean {
  if (!orderDate && !dueDate) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Check if created today or due today
  if (orderDate) {
    const created = new Date(orderDate);
    created.setHours(0, 0, 0, 0);
    if (created.getTime() === today.getTime()) return true;
  }
  
  if (dueDate) {
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due.getTime() === today.getTime()) return true;
  }
  
  return false;
}

/**
 * Check if an order should show time indicators (Sales or Service only)
 */
export function isTimeBasedOrder(orderType: string): boolean {
  const timeBasedTypes = ['sales', 'service'];
  return timeBasedTypes.includes(orderType.toLowerCase());
}

/**
 * Get CSS classes for row attention effects based on attention level
 */
export function getAttentionRowClasses(attentionLevel: AttentionLevel): string {
  switch (attentionLevel) {
    case 'attention':
      return 'border-l-4 border-amber-400 bg-amber-50/30 animate-pulse-slow';
    case 'delayed':
      return 'border-l-4 border-red-500 bg-red-50/50 animate-flash-red';
    default:
      return '';
  }
}

/**
 * Format countdown time for display
 */
export function formatCountdown(milliseconds: number): string {
  const totalMinutes = Math.abs(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  return `${minutes}m`;
}