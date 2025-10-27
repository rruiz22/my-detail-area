# Order Status Transition Validation System

## Overview

Enterprise-grade business logic validation for sales order status transitions in the My Detail Area dealership management system. This utility enforces a finite state machine to ensure order status changes follow proper workflow rules and prevent invalid state transitions.

## File Location

```
C:\Users\rudyr\apps\mydetailarea\src\utils\statusTransitions.ts
```

## Business Context

Sales orders in the dealership system follow a structured workflow with defined states and transition rules. This prevents:

- **Skipping approval steps** (e.g., draft → completed)
- **Backward transitions** (e.g., completed → pending)
- **Modifying terminal states** (completed/cancelled orders)
- **Unauthorized status changes** based on user roles

## Status Flow Diagram

```
┌─────────┐
│  DRAFT  │ Initial state - order being created
└────┬────┘
     │
     ▼
┌─────────┐
│ PENDING │ Awaiting manager approval
└────┬────┘
     │
     ▼
┌──────────┐
│CONFIRMED │ Approved by manager
└────┬─────┘
     │
     ▼
┌────────────┐     ┌─────────┐
│IN_PROGRESS │────▶│ ON_HOLD │ (can resume)
└─────┬──────┘     └────┬────┘
      │                 │
      │◀────────────────┘
      │
      ▼
┌───────────┐
│ COMPLETED │ Terminal state - no further transitions
└───────────┘

┌───────────┐
│ CANCELLED │ Terminal state - can be set from any non-terminal status
└───────────┘
```

## Type Definitions

### OrderStatus

```typescript
export type OrderStatus =
  | 'draft'        // Initial state
  | 'pending'      // Awaiting approval
  | 'confirmed'    // Approved by manager
  | 'in_progress'  // Currently being processed
  | 'completed'    // Successfully finished (terminal)
  | 'cancelled'    // Cancelled by user/system (terminal)
  | 'on_hold';     // Temporarily paused (legacy support)
```

## Core Functions

### 1. isValidStatusTransition()

Validates if a status transition is allowed according to business rules.

```typescript
function isValidStatusTransition(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): boolean
```

**Examples:**

```typescript
// Valid transitions
isValidStatusTransition('draft', 'pending'); // ✅ true
isValidStatusTransition('pending', 'confirmed'); // ✅ true
isValidStatusTransition('confirmed', 'in_progress'); // ✅ true
isValidStatusTransition('in_progress', 'completed'); // ✅ true

// Cancellation allowed from any non-terminal status
isValidStatusTransition('draft', 'cancelled'); // ✅ true
isValidStatusTransition('pending', 'cancelled'); // ✅ true

// Invalid transitions - skipping steps
isValidStatusTransition('draft', 'completed'); // ❌ false
isValidStatusTransition('pending', 'in_progress'); // ❌ false

// Invalid transitions - backward movement
isValidStatusTransition('completed', 'pending'); // ❌ false
isValidStatusTransition('in_progress', 'draft'); // ❌ false

// Invalid transitions - from terminal states
isValidStatusTransition('completed', 'in_progress'); // ❌ false
isValidStatusTransition('cancelled', 'pending'); // ❌ false
```

### 2. getValidNextStatuses()

Gets all valid next statuses for the current order status.

```typescript
function getValidNextStatuses(currentStatus: OrderStatus): readonly OrderStatus[]
```

**Examples:**

```typescript
getValidNextStatuses('draft');
// Returns: ['pending', 'cancelled']

getValidNextStatuses('pending');
// Returns: ['confirmed', 'cancelled']

getValidNextStatuses('in_progress');
// Returns: ['completed', 'on_hold', 'cancelled']

getValidNextStatuses('completed');
// Returns: [] (terminal state)
```

**Use Cases:**
- Building status dropdown menus in UI
- Displaying available actions to users
- Programmatic workflow automation

### 3. isTerminalStatus()

Checks if a status is terminal (no further transitions possible).

```typescript
function isTerminalStatus(status: OrderStatus): boolean
```

**Examples:**

```typescript
isTerminalStatus('completed'); // ✅ true
isTerminalStatus('cancelled'); // ✅ true
isTerminalStatus('in_progress'); // ❌ false
isTerminalStatus('draft'); // ❌ false
```

### 4. getTransitionErrorMessage()

Gets human-readable error messages for invalid transitions.

```typescript
function getTransitionErrorMessage(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): { title: string; description: string }
```

**Examples:**

```typescript
getTransitionErrorMessage('draft', 'completed');
// Returns: {
//   title: 'validation.invalid_transition',
//   description: 'Cannot change from draft to completed. Valid next steps: pending, cancelled'
// }

getTransitionErrorMessage('completed', 'pending');
// Returns: {
//   title: 'validation.terminal_status',
//   description: 'validation.cannot_change_from_completed'
// }
```

**Integration:**
- Works with react-i18next for multilingual support
- Translation keys ready in: `en.json`, `es.json`, `pt-BR.json`

### 5. getStatusDistance()

Calculates the number of workflow steps between two statuses.

```typescript
function getStatusDistance(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): number
```

**Examples:**

```typescript
getStatusDistance('draft', 'completed'); // 4 steps
getStatusDistance('pending', 'confirmed'); // 1 step
getStatusDistance('draft', 'in_progress'); // 3 steps
getStatusDistance('pending', 'pending'); // 0 (same status)
getStatusDistance('completed', 'draft'); // -1 (invalid)
```

**Use Cases:**
- Progress indicators
- Workflow visualization
- Business analytics

### 6. getWorkflowPath()

Gets the full workflow path from current status to target status.

```typescript
function getWorkflowPath(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
): OrderStatus[] | null
```

**Examples:**

```typescript
getWorkflowPath('draft', 'completed');
// Returns: ['draft', 'pending', 'confirmed', 'in_progress', 'completed']

getWorkflowPath('pending', 'in_progress');
// Returns: ['pending', 'confirmed', 'in_progress']

getWorkflowPath('completed', 'draft');
// Returns: null (invalid path)
```

**Use Cases:**
- Breadcrumb navigation
- Stepper components
- Progress visualization

## Business Rules Summary

### Valid Transitions

| From Status   | To Status(es)                          |
|---------------|----------------------------------------|
| draft         | pending, cancelled                     |
| pending       | confirmed, cancelled                   |
| confirmed     | in_progress, cancelled                 |
| in_progress   | completed, on_hold, cancelled          |
| on_hold       | in_progress, cancelled                 |
| completed     | (none - terminal)                      |
| cancelled     | (none - terminal)                      |

### Key Rules

1. **No Skipping Steps**: Orders must progress through each approval stage
2. **No Backward Movement**: Cannot revert to previous statuses
3. **Terminal States**: Completed and cancelled orders cannot be modified
4. **Emergency Cancel**: Any non-terminal status can transition to cancelled
5. **Pause/Resume**: In-progress orders can be put on hold and resumed

## Integration Examples

### React Component - Status Dropdown

```typescript
import { getValidNextStatuses } from '@/utils/statusTransitions';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

function OrderStatusDropdown({ currentStatus, onStatusChange }) {
  const { t } = useTranslation();
  const validStatuses = getValidNextStatuses(currentStatus);

  if (validStatuses.length === 0) {
    return <Badge>{ t(`common.status.${currentStatus}`)}</Badge>;
  }

  return (
    <Select value={currentStatus} onValueChange={onStatusChange}>
      <SelectContent>
        {validStatuses.map((status) => (
          <SelectItem key={status} value={status}>
            {t(`common.status.${status}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### React Hook - Status Update Handler

```typescript
import { isValidStatusTransition, getTransitionErrorMessage } from '@/utils/statusTransitions';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

function useOrderStatusUpdate(orderId: string, currentStatus: OrderStatus) {
  const { toast } = useToast();
  const { t } = useTranslation();

  const updateStatus = async (newStatus: OrderStatus) => {
    // Validate transition BEFORE API call
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      const error = getTransitionErrorMessage(currentStatus, newStatus);
      toast({
        title: t(error.title),
        description: t(error.description),
        variant: 'destructive'
      });
      return false;
    }

    // Transition is valid - proceed with update
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      toast({
        title: t('common.success'),
        description: t('orders.status_updated')
      });
      return true;
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('messages.error')
      });
      return false;
    }
  };

  return { updateStatus };
}
```

### Supabase Edge Function - Server-Side Validation

```typescript
// supabase/functions/update-order-status/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isValidStatusTransition } from './statusTransitions.ts';

serve(async (req) => {
  const { orderId, newStatus } = await req.json();

  // Get current order
  const { data: order, error } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
  }

  // Validate transition server-side (critical security layer)
  if (!isValidStatusTransition(order.status, newStatus)) {
    return new Response(
      JSON.stringify({ error: 'Invalid status transition' }),
      { status: 400 }
    );
  }

  // Update order
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

## Translation Keys

All error messages support internationalization (EN, ES, PT-BR):

```json
{
  "validation": {
    "invalid_status": "Invalid status value",
    "status_not_recognized": "The provided status is not recognized",
    "terminal_status": "Cannot change status",
    "cannot_change_from_completed": "Completed orders cannot be modified",
    "cannot_change_from_cancelled": "Cancelled orders cannot be modified",
    "invalid_transition": "Invalid status transition",
    "cannot_transition_from_draft_to_completed": "Cannot skip approval steps. Please follow the workflow",
    "cannot_transition_from_draft_to_confirmed": "Orders must be approved before confirmation",
    "cannot_transition_from_draft_to_in_progress": "Orders must be approved and confirmed first",
    "cannot_transition_from_pending_to_in_progress": "Orders must be confirmed by a manager first",
    "cannot_transition_from_pending_to_completed": "Orders must be processed before completion",
    "cannot_transition_from_confirmed_to_completed": "Orders must be processed before completion",
    "status_transition_error": "This status change is not allowed. Please check the workflow"
  },
  "common": {
    "status": {
      "draft": "Draft",
      "pending": "Pending",
      "confirmed": "Confirmed",
      "in_progress": "In Progress",
      "on_hold": "On Hold",
      "completed": "Completed",
      "cancelled": "Cancelled"
    }
  }
}
```

## Constants

```typescript
// Standard workflow progression (excludes cancelled and on_hold)
export const WORKFLOW_STATUSES: readonly OrderStatus[] = [
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed'
];

// Terminal statuses that cannot transition to any other status
export const TERMINAL_STATUSES: readonly OrderStatus[] = [
  'completed',
  'cancelled'
];
```

## Testing

See `src/utils/__examples__/statusTransitions.example.ts` for comprehensive usage examples including:

- Status update handlers
- Dropdown menu builders
- Workflow progress indicators
- Bulk status updates
- Automated workflow advancement
- Timeline visualization
- Permission-based filtering
- Breadcrumb generation
- Confirmation dialogs
- Server-side integration

## Security Considerations

1. **Client-Side Validation**: Use for immediate user feedback in UI
2. **Server-Side Validation**: **MUST** also validate in Supabase Edge Functions/RLS policies
3. **Audit Trail**: Log all status transitions with user ID and timestamp
4. **Permission Layer**: Combine with role-based access control for additional security

## Migration Notes

**Important**: This utility introduces two new statuses to the existing system:

- `draft` - New initial state for orders
- `confirmed` - New approval state between pending and in_progress

**Backward Compatibility**: The utility maintains support for the existing `on_hold` status for legacy orders.

**Database Migration Required**:
```sql
-- Add new enum values to order status
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed';

-- Update existing orders if needed
UPDATE orders SET status = 'draft' WHERE status IS NULL;
```

## Performance

- ✅ **Zero runtime overhead**: All validations use constant-time lookups (O(1))
- ✅ **Type-safe**: Full TypeScript support with strict mode
- ✅ **Immutable**: All data structures use `readonly` for safety
- ✅ **Tree-shakeable**: Only imported functions are included in bundle

## Maintainability

- 📝 **Comprehensive JSDoc**: Every function documented
- 🎯 **Single Source of Truth**: All transition rules in one map
- 🧪 **Unit Testable**: Pure functions with no side effects
- 🌍 **Internationalized**: All messages support i18n

## Related Files

- `src/utils/statusTransitions.ts` - Core utility (this file)
- `src/utils/__examples__/statusTransitions.example.ts` - Usage examples
- `src/utils/__docs__/statusTransitions.md` - Documentation (this file)
- `public/translations/en.json` - English translations
- `public/translations/es.json` - Spanish translations
- `public/translations/pt-BR.json` - Portuguese (Brazil) translations

## Support

For questions or issues, contact the My Detail Area development team or refer to the enterprise documentation.

---

**Version**: 1.0.0
**Last Updated**: 2025-10-26
**Author**: My Detail Area - Enterprise Development Team
