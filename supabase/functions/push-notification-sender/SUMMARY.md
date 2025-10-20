# Push Notification Diagnostics - Executive Summary

## Current Problem

**Edge Function Status:** Running (v65)
**Symptom:** Notifications not being delivered to Windows Push Notification Service (WNS)
**Evidence:** `sent: 0, failed: 1, total: 1`

The Edge Function successfully:
- ✅ Receives requests
- ✅ Queries database for active subscriptions
- ✅ Finds valid subscription data
- ❌ **FAILS when calling web-push library to send to WNS**

## Why Current Logs Are Insufficient

**Console logs in Edge Functions are LIMITED:**
- Only basic output visible in Supabase Dashboard
- Detailed error objects NOT fully logged
- Stack traces truncated or missing
- Can't see HTTP status codes from WNS
- Can't see error body/response from WNS

**Current error output:**
```javascript
console.error('❌ Send push notification error:', error);
// In Supabase logs: Shows only error.message, missing critical details
```

## Solution Implemented: v2.1.0

### Database-Backed Logging System

**New table:** `edge_function_logs`
```sql
CREATE TABLE edge_function_logs (
  id uuid PRIMARY KEY,
  created_at timestamptz,
  function_name text,
  level text, -- 'info' | 'warn' | 'error' | 'debug'
  message text,
  data jsonb,
  error_details jsonb  -- 🔑 Full error object with ALL properties
);
```

### Enhanced Error Capture

**Before (v2.0.0):**
```typescript
catch (error: any) {
  console.error('Error:', error);  // Limited visibility
  throw error;
}
```

**After (v2.1.0):**
```typescript
catch (error: any) {
  const errorDetails = {
    message: error.message,
    statusCode: error.statusCode,  // HTTP status from WNS
    body: error.body,              // Response body from WNS
    stack: error.stack,            // Full stack trace
    name: error.name,
    ...error                       // ALL other properties
  };

  await logToDatabase('error', 'Push notification send failed', {
    subscription_id: subscription.id,
    endpoint: subscription.endpoint
  }, errorDetails);

  throw error;
}
```

## What This Reveals

After deployment, the `edge_function_logs` table will capture:

### 1. WNS HTTP Status Codes
- **401 Unauthorized** → VAPID authentication failing
- **403 Forbidden** → Encryption/signature invalid
- **404 Not Found** → Subscription expired
- **410 Gone** → Subscription permanently invalid
- **Network errors** → Connectivity or Deno compatibility issues

### 2. WNS Error Response Body
```json
{
  "statusCode": 403,
  "body": "Invalid VAPID signature" // Example
}
```

### 3. Stack Traces
Full stack trace showing:
- Where in web-push library the error occurs
- Which crypto/network operation failed
- Deno compatibility issues

### 4. Request Context
- Subscription endpoint
- User ID and dealer ID
- Payload size and structure
- VAPID configuration status

## Diagnostic Queries Provided

### Quick Error Check
```sql
SELECT
  error_details->'statusCode' as status_code,
  error_details->'message' as error_message,
  error_details->'body' as error_body
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
  AND level = 'error'
ORDER BY created_at DESC
LIMIT 1;
```

**This ONE query will reveal the exact WNS error.**

### Success Rate Monitoring
```sql
SELECT
  COUNT(*) FILTER (WHERE level = 'info') as successful,
  COUNT(*) FILTER (WHERE level = 'error') as failed
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
  AND created_at > NOW() - INTERVAL '1 hour';
```

## Files Delivered

### 1. Database Migration
- **File:** `20251018000000_create_edge_function_logs.sql`
- **Purpose:** Creates logging table with indexes and RLS
- **Action Required:** `supabase db push`

### 2. Updated Edge Function
- **File:** `index.ts` (modified)
- **Changes:** Added `logToDatabase()` function and enhanced error capture
- **Action Required:** `supabase functions deploy push-notification-sender`

### 3. Diagnostic Documentation
- **File:** `DIAGNOSTICS.md`
- **Contents:**
  - 6 ready-to-use SQL diagnostic queries
  - Error pattern identification guide
  - Common WNS error explanations
  - Troubleshooting decision tree

### 4. Test Script
- **File:** `test-wns-direct.ts`
- **Purpose:** Test WNS directly without web-push library
- **Usage:** `deno run --allow-net --allow-env test-wns-direct.ts`
- **Reveals:** Whether web-push library is incompatible with Deno

### 5. Deployment Guide
- **File:** `DEPLOY-AND-TEST.md`
- **Contents:**
  - Step-by-step deployment instructions
  - Test procedures
  - Expected outcomes for each error type
  - Alternative implementation options

### 6. Updated Changelog
- **File:** `CHANGELOG.md`
- **Version:** 2.1.0
- **Documents:** All diagnostic enhancements

## Deployment Steps

```bash
# 1. Apply migration
supabase db push

# 2. Deploy function
supabase functions deploy push-notification-sender

# 3. Send test notification (via frontend or cURL)

# 4. Check logs
# Run in Supabase SQL Editor:
SELECT * FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
ORDER BY created_at DESC;
```

**Time required:** ~15 minutes

## Expected Diagnosis

### Most Likely Root Causes

#### Option A: web-push Library Incompatibility (60% probability)
**Evidence:** Error logs show crypto or network-related errors
**Reason:** npm:web-push@3.6.7 uses Node.js crypto APIs that may not fully work in Deno
**Solution:** Implement manual VAPID JWT + aes128gcm using Web Crypto API

#### Option B: VAPID Configuration Issue (30% probability)
**Evidence:** Error logs show 401 Unauthorized
**Reason:** VAPID keys don't match or incorrect format
**Solution:** Verify keys, check base64url encoding, ensure subject format

#### Option C: Subscription Invalid (10% probability)
**Evidence:** Error logs show 404/410 from WNS
**Reason:** Subscription expired or deleted
**Solution:** User re-subscribes from browser

## Success Metrics

After deployment, you will have:

✅ **Persistent error logs** - Queryable historical data
✅ **Full error details** - HTTP codes, response bodies, stack traces
✅ **Success rate tracking** - Monitor notification delivery over time
✅ **Root cause identification** - Exact error from WNS captured
✅ **Alternative implementation path** - If web-push incompatible, clear next steps

## Next Steps After Diagnosis

### If web-push Incompatible
1. Implement manual VAPID using Web Crypto API (documented in DIAGNOSTICS.md)
2. Or use Deno-native web-push library
3. Or create external Node.js service for web-push

### If VAPID Issue
1. Fix key configuration
2. Re-deploy
3. Re-test

### If Subscription Issue
1. Document re-subscription process
2. Add UI guidance for users
3. Monitor subscription lifecycle

## Questions This Answers

❓ **Why is web-push library failing?**
→ Error logs will show exact error from library

❓ **What is WNS returning?**
→ Error logs will show HTTP status code and response body

❓ **Is it a Deno compatibility issue?**
→ test-wns-direct.ts script will confirm

❓ **Are VAPID keys correct?**
→ 401 errors indicate auth issues

❓ **Is subscription valid?**
→ 404/410 errors indicate subscription problems

## Support Contact

After reviewing error logs, if you need implementation of alternative solution:
- Manual VAPID implementation examples in DIAGNOSTICS.md
- Deno-native library references included
- External service architecture documented

---

**Summary:** Deploy v2.1.0 → Send test notification → Query `edge_function_logs` → Root cause identified in < 15 minutes
