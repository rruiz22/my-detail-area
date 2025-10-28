# Send Notification Edge Function

Enterprise-grade Firebase Cloud Messaging (FCM) notification sender for the My Detail Area dealership management system.

## Overview

This Edge Function sends push notifications to users via Firebase Cloud Messaging using the Legacy HTTP API. It retrieves active FCM tokens from the database and sends notifications with proper error handling, token validation, and logging.

## Features

- **Multi-token support**: Sends to all active tokens for a user/dealer combination
- **Token validation**: Automatically deactivates invalid or unregistered tokens
- **Comprehensive logging**: Logs all operations to `edge_function_logs` table
- **Error handling**: Proper HTTP status codes and detailed error messages
- **Type safety**: Full TypeScript implementation with strict types
- **CORS support**: Handles preflight requests correctly

## API Specification

### Endpoint

```
POST /functions/v1/send-notification
```

### Headers

```
Content-Type: application/json
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
```

### Request Payload

```typescript
{
  userId: string,           // User ID to send notification to (UUID)
  dealerId: number,         // Dealership ID (bigint)
  title: string,           // Notification title (required)
  body: string,            // Notification body (required)
  url?: string,            // Optional URL to open on click
  data?: Record<string, any> // Optional additional data payload
}
```

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "sent": 3,
  "failed": 0,
  "tokens": [
    "fcm_token_1",
    "fcm_token_2",
    "fcm_token_3"
  ]
}
```

#### Partial Success (200 OK)

```json
{
  "success": true,
  "sent": 2,
  "failed": 1,
  "tokens": [
    "fcm_token_1",
    "fcm_token_2"
  ],
  "errors": [
    "FCM API error: 400"
  ]
}
```

#### No Tokens Found (404 Not Found)

```json
{
  "success": false,
  "error": "No active FCM tokens found for user",
  "sent": 0,
  "failed": 0,
  "tokens": []
}
```

#### Validation Error (400 Bad Request)

```json
{
  "success": false,
  "error": "Invalid request payload",
  "details": [
    "userId is required and must be a string",
    "title is required and must be a string"
  ]
}
```

#### Server Error (500 Internal Server Error)

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Detailed error message",
  "sent": 0,
  "failed": 0,
  "tokens": []
}
```

## Environment Variables

Required environment variables (set in Supabase Dashboard → Project Settings → Edge Functions):

```bash
# Supabase Configuration (auto-configured)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Firebase Cloud Messaging (Legacy API)
FCM_SERVER_KEY=your_fcm_server_key  # From Firebase Console → Project Settings → Cloud Messaging
```

### Getting FCM Server Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `my-detail-area`
3. Navigate to **Project Settings** → **Cloud Messaging**
4. Copy the **Server key** (Legacy API)
5. Set as `FCM_SERVER_KEY` in Supabase Edge Functions secrets

## Database Schema

### FCM Tokens Table

```sql
CREATE TABLE fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id bigint NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, dealer_id, fcm_token)
);
```

### Edge Function Logs Table

```sql
CREATE TABLE edge_function_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  level text NOT NULL,  -- 'info' | 'warn' | 'error' | 'debug'
  message text NOT NULL,
  data jsonb,
  error_details jsonb,
  created_at timestamptz DEFAULT now()
);
```

## Usage Examples

### TypeScript/JavaScript (Frontend)

```typescript
import { supabase } from '@/lib/supabase'

async function sendNotification(
  userId: string,
  dealerId: number,
  title: string,
  body: string,
  url?: string
) {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId,
        dealerId,
        title,
        body,
        url,
        data: {
          type: 'order_update',
          orderId: '12345'
        }
      }
    })

    if (error) {
      console.error('Failed to send notification:', error)
      return { success: false, error }
    }

    console.log(`Notification sent to ${data.sent} device(s)`)
    return { success: true, data }
  } catch (err) {
    console.error('Unexpected error:', err)
    return { success: false, error: err }
  }
}

// Example: Notify user about order status change
await sendNotification(
  'user-uuid-here',
  42,
  'Order Status Update',
  'Your service order #1234 is now in progress',
  '/orders/service/1234'
)
```

### cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "userId": "user-uuid-here",
    "dealerId": 42,
    "title": "Order Status Update",
    "body": "Your service order #1234 is now in progress",
    "url": "/orders/service/1234",
    "data": {
      "type": "order_update",
      "orderId": "1234"
    }
  }'
```

## Architecture & Implementation

### Token Management

The function queries the `fcm_tokens` table using:

```sql
SELECT * FROM fcm_tokens
WHERE user_id = $1
AND dealer_id = $2
AND is_active = true
```

This ensures:
- Only active tokens receive notifications
- Dealership-scoped notifications (multi-tenancy)
- User-specific targeting

### Error Handling

The function handles several error scenarios:

1. **Invalid Registration**: Token is marked as inactive
2. **Not Registered**: Token is marked as inactive
3. **Network Errors**: Logged but don't affect other tokens
4. **Validation Errors**: Returned with 400 status code
5. **Missing Tokens**: Returned with 404 status code

### Logging Strategy

All operations are logged to `edge_function_logs`:

- **Debug**: FCM payload details (token preview only)
- **Info**: Successful sends, token counts
- **Warn**: Validation failures
- **Error**: API errors, exceptions

## Testing

### Local Testing

```bash
# Start Supabase local development
supabase start

# Deploy function locally
supabase functions deploy send-notification --no-verify-jwt

# Test with curl
curl -X POST http://localhost:54321/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "dealerId": 1,
    "title": "Test Notification",
    "body": "This is a test"
  }'
```

### Production Deployment

```bash
# Deploy to production
supabase functions deploy send-notification

# View logs
supabase functions logs send-notification --follow
```

## Integration Points

This function is designed to be called from:

1. **Order Workflows**: Notify users when order status changes
2. **Assignment System**: Notify users when assigned to an order
3. **Chat System**: Notify users of new messages
4. **Report Generation**: Notify users when reports are ready
5. **Scheduled Jobs**: Batch notifications for reminders/updates

### Example Integration: Order Status Change

```typescript
// hooks/useOrderManagement.ts
import { supabase } from '@/lib/supabase'

async function updateOrderStatus(orderId: string, newStatus: string) {
  // Update order in database
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (updateError) throw updateError

  // Get order details for notification
  const { data: order } = await supabase
    .from('orders')
    .select('*, profiles!assigned_to(*)')
    .eq('id', orderId)
    .single()

  if (!order?.assigned_to) return

  // Send notification to assigned user
  await supabase.functions.invoke('send-notification', {
    body: {
      userId: order.assigned_to,
      dealerId: order.dealer_id,
      title: 'Order Status Update',
      body: `Order #${order.order_number} status changed to ${newStatus}`,
      url: `/orders/${order.type}/${orderId}`,
      data: {
        type: 'order_status_change',
        orderId,
        newStatus,
        orderType: order.type
      }
    }
  })
}
```

## Security Considerations

- **Service Role Key**: Used to bypass RLS policies for reading tokens
- **Input Validation**: All inputs are validated before processing
- **Token Privacy**: Only token previews are logged (first 20 chars)
- **CORS**: Configured for cross-origin requests
- **Rate Limiting**: Consider implementing rate limiting for production use

## Performance

- **Batch Processing**: Sends to multiple tokens in parallel using `Promise.allSettled`
- **Error Isolation**: One failed token doesn't affect others
- **Database Indexes**: Optimized queries with indexes on user_id, dealer_id, is_active
- **Token Cleanup**: Invalid tokens are automatically marked inactive

## Monitoring

Query logs from the database:

```sql
-- View recent notification activity
SELECT * FROM edge_function_logs
WHERE function_name = 'send-notification'
ORDER BY created_at DESC
LIMIT 100;

-- Count notifications by result
SELECT
  level,
  COUNT(*) as count
FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY level;

-- Find failed notifications
SELECT * FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND level = 'error'
  AND created_at > NOW() - INTERVAL '24 hours';
```

## Troubleshooting

### No notifications received

1. Check FCM_SERVER_KEY is set correctly
2. Verify tokens exist in fcm_tokens table and are active
3. Check edge_function_logs for errors
4. Verify Firebase Cloud Messaging is enabled in Firebase Console

### Tokens being marked inactive

This is expected behavior when:
- Device uninstalls the app
- User revokes notification permissions
- Token expires or becomes invalid

Solution: Frontend should re-register tokens when necessary.

### High failure rate

1. Check FCM server key is valid
2. Verify Firebase project configuration
3. Review error details in logs
4. Check network connectivity from Supabase Edge Functions

## Related Documentation

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [FCM Legacy HTTP API Reference](https://firebase.google.com/docs/cloud-messaging/http-server-ref)

## Version History

- **v1.0.0** (2025-10-27): Initial implementation with FCM Legacy API support
