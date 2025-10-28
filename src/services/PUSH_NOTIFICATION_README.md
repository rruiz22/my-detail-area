# Push Notification Helper Service

## Overview

The **Push Notification Helper Service** is an enterprise-grade notification system for the MyDetailArea application. It provides a clean, type-safe API for sending push notifications to users via Firebase Cloud Messaging (FCM) through a Supabase Edge Function.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React Application                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │       pushNotificationHelper Service                   │ │
│  │  - sendNotification()                                  │ │
│  │  - notifyOrderFollowers()                              │ │
│  │  - notifyDealerMembers()                               │ │
│  │  - notifyOrderStatusChange()                           │ │
│  │  - notifyNewComment()                                  │ │
│  │  - notifyNewAttachment()                               │ │
│  │  - notifyOrderAssignment()                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP Request
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Function                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │        send-notification Function                      │ │
│  │  - Validates request payload                           │ │
│  │  - Fetches FCM tokens from database                    │ │
│  │  - Sends to Firebase Cloud Messaging                   │ │
│  │  - Handles token invalidation                          │ │
│  │  - Returns aggregated response                         │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ FCM API
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           Firebase Cloud Messaging                           │
│  - Delivers notifications to devices                         │
│  - Handles offline queuing                                   │
│  - Manages device token lifecycle                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   User Devices                               │
│  - iOS (Safari, Chrome, Firefox)                             │
│  - Android (Chrome, Firefox)                                 │
│  - Desktop (Chrome, Firefox, Edge)                           │
└─────────────────────────────────────────────────────────────┘
```

## Files Structure

```
src/services/
├── pushNotificationHelper.ts              # Main service implementation
├── pushNotificationHelper.test.ts         # Comprehensive unit tests
├── PUSH_NOTIFICATION_README.md            # This file - main documentation
├── PUSH_NOTIFICATION_HELPER_GUIDE.md      # Developer usage guide
└── PUSH_NOTIFICATION_INTEGRATION_EXAMPLES.tsx  # Real-world examples
```

## Quick Start

### 1. Import the Service

```typescript
import { pushNotificationHelper } from '@/services/pushNotificationHelper';
```

### 2. Send Your First Notification

```typescript
// Send to a specific user
const response = await pushNotificationHelper.sendNotification({
  userId: 'user-123',
  dealerId: 5,
  title: 'Order Ready',
  body: 'Your vehicle is ready for pickup',
  url: '/orders/123'
});

console.log(`Sent to ${response.sent} device(s)`);
```

### 3. Use Convenience Methods

```typescript
// Notify when order status changes
await pushNotificationHelper.notifyOrderStatusChange(
  orderId,
  orderNumber,
  newStatus,
  changedByUserName
);

// Notify when comment is added
await pushNotificationHelper.notifyNewComment(
  orderId,
  orderNumber,
  commenterName,
  commentText
);
```

## Core Features

### ✅ Type-Safe API
- Full TypeScript support
- Comprehensive interface definitions
- Type inference for better DX

### ✅ Enterprise Error Handling
- Try-catch all operations
- Graceful degradation
- Detailed error logging
- Never throws - returns error responses

### ✅ Automatic Follower Resolution
- Queries `entity_followers` table
- Respects notification level preferences
- Filters inactive followers
- Batch sends to all followers

### ✅ Dealer-Scoped Notifications
- Multi-dealer support
- Proper data isolation
- Row Level Security compliance

### ✅ Convenience Methods
- Pre-formatted notifications for common scenarios
- Consistent message formatting
- Automatic deep linking
- Semantic method names

### ✅ Performance Optimized
- Parallel notification sends
- Non-blocking architecture
- Fire-and-forget pattern
- Promise.allSettled for reliability

### ✅ Comprehensive Testing
- Unit tests with 90%+ coverage
- Mocked dependencies
- Edge case handling
- Error scenario testing

## API Reference

### Core Methods

#### `sendNotification(payload: SendNotificationPayload)`

Send notification to a specific user.

**Parameters:**
```typescript
interface SendNotificationPayload {
  userId: string;        // Target user ID
  dealerId: number;      // Dealer ID for scoping
  title: string;         // Notification title
  body: string;          // Notification body
  url?: string;          // Deep link URL
  data?: Record<string, any>; // Custom data
}
```

**Returns:** `Promise<NotificationResponse>`

**Example:**
```typescript
const response = await pushNotificationHelper.sendNotification({
  userId: 'abc123',
  dealerId: 5,
  title: 'New Message',
  body: 'You have a new message',
  url: '/messages',
  data: { messageId: '456' }
});
```

---

#### `notifyOrderFollowers(orderId, title, body, options?)`

Send notification to all active followers of an order.

**Parameters:**
- `orderId: string` - Order ID
- `title: string` - Notification title
- `body: string` - Notification body
- `options?: object` - Optional configuration
  - `url?: string` - Deep link URL
  - `data?: Record<string, any>` - Custom data
  - `notificationLevel?: 'all' | 'important'` - Filter by level

**Returns:** `Promise<NotificationResponse>`

**Example:**
```typescript
await pushNotificationHelper.notifyOrderFollowers(
  '123',
  'Order Updated',
  'Status changed to In Progress',
  {
    url: '/orders/123',
    notificationLevel: 'all'
  }
);
```

---

#### `notifyDealerMembers(dealerId, title, body, options?)`

Send notification to all active members of a dealership.

**Parameters:**
- `dealerId: number` - Dealership ID
- `title: string` - Notification title
- `body: string` - Notification body
- `options?: object` - Optional configuration
  - `url?: string` - Deep link URL
  - `data?: Record<string, any>` - Custom data

**Returns:** `Promise<NotificationResponse>`

**Example:**
```typescript
await pushNotificationHelper.notifyDealerMembers(
  5,
  'System Maintenance',
  'System will be down tonight',
  { url: '/announcements' }
);
```

---

### Convenience Methods

#### `notifyOrderStatusChange(orderId, orderNumber, newStatus, changedBy)`

Pre-formatted notification for order status changes.

**Example:**
```typescript
await pushNotificationHelper.notifyOrderStatusChange(
  '123',
  'ABC123',
  'In Progress',
  'John Doe'
);
// Sends: "Order ABC123 Status Updated - John Doe changed status to In Progress"
```

---

#### `notifyNewComment(orderId, orderNumber, commenterName, commentText)`

Pre-formatted notification for new comments.

**Example:**
```typescript
await pushNotificationHelper.notifyNewComment(
  '123',
  'ABC123',
  'Jane Smith',
  'Vehicle is ready for inspection'
);
// Sends: "New Comment on Order ABC123 - Jane Smith: Vehicle is ready..."
```

---

#### `notifyNewAttachment(orderId, orderNumber, uploaderName, fileName)`

Pre-formatted notification for new attachments.

**Example:**
```typescript
await pushNotificationHelper.notifyNewAttachment(
  '123',
  'ABC123',
  'Mike Johnson',
  'inspection_report.pdf'
);
// Sends: "New Attachment on Order ABC123 - Mike Johnson uploaded inspection_report.pdf"
```

---

#### `notifyOrderAssignment(userId, dealerId, orderId, orderNumber, assignedBy)`

Notify a user when assigned to an order.

**Example:**
```typescript
await pushNotificationHelper.notifyOrderAssignment(
  'user-456',
  5,
  '123',
  'ABC123',
  'Manager Smith'
);
// Sends: "Assigned to Order ABC123 - Manager Smith assigned you to this order"
```

## Response Structure

All methods return a `NotificationResponse`:

```typescript
interface NotificationResponse {
  success: boolean;      // true if at least one notification sent
  sent: number;          // Count of successful sends
  failed: number;        // Count of failed sends
  tokens: string[];      // FCM tokens that received notification
  errors?: string[];     // Error messages (if any failures)
}
```

### Example Response

```typescript
{
  success: true,
  sent: 3,
  failed: 1,
  tokens: ['token1', 'token2', 'token3'],
  errors: ['NotRegistered'] // Optional, only if failures occurred
}
```

## Integration Patterns

### Pattern 1: Fire and Forget (Recommended)

```typescript
const handleAction = async () => {
  // Main business logic
  await updateOrder(orderId, newStatus);

  // Non-blocking notification (no await)
  pushNotificationHelper.notifyOrderStatusChange(...);

  // Continue with UI updates
  toast.success('Order updated');
};
```

### Pattern 2: With Response Handling

```typescript
const handleAction = async () => {
  const response = await pushNotificationHelper.sendNotification(...);

  if (response.success) {
    console.log(`Notified ${response.sent} user(s)`);
  } else {
    console.error('Notification failed:', response.errors);
  }
};
```

### Pattern 3: Custom Hook

```typescript
function useOrderNotifications(orderId: string) {
  const { user } = useAuth();

  const notifyStatusChange = (status: string) => {
    pushNotificationHelper.notifyOrderStatusChange(
      orderId,
      orderNumber,
      status,
      user.name
    );
  };

  return { notifyStatusChange };
}

// Usage
const { notifyStatusChange } = useOrderNotifications(orderId);
notifyStatusChange('Completed');
```

## Database Schema

### Required Tables

#### `fcm_tokens`
Stores Firebase Cloud Messaging tokens for users.

```sql
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  dealer_id INTEGER REFERENCES dealerships(id) NOT NULL,
  fcm_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `entity_followers`
Tracks which users follow which entities (orders, etc).

```sql
CREATE TABLE entity_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  dealer_id INTEGER REFERENCES dealerships(id) NOT NULL,
  follow_type TEXT NOT NULL,
  notification_level TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  followed_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `dealer_memberships`
Tracks which users belong to which dealerships.

```sql
CREATE TABLE dealer_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  dealer_id INTEGER REFERENCES dealerships(id) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Edge Function

### Deployment

```bash
cd supabase/functions/send-notification
supabase functions deploy send-notification
```

### Environment Variables

Set in Supabase Dashboard → Edge Functions → send-notification → Secrets:

```
FCM_SERVER_KEY=your-firebase-server-key
```

### Testing Edge Function

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/send-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-id",
    "dealerId": 5,
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

## Error Handling

The service uses a **no-throw** pattern - errors are caught and returned in the response:

```typescript
// ✅ Safe - no try-catch needed
await pushNotificationHelper.notifyOrderStatusChange(...);

// ✅ With error checking
const response = await pushNotificationHelper.sendNotification(...);
if (!response.success) {
  console.error('Notification failed:', response.errors);
}
```

## Best Practices

### 1. Use Semantic Methods

```typescript
// ✅ Good - Clear intent
await pushNotificationHelper.notifyOrderStatusChange(...);

// ❌ Avoid - Manual formatting
await pushNotificationHelper.notifyOrderFollowers(
  orderId,
  'Status',
  'Changed'
);
```

### 2. Include Deep Links

```typescript
// ✅ Good - Direct navigation
url: `/orders/${orderId}?tab=comments`

// ❌ Avoid - Generic URLs
url: `/orders`
```

### 3. Add Structured Data

```typescript
// ✅ Good - Rich metadata
data: {
  orderId,
  orderNumber,
  notificationType: 'status_change',
  priority: 'high'
}

// ❌ Avoid - No data
data: undefined
```

### 4. Non-Blocking Calls

```typescript
// ✅ Good - Non-blocking
await updateDatabase();
pushNotificationHelper.notify(...); // No await

// ❌ Avoid - Blocks user action
await updateDatabase();
await pushNotificationHelper.notify(...);
```

## Testing

### Run Unit Tests

```bash
npm test pushNotificationHelper.test.ts
```

### Test Coverage

```bash
npm run test:coverage -- pushNotificationHelper.test.ts
```

### Manual Testing

Use the test component in development:

```typescript
import { NotificationTesterExample } from './PUSH_NOTIFICATION_INTEGRATION_EXAMPLES';

// Add to dev tools page
<NotificationTesterExample />
```

## Troubleshooting

### No Notifications Sent

**Problem:** `response.sent === 0`

**Solutions:**
1. Check if user has active FCM tokens in database
2. Verify Edge Function is deployed
3. Check FCM_SERVER_KEY environment variable
4. Review Edge Function logs

### Notifications Not Received

**Problem:** Sent successfully but not appearing on device

**Solutions:**
1. Check browser notification permission
2. Verify Service Worker is active
3. Test with different device/browser
4. Check FCM token validity

### Database Query Errors

**Problem:** Follower/member queries fail

**Solutions:**
1. Verify table exists and RLS policies are correct
2. Check user has proper authentication
3. Review Supabase logs for specific error
4. Test query in Supabase SQL editor

## Performance Considerations

### Parallel Execution

The service automatically parallelizes notifications:

```typescript
// Internally uses Promise.allSettled for optimal performance
await notifyOrderFollowers(...); // Sends to all followers in parallel
```

### Non-Blocking Architecture

Convenience methods don't return promises by default:

```typescript
// Non-blocking - returns void Promise
notifyOrderStatusChange(...); // Fire and forget
```

### Batch Optimization

For custom batch operations:

```typescript
const users = await getUsers();
await Promise.allSettled(
  users.map(user => pushNotificationHelper.sendNotification({...}))
);
```

## Security

### Row Level Security (RLS)

Ensure RLS policies are enabled on:
- `fcm_tokens` - Users can only access their own tokens
- `entity_followers` - Scoped by dealer_id
- `dealer_memberships` - Scoped by dealer_id

### Edge Function Security

- Uses service role key for database access
- Validates all input parameters
- Rate limiting recommended (implement in Edge Function)

## Migration Guide

### From Old Notification System

If migrating from a previous notification system:

1. Replace direct FCM calls:
```typescript
// ❌ Old
await sendFCM(token, title, body);

// ✅ New
await pushNotificationHelper.sendNotification({
  userId, dealerId, title, body
});
```

2. Replace custom follower queries:
```typescript
// ❌ Old
const followers = await getFollowers(orderId);
await Promise.all(followers.map(f => sendFCM(...)));

// ✅ New
await pushNotificationHelper.notifyOrderFollowers(
  orderId, title, body
);
```

## Roadmap

### Planned Features

- [ ] Notification scheduling (delayed send)
- [ ] Template system for consistent messaging
- [ ] A/B testing for notification content
- [ ] Analytics dashboard integration
- [ ] Silent notifications for background updates
- [ ] Rich media support (images, actions)
- [ ] Notification grouping/threading
- [ ] Multi-language support (i18n)

## Support & Contributing

### Documentation
- **Usage Guide**: `PUSH_NOTIFICATION_HELPER_GUIDE.md`
- **Integration Examples**: `PUSH_NOTIFICATION_INTEGRATION_EXAMPLES.tsx`
- **Unit Tests**: `pushNotificationHelper.test.ts`

### Getting Help
1. Check this README and usage guide
2. Review integration examples
3. Check Edge Function logs
4. Review unit tests for usage patterns

### Contributing
1. Add unit tests for new features
2. Update documentation
3. Follow existing code patterns
4. Maintain TypeScript strict mode
5. No breaking changes without major version bump

## License

Proprietary - MyDetailArea Application

---

**Version:** 1.0.0
**Last Updated:** 2025-10-27
**Maintained By:** MyDetailArea Development Team
