# Push Notification Sender - Edge Function

## Overview
Production-ready Edge Function for sending push notifications to Windows Push Notification Service (WNS) and other push services using proper VAPID authentication and Web Push Protocol (RFC 8291).

**Current Version:** 2.1.0 (Enhanced Diagnostics)

## Key Features
- **Proper VAPID JWT Signing**: Uses ES256 algorithm via `web-push` library
- **RFC 8291 Encryption**: Implements aes128gcm encryption for secure payloads
- **WNS Compatible**: Fully supports Windows Push Notification Service
- **Auto-cleanup**: Marks invalid subscriptions (410/404) as inactive
- **Database Logging**: Persistent error tracking in `edge_function_logs` table
- **Comprehensive Diagnostics**: Full error details, status codes, and stack traces
- **Success Rate Monitoring**: Track notification delivery over time

## Technology Stack
- **Runtime**: Deno 1.x
- **Library**: `web-push@3.6.7` (via npm:)
- **Database**: Supabase PostgreSQL with RLS
- **Protocol**: Web Push Protocol (RFC 8291)

## Environment Variables Required

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# VAPID Configuration (Critical)
VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:support@mydetailarea.com
```

## Deployment Instructions

### Using Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy push-notification-sender

# Set environment variables (if not already set)
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
supabase secrets set VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A
supabase secrets set VAPID_SUBJECT=mailto:support@mydetailarea.com
```

### Using Supabase Dashboard

1. Navigate to **Edge Functions** in your Supabase Dashboard
2. Click **Deploy new function** or update existing `push-notification-sender`
3. Upload files:
   - `index.ts`
   - `deno.json`
4. Verify environment variables in **Edge Functions Settings**:
   - `VAPID_PRIVATE_KEY`
   - `VAPID_PUBLIC_KEY`
   - `VAPID_SUBJECT`

## API Specification

### Endpoint
```
POST https://your-project.supabase.co/functions/v1/push-notification-sender
```

### Headers
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

### Request Body

```typescript
{
  // Target users (one of these required)
  userId?: string;           // Single user ID
  userIds?: string[];        // Multiple user IDs
  dealerId?: number;         // All users in dealership

  // Notification payload (required)
  payload: {
    title: string;           // Required
    body: string;            // Required
    icon?: string;           // Default: /favicon-mda.svg
    badge?: string;          // Default: /favicon-mda.svg
    tag?: string;            // Default: 'default'
    url?: string;            // URL to open on click
    data?: Record<string, any>;  // Custom data
    actions?: Array<{
      action: string;
      title: string;
      icon?: string;
    }>;
    requireInteraction?: boolean;  // Default: false
  }
}
```

### Response

**Success:**
```json
{
  "success": true,
  "sent": 1,
  "failed": 0,
  "total": 1
}
```

**Error:**
```json
{
  "error": "Error message"
}
```

## Testing

### From Frontend
```typescript
const response = await supabase.functions.invoke('push-notification-sender', {
  body: {
    userId: '122c8d5b-e5f5-4782-a179-544acbaaceb9',
    dealerId: 5,
    payload: {
      title: 'Test Notification',
      body: 'This is a test notification from My Detail Area',
      url: '/dashboard'
    }
  }
});

console.log('Notification result:', response.data);
```

### Using curl
```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/push-notification-sender \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "122c8d5b-e5f5-4782-a179-544acbaaceb9",
    "dealerId": 5,
    "payload": {
      "title": "Test Notification",
      "body": "Testing WNS push notifications"
    }
  }'
```

## Database Schema

This function expects a `push_subscriptions` table:

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dealer_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active, dealer_id, user_id);
```

## Troubleshooting

### Version 2.1.0: Enhanced Diagnostics

**NEW: Database-backed logging for detailed error tracking**

#### Step 1: Check Database Logs (Recommended)
```sql
-- View recent logs with full error details
SELECT
  created_at,
  level,
  message,
  error_details->'statusCode' as status_code,
  error_details->'message' as error_message,
  error_details->'body' as error_body,
  data->'subscription_id' as subscription_id
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
ORDER BY created_at DESC
LIMIT 10;
```

**This query reveals:**
- Exact HTTP status code from WNS
- Full error message from web-push library
- Response body from WNS
- Stack traces for debugging

#### Step 2: Check Success Rate
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
  ROUND((successful::numeric / NULLIF(successful + failed, 0)) * 100, 2) as success_rate_percentage
FROM stats;
```

### No notifications received

1. **Check VAPID keys are configured**:
   ```bash
   supabase secrets list
   ```

2. **Verify subscription in database**:
   ```sql
   SELECT * FROM push_subscriptions
   WHERE user_id = 'your-user-id'
   AND is_active = true;
   ```

3. **Check detailed error logs** (v2.1.0+):
   ```sql
   SELECT
     error_details->'statusCode' as code,
     error_details->'message' as error
   FROM edge_function_logs
   WHERE function_name = 'push-notification-sender'
     AND level = 'error'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

4. **Common error codes and solutions**:
   - **401 Unauthorized**: VAPID authentication failed
     - Solution: Verify VAPID keys match between frontend and backend
     - Check VAPID_SUBJECT format (`mailto:email@domain.com`)

   - **403 Forbidden**: Encryption or signature invalid
     - Solution: Check web-push library compatibility
     - Verify subscription keys (p256dh, auth) are valid
     - See DIAGNOSTICS.md for manual implementation

   - **404 Not Found**: Subscription not found on WNS
     - Solution: Automatically marked inactive, user needs to re-subscribe

   - **410 Gone**: Subscription permanently expired
     - Solution: Automatically marked inactive, user needs to re-subscribe

   - **Network/Crypto errors**: web-push library incompatibility
     - Solution: Run test-wns-direct.ts to confirm
     - Consider manual VAPID implementation (see DIAGNOSTICS.md)

### Testing locally

```bash
# Serve function locally
supabase functions serve push-notification-sender --env-file .env.local

# Test with local endpoint
curl -X POST http://localhost:54321/functions/v1/push-notification-sender \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id", "payload": {"title": "Test", "body": "Local test"}}'
```

## Changes from Previous Version

### What was fixed:
1. **Removed fake VAPID implementation** - Now uses proper ES256 JWT signing
2. **Removed fake encryption** - Implements RFC 8291 aes128gcm encryption
3. **Added web-push library** - Industry-standard library with WNS support
4. **Enhanced error handling** - Better logging and automatic cleanup
5. **Proper configuration** - VAPID details configured at module level

### What was kept:
- All debug logging (lines 63-115)
- CORS headers (embedded, no imports)
- Subscription query logic
- Database cleanup on 410/404 errors

## Production Monitoring

Monitor these metrics:
- **Success rate**: `sent / total`
- **410 Gone errors**: Indicates users uninstalling/clearing browser data
- **Execution time**: Should be < 2 seconds per notification
- **Error patterns**: Group by status code

Expected performance:
- Cold start: ~500ms
- Warm execution: ~200ms per notification
- Batch of 10: ~1.5 seconds total

## Documentation Files

This function includes comprehensive documentation:

- **README.md** (this file) - Overview and API documentation
- **SUMMARY.md** - Executive summary of diagnostic implementation
- **DEPLOY-AND-TEST.md** - Step-by-step deployment and testing guide
- **DIAGNOSTICS.md** - Comprehensive troubleshooting guide with SQL queries
- **CHANGELOG.md** - Version history and changes
- **test-wns-direct.ts** - Direct WNS testing script (bypasses web-push library)

## Quick Start for Diagnostics

If you're experiencing push notification failures:

1. **Deploy v2.1.0** (includes diagnostic logging):
   ```bash
   supabase db push  # Apply edge_function_logs table
   supabase functions deploy push-notification-sender
   ```

2. **Send test notification** (via frontend or cURL)

3. **Check error details**:
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

4. **Review DIAGNOSTICS.md** for specific error solutions

**Time to diagnosis:** ~15 minutes

## Support

For issues:
1. **Check database logs** (v2.1.0+):
   ```sql
   SELECT * FROM edge_function_logs
   WHERE function_name = 'push-notification-sender'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. **Verify VAPID keys** match frontend configuration
3. **Run diagnostic script**: `deno run --allow-net --allow-env test-wns-direct.ts`
4. **Review DIAGNOSTICS.md** for comprehensive troubleshooting guide
5. **Check browser console** for Service Worker errors

## Version History

- **v2.1.0** (2025-10-18): Enhanced diagnostics with database logging
- **v2.0.0** (2024-10-18): Production-ready with web-push library
- **v1.0.0** (2024-09-22): Initial implementation

## References

- [Web Push Protocol (RFC 8291)](https://datatracker.ietf.org/doc/html/rfc8291)
- [VAPID Specification (RFC 8292)](https://datatracker.ietf.org/doc/html/rfc8292)
- [web-push npm package](https://www.npmjs.com/package/web-push)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Windows Push Notification Services (WNS)](https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/windows-push-notification-services--wns--overview)
