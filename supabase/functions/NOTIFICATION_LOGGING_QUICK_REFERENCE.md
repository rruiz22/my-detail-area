# Notification Delivery Logging - Quick Reference

## 🚀 Quick Start (5 minutos)

### 1. Deploy Sistema
```bash
cd supabase/functions
./deploy-notification-logging.sh production
```

### 2. Integrar en tu Edge Function
```typescript
import { createNotificationLogger } from '../_shared/notification-logger.ts'

const logger = createNotificationLogger(supabase)

// Pre-send
const log = await logger.logDelivery({
  dealership_id: '123',
  notification_id: crypto.randomUUID(),
  user_id: userId,
  channel: 'push',
  status: 'pending',
  provider: 'fcm',
  notification_title: title,
  notification_body: body
})

// Post-send
await logger.updateStatus(log.id, 'sent', {
  sent_at: new Date(),
  latency_ms: Date.now() - startTime
})
```

### 3. Configurar Webhook
```
URL: https://[project-ref].supabase.co/functions/v1/process-notification-webhook
Method: POST
Events: sent, delivered, clicked, failed
```

---

## 📋 Common Use Cases

### Log Single Delivery
```typescript
const result = await logger.logDelivery({
  dealership_id: dealerId.toString(),
  notification_id: notificationId,
  user_id: userId,
  channel: 'push', // 'push' | 'email' | 'sms' | 'in_app'
  status: 'pending',
  provider: 'fcm',
  notification_title: title,
  notification_body: body
})
```

### Update Status
```typescript
await logger.updateStatus(logId, 'sent', {
  sent_at: new Date(),
  latency_ms: 150
})
```

### Update by Provider ID
```typescript
await logger.updateStatusByProviderId(
  'fcm-msg-12345',
  'delivered'
)
```

### Bulk Operations
```typescript
const logs = notifications.map(n => ({
  dealership_id: n.dealerId,
  notification_id: n.id,
  user_id: n.userId,
  channel: 'push',
  status: 'pending'
}))

const result = await logger.logBulkDelivery(logs)
console.log(`Inserted: ${result.inserted}, Failed: ${result.failed}`)
```

---

## 🎯 Status Values

| Status | Meaning | When to Use |
|--------|---------|-------------|
| `pending` | Queued, not sent yet | Initial state |
| `sent` | Sent to provider | After successful API call |
| `delivered` | Confirmed delivery | Via webhook |
| `failed` | Permanent failure | After provider error |
| `clicked` | User clicked notification | Via webhook |
| `read` | User read notification | Via webhook (in-app) |
| `bounced` | Email bounced | Via webhook (email) |
| `unsubscribed` | User unsubscribed | User action |

---

## 🔌 Webhook Configuration

### OneSignal
```
URL: https://[ref].supabase.co/functions/v1/process-notification-webhook
Events: sent, delivered, clicked
Secret: supabase secrets set ONESIGNAL_WEBHOOK_SECRET=<secret>
```

### Twilio
```
URL: Same
Method: POST (Status Callback URL)
Secret: supabase secrets set TWILIO_WEBHOOK_SECRET=<auth_token>
```

### Resend
```
URL: Same
Events: email.sent, email.delivered, email.opened, email.clicked
Secret: supabase secrets set RESEND_WEBHOOK_SECRET=<secret>
```

---

## 📊 Useful Queries

### Recent Deliveries
```sql
SELECT channel, status, COUNT(*)
FROM notification_delivery_log
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY channel, status;
```

### Success Rate
```sql
SELECT
  channel,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('sent', 'delivered')) / COUNT(*), 2) as success_rate
FROM notification_delivery_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY channel;
```

### Failed Deliveries
```sql
SELECT id, channel, error_code, error_message, failed_at
FROM notification_delivery_log
WHERE status = 'failed'
  AND failed_at >= NOW() - INTERVAL '1 hour'
ORDER BY failed_at DESC;
```

### Average Latency
```sql
SELECT
  provider,
  ROUND(AVG(latency_ms), 2) as avg_latency
FROM notification_delivery_log
WHERE latency_ms IS NOT NULL
GROUP BY provider;
```

---

## 🐛 Debugging

### Check Logs
```bash
# Edge function logs
supabase functions logs send-notification --tail

# Webhook processor logs
supabase functions logs process-notification-webhook --tail

# Retry system logs
supabase functions logs retry-failed-notifications
```

### Test Webhook
```bash
curl -X POST https://[ref].supabase.co/functions/v1/process-notification-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "fcm",
    "event_type": "delivered",
    "data": {
      "message_id": "test-msg-123"
    }
  }'
```

### Check Database
```sql
-- Find log by notification ID
SELECT * FROM notification_delivery_log
WHERE notification_id = 'your-notification-id';

-- Find log by provider message ID
SELECT * FROM notification_delivery_log
WHERE provider_message_id = 'fcm-msg-12345';

-- Check webhook processing
SELECT * FROM edge_function_logs
WHERE function_name = 'process-notification-webhook'
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ Common Issues

### Issue: Logs not appearing
**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'notification_delivery_log';

-- Verify service role access
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON notification_delivery_log
  FOR ALL TO service_role USING (true);
```

### Issue: Webhooks not updating status
**Solution:**
```typescript
// Ensure provider_message_id is set correctly
await supabase
  .from('notification_delivery_log')
  .update({ provider_message_id: messageId })
  .eq('id', logId)
```

### Issue: High failure rate
**Solution:**
```sql
-- Check error codes
SELECT error_code, COUNT(*) as count
FROM notification_delivery_log
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY count DESC;
```

---

## 🔑 Environment Variables

Required:
```bash
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FIREBASE_SERVICE_ACCOUNT={"type":"service_account"...}
FIREBASE_PROJECT_ID=my-detail-area
WEBHOOK_SECRET=your_general_secret
```

Optional (Provider Webhooks):
```bash
ONESIGNAL_WEBHOOK_SECRET=onesignal_secret
TWILIO_WEBHOOK_SECRET=twilio_auth_token
RESEND_WEBHOOK_SECRET=resend_whsec_secret
```

---

## 📈 Performance Tips

1. **Use Batch Operations for Broadcasts**
   ```typescript
   await logger.logBulkDelivery(notifications) // Not individual calls
   ```

2. **Don't Block on Logging**
   ```typescript
   // Fire and forget (non-critical)
   logger.logDelivery(...).catch(console.error)
   ```

3. **Index Your Queries**
   ```sql
   -- Already indexed: dealership_id, user_id, status, channel, provider_message_id
   ```

4. **Use Webhook Updates (Not Polling)**
   ```typescript
   // ✅ Webhook updates status automatically
   // ❌ Don't poll database for status changes
   ```

---

## 🧪 Testing

### Unit Tests
```bash
deno test supabase/functions/_shared/notification-logger.test.ts
```

### Integration Test
```bash
# Send test notification
curl -X POST https://[ref].supabase.co/functions/v1/send-notification \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "dealerId": 123,
    "title": "Test",
    "body": "Test body"
  }'

# Check if logged
supabase db psql -c "SELECT * FROM notification_delivery_log ORDER BY created_at DESC LIMIT 1;"
```

---

## 📚 Full Documentation

- **System Overview:** `NOTIFICATION_DELIVERY_LOGGING.md`
- **Webhook Setup:** `WEBHOOK_CONFIGURATION_GUIDE.md`
- **Executive Summary:** `NOTIFICATION_LOGGING_SUMMARY.md`
- **Helper Module:** `_shared/notification-logger.ts`

---

## 🆘 Support

**Issues?**
1. Check logs: `supabase functions logs --tail`
2. Query database: `SELECT * FROM notification_delivery_log`
3. Review documentation: `NOTIFICATION_DELIVERY_LOGGING.md`

**Contact:** developers@mydetailarea.com

---

## ✅ Checklist

Before going to production:

- [ ] Deploy functions: `./deploy-notification-logging.sh production`
- [ ] Set webhook secrets: `supabase secrets set ...`
- [ ] Configure provider webhooks (OneSignal, Twilio, Resend)
- [ ] Test notification sending
- [ ] Test webhook processing
- [ ] Verify logs in database
- [ ] Set up cron job for retries
- [ ] Monitor analytics dashboard

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0
