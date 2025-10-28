# Quick Reference: send-notification

One-page reference for daily use of the send-notification Edge Function.

## 🚀 Quick Deploy

```bash
# Set FCM key
supabase secrets set FCM_SERVER_KEY=your_fcm_server_key

# Deploy
supabase functions deploy send-notification

# View logs
supabase functions logs send-notification --follow
```

## 📡 API Call

### TypeScript (Frontend)

```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    userId: 'user-uuid',
    dealerId: 42,
    title: 'Order Status Update',
    body: 'Your order is ready',
    url: '/orders/123',  // optional
    data: { orderId: '123' }  // optional
  }
})

if (error) {
  console.error('Failed:', error)
} else {
  console.log(`Sent to ${data.sent} device(s)`)
}
```

### cURL

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{
    "userId": "user-uuid",
    "dealerId": 42,
    "title": "Test",
    "body": "Test notification"
  }'
```

## 📥 Request Format

```typescript
{
  userId: string,        // Required: User UUID
  dealerId: number,      // Required: Dealer ID
  title: string,         // Required: Notification title
  body: string,          // Required: Notification body
  url?: string,          // Optional: Click URL
  data?: object          // Optional: Custom data
}
```

## 📤 Response Format

### Success
```json
{
  "success": true,
  "sent": 3,
  "failed": 0,
  "tokens": ["token1", "token2", "token3"]
}
```

### No Tokens (404)
```json
{
  "success": false,
  "error": "No active FCM tokens found for user",
  "sent": 0,
  "failed": 0,
  "tokens": []
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": "Invalid request payload",
  "details": ["userId is required and must be a string"]
}
```

## 🔍 Common Queries

### Check Active Tokens
```sql
SELECT * FROM fcm_tokens
WHERE user_id = 'user-uuid'
  AND dealer_id = 42
  AND is_active = true;
```

### View Recent Logs
```sql
SELECT * FROM edge_function_logs
WHERE function_name = 'send-notification'
ORDER BY created_at DESC
LIMIT 20;
```

### Success Rate (Last Hour)
```sql
SELECT
  SUM((data->>'sent')::int) as total_sent,
  SUM((data->>'failed')::int) as total_failed
FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND level = 'info'
  AND created_at > NOW() - INTERVAL '1 hour';
```

### Find Errors
```sql
SELECT * FROM edge_function_logs
WHERE function_name = 'send-notification'
  AND level = 'error'
ORDER BY created_at DESC
LIMIT 10;
```

## 🐛 Troubleshooting

### Issue: "No active FCM tokens found"
**Cause**: User hasn't registered any tokens
**Fix**: Verify frontend FCM token registration

### Issue: "FCM_SERVER_KEY not configured"
**Cause**: Environment variable not set
**Fix**: `supabase secrets set FCM_SERVER_KEY=your_key`

### Issue: All notifications failing
**Cause**: Invalid FCM server key
**Fix**: Verify key in Firebase Console → Project Settings → Cloud Messaging

### Issue: Some notifications failing
**Cause**: Invalid/expired tokens (expected)
**Action**: Tokens are auto-deactivated, no action needed

## 🔧 Test Function

```bash
# Set test env vars
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your_anon_key
export TEST_USER_ID=user-uuid
export TEST_DEALER_ID=1

# Run tests
cd supabase/functions/send-notification
deno run --allow-net --allow-env test.ts
```

## 📊 Monitoring Commands

```bash
# Real-time logs
supabase functions logs send-notification --follow

# Last 100 entries
supabase functions logs send-notification --tail 100

# List all functions
supabase functions list

# Check secrets
supabase secrets list
```

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FCM_SERVER_KEY` | ✅ Yes | Firebase Cloud Messaging server key |
| `SUPABASE_URL` | Auto | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto | Service role key for database access |

## 📝 HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Notification(s) sent |
| 400 | Bad Request | Check request payload |
| 404 | Not Found | No active tokens for user |
| 405 | Method Not Allowed | Use POST method |
| 500 | Server Error | Check logs for details |

## 🎯 Use Case Examples

### Order Status Change
```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    userId: order.assigned_to,
    dealerId: order.dealer_id,
    title: 'Order Status Update',
    body: `Order #${order.number} is now ${newStatus}`,
    url: `/orders/${order.type}/${order.id}`,
    data: { type: 'order_update', orderId: order.id }
  }
})
```

### New Assignment
```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    userId: assignedUserId,
    dealerId: currentDealerId,
    title: 'New Order Assignment',
    body: `You've been assigned to order #${orderNumber}`,
    url: `/orders/service/${orderId}`,
    data: { type: 'assignment', orderId }
  }
})
```

### New Comment
```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    userId: followerId,
    dealerId: order.dealer_id,
    title: 'New Comment',
    body: `${userName} commented on order #${orderNumber}`,
    url: `/orders/${orderType}/${orderId}`,
    data: { type: 'comment', orderId, commenterId }
  }
})
```

## 📚 Full Documentation

- **API Reference**: [README.md](./README.md)
- **Integration Guide**: [INTEGRATION.md](./INTEGRATION.md)
- **Deployment Guide**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Complete Summary**: [SUMMARY.md](./SUMMARY.md)

## 🆘 Support

1. Check function logs: `supabase functions logs send-notification`
2. Query database logs: `SELECT * FROM edge_function_logs`
3. Verify FCM key: `supabase secrets list`
4. Test manually: Use cURL command above
5. Check Supabase status: [status.supabase.com](https://status.supabase.com)

---

**Function**: `send-notification`
**Location**: `supabase/functions/send-notification/`
**Status**: ✅ Ready for Production
