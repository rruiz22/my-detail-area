# Deployment and Testing Guide - v2.1.0

## Overview
This guide walks through deploying the enhanced push-notification-sender with diagnostic logging and testing to identify the WNS failure root cause.

## Prerequisites

- Supabase CLI installed
- Project linked to Supabase project
- VAPID keys configured in Supabase secrets

## Step 1: Apply Database Migration

```bash
# Navigate to project root
cd C:\Users\rudyr\apps\mydetailarea

# Apply migration to create edge_function_logs table
supabase db push
```

**Expected output:**
```
Applying migration 20251018000000_create_edge_function_logs.sql...
✔ Migration applied successfully
```

**Verify migration:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'edge_function_logs';
```

## Step 2: Deploy Updated Edge Function

```bash
# Deploy from project root
supabase functions deploy push-notification-sender

# Or with specific flags
supabase functions deploy push-notification-sender --project-ref YOUR_PROJECT_REF
```

**Expected output:**
```
Deploying function push-notification-sender...
✔ Function deployed successfully
Version: 66 (or next version number)
```

## Step 3: Send Test Notification

### Option A: Via Frontend
1. Navigate to http://localhost:8080
2. Log in as user with active push subscription
3. Click "Test Push Notification" button
4. Observe response in browser console

### Option B: Via cURL
```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notification-sender \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "122c8d5b-e5f5-4782-a179-544acbaaceb9",
    "dealerId": 5,
    "payload": {
      "title": "Diagnostic Test",
      "body": "Testing v2.1.0 with enhanced logging"
    }
  }'
```

**Expected response (if still failing):**
```json
{
  "success": true,
  "sent": 0,
  "failed": 1,
  "total": 1
}
```

## Step 4: Check Diagnostic Logs

### Query 1: View Latest Logs
```sql
-- Run in Supabase SQL Editor
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

**Look for:**
- `level = 'debug'`: Attempting to send push notification
- `level = 'error'`: Push notification send failed

### Query 2: Extract Error Details
```sql
SELECT
  created_at,
  error_details->'message' as error_message,
  error_details->'statusCode' as status_code,
  error_details->'body' as error_body,
  error_details->'stack' as stack_trace,
  data->'endpoint' as endpoint
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
  AND level = 'error'
ORDER BY created_at DESC
LIMIT 1;
```

**This will reveal:**
- Exact error from web-push library
- HTTP status code from WNS
- Error body/response from WNS
- Full stack trace

## Step 5: Diagnose Based on Error

### Scenario A: 401 Unauthorized
**Error details will show:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "body": "..."
}
```

**Root cause:** VAPID authentication failing

**Solution:**
1. Verify VAPID keys match between frontend and backend
2. Check VAPID_SUBJECT format
3. Ensure keys are base64url encoded correctly

### Scenario B: 403 Forbidden
**Error details will show:**
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

**Root cause:** WNS rejecting encrypted payload or signature

**Potential issues:**
- web-push library encryption not compatible with Deno
- Payload encryption failing
- Subscription keys invalid

**Next step:** Run direct WNS test (Step 6)

### Scenario C: Network/Crypto Errors
**Error details will show:**
```json
{
  "message": "fetch failed" // or crypto-related error
}
```

**Root cause:** web-push library incompatible with Deno environment

**Solution:** Implement manual VAPID + encryption (see Alternative Implementation below)

### Scenario D: 404 or 410
**Error details will show:**
```json
{
  "statusCode": 404  // or 410
}
```

**Root cause:** Subscription expired/invalid

**Solution:** User needs to re-subscribe

## Step 6: Run Direct WNS Test (Optional)

If web-push library is suspected to be incompatible with Deno:

```bash
# Set environment variables
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
export VAPID_PRIVATE_KEY="YOUR_PRIVATE_KEY"
export VAPID_PUBLIC_KEY="YOUR_PUBLIC_KEY"
export VAPID_SUBJECT="mailto:support@mydetailarea.com"

# Run test script
cd supabase/functions/push-notification-sender
deno run --allow-net --allow-env test-wns-direct.ts
```

**This script will:**
1. Test database connection
2. Get active subscription
3. Generate VAPID JWT manually
4. Test direct WNS request (without encryption)
5. Test web-push library
6. Compare results to diagnose incompatibility

**Expected diagnosis:**
- If direct WNS works BUT web-push fails → Library incompatibility
- If both fail → VAPID/subscription issue
- If both work → Mystery, check other factors

## Step 7: Analyze Results

### Success Case
**Logs show:**
```
level: debug | Attempting to send push notification
level: info  | Push notification sent successfully
```

**Response:**
```json
{ "sent": 1, "failed": 0 }
```

**Action:** Success! Monitor for consistency.

### Failure Case - web-push Incompatibility
**Logs show crypto/network errors**

**Action:** Implement alternative solution (see below)

### Failure Case - VAPID Issues
**Logs show 401 errors**

**Action:** Fix VAPID configuration, re-test

## Alternative Implementation (If web-push Incompatible)

### Option 1: Deno-native library
```typescript
// Replace npm:web-push with Deno module
import { sendWebPush } from "https://deno.land/x/webpush@VERSION/mod.ts";
```

### Option 2: Manual implementation
See `DIAGNOSTICS.md` for manual VAPID JWT + aes128gcm implementation using Web Crypto API.

### Option 3: HTTP-only Edge Function proxy
Create separate Node.js service for web-push, call from Edge Function:
```typescript
// Edge Function calls external service
await fetch('https://your-nodejs-service.com/send-push', {
  method: 'POST',
  body: JSON.stringify({ subscription, payload })
});
```

## Monitoring After Deployment

### Daily Health Check
```sql
-- Run daily to monitor success rate
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE level = 'info' AND message = 'Push notification sent successfully') as successful,
    COUNT(*) FILTER (WHERE level = 'error' AND message = 'Push notification send failed') as failed
  FROM edge_function_logs
  WHERE function_name = 'push-notification-sender'
    AND created_at > NOW() - INTERVAL '24 hours'
)
SELECT
  successful,
  failed,
  (successful + failed) as total,
  ROUND((successful::numeric / NULLIF(successful + failed, 0)) * 100, 2) as success_rate_percentage
FROM stats;
```

### Alert on High Error Rate
```sql
-- Create notification if error rate > 20% in last hour
SELECT CASE
  WHEN error_rate > 0.2 THEN '🚨 HIGH ERROR RATE ALERT'
  ELSE '✅ System healthy'
END as status,
error_rate * 100 as error_percentage
FROM (
  SELECT
    COUNT(*) FILTER (WHERE level = 'error')::numeric / NULLIF(COUNT(*), 0) as error_rate
  FROM edge_function_logs
  WHERE function_name = 'push-notification-sender'
    AND created_at > NOW() - INTERVAL '1 hour'
) sub;
```

## Rollback Procedure

If deployment causes issues:

```bash
# Revert Edge Function to previous version
git checkout HEAD~1 -- supabase/functions/push-notification-sender/index.ts
supabase functions deploy push-notification-sender

# Rollback database migration
supabase db reset  # WARNING: This resets ALL data
# Or manually drop table:
# DROP TABLE IF EXISTS edge_function_logs;
```

## Expected Timeline

1. **Migration**: < 1 minute
2. **Deployment**: 1-2 minutes
3. **Test**: < 30 seconds
4. **Log analysis**: 1-2 minutes
5. **Diagnosis**: 5-10 minutes

**Total: ~15 minutes to full diagnosis**

## Support Queries

See `DIAGNOSTICS.md` for comprehensive SQL queries including:
- Error summary by type
- Success rate over time
- Subscription-specific error history
- Live log tailing

## Next Steps

After identifying root cause:

1. **If web-push incompatible:** Implement alternative (manual VAPID or Deno library)
2. **If VAPID issue:** Fix configuration, re-deploy
3. **If subscription issue:** Document user re-subscription process
4. **If WNS outage:** Monitor WNS status, implement retry logic

## Success Criteria

✅ Deployment successful
✅ Migration applied
✅ Logs appearing in database
✅ Error details captured
✅ Root cause identified

Once you see error details in `edge_function_logs`, you'll have the exact information needed to fix the WNS push notification failure.
