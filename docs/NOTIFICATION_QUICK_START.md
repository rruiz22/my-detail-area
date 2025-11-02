# Notification Helper - Quick Start Cheat Sheet

**TL;DR: Copy-paste examples to get started in 60 seconds**

---

## Installation

Already installed! Just import and use.

```typescript
import { createOrderNotification } from '@/utils/notificationHelper';
```

---

## Common Patterns (Copy-Paste Ready)

### 1. Order Created

```typescript
import { createOrderNotification } from '@/utils/notificationHelper';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';

// In your component
const { user } = useAuth();
const { selectedDealerId } = useDealerFilter();

// After creating order
await createOrderNotification({
  userId: formData.assignedUserId,
  dealerId: selectedDealerId,
  module: 'sales_orders', // or 'service_orders', 'recon_orders', 'car_wash'
  event: 'order_assigned',
  orderId: order.id,
  orderNumber: order.order_number,
  priority: 'high',
  metadata: { vehicleVin: order.vehicle_vin }
});
```

### 2. Status Changed

```typescript
import { createStatusChangeNotification } from '@/utils/notificationHelper';

await createStatusChangeNotification({
  userId: order.assigned_user_id,
  dealerId: order.dealer_id,
  module: 'sales_orders',
  entityType: 'sales_order',
  entityId: order.id,
  entityName: order.order_number,
  oldStatus: 'pending',
  newStatus: 'in_progress',
  priority: 'high'
});
```

### 3. User Assigned

```typescript
import { createAssignmentNotification } from '@/utils/notificationHelper';

await createAssignmentNotification({
  userId: newAssignedUserId,
  dealerId: selectedDealerId,
  module: 'sales_orders',
  entityType: 'sales_order',
  entityId: order.id,
  entityName: order.order_number,
  assignedBy: currentUserName,
  priority: 'high'
});
```

### 4. Comment Added

```typescript
import { createCommentNotification } from '@/utils/notificationHelper';

await createCommentNotification({
  userId: order.assigned_user_id,
  dealerId: order.dealer_id,
  module: 'sales_orders',
  entityType: 'sales_order',
  entityId: order.id,
  entityName: order.order_number,
  commenterName: currentUserName,
  commentPreview: commentText,
  actionUrl: `/orders/sales/${order.id}#comments`,
  priority: 'normal'
});
```

### 5. System Announcement

```typescript
import { createBroadcastNotification } from '@/utils/notificationHelper';

await createBroadcastNotification({
  dealerId: selectedDealerId,
  module: 'system',
  event: 'maintenance_scheduled',
  title: 'Scheduled Maintenance',
  message: 'System will be down Saturday at 2am EST',
  priority: 'high',
  targetChannels: ['in_app', 'email']
});
```

### 6. Notify Multiple Users

```typescript
import { createBatchNotifications } from '@/utils/notificationHelper';

const teamMemberIds = ['user-id-1', 'user-id-2', 'user-id-3'];

await createBatchNotifications(
  teamMemberIds.map(userId => ({
    userId,
    dealerId: selectedDealerId,
    module: 'sales_orders',
    event: 'order_created',
    title: 'New Team Order',
    message: `Order ${orderNumber} assigned to your team`,
    priority: 'normal',
    entityType: 'sales_order',
    entityId: order.id,
    actionUrl: `/orders/sales/${order.id}`,
    actionLabel: 'View Order'
  }))
);
```

---

## Full Example: Order Creation Flow

```typescript
import { createOrderNotification } from '@/utils/notificationHelper';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { toast } from '@/hooks/use-toast';

export function CreateOrderModal() {
  const { user } = useAuth();
  const { selectedDealerId } = useDealerFilter();

  async function handleSubmit(formData: any) {
    try {
      // 1. Create order
      const { data: order, error } = await supabase
        .from('sales_orders')
        .insert({
          dealer_id: selectedDealerId,
          assigned_user_id: formData.assignedUserId,
          order_number: formData.orderNumber,
          vehicle_vin: formData.vehicleVin,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Send notification (non-blocking)
      const notificationResult = await createOrderNotification({
        userId: formData.assignedUserId,
        dealerId: selectedDealerId,
        module: 'sales_orders',
        event: 'order_assigned',
        orderId: order.id,
        orderNumber: order.order_number,
        priority: 'high',
        targetChannels: ['in_app', 'email'],
        metadata: {
          vehicleVin: order.vehicle_vin,
          createdBy: user?.email,
        }
      });

      // 3. Log result but don't fail order creation
      if (!notificationResult.success) {
        console.warn('Notification failed:', notificationResult.error);
      }

      toast.success('Order created successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to create order');
    }
  }
}
```

---

## Module Quick Reference

| Module | Use For |
|--------|---------|
| `'sales_orders'` | Sales order notifications |
| `'service_orders'` | Service department notifications |
| `'recon_orders'` | Recon/detailing notifications |
| `'car_wash'` | Car wash notifications |
| `'get_ready'` | Get ready process notifications |
| `'contacts'` | Contact management notifications |
| `'chat'` | Chat/messaging notifications |
| `'system'` | System-wide announcements |

## Priority Quick Reference

| Priority | When to Use | Behavior |
|----------|-------------|----------|
| `'low'` | Informational only | Silent, collapsed |
| `'normal'` | Standard notification | Default display |
| `'high'` | Requires attention | Prominent, sound |
| `'urgent'` | Time-sensitive | Persistent, multi-channel |
| `'critical'` | System-critical | Highest visibility |

## Channel Quick Reference

| Channel | Description |
|---------|-------------|
| `'in_app'` | Show in notification center (default) |
| `'email'` | Send email notification |
| `'sms'` | Send SMS notification |
| `'push'` | Send push notification |

**Example:**
```typescript
targetChannels: ['in_app', 'email', 'sms']
```

---

## Error Handling Pattern

```typescript
const result = await createNotification({...});

if (result.success) {
  console.log('✓ Notification created:', result.notificationId);
} else {
  console.warn('✗ Notification failed:', result.error);
  // App continues - notification failure doesn't break flow
}
```

---

## Testing in Console

```javascript
// 1. Enable debug logging
localStorage.setItem('debug', 'true');

// 2. Reload page

// 3. Import and test
import('@/utils/notificationHelper').then(({ createNotification }) => {
  createNotification({
    userId: 'your-user-id-here', // or null for broadcast
    dealerId: 5,
    module: 'sales_orders',
    event: 'test',
    title: 'Test Notification',
    message: 'This is a test',
    priority: 'normal'
  }).then(result => console.log('Result:', result));
});
```

---

## Common Mistakes

### ❌ Wrong
```typescript
// Missing error handling
await createNotification({...});

// Hardcoded dealerId
dealerId: 5

// Wrong module name
module: 'sales' // Should be 'sales_orders'

// Invalid UUID
userId: '123' // Must be full UUID or null
```

### ✅ Correct
```typescript
// With error handling
const result = await createNotification({...});
if (!result.success) console.warn(result.error);

// Dynamic dealerId
dealerId: selectedDealerId

// Correct module name
module: 'sales_orders'

// Valid UUID or broadcast
userId: '550e8400-e29b-41d4-a716-446655440000' // or null
```

---

## Need Help?

1. **Full Guide:** `docs/notification-helper-guide.md`
2. **Integration Examples:** `docs/notification-integration-examples.md`
3. **Code Examples:** `src/utils/__examples__/notificationHelper.example.ts`
4. **Type Definitions:** `src/utils/notificationHelper.d.ts`

---

**Last Updated:** 2025-11-01
