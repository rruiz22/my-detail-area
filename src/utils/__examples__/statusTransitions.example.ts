/**
 * Status Transition Validation - Usage Examples
 *
 * Demonstrates enterprise usage patterns for the statusTransitions utility.
 * These examples show real-world integration scenarios.
 *
 * @module statusTransitions.example
 */

import {
  isValidStatusTransition,
  getValidNextStatuses,
  isTerminalStatus,
  getTransitionErrorMessage,
  getStatusDistance,
  getWorkflowPath,
  type OrderStatus
} from '../statusTransitions';

// ============================================================================
// EXAMPLE 1: Status Update Handler (React Component)
// ============================================================================

/**
 * Example: Status update handler for order detail modal
 * Used in components like SalesOrderDetail, ServiceOrderDetail, etc.
 */
export function handleStatusUpdate(
  orderId: string,
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  updateCallback: (orderId: string, status: OrderStatus) => Promise<void>
) {
  // Validate transition BEFORE making API call
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    const error = getTransitionErrorMessage(currentStatus, newStatus);

    // Use toast notification (already in project)
    import('@/hooks/use-toast').then(({ toast }) => {
      toast({
        title: error.title,
        description: error.description,
        variant: 'destructive'
      });
    });

    return;
  }

  // Transition is valid - proceed with update
  updateCallback(orderId, newStatus)
    .then(() => {
      import('@/hooks/use-toast').then(({ toast }) => {
        toast({
          title: 'Status Updated',
          description: `Order status changed to ${newStatus}`,
          variant: 'default'
        });
      });
    })
    .catch((error) => {
      console.error('Status update failed:', error);
    });
}

// ============================================================================
// EXAMPLE 2: Status Dropdown Menu Builder (UI Component)
// ============================================================================

/**
 * Example: Building status dropdown options in OrderKanban or StatusBadge
 * Only shows valid next statuses based on current state
 */
export function buildStatusDropdownOptions(currentStatus: OrderStatus) {
  const validNextStatuses = getValidNextStatuses(currentStatus);

  // If terminal status, return empty array (no dropdown needed)
  if (validNextStatuses.length === 0) {
    return [];
  }

  // Map to dropdown items with i18n labels
  return validNextStatuses.map((status) => ({
    value: status,
    label: `orders.status.${status}`, // i18n key
    disabled: false,
    icon: getStatusIcon(status) // Helper function for icons
  }));
}

// Helper: Get icon for each status (shadcn/ui Lucide icons)
function getStatusIcon(status: OrderStatus): string {
  const icons: Record<OrderStatus, string> = {
    draft: 'FileEdit',
    pending: 'Clock',
    confirmed: 'CheckCircle',
    in_progress: 'PlayCircle',
    completed: 'CheckCircle2',
    cancelled: 'XCircle',
    on_hold: 'PauseCircle'
  };

  return icons[status];
}

// ============================================================================
// EXAMPLE 3: Workflow Progress Indicator
// ============================================================================

/**
 * Example: Progress bar calculation for order workflow
 * Shows how far along the order is in the standard workflow
 */
export function calculateWorkflowProgress(currentStatus: OrderStatus): {
  percentage: number;
  step: number;
  totalSteps: number;
  remainingSteps: string[];
} {
  const workflow: OrderStatus[] = ['draft', 'pending', 'confirmed', 'in_progress', 'completed'];
  const currentIndex = workflow.indexOf(currentStatus);

  // Handle non-workflow statuses
  if (currentIndex === -1) {
    if (currentStatus === 'cancelled') {
      return { percentage: 0, step: 0, totalSteps: 5, remainingSteps: [] };
    }
    if (currentStatus === 'on_hold') {
      // Use in_progress position for on_hold
      const inProgressIndex = workflow.indexOf('in_progress');
      return {
        percentage: ((inProgressIndex + 1) / workflow.length) * 100,
        step: inProgressIndex + 1,
        totalSteps: workflow.length,
        remainingSteps: workflow.slice(inProgressIndex + 1)
      };
    }
    return { percentage: 0, step: 0, totalSteps: 5, remainingSteps: workflow };
  }

  const percentage = ((currentIndex + 1) / workflow.length) * 100;
  const remainingSteps = workflow.slice(currentIndex + 1);

  return {
    percentage,
    step: currentIndex + 1,
    totalSteps: workflow.length,
    remainingSteps
  };
}

// ============================================================================
// EXAMPLE 4: Bulk Status Update Validation
// ============================================================================

/**
 * Example: Validating bulk status updates (multi-select in OrderKanban)
 * Ensures all selected orders can transition to the target status
 */
export function validateBulkStatusUpdate(
  orders: Array<{ id: string; status: OrderStatus }>,
  targetStatus: OrderStatus
): {
  valid: Array<{ id: string; status: OrderStatus }>;
  invalid: Array<{ id: string; status: OrderStatus; reason: string }>;
} {
  const valid: Array<{ id: string; status: OrderStatus }> = [];
  const invalid: Array<{ id: string; status: OrderStatus; reason: string }> = [];

  orders.forEach((order) => {
    if (isValidStatusTransition(order.status, targetStatus)) {
      valid.push(order);
    } else {
      const error = getTransitionErrorMessage(order.status, targetStatus);
      invalid.push({
        ...order,
        reason: error.description
      });
    }
  });

  return { valid, invalid };
}

// ============================================================================
// EXAMPLE 5: Automated Workflow Advancement
// ============================================================================

/**
 * Example: Automatic status progression based on business events
 * E.g., auto-confirm orders after manager approval, auto-complete after payment
 */
export async function autoAdvanceWorkflow(
  orderId: string,
  currentStatus: OrderStatus,
  triggerEvent: 'manager_approved' | 'payment_received' | 'work_completed',
  updateCallback: (orderId: string, status: OrderStatus) => Promise<void>
): Promise<void> {
  // Define automation rules
  const automationRules: Record<string, OrderStatus> = {
    manager_approved: 'confirmed',
    payment_received: 'in_progress',
    work_completed: 'completed'
  };

  const targetStatus = automationRules[triggerEvent];

  // Validate transition
  if (!isValidStatusTransition(currentStatus, targetStatus)) {
    console.warn(`Cannot auto-advance from ${currentStatus} to ${targetStatus}`);
    return;
  }

  // Execute transition
  await updateCallback(orderId, targetStatus);
  console.log(`Order ${orderId} auto-advanced to ${targetStatus} (trigger: ${triggerEvent})`);
}

// ============================================================================
// EXAMPLE 6: Status Timeline Visualization
// ============================================================================

/**
 * Example: Generate timeline data for order history visualization
 * Shows the path the order has taken through the workflow
 */
export function generateStatusTimeline(
  statusHistory: Array<{ status: OrderStatus; timestamp: string; userId: string }>
) {
  return statusHistory.map((entry, index) => {
    const isTerminal = isTerminalStatus(entry.status);
    const nextEntry = statusHistory[index + 1];

    let transitionValid = true;
    if (nextEntry) {
      transitionValid = isValidStatusTransition(entry.status, nextEntry.status);
    }

    return {
      ...entry,
      isTerminal,
      transitionValid,
      icon: getStatusIcon(entry.status),
      // Calculate duration if next entry exists
      duration: nextEntry
        ? new Date(nextEntry.timestamp).getTime() - new Date(entry.timestamp).getTime()
        : null
    };
  });
}

// ============================================================================
// EXAMPLE 7: Permission-Based Status Options
// ============================================================================

/**
 * Example: Filter status options based on user permissions
 * Combines status transition rules with role-based access control
 */
export function getPermittedStatusOptions(
  currentStatus: OrderStatus,
  userRole: 'dealer_user' | 'dealer_manager' | 'dealer_admin' | 'system_admin'
): OrderStatus[] {
  const validNextStatuses = getValidNextStatuses(currentStatus);

  // Define role permissions for status changes
  const rolePermissions: Record<string, OrderStatus[]> = {
    dealer_user: ['pending', 'on_hold', 'cancelled'], // Can request approval or cancel
    dealer_manager: ['confirmed', 'in_progress', 'on_hold', 'cancelled'], // Can approve and manage
    dealer_admin: ['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'on_hold', 'cancelled'], // Full control
    system_admin: ['draft', 'pending', 'confirmed', 'in_progress', 'completed', 'on_hold', 'cancelled'] // Full control
  };

  const allowedStatuses = rolePermissions[userRole] || [];

  // Return intersection of valid transitions and permitted statuses
  return validNextStatuses.filter((status) => allowedStatuses.includes(status));
}

// ============================================================================
// EXAMPLE 8: Workflow Path Visualization
// ============================================================================

/**
 * Example: Generate workflow path for UI breadcrumb or stepper component
 * Shows user where they are in the process
 */
export function generateWorkflowBreadcrumb(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus = 'completed'
) {
  const path = getWorkflowPath(currentStatus, targetStatus);

  if (!path) {
    return null;
  }

  return path.map((status, index) => ({
    status,
    label: `orders.status.${status}`,
    isActive: status === currentStatus,
    isCompleted: index < path.indexOf(currentStatus),
    isFuture: index > path.indexOf(currentStatus),
    step: index + 1,
    totalSteps: path.length
  }));
}

// ============================================================================
// EXAMPLE 9: Status Change Confirmation Dialog
// ============================================================================

/**
 * Example: Generate confirmation dialog data for critical status changes
 * Warns users about terminal statuses or significant workflow steps
 */
export function getStatusChangeConfirmation(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): {
  needsConfirmation: boolean;
  title: string;
  message: string;
  confirmButtonText: string;
  variant: 'default' | 'destructive';
} | null {
  // No confirmation needed if invalid transition
  if (!isValidStatusTransition(fromStatus, toStatus)) {
    return null;
  }

  // Terminal status changes need confirmation
  if (isTerminalStatus(toStatus)) {
    return {
      needsConfirmation: true,
      title: 'Confirm Status Change',
      message: `This will change the order to ${toStatus}. This action cannot be undone.`,
      confirmButtonText: `Mark as ${toStatus}`,
      variant: toStatus === 'cancelled' ? 'destructive' : 'default'
    };
  }

  // Large workflow jumps might need confirmation
  const distance = getStatusDistance(fromStatus, toStatus);
  if (distance > 1) {
    return {
      needsConfirmation: true,
      title: 'Skip Workflow Steps?',
      message: `You are skipping ${distance - 1} step(s). Are you sure?`,
      confirmButtonText: 'Confirm',
      variant: 'default'
    };
  }

  // No confirmation needed for normal progression
  return null;
}

// ============================================================================
// EXAMPLE 10: Integration with Supabase Edge Function
// ============================================================================

/**
 * Example: Server-side status validation in Supabase Edge Function
 * Demonstrates how to use the same validation logic on the backend
 */
export async function supabaseStatusUpdateHandler(
  orderId: string,
  newStatus: OrderStatus,
  userId: string
) {
  // This would be in a Supabase Edge Function
  // Import the same statusTransitions utility for consistent validation

  /*
  import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  import { isValidStatusTransition } from './statusTransitions.ts';

  serve(async (req) => {
    const { orderId, newStatus, userId } = await req.json();

    // Get current order
    const { data: order, error } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
    }

    // Validate transition server-side
    if (!isValidStatusTransition(order.status, newStatus)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status transition' }),
        { status: 400 }
      );
    }

    // Update order
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_by: userId })
      .eq('id', orderId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  });
  */

  console.log('This would be implemented in a Supabase Edge Function');
}
