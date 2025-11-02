# Notification Helper System - Developer Guide

**Version:** 1.0.0
**Last Updated:** 2025-11-01
**Module:** `src/utils/notificationHelper.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [API Reference](#api-reference)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)
6. [Integration Guide](#integration-guide)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)
9. [Testing](#testing)

---

## Overview

The Notification Helper is an enterprise-grade utility that provides a unified interface for creating notifications across all modules in My Detail Area. It interfaces with the `notification_log` table in Supabase to create persistent, trackable notifications.

### Key Features

- ✅ **Type-Safe**: Full TypeScript support with strict validation
- ✅ **Multi-Module**: Supports 8 modules (Sales, Service, Recon, Car Wash, Get Ready, Contacts, Chat, System)
- ✅ **Multi-Channel**: Coordinate delivery across in-app, email, SMS, and push notifications
- ✅ **Priority-Based**: 5 priority levels (low, normal, high, urgent, critical)
- ✅ **Deep Linking**: Direct navigation to relevant entities
- ✅ **Flexible Metadata**: Extensible JSON metadata for custom data
- ✅ **Broadcast Support**: Send notifications to all users in a dealership
- ✅ **Batch Operations**: Create multiple notifications efficiently
- ✅ **Graceful Errors**: Non-blocking error handling with detailed logging
- ✅ **Performance**: < 100ms execution time for optimal UX

### Architecture

```
┌─────────────────────┐
│  Your Component     │
│  (Order Create)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ notificationHelper  │
│  - Validation       │
│  - Error Handling   │
│  - Logging          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase           │
│  notification_log   │
└─────────────────────┘
```

---

## Quick Start

### Installation

The utility is already part of your project at `src/utils/notificationHelper.ts`. No installation required.

### Basic Usage

```typescript
import { createNotification } from '@/utils/notificationHelper';

// Create a notification
const result = await createNotification({
  userId: '550e8400-e29b-41d4-a716-446655440000',
  dealerId: 5,
  module: 'sales_orders',
  event: 'order_created',
  title: 'New Sales Order',
  message: 'Sales Order #SO-001 has been created',
  priority: 'normal',
});

// Check result
if (result.success) {
  console.log('✓ Notification created:', result.notificationId);
} else {
  console.error('✗ Failed:', result.error);
}
```

### Using Helper Functions

```typescript
import { createOrderNotification } from '@/utils/notificationHelper';

// Simplified order notification
await createOrderNotification({
  userId: userId,
  dealerId: 5,
  module: 'sales_orders',
  event: 'order_created',
  orderId: '123',
  orderNumber: 'SO-001',
  priority: 'normal',
});
```

---

## API Reference

### Core Functions

#### `createNotification(params: CreateNotificationParams): Promise<NotificationResult>`

Main function for creating notifications with full control over all parameters.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | `string \| null` | Yes | Target user UUID or null for broadcast |
| `dealerId` | `number` | Yes | Dealership ID (must be > 0) |
| `module` | `NotificationModule` | Yes | Module: 'sales_orders', 'service_orders', etc. |
| `event` | `NotificationEvent \| string` | Yes | Event type: 'order_created', 'status_changed', etc. |
| `title` | `string` | Yes | Notification title (max 100 chars recommended) |
| `message` | `string` | Yes | Notification message body |
| `priority` | `NotificationPriority` | No | Priority: 'low', 'normal', 'high', 'urgent', 'critical' (default: 'normal') |
| `entityType` | `string` | No | Entity type: 'sales_order', 'contact', etc. |
| `entityId` | `string` | No | Entity ID for deep linking |
| `actionUrl` | `string` | No | Navigation URL when clicked |
| `actionLabel` | `string` | No | Action button label: 'View Order', 'Reply', etc. |
| `targetChannels` | `DeliveryChannel[]` | No | Channels: ['in_app', 'email', 'sms', 'push'] (default: ['in_app']) |
| `metadata` | `Record<string, unknown>` | No | Custom JSON metadata |
| `threadId` | `string` | No | Thread ID for grouping |
| `parentId` | `string` | No | Parent notification ID for replies |
| `scheduledFor` | `Date` | No | Future delivery time |

**Returns:**

```typescript
interface NotificationResult {
  success: boolean;
  notificationId?: string;  // UUID (if success)
  error?: string;           // Error message (if failed)
  details?: unknown;        // Additional error context
}
```

---

### Helper Functions

#### `createOrderNotification(params: OrderNotificationParams): Promise<NotificationResult>`

Simplified order notification creation with automatic URL generation.

```typescript
await createOrderNotification({
  userId: userId,
  dealerId: 5,
  module: 'sales_orders',
  event: 'order_created',
  orderId: '123',
  orderNumber: 'SO-001',
  priority: 'normal',
  metadata: { vehicleVin: 'ABC123' }
});
```

#### `createStatusChangeNotification(params: StatusChangeParams): Promise<NotificationResult>`

Automatically formatted status change notifications.

```typescript
await createStatusChangeNotification({
  userId: userId,
  dealerId: 5,
  module: 'sales_orders',
  entityType: 'sales_order',
  entityId: '123',
  entityName: 'SO-001',
  oldStatus: 'pending',
  newStatus: 'in_progress',
  priority: 'high'
});
```

#### `createAssignmentNotification(params: AssignmentParams): Promise<NotificationResult>`

Notify users when assigned to entities.

```typescript
await createAssignmentNotification({
  userId: assignedUserId,
  dealerId: 5,
  module: 'sales_orders',
  entityType: 'sales_order',
  entityId: '123',
  entityName: 'SO-001',
  assignedBy: 'John Manager',
  priority: 'high'
});
```

#### `createCommentNotification(params: CommentParams): Promise<NotificationResult>`

Notify about new comments or mentions.

```typescript
await createCommentNotification({
  userId: userId,
  dealerId: 5,
  module: 'sales_orders',
  entityType: 'sales_order',
  entityId: '123',
  entityName: 'SO-001',
  commenterName: 'Jane Technician',
  commentPreview: 'The vehicle is ready for pickup...',
  actionUrl: '/orders/sales/123#comments',
  priority: 'normal'
});
```

#### `createBroadcastNotification(params: Omit<CreateNotificationParams, 'userId'>): Promise<NotificationResult>`

Send notification to all users in a dealership.

```typescript
await createBroadcastNotification({
  dealerId: 5,
  module: 'system',
  event: 'maintenance_scheduled',
  title: 'Scheduled Maintenance',
  message: 'System will be down Saturday at 2am',
  priority: 'high',
  targetChannels: ['in_app', 'email']
});
```

#### `createBatchNotifications(notifications: CreateNotificationParams[]): Promise<NotificationResult[]>`

Create multiple notifications efficiently.

```typescript
const results = await createBatchNotifications([
  { userId: user1, dealerId: 5, module: 'sales_orders', ... },
  { userId: user2, dealerId: 5, module: 'sales_orders', ... },
  { userId: user3, dealerId: 5, module: 'sales_orders', ... },
]);

const successCount = results.filter(r => r.success).length;
console.log(`Created ${successCount}/${results.length} notifications`);
```

---

## Usage Examples

### Sales Order Created

```typescript
import { createOrderNotification } from '@/utils/notificationHelper';

async function handleOrderCreated(order: any, assignedUserId: string, dealerId: number) {
  await createOrderNotification({
    userId: assignedUserId,
    dealerId: dealerId,
    module: 'sales_orders',
    event: 'order_created',
    orderId: order.id,
    orderNumber: order.order_number,
    priority: 'high',
    targetChannels: ['in_app', 'email'],
    metadata: {
      vehicleVin: order.vehicle_vin,
      customerName: order.customer_name,
    }
  });
}
```

### Order Status Changed

```typescript
import { createStatusChangeNotification } from '@/utils/notificationHelper';

async function handleStatusChange(
  orderId: string,
  orderNumber: string,
  oldStatus: string,
  newStatus: string,
  assignedUserId: string,
  dealerId: number
) {
  await createStatusChangeNotification({
    userId: assignedUserId,
    dealerId: dealerId,
    module: 'sales_orders',
    entityType: 'sales_order',
    entityId: orderId,
    entityName: orderNumber,
    oldStatus: oldStatus,
    newStatus: newStatus,
    priority: 'high',
    targetChannels: ['in_app']
  });
}
```

### Order Overdue Alert

```typescript
import { createNotification } from '@/utils/notificationHelper';

async function sendOverdueAlert(order: any, assignedUserId: string, dealerId: number) {
  await createNotification({
    userId: assignedUserId,
    dealerId: dealerId,
    module: 'sales_orders',
    event: 'order_overdue',
    title: 'Order Overdue',
    message: `Order ${order.order_number} is overdue by ${order.overdueHours} hours`,
    priority: 'urgent',
    entityType: 'sales_order',
    entityId: order.id,
    actionUrl: `/orders/sales/${order.id}`,
    actionLabel: 'View Order',
    targetChannels: ['in_app', 'email', 'sms'],
    metadata: {
      orderNumber: order.order_number,
      dueDate: order.due_date,
      overdueHours: order.overdueHours
    }
  });
}
```

### Team Notification (Batch)

```typescript
import { createBatchNotifications } from '@/utils/notificationHelper';

async function notifyTeam(teamMemberIds: string[], order: any, dealerId: number) {
  const notifications = teamMemberIds.map(userId => ({
    userId,
    dealerId,
    module: 'sales_orders' as const,
    event: 'order_created' as const,
    title: 'New Team Order',
    message: `New sales order ${order.order_number} assigned to your team`,
    priority: 'normal' as const,
    entityType: 'sales_order',
    entityId: order.id,
    actionUrl: `/orders/sales/${order.id}`,
    actionLabel: 'View Order',
  }));

  const results = await createBatchNotifications(notifications);
  console.log(`Notified ${results.filter(r => r.success).length}/${results.length} team members`);
}
```

---

## Best Practices

### 1. Always Handle Results

```typescript
// ✅ GOOD: Check result and handle errors
const result = await createNotification({...});
if (!result.success) {
  console.warn('Notification failed:', result.error);
  // Continue app flow - don't block user
}

// ❌ BAD: Fire and forget
await createNotification({...}); // No error handling
```

### 2. Use Helper Functions When Appropriate

```typescript
// ✅ GOOD: Use helper for common patterns
await createOrderNotification({
  userId, dealerId, module: 'sales_orders',
  event: 'order_created', orderId, orderNumber
});

// ❌ LESS OPTIMAL: Manual construction for simple cases
await createNotification({
  userId, dealerId, module: 'sales_orders',
  event: 'order_created',
  title: `Sales Order ${orderNumber}`,
  message: `order_created - ${orderNumber}`,
  entityType: 'sales_order',
  entityId: orderId,
  actionUrl: `/orders/sales/${orderId}`,
  actionLabel: 'View Order',
});
```

### 3. Choose Appropriate Priority Levels

| Priority | Use Case | Behavior |
|----------|----------|----------|
| `low` | Informational updates | Silent, collapsed in UI |
| `normal` | Standard notifications | Default notification |
| `high` | Important, requires attention | Prominent display, sound |
| `urgent` | Time-sensitive actions | Persistent, multi-channel |
| `critical` | System-critical alerts | Highest visibility, all channels |

```typescript
// ✅ GOOD: Appropriate priorities
await createNotification({
  ...,
  event: 'user_joined',
  priority: 'low'  // Just informational
});

await createNotification({
  ...,
  event: 'order_overdue',
  priority: 'urgent',  // Time-sensitive
  targetChannels: ['in_app', 'email', 'sms']
});

// ❌ BAD: Everything is critical
await createNotification({
  ...,
  event: 'user_joined',
  priority: 'critical'  // Overuse diminishes importance
});
```

### 4. Include Meaningful Metadata

```typescript
// ✅ GOOD: Rich metadata for context
await createNotification({
  ...,
  metadata: {
    orderNumber: 'SO-001',
    vehicleVin: '1HGBH41JXMN109186',
    customerName: 'John Doe',
    estimatedCompletionDate: '2025-11-05',
    totalAmount: 45000,
    assignedTechnician: 'Jane Smith'
  }
});

// ❌ BAD: No metadata
await createNotification({...}); // Missing valuable context
```

### 5. Use Batch Operations for Multiple Users

```typescript
// ✅ GOOD: Batch operation (parallel execution)
await createBatchNotifications(teamMemberIds.map(userId => ({...})));

// ❌ BAD: Sequential individual notifications
for (const userId of teamMemberIds) {
  await createNotification({...}); // Slow, sequential
}
```

### 6. Non-Blocking Error Handling

```typescript
// ✅ GOOD: Graceful degradation
async function createOrder(orderData: any) {
  // 1. Create order (critical)
  const order = await supabase.from('orders').insert(orderData);

  // 2. Send notification (non-critical)
  const notifResult = await createNotification({...});
  if (!notifResult.success) {
    console.warn('Notification failed, but order created successfully');
  }

  return order; // Order succeeds even if notification fails
}

// ❌ BAD: Blocking error handling
async function createOrder(orderData: any) {
  const order = await supabase.from('orders').insert(orderData);
  await createNotification({...}); // If this fails, order creation appears to fail
  return order;
}
```

---

## Integration Guide

### Sales Orders Module

```typescript
// src/components/orders/CreateSalesOrderModal.tsx

import { createOrderNotification } from '@/utils/notificationHelper';
import { useAuth } from '@/contexts/AuthContext';

export function CreateSalesOrderModal() {
  const { user } = useAuth();

  async function handleCreateOrder(formData: any) {
    try {
      // Create order
      const { data: order, error } = await supabase
        .from('sales_orders')
        .insert({
          dealer_id: formData.dealerId,
          assigned_user_id: formData.assignedUserId,
          order_number: formData.orderNumber,
          // ... other fields
        })
        .select()
        .single();

      if (error) throw error;

      // Notify assigned user
      await createOrderNotification({
        userId: formData.assignedUserId,
        dealerId: formData.dealerId,
        module: 'sales_orders',
        event: 'order_assigned',
        orderId: order.id,
        orderNumber: order.order_number,
        priority: 'high',
        targetChannels: ['in_app', 'email'],
        metadata: {
          vehicleVin: formData.vehicleVin,
          createdBy: user?.id,
        }
      });

      toast.success('Order created and user notified');
    } catch (error) {
      toast.error('Failed to create order');
    }
  }
}
```

### Service Orders Module

```typescript
// src/hooks/useServiceOrders.ts

import { createStatusChangeNotification } from '@/utils/notificationHelper';

export function useServiceOrders() {
  async function updateOrderStatus(
    orderId: string,
    newStatus: string,
    currentStatus: string
  ) {
    // Update status
    const { data: order } = await supabase
      .from('service_orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select()
      .single();

    // Notify assigned user
    if (order.assigned_user_id) {
      await createStatusChangeNotification({
        userId: order.assigned_user_id,
        dealerId: order.dealer_id,
        module: 'service_orders',
        entityType: 'service_order',
        entityId: orderId,
        entityName: order.order_number,
        oldStatus: currentStatus,
        newStatus: newStatus,
        priority: 'high'
      });
    }
  }
}
```

### Chat Module

```typescript
// src/components/chat/ChatInput.tsx

import { createNotification } from '@/utils/notificationHelper';

async function sendMessage(messageText: string, recipientId: string, dealerId: number) {
  // Send message
  const { data: message } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      message: messageText
    })
    .select()
    .single();

  // Notify recipient
  await createNotification({
    userId: recipientId,
    dealerId: dealerId,
    module: 'chat',
    event: 'message_received',
    title: 'New Message',
    message: `${senderName}: ${messageText.substring(0, 100)}`,
    priority: 'normal',
    entityType: 'chat_message',
    entityId: message.id,
    actionUrl: `/chat/conversation/${conversationId}`,
    actionLabel: 'Reply',
    targetChannels: ['in_app', 'push']
  });
}
```

---

## Error Handling

### Validation Errors

The system validates all parameters before database insertion:

```typescript
const result = await createNotification({
  userId: 'invalid-uuid',  // ❌ Invalid UUID format
  dealerId: -1,            // ❌ Must be > 0
  module: 'invalid',       // ❌ Not a valid module
  event: '',               // ❌ Cannot be empty
  title: '',               // ❌ Cannot be empty
  message: '',             // ❌ Cannot be empty
});

if (!result.success) {
  console.error(result.error);
  // Example: "userId must be a valid UUID format or null"
}
```

### Database Errors

Database errors are caught and returned in the result:

```typescript
const result = await createNotification({...});

if (!result.success) {
  console.error('Error:', result.error);
  console.error('Details:', result.details);
  // Example: "Failed to create notification: duplicate key value"
}
```

### Best Practices for Error Handling

1. **Always check result.success**
2. **Log errors but don't block UI**
3. **Provide user feedback when appropriate**
4. **Use try/catch for unexpected errors**

```typescript
async function handleNotificationWithErrorRecovery() {
  try {
    const result = await createNotification({...});

    if (!result.success) {
      // Log for debugging
      console.warn('[Notification] Failed to create:', result.error);

      // Optional: Show user feedback
      toast.info('Action completed (notification unavailable)');

      // Continue app flow
      return;
    }

    console.log('✓ Notification sent:', result.notificationId);
  } catch (error) {
    // Unexpected errors
    console.error('[Notification] Unexpected error:', error);
  }
}
```

---

## Performance Considerations

### Execution Time

The notification helper is optimized for < 100ms execution time:

```typescript
const startTime = performance.now();
const result = await createNotification({...});
const duration = performance.now() - startTime;

console.log(`Execution time: ${duration.toFixed(2)}ms`);
// Typical: 20-50ms for validation + database insert
```

### Batch Operations

Use batch operations for multiple notifications:

```typescript
// ✅ FAST: Parallel execution
const results = await createBatchNotifications([...notifications]);
// ~50ms total for 10 notifications

// ❌ SLOW: Sequential execution
for (const notif of notifications) {
  await createNotification(notif);
}
// ~500ms total for 10 notifications (10x slower)
```

### Database Indexes

The `notification_log` table has optimized indexes for:
- User ID + Read status queries
- Dealer ID + Created date queries
- Module + Event type queries
- Entity type + Entity ID lookups

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createNotification } from '@/utils/notificationHelper';

describe('notificationHelper', () => {
  it('should create notification with valid params', async () => {
    const result = await createNotification({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      dealerId: 5,
      module: 'sales_orders',
      event: 'order_created',
      title: 'Test Notification',
      message: 'Test message',
    });

    expect(result.success).toBe(true);
    expect(result.notificationId).toBeDefined();
  });

  it('should fail with invalid dealerId', async () => {
    const result = await createNotification({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      dealerId: -1,
      module: 'sales_orders',
      event: 'order_created',
      title: 'Test',
      message: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('dealerId must be a positive integer');
  });
});
```

### Integration Tests

```typescript
import { test, expect } from '@playwright/test';

test('notification appears after order creation', async ({ page }) => {
  // Create order
  await page.goto('/orders/sales');
  await page.click('[data-testid="create-order-btn"]');
  await page.fill('[name="orderNumber"]', 'SO-TEST-001');
  await page.click('[data-testid="submit-btn"]');

  // Check notification appears
  await expect(page.locator('[data-testid="notification-bell"]')).toHaveText('1');
  await page.click('[data-testid="notification-bell"]');
  await expect(page.locator('[data-testid="notification-list"]')).toContainText('SO-TEST-001');
});
```

---

## Troubleshooting

### Common Issues

#### 1. "userId must be a valid UUID format"

**Problem:** Invalid UUID format
**Solution:** Ensure userId is a valid UUID v4 or set to null for broadcast

```typescript
// ✅ Valid
userId: '550e8400-e29b-41d4-a716-446655440000'
userId: null  // For broadcast

// ❌ Invalid
userId: '123'
userId: 'abc-def-ghi'
```

#### 2. "module must be one of: sales_orders, ..."

**Problem:** Invalid module name
**Solution:** Use exact module names from NotificationModule type

```typescript
// ✅ Valid
module: 'sales_orders'
module: 'service_orders'
module: 'recon_orders'
module: 'car_wash'
module: 'get_ready'
module: 'contacts'
module: 'chat'
module: 'system'

// ❌ Invalid
module: 'sales'
module: 'Sales_Orders'
```

#### 3. Notification created but not appearing

**Problem:** RLS policies or user permissions
**Solution:** Check Supabase RLS policies allow user to read notifications

```sql
-- Check RLS policy
SELECT * FROM notification_log WHERE user_id = 'your-user-id';
```

---

## Support

For questions or issues:

1. Check this documentation
2. Review examples in `src/utils/__examples__/notificationHelper.example.ts`
3. Check database schema in `supabase/migrations/*notification_log*`
4. Contact the development team

---

**Last Updated:** 2025-11-01
**Documentation Version:** 1.0.0
