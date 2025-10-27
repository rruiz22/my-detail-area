/**
 * Order Status Transition Validation Utility
 *
 * Enterprise-grade business logic validation for sales order status transitions.
 * Ensures state machine integrity and prevents invalid status changes.
 *
 * @module statusTransitions
 * @author My Detail Area - Enterprise Development Team
 * @since 2025-10-26
 */

import { logger } from './logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Complete order status lifecycle for sales orders.
 * Extends the base OrderStatus type with additional workflow states.
 *
 * Status Flow:
 * - draft → pending → confirmed → in_progress → completed
 * - Any non-terminal status → cancelled
 * - completed/cancelled are terminal states (no further transitions)
 */
export type OrderStatus =
  | 'draft'        // Initial state - order being created/edited
  | 'pending'      // Awaiting approval from manager
  | 'confirmed'    // Approved by manager, ready to process
  | 'in_progress'  // Currently being processed
  | 'completed'    // Successfully finished (terminal)
  | 'cancelled'    // Cancelled by user/system (terminal)
  | 'on_hold';     // Temporarily paused (legacy support)

/**
 * Type guard to validate if a string is a valid OrderStatus
 *
 * @param status - Unknown value to validate
 * @returns True if status is a valid OrderStatus enum value
 *
 * @example
 * ```typescript
 * if (isValidOrderStatus('draft')) {
 *   // TypeScript knows this is OrderStatus
 * }
 * ```
 */
export function isValidOrderStatus(status: unknown): status is OrderStatus {
  const validStatuses: OrderStatus[] = [
    'draft',
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'on_hold'
  ];

  return typeof status === 'string' && validStatuses.includes(status as OrderStatus);
}

// ============================================================================
// BUSINESS RULES - STATUS TRANSITION MAP
// ============================================================================

/**
 * Status Transition Rules Map
 *
 * Defines the finite state machine for order status transitions.
 * Each status maps to an array of valid next statuses.
 *
 * Business Rules:
 * 1. draft → pending, cancelled
 * 2. pending → confirmed, cancelled
 * 3. confirmed → in_progress, cancelled
 * 4. in_progress → completed, on_hold, cancelled
 * 5. on_hold → in_progress, cancelled (resume or cancel)
 * 6. completed → TERMINAL (no transitions)
 * 7. cancelled → TERMINAL (no transitions)
 *
 * Security Note: This map is the single source of truth for valid transitions.
 * Any status change in the UI or API MUST validate against this map.
 */
const STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  // Initial draft state - can move to approval or be cancelled
  draft: ['pending', 'cancelled'],

  // Awaiting approval - can be approved or cancelled
  pending: ['confirmed', 'cancelled'],

  // Confirmed by manager - can start processing or be cancelled
  confirmed: ['in_progress', 'cancelled'],

  // Active processing - can complete, pause, or cancel
  in_progress: ['completed', 'on_hold', 'cancelled'],

  // Temporarily paused - can resume or cancel
  on_hold: ['in_progress', 'cancelled'],

  // Terminal states - no further transitions allowed
  completed: [],
  cancelled: []
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates if a status transition is allowed according to business rules.
 *
 * This function enforces the order status state machine and prevents:
 * - Skipping required approval steps (e.g., draft → completed)
 * - Backward transitions (e.g., completed → pending)
 * - Transitions from terminal states
 *
 * @param fromStatus - Current order status
 * @param toStatus - Desired target status
 * @returns True if transition is valid, false otherwise
 *
 * @throws Never throws - returns false for invalid inputs
 *
 * @example
 * ```typescript
 * // Valid transition
 * isValidStatusTransition('draft', 'pending'); // true
 *
 * // Invalid transition - skipping steps
 * isValidStatusTransition('draft', 'completed'); // false
 *
 * // Invalid transition - from terminal state
 * isValidStatusTransition('completed', 'pending'); // false
 * ```
 */
export function isValidStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean {
  // Validate input types
  if (!isValidOrderStatus(fromStatus) || !isValidOrderStatus(toStatus)) {
    logger.warn('[Status Validation] Invalid status values:', { fromStatus, toStatus });
    return false;
  }

  // Check if transition exists in the map
  const allowedTransitions = STATUS_TRANSITIONS[fromStatus];
  const isValid = allowedTransitions.includes(toStatus);

  // Log invalid transition attempts for debugging
  if (!isValid) {
    logger.warn('[Status Validation] Invalid transition attempt:', {
      from: fromStatus,
      to: toStatus,
      allowed: allowedTransitions
    });
  }

  return isValid;
}

/**
 * Gets all valid next statuses for the current order status.
 *
 * Useful for:
 * - Building status dropdown menus in the UI
 * - Displaying available actions to users
 * - Programmatic workflow automation
 *
 * @param currentStatus - Current order status
 * @returns Array of valid next statuses (empty array for terminal states)
 *
 * @example
 * ```typescript
 * const nextStatuses = getValidNextStatuses('draft');
 * // Returns: ['pending', 'cancelled']
 *
 * // Terminal state example
 * const completedNext = getValidNextStatuses('completed');
 * // Returns: []
 * ```
 */
export function getValidNextStatuses(currentStatus: OrderStatus): readonly OrderStatus[] {
  if (!isValidOrderStatus(currentStatus)) {
    logger.warn('[Status Validation] Invalid current status:', currentStatus);
    return [];
  }

  return STATUS_TRANSITIONS[currentStatus];
}

/**
 * Checks if a status is a terminal state (no further transitions possible).
 *
 * Terminal states:
 * - completed: Order successfully finished
 * - cancelled: Order was cancelled
 *
 * @param status - Status to check
 * @returns True if status is terminal (no valid transitions)
 *
 * @example
 * ```typescript
 * isTerminalStatus('completed'); // true
 * isTerminalStatus('cancelled'); // true
 * isTerminalStatus('in_progress'); // false
 * ```
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  if (!isValidOrderStatus(status)) {
    return false;
  }

  return STATUS_TRANSITIONS[status].length === 0;
}

/**
 * Gets a human-readable validation error message for an invalid transition.
 *
 * Returns localized error messages suitable for displaying to users.
 * Includes suggestions for valid next steps.
 *
 * @param fromStatus - Current order status
 * @param toStatus - Attempted target status
 * @returns Error message object with title and description
 *
 * @example
 * ```typescript
 * const error = getTransitionErrorMessage('draft', 'completed');
 * // Returns: {
 * //   title: 'Invalid status transition',
 * //   description: 'Cannot change from draft to completed. Valid next steps: pending, cancelled'
 * // }
 * ```
 */
export function getTransitionErrorMessage(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): { title: string; description: string } {
  // Handle invalid status values
  if (!isValidOrderStatus(fromStatus) || !isValidOrderStatus(toStatus)) {
    return {
      title: 'validation.invalid_status',
      description: 'validation.status_not_recognized'
    };
  }

  // Handle terminal state attempts
  if (isTerminalStatus(fromStatus)) {
    return {
      title: 'validation.terminal_status',
      description: `validation.cannot_change_from_${fromStatus}`
    };
  }

  // Get valid transitions for context
  const validNextStatuses = getValidNextStatuses(fromStatus);
  const validStatusList = validNextStatuses.join(', ');

  return {
    title: 'validation.invalid_transition',
    description: `validation.cannot_transition_from_${fromStatus}_to_${toStatus}. Valid: ${validStatusList}`
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates the number of steps between two statuses in the workflow.
 *
 * Useful for:
 * - Progress indicators
 * - Workflow visualization
 * - Business analytics
 *
 * @param fromStatus - Starting status
 * @param toStatus - Target status
 * @returns Number of steps, or -1 if transition is invalid
 *
 * @example
 * ```typescript
 * getStatusDistance('draft', 'completed'); // 4 (draft→pending→confirmed→in_progress→completed)
 * getStatusDistance('pending', 'confirmed'); // 1
 * getStatusDistance('completed', 'draft'); // -1 (invalid)
 * ```
 */
export function getStatusDistance(fromStatus: OrderStatus, toStatus: OrderStatus): number {
  if (!isValidOrderStatus(fromStatus) || !isValidOrderStatus(toStatus)) {
    return -1;
  }

  // Same status = 0 distance
  if (fromStatus === toStatus) {
    return 0;
  }

  // Standard workflow progression
  const workflow: OrderStatus[] = ['draft', 'pending', 'confirmed', 'in_progress', 'completed'];
  const fromIndex = workflow.indexOf(fromStatus);
  const toIndex = workflow.indexOf(toStatus);

  // Both statuses in workflow and moving forward
  if (fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex) {
    return toIndex - fromIndex;
  }

  // Cancellation is always 1 step from any non-terminal status
  if (toStatus === 'cancelled' && !isTerminalStatus(fromStatus)) {
    return 1;
  }

  // Invalid or backward transition
  return -1;
}

/**
 * Gets the standard workflow progression path from current status to target.
 *
 * Returns the full path of statuses needed to reach the target status,
 * or null if no valid path exists.
 *
 * @param fromStatus - Starting status
 * @param toStatus - Target status
 * @returns Array of statuses in order, or null if no path exists
 *
 * @example
 * ```typescript
 * getWorkflowPath('draft', 'completed');
 * // Returns: ['draft', 'pending', 'confirmed', 'in_progress', 'completed']
 *
 * getWorkflowPath('pending', 'in_progress');
 * // Returns: ['pending', 'confirmed', 'in_progress']
 *
 * getWorkflowPath('completed', 'draft');
 * // Returns: null (invalid path)
 * ```
 */
export function getWorkflowPath(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): OrderStatus[] | null {
  if (!isValidOrderStatus(fromStatus) || !isValidOrderStatus(toStatus)) {
    return null;
  }

  // Same status
  if (fromStatus === toStatus) {
    return [fromStatus];
  }

  // Standard forward progression
  const workflow: OrderStatus[] = ['draft', 'pending', 'confirmed', 'in_progress', 'completed'];
  const fromIndex = workflow.indexOf(fromStatus);
  const toIndex = workflow.indexOf(toStatus);

  if (fromIndex !== -1 && toIndex !== -1 && toIndex > fromIndex) {
    return workflow.slice(fromIndex, toIndex + 1);
  }

  // Direct cancellation
  if (toStatus === 'cancelled' && !isTerminalStatus(fromStatus)) {
    return [fromStatus, 'cancelled'];
  }

  // on_hold workflow handling
  if (fromStatus === 'on_hold' && toStatus === 'in_progress') {
    return ['on_hold', 'in_progress'];
  }

  if (fromStatus === 'in_progress' && toStatus === 'on_hold') {
    return ['in_progress', 'on_hold'];
  }

  // No valid path
  return null;
}

// ============================================================================
// CONSTANTS EXPORT
// ============================================================================

/**
 * Ordered list of statuses in the standard workflow progression.
 * Excludes cancelled and on_hold (which are off the main path).
 */
export const WORKFLOW_STATUSES: readonly OrderStatus[] = [
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed'
] as const;

/**
 * List of terminal statuses that cannot transition to any other status.
 */
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  'completed',
  'cancelled'
] as const;

// ============================================================================
// UNIT TEST EXAMPLES (for reference)
// ============================================================================

/*
import { describe, it, expect } from 'vitest';
import {
  isValidStatusTransition,
  getValidNextStatuses,
  isTerminalStatus,
  getStatusDistance,
  getWorkflowPath
} from './statusTransitions';

describe('Status Transition Validation', () => {
  describe('isValidStatusTransition', () => {
    it('allows draft → pending transition', () => {
      expect(isValidStatusTransition('draft', 'pending')).toBe(true);
    });

    it('allows pending → confirmed transition', () => {
      expect(isValidStatusTransition('pending', 'confirmed')).toBe(true);
    });

    it('allows confirmed → in_progress transition', () => {
      expect(isValidStatusTransition('confirmed', 'in_progress')).toBe(true);
    });

    it('allows in_progress → completed transition', () => {
      expect(isValidStatusTransition('in_progress', 'completed')).toBe(true);
    });

    it('allows cancellation from any non-terminal status', () => {
      expect(isValidStatusTransition('draft', 'cancelled')).toBe(true);
      expect(isValidStatusTransition('pending', 'cancelled')).toBe(true);
      expect(isValidStatusTransition('confirmed', 'cancelled')).toBe(true);
      expect(isValidStatusTransition('in_progress', 'cancelled')).toBe(true);
    });

    it('prevents skipping statuses', () => {
      expect(isValidStatusTransition('draft', 'completed')).toBe(false);
      expect(isValidStatusTransition('draft', 'in_progress')).toBe(false);
      expect(isValidStatusTransition('pending', 'in_progress')).toBe(false);
    });

    it('prevents backward transitions', () => {
      expect(isValidStatusTransition('completed', 'pending')).toBe(false);
      expect(isValidStatusTransition('in_progress', 'pending')).toBe(false);
      expect(isValidStatusTransition('confirmed', 'draft')).toBe(false);
    });

    it('prevents transitions from terminal states', () => {
      expect(isValidStatusTransition('completed', 'in_progress')).toBe(false);
      expect(isValidStatusTransition('cancelled', 'pending')).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('returns correct next statuses for draft', () => {
      const next = getValidNextStatuses('draft');
      expect(next).toEqual(['pending', 'cancelled']);
    });

    it('returns correct next statuses for pending', () => {
      const next = getValidNextStatuses('pending');
      expect(next).toEqual(['confirmed', 'cancelled']);
    });

    it('returns empty array for terminal statuses', () => {
      expect(getValidNextStatuses('completed')).toEqual([]);
      expect(getValidNextStatuses('cancelled')).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('identifies completed as terminal', () => {
      expect(isTerminalStatus('completed')).toBe(true);
    });

    it('identifies cancelled as terminal', () => {
      expect(isTerminalStatus('cancelled')).toBe(true);
    });

    it('identifies non-terminal statuses correctly', () => {
      expect(isTerminalStatus('draft')).toBe(false);
      expect(isTerminalStatus('pending')).toBe(false);
      expect(isTerminalStatus('in_progress')).toBe(false);
    });
  });

  describe('getStatusDistance', () => {
    it('calculates distance for forward progression', () => {
      expect(getStatusDistance('draft', 'completed')).toBe(4);
      expect(getStatusDistance('pending', 'confirmed')).toBe(1);
      expect(getStatusDistance('draft', 'in_progress')).toBe(3);
    });

    it('returns 0 for same status', () => {
      expect(getStatusDistance('pending', 'pending')).toBe(0);
    });

    it('returns -1 for invalid transitions', () => {
      expect(getStatusDistance('completed', 'draft')).toBe(-1);
      expect(getStatusDistance('in_progress', 'pending')).toBe(-1);
    });
  });

  describe('getWorkflowPath', () => {
    it('returns full path for valid progression', () => {
      const path = getWorkflowPath('draft', 'completed');
      expect(path).toEqual(['draft', 'pending', 'confirmed', 'in_progress', 'completed']);
    });

    it('returns partial path for intermediate steps', () => {
      const path = getWorkflowPath('pending', 'in_progress');
      expect(path).toEqual(['pending', 'confirmed', 'in_progress']);
    });

    it('returns null for invalid paths', () => {
      expect(getWorkflowPath('completed', 'draft')).toBeNull();
      expect(getWorkflowPath('in_progress', 'pending')).toBeNull();
    });
  });
});
*/
