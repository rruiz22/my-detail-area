/**
 * Order Status Constants and Types
 *
 * Enterprise-grade type-safe constants for order status management
 * Prevents typos and ensures consistency across the application
 */

// ============================================================================
// ORDER STATUS CONSTANTS
// ============================================================================

/**
 * Order Status Constants
 * Use these constants instead of magic strings throughout the application
 */
export const ORDER_STATUS = {
  /** Order is in draft state, not yet submitted */
  DRAFT: 'draft',

  /** Order is pending approval or assignment */
  PENDING: 'pending',

  /** Order has been confirmed and approved */
  CONFIRMED: 'confirmed',

  /** Order is currently being processed */
  IN_PROGRESS: 'in_progress',

  /** Order is temporarily on hold */
  ON_HOLD: 'on_hold',

  /** Order has been completed successfully */
  COMPLETED: 'completed',

  /** Order has been cancelled */
  CANCELLED: 'cancelled',
} as const;

/**
 * Order Status Type
 * Derived from ORDER_STATUS constants for type safety
 */
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// ============================================================================
// STATUS VALIDATION
// ============================================================================

/**
 * All valid order status values
 * Useful for validation and dropdown options
 */
export const VALID_ORDER_STATUSES: OrderStatus[] = Object.values(ORDER_STATUS);

/**
 * Check if a string is a valid order status
 */
export function isValidOrderStatus(status: string): status is OrderStatus {
  return VALID_ORDER_STATUSES.includes(status as OrderStatus);
}

// ============================================================================
// STATUS CATEGORIES
// ============================================================================

/**
 * Active statuses - orders currently in progress
 */
export const ACTIVE_STATUSES: OrderStatus[] = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.ON_HOLD,
];

/**
 * Terminal statuses - orders that are finalized
 */
export const TERMINAL_STATUSES: OrderStatus[] = [
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CANCELLED,
];

/**
 * Check if status is active (not terminal)
 */
export function isActiveStatus(status: OrderStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * Check if status is terminal (completed or cancelled)
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

// ============================================================================
// STATUS DISPLAY
// ============================================================================

/**
 * Human-readable labels for order statuses
 * Use for UI display
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [ORDER_STATUS.DRAFT]: 'Draft',
  [ORDER_STATUS.PENDING]: 'Pending',
  [ORDER_STATUS.CONFIRMED]: 'Confirmed',
  [ORDER_STATUS.IN_PROGRESS]: 'In Progress',
  [ORDER_STATUS.ON_HOLD]: 'On Hold',
  [ORDER_STATUS.COMPLETED]: 'Completed',
  [ORDER_STATUS.CANCELLED]: 'Cancelled',
};

/**
 * Get human-readable label for a status
 */
export function getStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status] || status;
}

// ============================================================================
// STATUS COLORS (Tailwind CSS)
// ============================================================================

/**
 * Tailwind color classes for each status
 * Use for badges and status indicators
 */
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  [ORDER_STATUS.DRAFT]: 'bg-gray-100 text-gray-800 border-gray-200',
  [ORDER_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [ORDER_STATUS.CONFIRMED]: 'bg-blue-100 text-blue-800 border-blue-200',
  [ORDER_STATUS.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  [ORDER_STATUS.ON_HOLD]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ORDER_STATUS.COMPLETED]: 'bg-green-100 text-green-800 border-green-200',
  [ORDER_STATUS.CANCELLED]: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * Get Tailwind color classes for a status
 */
export function getStatusColor(status: OrderStatus): string {
  return ORDER_STATUS_COLORS[status] || ORDER_STATUS_COLORS[ORDER_STATUS.PENDING];
}

// ============================================================================
// EXPORTS
// ============================================================================

// Re-export for convenience
export { ORDER_STATUS as default };
