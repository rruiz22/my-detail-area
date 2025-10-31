# Webhook Configuration Guide

Complete guide for configuring webhooks from notification providers to track delivery status in MyDetailArea.

## Table of Contents

1. [Firebase Cloud Messaging (FCM)](#firebase-cloud-messaging-fcm)
2. [OneSignal](#onesignal)
3. [Twilio SMS](#twilio-sms)
4. [Resend Email](#resend-email)
5. [Testing Webhooks](#testing-webhooks)
6. [Troubleshooting](#troubleshooting)

---

## Firebase Cloud Messaging (FCM)

### Overview
FCM doesn't provide native webhooks, but you can set up delivery receipts using FCM data messages or integrate with third-party services.

### Option 1: Client-Side Reporting (Recommended)

Configure the PWA service worker to report delivery events:

```javascript
// public/service-worker.js

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Report click to backend
  fetch('/api/notification-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'fcm',
      event_type: 'clicked',
      data: {
        message_id: event.notification.data.fcm_message_id,
        timestamp: new Date().toISOString()
      }
    })
  });
});

self.addEventListener('push', (event) => {
  const data = event.data.json();

  // Report delivery to backend
  fetch('/api/notification-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'fcm',
      event_type: 'delivered',
      data: {
        message_id: data.fcm_message_id,
        timestamp: new Date().toISOString()
      }
    })
  });

  event.waitUntil(
    self.registration.showNotification(data.notification.title, {
      body: data.notification.body,
      data: data.data
    })
  );
});
```

### Option 2: Firebase Cloud Functions (Alternative)

```javascript
// Firebase Cloud Function
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

exports.fcmDeliveryStatus = functions.https.onRequest(async (req, res) => {
  const { messageId, status } = req.body;

  // Forward to Supabase webhook processor
  await fetch('https://[project-ref].supabase.co/functions/v1/process-notification-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-signature': generateHmacSignature(req.body)
    },
    body: JSON.stringify({
      provider: 'fcm',
      event_type: status,
      data: {
        message_id: messageId,
        timestamp: new Date().toISOString()
      }
    })
  });

  res.status(200).send('OK');
});
```

---

## OneSignal

### Step 1: Access Webhook Settings

1. Log in to [OneSignal Dashboard](https://app.onesignal.com)
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**

### Step 2: Configure Webhook URL

**Webhook URL:**
```
https://[your-project-ref].supabase.co/functions/v1/process-notification-webhook
```

Replace `[your-project-ref]` with your Supabase project reference ID (found in Supabase Dashboard → Settings → API).

### Step 3: Select Events

Enable the following events:
- ✅ **Sent** - Notification sent to device
- ✅ **Delivered** - Notification delivered (if supported by platform)
- ✅ **Clicked** - User clicked notification
- ✅ **Dismissed** - User dismissed notification (optional)

### Step 4: Configure Webhook Secret

1. Generate a secure random secret:
   ```bash
   openssl rand -hex 32
   ```

2. Add secret to OneSignal webhook configuration (if supported)

3. Store secret in Supabase:
   ```bash
   supabase secrets set ONESIGNAL_WEBHOOK_SECRET=your_generated_secret_here
   ```

### Step 5: Test Webhook

Send test notification:
```bash
curl -X POST https://onesignal.com/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic YOUR_REST_API_KEY" \
  -d '{
    "app_id": "YOUR_APP_ID",
    "included_segments": ["Test Users"],
    "contents": {"en": "Test Notification"},
    "headings": {"en": "Test"}
  }'
```

Check Supabase logs:
```sql
SELECT * FROM edge_function_logs
WHERE function_name = 'process-notification-webhook'
ORDER BY created_at DESC
LIMIT 10;
```

### Payload Example

OneSignal will send:
```json
{
  "event": "sent",
  "id": "notification-uuid",
  "userId": "player-id-12345",
  "timestamp": 1642252800,
  "app_id": "your-app-id",
  "device_type": 0
}
```

Our processor expects:
```json
{
  "provider": "onesignal",
  "event_type": "sent",
  "data": {
    "notification_id": "notification-uuid",
    "player_id": "player-id-12345",
    "device_type": 0
  }
}
```

---

## Twilio SMS

### Step 1: Access Twilio Console

1. Log in to [Twilio Console](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click on your phone number

### Step 2: Configure Status Callbacks

**Webhook URL:**
```
https://[your-project-ref].supabase.co/functions/v1/process-notification-webhook
```

**Configuration:**
1. Scroll to **Messaging Configuration** section
2. Under **A MESSAGE COMES IN**, select **Webhook**
3. Enter webhook URL
4. Select **HTTP POST** method
5. Under **STATUS CALLBACK URL**, enter same webhook URL
6. Click **Save**

### Step 3: Configure Webhook Authentication

Twilio uses request validation via signatures.

1. Get your Auth Token from Twilio Console → Account → General Settings
2. Store in Supabase:
   ```bash
   supabase secrets set TWILIO_WEBHOOK_SECRET=your_auth_token_here
   ```

### Step 4: Update Edge Function for Twilio Validation

The webhook processor already includes Twilio signature validation:

```typescript
// In process-notification-webhook/index.ts
function verifyTwilioSignature(signature: string, url: string, params: any): boolean {
  const twilioSignature = createHmac('sha1', TWILIO_WEBHOOK_SECRET)
    .update(url + Object.keys(params).sort().map(k => k + params[k]).join(''))
    .digest('base64')

  return signature === twilioSignature
}
```

### Payload Examples

**Twilio sends:**
```
MessageSid=SM12345
MessageStatus=delivered
To=+15551234567
From=+15559876543
ApiVersion=2010-04-01
```

**Our processor transforms to:**
```json
{
  "provider": "twilio",
  "event_type": "delivered",
  "data": {
    "MessageSid": "SM12345",
    "MessageStatus": "delivered",
    "To": "+15551234567",
    "From": "+15559876543"
  }
}
```

### Status Values

Twilio statuses mapped to our system:
- `queued` → ignored (transient)
- `sending` → ignored (transient)
- `sent` → `sent`
- `delivered` → `delivered`
- `failed` → `failed`
- `undelivered` → `failed`

---

## Resend Email

### Step 1: Access Resend Dashboard

1. Log in to [Resend Dashboard](https://resend.com)
2. Navigate to **Webhooks** in sidebar
3. Click **Add Webhook**

### Step 2: Configure Webhook

**Endpoint URL:**
```
https://[your-project-ref].supabase.co/functions/v1/process-notification-webhook
```

**Events to Subscribe:**
- ✅ `email.sent` - Email accepted by mail server
- ✅ `email.delivered` - Email delivered to inbox
- ✅ `email.opened` - Email opened by recipient
- ✅ `email.clicked` - Link clicked in email
- ✅ `email.bounced` - Email bounced (hard/soft)
- ✅ `email.complained` - Marked as spam
- ⚠️ `email.delivery_delayed` - Temporary delay (optional)

### Step 3: Configure Webhook Secret

1. Resend automatically generates a signing secret
2. Copy the secret (starts with `whsec_`)
3. Store in Supabase:
   ```bash
   supabase secrets set RESEND_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### Step 4: Verify Webhook Signature

Resend uses Svix for webhook signing. Our processor verifies signatures:

```typescript
function verifyResendSignature(signature: string, timestamp: string, payload: string): boolean {
  const expectedSignature = createHmac('sha256', RESEND_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest('hex')

  return signature === expectedSignature
}
```

### Payload Example

```json
{
  "type": "email.delivered",
  "created_at": "2024-01-15T10:00:00.000Z",
  "data": {
    "created_at": "2024-01-15T09:59:45.000Z",
    "email_id": "re_12345abcde",
    "from": "invitations@mydetailarea.com",
    "to": ["user@example.com"],
    "subject": "You're invited to MyDetailArea",
    "html": "...",
    "text": "..."
  }
}
```

### Testing Resend Webhook

Send test email:
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer re_your_api_key' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "invitations@mydetailarea.com",
    "to": ["test@example.com"],
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

Trigger test webhook from Resend dashboard:
1. Go to Webhooks → Your webhook
2. Click **Send test event**
3. Select event type (e.g., `email.delivered`)

---

## Testing Webhooks

### Manual Testing with cURL

#### Test FCM Event
```bash
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/process-notification-webhook \
  -H "Content-Type: application/json" \
  -H "webhook-signature: $(echo -n '{"provider":"fcm","event_type":"delivered","data":{"message_id":"test-123"}}' | openssl dgst -sha256 -hmac 'your_secret' | awk '{print $2}')" \
  -d '{
    "provider": "fcm",
    "event_type": "delivered",
    "data": {
      "message_id": "test-msg-12345",
      "delivered_at": "2024-01-15T10:00:00Z"
    }
  }'
```

#### Test OneSignal Event
```bash
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/process-notification-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "onesignal",
    "event_type": "clicked",
    "data": {
      "notification_id": "test-notif-12345",
      "player_id": "player-abc"
    }
  }'
```

#### Test Twilio Event
```bash
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/process-notification-webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'provider=twilio' \
  -d 'event_type=delivered' \
  -d 'MessageSid=SM12345' \
  -d 'MessageStatus=delivered' \
  -d 'To=+15551234567'
```

#### Test Resend Event
```bash
curl -X POST \
  https://[project-ref].supabase.co/functions/v1/process-notification-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "resend",
    "event_type": "email.delivered",
    "data": {
      "email_id": "re_test_12345",
      "to": "test@example.com",
      "subject": "Test Email"
    }
  }'
```

### Verify Webhook Processing

Check delivery logs:
```sql
-- Recent webhook updates
SELECT
  id,
  channel,
  provider,
  provider_message_id,
  status,
  updated_at,
  metadata
FROM notification_delivery_log
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- Webhook processing logs
SELECT
  function_name,
  level,
  message,
  data,
  created_at
FROM edge_function_logs
WHERE function_name = 'process-notification-webhook'
  AND created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Webhook Debugging Tools

#### 1. Webhook.site (Testing Endpoint)

Use [webhook.site](https://webhook.site) to inspect raw webhook payloads:

1. Go to webhook.site
2. Copy your unique URL
3. Configure provider to send to this URL temporarily
4. Inspect raw payloads
5. Copy payload structure and test with your actual endpoint

#### 2. ngrok (Local Development)

Test webhooks locally:

```bash
# Install ngrok
npm install -g ngrok

# Start Supabase locally
supabase start

# Expose local Edge Function
ngrok http 54321

# Use ngrok URL in provider webhook config
https://[random-id].ngrok.io/functions/v1/process-notification-webhook
```

#### 3. Supabase Edge Function Logs

Real-time logs:
```bash
supabase functions logs process-notification-webhook --tail
```

---

## Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Events

**Check webhook URL:**
```bash
# Test endpoint accessibility
curl https://[project-ref].supabase.co/functions/v1/process-notification-webhook

# Should return 405 Method Not Allowed (GET not supported)
# This confirms endpoint is reachable
```

**Verify provider configuration:**
- Double-check webhook URL in provider dashboard
- Ensure correct HTTP method (POST)
- Verify events are enabled

#### 2. Signature Verification Failing

**Check secret configuration:**
```sql
-- Verify secret is set (won't show actual value)
SELECT COUNT(*) FROM pg_settings WHERE name = 'ONESIGNAL_WEBHOOK_SECRET';
```

**Debug signature verification:**
```typescript
// Temporarily log signatures (REMOVE IN PRODUCTION)
console.log('Received signature:', signature)
console.log('Expected signature:', expectedSignature)
console.log('Payload:', payload)
```

#### 3. Status Not Updating in Database

**Check provider_message_id:**
```sql
-- Find log by provider message ID
SELECT * FROM notification_delivery_log
WHERE provider_message_id = 'your-message-id';

-- If not found, check original log creation
SELECT * FROM notification_delivery_log
WHERE notification_id = 'your-notification-id'
ORDER BY created_at DESC;
```

**Verify update permissions:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'notification_delivery_log';

-- Temporarily disable RLS for debugging (ENABLE AFTER!)
ALTER TABLE notification_delivery_log DISABLE ROW LEVEL SECURITY;
```

#### 4. High Webhook Failure Rate

**Check rate limits:**
```sql
-- Webhook failures in last hour
SELECT
  provider,
  COUNT(*) as failures,
  array_agg(DISTINCT error_message) as errors
FROM edge_function_logs
WHERE function_name = 'process-notification-webhook'
  AND level = 'error'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY provider;
```

**Implement retry logic in provider:**
Most providers (Resend, OneSignal) automatically retry failed webhooks with exponential backoff.

---

## Security Best Practices

### 1. Always Verify Signatures

Never process webhooks without signature verification in production:

```typescript
if (!isDevelopment && !verifyWebhookSignature(provider, signature, rawBody)) {
  return new Response('Invalid signature', { status: 401 })
}
```

### 2. Use HTTPS Only

Ensure webhook URLs use HTTPS:
- ✅ `https://[project-ref].supabase.co/functions/v1/process-notification-webhook`
- ❌ `http://[project-ref].supabase.co/functions/v1/process-notification-webhook`

### 3. Rotate Secrets Regularly

```bash
# Generate new secret
openssl rand -hex 32

# Update in provider dashboard
# Update in Supabase
supabase secrets set PROVIDER_WEBHOOK_SECRET=new_secret_here
```

### 4. Monitor Webhook Failures

Set up alerts for high failure rates:
```sql
-- Alert if >10 webhook failures in 5 minutes
SELECT COUNT(*) as failures
FROM edge_function_logs
WHERE function_name = 'process-notification-webhook'
  AND level = 'error'
  AND created_at >= NOW() - INTERVAL '5 minutes'
HAVING COUNT(*) > 10;
```

---

## Reference

### Provider Documentation

- **FCM:** https://firebase.google.com/docs/cloud-messaging
- **OneSignal:** https://documentation.onesignal.com/docs/webhooks
- **Twilio:** https://www.twilio.com/docs/sms/twiml/statusCallbackUrl
- **Resend:** https://resend.com/docs/api-reference/webhooks

### Webhook Signature Standards

- **HMAC-SHA256:** OneSignal, Resend, Custom
- **Twilio Signature:** SHA1-based validation
- **Svix:** Resend (modern standard)

### HTTP Status Codes

Return appropriate codes from webhook processor:
- `200 OK` - Event processed successfully
- `401 Unauthorized` - Invalid signature
- `400 Bad Request` - Malformed payload
- `500 Internal Server Error` - Processing error

Providers will retry on `5xx` errors, but not `4xx` errors.
