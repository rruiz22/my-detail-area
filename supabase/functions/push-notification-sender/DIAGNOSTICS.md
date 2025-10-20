# Push Notification Diagnostics Guide

## Overview
This document provides diagnostic queries and troubleshooting steps for the push-notification-sender Edge Function.

## Quick Diagnostic Queries

### 1. View Recent Logs (Last Hour)
```sql
SELECT
  created_at,
  level,
  message,
  data,
  error_details
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 50;
```

### 2. View Recent Errors Only
```sql
SELECT
  created_at,
  message,
  data->'subscription_id' as subscription_id,
  data->'endpoint' as endpoint,
  error_details->'message' as error_message,
  error_details->'statusCode' as status_code,
  error_details->'body' as error_body,
  error_details->'stack' as stack_trace
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
  AND level = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### 3. Error Summary (Last 24 Hours)
```sql
SELECT
  error_details->>'message' as error_type,
  error_details->>'statusCode' as status_code,
  COUNT(*) as error_count,
  MAX(created_at) as last_occurrence
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
  AND level = 'error'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_details->>'message', error_details->>'statusCode'
ORDER BY error_count DESC;
```

### 4. Success Rate Analysis
```sql
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE level = 'info' AND message = 'Push notification sent successfully') as successful,
    COUNT(*) FILTER (WHERE level = 'error' AND message = 'Push notification send failed') as failed
  FROM edge_function_logs
  WHERE function_name = 'push-notification-sender'
    AND created_at > NOW() - INTERVAL '1 hour'
)
SELECT
  successful,
  failed,
  (successful + failed) as total,
  CASE
    WHEN (successful + failed) > 0
    THEN ROUND((successful::numeric / (successful + failed)) * 100, 2)
    ELSE 0
  END as success_rate_percentage
FROM stats;
```

### 5. Check Active Subscriptions
```sql
SELECT
  id,
  user_id,
  dealer_id,
  endpoint,
  created_at,
  is_active
FROM push_subscriptions
WHERE is_active = true
ORDER BY created_at DESC;
```

### 6. Subscription-Specific Error History
```sql
SELECT
  l.created_at,
  l.level,
  l.message,
  l.error_details->'statusCode' as status_code,
  l.error_details->'message' as error_message,
  s.endpoint
FROM edge_function_logs l
JOIN push_subscriptions s ON s.id::text = l.data->>'subscription_id'
WHERE l.function_name = 'push-notification-sender'
  AND s.id = 'YOUR_SUBSCRIPTION_ID_HERE'
ORDER BY l.created_at DESC
LIMIT 20;
```

## Common Error Patterns

### WNS-Specific Errors

#### 1. 401 Unauthorized
**Symptom**: `statusCode: 401`
**Cause**: VAPID signature invalid or keys not properly configured
**Solution**:
- Verify VAPID keys in Supabase secrets
- Ensure keys match those used in frontend subscription
- Check VAPID_SUBJECT format (`mailto:email@domain.com`)

#### 2. 403 Forbidden
**Symptom**: `statusCode: 403`
**Cause**: WNS rejected the request (invalid encryption or authentication)
**Solution**:
- Verify web-push library is correctly encrypting payload
- Check that subscription keys (p256dh, auth) are valid
- Ensure endpoint URL is correct WNS URL

#### 3. 404 Not Found
**Symptom**: `statusCode: 404`
**Cause**: Push subscription expired or deleted on WNS
**Solution**:
- Subscription automatically marked as inactive
- User needs to re-subscribe from browser

#### 4. 410 Gone
**Symptom**: `statusCode: 410`
**Cause**: Push subscription permanently invalid
**Solution**:
- Subscription automatically marked as inactive
- User needs to re-subscribe from browser

#### 5. Network/Connection Errors
**Symptom**: Error message contains "fetch failed" or network-related errors
**Cause**: Deno environment cannot reach WNS servers
**Solution**:
- Check Supabase Edge Function network connectivity
- Verify WNS endpoint is accessible from Supabase infrastructure
- May require allowlist in firewall

## Web-Push Library Compatibility

### Potential Deno Issues

The npm:web-push@3.6.7 library may have compatibility issues in Deno environment:

1. **Node.js crypto dependencies**: web-push uses Node crypto APIs
2. **Buffer vs Uint8Array**: Type conversions may fail
3. **npm compatibility layer**: Deno's npm: imports may not fully support all features

### Alternative Solutions

If web-push continues failing, consider:

#### Option 1: Use Deno-native library
```typescript
import { sendWebPush } from "https://deno.land/x/webpush/mod.ts";
```

#### Option 2: Manual WNS implementation
```typescript
// Generate VAPID JWT manually
async function generateVapidJWT() {
  // ES256 signing with Web Crypto API
  const header = { typ: "JWT", alg: "ES256" };
  const claims = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 43200,
    sub: VAPID_SUBJECT
  };
  // ... sign with VAPID private key
}

// Encrypt payload with aes128gcm
async function encryptPayload(payload: string, subscription: PushSubscription) {
  // RFC 8291 encryption
  // ... use Web Crypto API for aes128gcm
}
```

## Troubleshooting Steps

### Step 1: Check Environment Variables
```sql
-- Run this in Supabase SQL Editor to verify Edge Function can access secrets
-- Note: This won't show actual values for security, but can verify they exist
```

In Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Verify these secrets exist:
   - `VAPID_PRIVATE_KEY`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_SUBJECT`

### Step 2: Test with Simple Payload
Try sending a minimal notification:
```json
{
  "userId": "YOUR_USER_ID",
  "dealerId": YOUR_DEALER_ID,
  "payload": {
    "title": "Test",
    "body": "Simple test"
  }
}
```

### Step 3: Check Subscription Validity
```sql
SELECT
  id,
  endpoint,
  p256dh_key,
  auth_key,
  LENGTH(p256dh_key) as p256dh_length,
  LENGTH(auth_key) as auth_length,
  is_active
FROM push_subscriptions
WHERE user_id = 'YOUR_USER_ID'
  AND dealer_id = YOUR_DEALER_ID;
```

Expected:
- `p256dh_key`: 87 characters (base64url encoded, 65 bytes)
- `auth_key`: 24 characters (base64url encoded, 16 bytes)
- `endpoint`: Starts with `https://wns2-` for Windows

### Step 4: Monitor Real-Time Logs
```sql
-- Live tail of logs (refresh every 5 seconds)
SELECT
  created_at,
  level,
  message,
  data,
  error_details
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
ORDER BY created_at DESC
LIMIT 10;
```

### Step 5: Test Direct WNS Call
Use the diagnostic script to test WNS directly:
```bash
# See test-wns-direct.sh
```

## Next Steps Based on Errors

### If Error: "VAPID keys not configured"
1. Set secrets in Supabase Dashboard
2. Redeploy Edge Function
3. Test again

### If Error: Network/Connection failures
1. Check Supabase status page
2. Verify WNS service status
3. Test from different network

### If Error: 401/403 (Authentication/Authorization)
1. **High Priority**: This suggests web-push library incompatibility with Deno
2. Consider implementing manual VAPID JWT signing
3. Or switch to Deno-native web-push library

### If Error: Encryption-related
1. **High Priority**: This suggests web-push encryption not working in Deno
2. Consider manual aes128gcm implementation using Web Crypto API
3. Or use tested Deno Edge Function example

## Deployment Instructions

### 1. Apply Database Migration
```bash
# From project root
supabase db push
```

### 2. Deploy Updated Edge Function
```bash
supabase functions deploy push-notification-sender
```

### 3. Verify Deployment
```bash
# Check function version
supabase functions list

# Test function
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notification-sender \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR_USER_ID","dealerId":5,"payload":{"title":"Test","body":"Test notification"}}'
```

### 4. Check Logs Immediately
```sql
SELECT * FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
ORDER BY created_at DESC
LIMIT 5;
```

## Expected Outcomes

### If Successful
You should see:
```json
{
  "success": true,
  "sent": 1,
  "failed": 0,
  "total": 1
}
```

And in logs table:
- 1 debug log: "Attempting to send push notification"
- 1 info log: "Push notification sent successfully"

### If Failed
You should see:
```json
{
  "success": true,
  "sent": 0,
  "failed": 1,
  "total": 1
}
```

And in logs table:
- 1 debug log: "Attempting to send push notification"
- 1 error log: "Push notification send failed" with FULL error details

## Contact/Escalation

If errors persist after following this guide:
1. Collect logs from `edge_function_logs` table
2. Include subscription details (without sensitive keys)
3. Document exact error message and status code
4. Consider switching to alternative implementation (manual VAPID or Deno-native library)
