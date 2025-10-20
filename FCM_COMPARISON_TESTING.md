# FCM vs web-push: Comparison & Testing Guide

**Date:** 2025-10-18
**Purpose:** Side-by-side comparison and testing methodology

## Quick Comparison

| Aspect | FCM (NEW) | web-push (EXISTING) |
|--------|-----------|---------------------|
| **Status** | ✅ Newly implemented | ⚠️ Existing but has issues |
| **Reliability** | Unknown (needs testing) | Known issues (notifications don't appear) |
| **Infrastructure** | Firebase Cloud | Self-managed VAPID |
| **Implementation Complexity** | Medium | High |
| **Library Dependencies** | Firebase SDK (stable) | web-push@3.6.7 (Deno issues) |
| **Token Type** | Simple string | Complex subscription object |
| **Database Table** | `fcm_tokens` | `push_subscriptions` |
| **Edge Function** | `push-notification-fcm` | `push-notification-sender` |
| **Service Worker** | `firebase-messaging-sw.js` | `sw.js` |
| **Hook** | `useFCMNotifications` | `usePushNotifications` |

## Detailed Comparison

### 1. Token/Subscription Management

#### FCM
```typescript
// Simple FCM token (string)
const fcmToken = "eXyz123...";

// Database structure
{
  id: uuid,
  user_id: uuid,
  dealer_id: bigint,
  fcm_token: string,  // Simple!
  is_active: boolean
}
```

#### web-push
```typescript
// Complex subscription object
const subscription = {
  endpoint: "https://fcm.googleapis.com/...",
  keys: {
    p256dh: "BKxJ...",
    auth: "Lg7D..."
  }
};

// Database structure
{
  id: uuid,
  user_id: uuid,
  dealer_id: bigint,
  endpoint: text,     // Complex!
  p256dh_key: text,
  auth_key: text,
  is_active: boolean
}
```

**Winner:** FCM (simpler)

### 2. Edge Function Implementation

#### FCM
```typescript
// Uses Firebase HTTP API
await fetch('https://fcm.googleapis.com/fcm/send', {
  headers: {
    'Authorization': `key=${FCM_SERVER_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    to: fcmToken,
    notification: { title, body }
  })
});
```

- ✅ Simple HTTPS request
- ✅ No library dependencies
- ✅ Standard Deno fetch
- ✅ Clear error messages

#### web-push
```typescript
// Uses web-push library
import webpush from "npm:web-push@3.6.7";

await webpush.sendNotification(
  pushSubscription,
  notificationPayload,
  { TTL: 86400, urgency: 'high' }
);
```

- ⚠️ npm library in Deno (compatibility issues)
- ⚠️ Complex VAPID signing
- ⚠️ Encryption overhead
- ⚠️ Opaque errors

**Winner:** FCM (native Deno, simpler)

### 3. Browser API

#### FCM
```typescript
import { getToken, onMessage } from 'firebase/messaging';

// Get token
const token = await getToken(messaging, {
  serviceWorkerRegistration: registration
});

// Listen to messages
onMessage(messaging, (payload) => {
  console.log('Message received:', payload);
});
```

- ✅ Modern Firebase SDK
- ✅ TypeScript types included
- ✅ Well-documented
- ✅ Active maintenance

#### web-push
```typescript
// Get subscription
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
});

// No built-in foreground message handling
```

- ⚠️ Lower-level API
- ⚠️ Manual VAPID key conversion
- ⚠️ No foreground message API
- ⚠️ Less documentation

**Winner:** FCM (better DX)

### 4. Service Worker

#### FCM (`firebase-messaging-sw.js`)
```javascript
import Firebase SDK scripts

messaging.onBackgroundMessage((payload) => {
  // Payload already parsed
  showNotification(payload.notification.title, {
    body: payload.notification.body,
    data: payload.data
  });
});
```

- ✅ Built-in payload parsing
- ✅ Simplified event handling
- ✅ Integrated with Firebase

#### web-push (`sw.js`)
```javascript
self.addEventListener('push', (event) => {
  // Manual parsing required
  const payload = event.data.json();

  self.registration.showNotification(
    payload.title,
    // ... manual options
  );
});
```

- ⚠️ Manual parsing
- ⚠️ More boilerplate
- ⚠️ Error-prone

**Winner:** FCM (less code, fewer errors)

### 5. Error Handling

#### FCM
```typescript
// Clear error codes
if (result.failure === 1) {
  const errorCode = result.results[0].error;
  // 'InvalidRegistration'
  // 'NotRegistered'
  // 'MismatchSenderId'

  // Auto-cleanup invalid tokens
  await markTokenInactive(fcmToken);
}
```

- ✅ Specific error codes
- ✅ Built-in token cleanup
- ✅ Clear HTTP status codes

#### web-push
```typescript
// Opaque errors from library
catch (error: any) {
  // error.statusCode might exist
  // error.body might have details
  // No standardized format
}
```

- ⚠️ Inconsistent error format
- ⚠️ Limited error details
- ⚠️ Manual cleanup logic

**Winner:** FCM (better error handling)

## Known Issues Comparison

### FCM Known Issues
- ✅ None yet (new implementation)
- 🔄 Needs testing to identify issues
- 🔄 Production reliability unknown

### web-push Known Issues
- ❌ Notifications send (201) but don't appear
- ❌ Service Worker never receives push event
- ❌ web-push library incompatible with Deno
- ❌ Complex debugging required
- ❌ No clear fix path

**Winner:** FCM (no known issues yet)

## Testing Methodology

### Phase 1: Basic Functionality (Day 1)

#### FCM Tests
```bash
# 1. Configuration verification
✓ Check Firebase config loaded
✓ Verify Service Worker registered
✓ Confirm database table created
✓ Verify Edge Function deployed

# 2. Token generation
✓ Request notification permission
✓ Get FCM token
✓ Save token to database
✓ Verify token in fcm_tokens table

# 3. Notification sending
✓ Send test notification via UI
✓ Send test via Edge Function CLI
✓ Send test via direct FCM API
✓ Verify notification appears in browser

# 4. Error scenarios
✓ Test with invalid token
✓ Test with permission denied
✓ Test with Firebase misconfigured
✓ Test with offline browser
```

#### web-push Tests
```bash
# Re-test existing system for comparison
✓ Verify VAPID subscription works
✓ Check subscription saved to DB
✓ Send test notification
✗ Confirm notification STILL doesn't appear
✓ Check Service Worker logs
✓ Verify 201 response from endpoint
```

### Phase 2: Reliability Testing (Week 1)

#### Metrics to Track
```sql
-- FCM success rate
SELECT
  COUNT(*) as total_attempts,
  SUM(CASE WHEN level = 'info' AND message LIKE '%sent successfully%' THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as failures
FROM edge_function_logs
WHERE function_name = 'push-notification-fcm'
  AND created_at > NOW() - INTERVAL '7 days';

-- web-push success rate
SELECT
  COUNT(*) as total_attempts,
  SUM(CASE WHEN level = 'info' AND message LIKE '%sent successfully%' THEN 1 ELSE 0 END) as successes,
  SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as failures
FROM edge_function_logs
WHERE function_name = 'push-notification-sender'
  AND created_at > NOW() - INTERVAL '7 days';
```

#### Test Scenarios
1. **Browser Compatibility**
   - Chrome/Edge (should work for both)
   - Firefox (test separately)
   - Safari (limited push support)

2. **Network Conditions**
   - Online with good connection
   - Slow 3G network
   - Offline → comes back online
   - Intermittent connection

3. **User Scenarios**
   - First-time subscription
   - Re-subscription after unsubscribe
   - Multiple devices per user
   - Token expiration/refresh

4. **Load Testing**
   - Send to 1 user
   - Send to 10 users
   - Send to 100 users
   - Measure Edge Function execution time

### Phase 3: Real-World Testing (Week 2-4)

#### A/B Testing Setup
```typescript
// Randomly assign users to FCM vs web-push
const useRandomPushSystem = () => {
  const userId = useAuth().user?.id;
  const useFCM = userId ? (parseInt(userId, 36) % 2 === 0) : false;

  return useFCM ? useFCMNotifications() : usePushNotifications();
};
```

#### Metrics to Track
- Notification delivery rate (FCM vs web-push)
- User engagement (click-through rate)
- Error rates
- Average delivery time
- Token/subscription persistence

## Testing Checklist

### ✅ FCM Setup
- [ ] Firebase credentials configured in `.env.local`
- [ ] Service Worker credentials updated
- [ ] Supabase secrets set (FCM_SERVER_KEY, FCM_PROJECT_ID)
- [ ] Database migration applied (fcm_tokens table)
- [ ] Edge Function deployed
- [ ] Firebase SDK npm package installed

### ✅ Basic Functionality
- [ ] Configuration status check passes
- [ ] Service Worker registers successfully
- [ ] Permission request works
- [ ] FCM token generation succeeds
- [ ] Token saved to database
- [ ] Test notification sent via UI
- [ ] Notification appears in browser
- [ ] Notification click works
- [ ] Foreground messages received

### ✅ Error Handling
- [ ] Permission denied handled gracefully
- [ ] Invalid token detected and deactivated
- [ ] Network errors logged properly
- [ ] Edge Function errors returned correctly
- [ ] Service Worker errors logged

### ✅ Comparison Tests
- [ ] FCM more reliable than web-push
- [ ] FCM easier to debug than web-push
- [ ] FCM error messages clearer
- [ ] FCM setup simpler
- [ ] FCM performance acceptable

## Decision Matrix

After testing, evaluate based on:

| Criteria | Weight | FCM Score | web-push Score |
|----------|--------|-----------|----------------|
| **Reliability** (does it work?) | 40% | TBD | 2/10 |
| **Developer Experience** | 15% | TBD | 4/10 |
| **Maintenance Burden** | 15% | TBD | 3/10 |
| **Setup Complexity** | 10% | TBD | 3/10 |
| **Debugging Ease** | 10% | TBD | 2/10 |
| **Performance** | 10% | TBD | 7/10 |

**Scoring Guide:**
- 1-3: Poor
- 4-6: Acceptable
- 7-9: Good
- 10: Excellent

**Decision Thresholds:**
- If FCM total score > 7.0: **Migrate to FCM**
- If FCM total score 5.0-7.0: **Gradual migration**
- If FCM total score < 5.0: **Keep investigating**

## Next Steps Based on Results

### If FCM Works Well ✅
1. Document FCM as primary system
2. Create migration guide for users
3. Gradually migrate users from web-push
4. Deprecate web-push after 90 days
5. Remove push_subscriptions table (with backup)

### If FCM Has Issues ⚠️
1. Document specific issues
2. Continue investigating alternatives
3. Consider hybrid approach
4. Reach out to Firebase support
5. Evaluate other push providers

### If Both Systems Fail ❌
1. Investigate browser-specific issues
2. Check for HTTPS/SSL problems
3. Review Service Worker registration
4. Consider alternative notification methods:
   - WebSocket real-time updates
   - Polling with notifications
   - Email/SMS fallback

## Logging for Comparison

### Enable Detailed Logging

Add to both hooks:

```typescript
// FCM
console.log('[FCM] Detailed logs:', {
  timestamp: new Date().toISOString(),
  action: 'subscribe',
  success: true,
  duration: 1234,
  tokenLength: fcmToken?.length
});

// web-push
console.log('[web-push] Detailed logs:', {
  timestamp: new Date().toISOString(),
  action: 'subscribe',
  success: true,
  duration: 1234,
  endpointLength: subscription?.endpoint?.length
});
```

### Aggregate Comparison Report

```sql
-- Compare success rates
WITH fcm_stats AS (
  SELECT
    'FCM' as system,
    COUNT(*) as total,
    SUM(CASE WHEN level = 'info' THEN 1 ELSE 0 END) as successes
  FROM edge_function_logs
  WHERE function_name = 'push-notification-fcm'
    AND created_at > NOW() - INTERVAL '7 days'
),
webpush_stats AS (
  SELECT
    'web-push' as system,
    COUNT(*) as total,
    SUM(CASE WHEN level = 'info' THEN 1 ELSE 0 END) as successes
  FROM edge_function_logs
  WHERE function_name = 'push-notification-sender'
    AND created_at > NOW() - INTERVAL '7 days'
)
SELECT
  system,
  total,
  successes,
  ROUND(100.0 * successes / NULLIF(total, 0), 2) as success_rate
FROM fcm_stats
UNION ALL
SELECT
  system,
  total,
  successes,
  ROUND(100.0 * successes / NULLIF(total, 0), 2) as success_rate
FROM webpush_stats;
```

---

**Start Testing:** Begin with Phase 1 checklist
**Report Issues:** Document in FCM_TESTING_RESULTS.md (create as needed)
**Update Scores:** Fill in Decision Matrix after 1 week of testing

**Last Updated:** 2025-10-18
