# Push Notification Helper Service - Usage Guide

## Overview

The `pushNotificationHelper` service provides a clean, enterprise-grade API for sending push notifications to users in the MyDetailArea application. It uses the Supabase Edge Function `/functions/v1/send-notification` to deliver notifications via Firebase Cloud Messaging (FCM).

## Installation & Import

```typescript
import { pushNotificationHelper } from '@/services/pushNotificationHelper';
```

## Core API

### 1. Send Notification to Specific User

```typescript
const response = await pushNotificationHelper.sendNotification({
  userId: 'abc123',
  dealerId: 5,
  title: 'Vehicle Ready',
  body: 'Your vehicle is ready for pickup',
  url: '/orders/456', // Optional - deep link
  data: { orderId: '456', type: 'completion' } // Optional - custom data
});

if (response.success) {
  console.log(`Sent to ${response.sent} device(s)`);
}
```

### 2. Notify Order Followers

Automatically sends notifications to all active followers of an order (respects their notification level preferences).

```typescript
// Notify all followers
await pushNotificationHelper.notifyOrderFollowers(
  '123', // orderId
  'Order Status Changed',
  'Order #ABC123 status changed to In Progress'
);

// With options
await pushNotificationHelper.notifyOrderFollowers(
  '123',
  'New Comment',
  'John Doe added a comment',
  {
    url: '/orders/123?tab=comments',
    data: { commentId: '456' },
    notificationLevel: 'all' // Only notify followers with 'all' level
  }
);
```

### 3. Notify Dealer Members

Send notifications to all active members of a dealership.

```typescript
await pushNotificationHelper.notifyDealerMembers(
  5, // dealerId
  'System Maintenance',
  'System will be down for maintenance at 2 AM',
  {
    url: '/announcements',
    data: { priority: 'high' }
  }
);
```

## Convenience Methods

### Order Status Change

```typescript
await pushNotificationHelper.notifyOrderStatusChange(
  '123',        // orderId
  'ABC123',     // orderNumber
  'In Progress', // newStatus
  'John Doe'    // changedBy
);
```

**Result**: Sends "Order ABC123 Status Updated - John Doe changed status to In Progress"

### New Comment

```typescript
await pushNotificationHelper.notifyNewComment(
  '123',                                      // orderId
  'ABC123',                                   // orderNumber
  'Jane Smith',                               // commenterName
  'The vehicle is ready for final inspection' // commentText
);
```

**Result**: Sends "New Comment on Order ABC123 - Jane Smith: The vehicle is ready..."

### New Attachment

```typescript
await pushNotificationHelper.notifyNewAttachment(
  '123',                    // orderId
  'ABC123',                 // orderNumber
  'Mike Johnson',           // uploaderName
  'inspection_report.pdf'   // fileName
);
```

**Result**: Sends "New Attachment on Order ABC123 - Mike Johnson uploaded inspection_report.pdf"

### Order Assignment

```typescript
await pushNotificationHelper.notifyOrderAssignment(
  'user-123',     // userId (person being assigned)
  5,              // dealerId
  'order-456',    // orderId
  'ABC123',       // orderNumber
  'Manager Smith' // assignedBy
);
```

**Result**: Sends "Assigned to Order ABC123 - Manager Smith assigned you to this order"

## Integration Examples

### Order Status Change Hook

```typescript
// In useOrderManagement.ts or similar
const updateOrderStatus = async (orderId: string, newStatus: string) => {
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId);

  if (!error) {
    // Notify followers
    await pushNotificationHelper.notifyOrderStatusChange(
      orderId,
      order.order_number,
      newStatus,
      user.firstName + ' ' + user.lastName
    );
  }
};
```

### Comment Creation Component

```typescript
// In CommentForm.tsx or similar
const handleSubmit = async (commentText: string) => {
  const { data, error } = await supabase
    .from('order_comments')
    .insert({
      order_id: orderId,
      user_id: userId,
      content: commentText
    })
    .select()
    .single();

  if (!error && data) {
    // Notify followers
    await pushNotificationHelper.notifyNewComment(
      orderId,
      orderNumber,
      userName,
      commentText
    );
  }
};
```

### Attachment Upload Handler

```typescript
// In AttachmentUpload.tsx or similar
const handleFileUpload = async (file: File) => {
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('order-attachments')
    .upload(`${orderId}/${file.name}`, file);

  if (!error) {
    // Save to database
    await supabase.from('order_attachments').insert({
      order_id: orderId,
      file_name: file.name,
      file_path: data.path
    });

    // Notify followers
    await pushNotificationHelper.notifyNewAttachment(
      orderId,
      orderNumber,
      userName,
      file.name
    );
  }
};
```

### Assignment Flow

```typescript
// In OrderAssignment.tsx or similar
const assignUserToOrder = async (orderId: string, assigneeUserId: string) => {
  const { error } = await supabase
    .from('order_assignments')
    .insert({
      order_id: orderId,
      user_id: assigneeUserId,
      assigned_by: currentUserId
    });

  if (!error) {
    // Notify assigned user
    await pushNotificationHelper.notifyOrderAssignment(
      assigneeUserId,
      dealerId,
      orderId,
      orderNumber,
      currentUserName
    );
  }
};
```

## Error Handling

All methods include comprehensive error handling and will **NOT throw errors**. Instead, they log errors to console and return graceful error responses.

```typescript
// Safe to call without try-catch
await pushNotificationHelper.notifyOrderStatusChange(...);

// But if you need the response:
const response = await pushNotificationHelper.sendNotification(...);

if (!response.success) {
  console.error('Notification failed:', response.errors);
  // Optional: Show toast notification to user
  toast.error('Failed to send notification');
}
```

## Response Structure

All methods return a `NotificationResponse`:

```typescript
interface NotificationResponse {
  success: boolean;      // true if at least one notification sent
  sent: number;          // Number of successful sends
  failed: number;        // Number of failed sends
  tokens: string[];      // FCM tokens that received notification
  errors?: string[];     // Error messages (if any)
}
```

## Best Practices

### 1. Don't Block User Actions

Notifications should not prevent the main action from completing:

```typescript
// ✅ GOOD - Fire and forget
const handleStatusChange = async () => {
  await updateStatus(); // Main action
  pushNotificationHelper.notifyOrderStatusChange(...); // Non-blocking
};

// ❌ BAD - Blocking user action
const handleStatusChange = async () => {
  await updateStatus();
  await pushNotificationHelper.notifyOrderStatusChange(...); // Blocks UI
};
```

### 2. Use Convenience Methods

Prefer convenience methods over manual `notifyOrderFollowers`:

```typescript
// ✅ GOOD - Semantic and consistent
await pushNotificationHelper.notifyOrderStatusChange(id, num, status, user);

// ❌ BAD - Manual and error-prone
await pushNotificationHelper.notifyOrderFollowers(
  id,
  'Status Changed',
  `Status changed to ${status}`
);
```

### 3. Include Deep Links

Always provide a `url` parameter to enable users to navigate directly to the relevant content:

```typescript
// ✅ GOOD - Direct navigation
url: `/orders/${orderId}?tab=comments`

// ❌ BAD - Generic navigation
url: `/orders/${orderId}`
```

### 4. Add Custom Data for Analytics

Include structured data for tracking and analytics:

```typescript
data: {
  orderId: '123',
  orderNumber: 'ABC123',
  notificationType: 'status_change',
  priority: 'high',
  timestamp: new Date().toISOString()
}
```

## Database Requirements

The service relies on these Supabase tables:

- **`fcm_tokens`** - FCM device tokens for users
- **`entity_followers`** - Order followers and notification preferences
- **`dealer_memberships`** - Active dealership members

Ensure proper Row Level Security (RLS) policies are in place.

## Edge Function Requirements

The service requires the **`send-notification`** Edge Function to be deployed:

```bash
supabase functions deploy send-notification
```

Environment variables required in Edge Function:
- `FCM_SERVER_KEY` - Firebase Cloud Messaging server key

## Troubleshooting

### No Notifications Sent

1. **Check FCM tokens**: User must have active FCM tokens in database
2. **Verify Edge Function**: Ensure `send-notification` is deployed
3. **Check environment**: FCM_SERVER_KEY must be configured
4. **Review logs**: Check browser console and Edge Function logs

### Notifications Not Received

1. **Permission**: User must have granted notification permission
2. **Service Worker**: Must be registered and active
3. **Token validity**: FCM tokens expire and must be refreshed
4. **Notification level**: Check follower's notification_level setting

## Testing

### Test Notification to Self

```typescript
import { useAuth } from '@/contexts/AuthContext';

const { user, dealershipId } = useAuth();

await pushNotificationHelper.sendNotification({
  userId: user!.id,
  dealerId: dealershipId!,
  title: 'Test Notification',
  body: 'This is a test from Push Notification Helper',
  url: '/',
  data: { test: true }
});
```

### Mock Follower Notifications

```typescript
// Test with a real order that has followers
await pushNotificationHelper.notifyOrderFollowers(
  'existing-order-id',
  'Test Title',
  'Test body message'
);
```

## Advanced Usage

### Batch Notifications with Custom Logic

```typescript
// Get specific users based on custom criteria
const { data: managers } = await supabase
  .from('profiles')
  .select('id, dealership_id')
  .eq('user_type', 'manager')
  .eq('dealership_id', dealerId);

// Send to each manager
const results = await Promise.allSettled(
  managers.map(manager =>
    pushNotificationHelper.sendNotification({
      userId: manager.id,
      dealerId: manager.dealership_id,
      title: 'Manager Alert',
      body: 'High priority order requires attention'
    })
  )
);

// Aggregate results
const successful = results.filter(r => r.status === 'fulfilled').length;
console.log(`Sent to ${successful}/${managers.length} managers`);
```

### Conditional Notifications

```typescript
// Only notify if order value exceeds threshold
if (orderValue > 50000) {
  await pushNotificationHelper.notifyDealerMembers(
    dealerId,
    'High Value Order',
    `New order worth $${orderValue} requires approval`
  );
}
```

## Support

For issues or questions:
- Check Edge Function logs: `supabase functions logs send-notification`
- Review browser console for client-side errors
- Verify database queries with Supabase SQL editor
- Test FCM connectivity with Firebase Console

---

**Version**: 1.0.0
**Last Updated**: 2025-10-27
**Author**: MyDetailArea Development Team
