# Firebase Cloud Messaging (FCM) Setup Guide

**Created:** 2025-10-18
**Status:** NEW IMPLEMENTATION (Parallel to existing web-push)

## Overview

This guide covers the complete setup of Firebase Cloud Messaging (FCM) for push notifications in My Detail Area. This is a **NEW** implementation that runs **in parallel** to the existing web-push system.

### Why FCM?

- **Better Reliability**: Firebase infrastructure vs. self-managed VAPID
- **Simplified Token Management**: Single FCM token vs. complex subscription objects
- **Better Browser Support**: Consistent behavior across browsers
- **No web-push Library Issues**: Native Deno/Firebase SDK vs. problematic npm package
- **Enhanced Features**: Rich notifications, topics, message priority

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                             │
├─────────────────────────────────────────────────────────┤
│  useFCMNotifications Hook                               │
│  ├─ Firebase SDK (getToken, onMessage)                  │
│  ├─ Permission Request                                  │
│  ├─ Token Management                                    │
│  └─ Foreground Message Handler                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ├─ FCM Token
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE                              │
├─────────────────────────────────────────────────────────┤
│  fcm_tokens table                                       │
│  ├─ user_id                                             │
│  ├─ dealer_id                                           │
│  ├─ fcm_token (Firebase registration token)            │
│  └─ is_active                                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ├─ Query tokens
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  EDGE FUNCTION                           │
├─────────────────────────────────────────────────────────┤
│  push-notification-fcm                                  │
│  ├─ Fetch FCM tokens from DB                            │
│  ├─ Call FCM HTTP v1 API                                │
│  └─ Log results to edge_function_logs                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ├─ HTTPS POST
                          ▼
┌─────────────────────────────────────────────────────────┐
│              FIREBASE CLOUD MESSAGING                    │
├─────────────────────────────────────────────────────────┤
│  FCM API (fcm.googleapis.com)                           │
│  ├─ Validate token                                      │
│  ├─ Queue message                                       │
│  └─ Deliver to device                                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ├─ Push Event
                          ▼
┌─────────────────────────────────────────────────────────┐
│               SERVICE WORKER                             │
├─────────────────────────────────────────────────────────┤
│  firebase-messaging-sw.js                               │
│  ├─ onBackgroundMessage                                 │
│  ├─ showNotification                                    │
│  └─ Handle notification clicks                          │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Firebase project created: `my-detail-area`
- Firebase credentials (API Key, App ID, Sender ID)
- Supabase project with Edge Functions enabled
- Browser with push notification support

## Step-by-Step Setup

### 1. Configure Firebase Credentials

#### A. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **my-detail-area**
3. Navigate to: **Project Settings** (gear icon) → **General**
4. Scroll to: **Your apps** → Select/Create **Web app**
5. Copy the configuration object

#### B. Add to .env.local

Open `C:\Users\rudyr\apps\mydetailarea\.env.local` and add:

```bash
# Firebase Cloud Messaging Configuration
VITE_FIREBASE_API_KEY=AIzaSyD... # YOUR ACTUAL API KEY
VITE_FIREBASE_AUTH_DOMAIN=my-detail-area.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-detail-area
VITE_FIREBASE_STORAGE_BUCKET=my-detail-area.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=242154179799
VITE_FIREBASE_APP_ID=1:242154179799:web:7c5b71cdcdeedac9277492 # YOUR ACTUAL APP ID
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX # OPTIONAL
```

#### C. Update Service Worker

Edit `public/firebase-messaging-sw.js` and replace placeholders:

```javascript
const firebaseConfig = {
  apiKey: 'AIzaSyD...', // YOUR ACTUAL API KEY
  authDomain: 'my-detail-area.firebaseapp.com',
  projectId: 'my-detail-area',
  storageBucket: 'my-detail-area.firebasestorage.app',
  messagingSenderId: '242154179799',
  appId: '1:242154179799:web:7c5b71cdcdeedac9277492', // YOUR ACTUAL APP ID
};
```

### 2. Configure Edge Function

#### A. Get FCM Server Key

1. Firebase Console → **Project Settings** → **Cloud Messaging**
2. Find section: **Cloud Messaging API (Legacy)**
3. Copy: **Server key** (starts with `AAAA...`)

#### B. Set Supabase Secrets

```bash
# Navigate to project
cd C:\Users\rudyr\apps\mydetailarea

# Set FCM Server Key
supabase secrets set FCM_SERVER_KEY=AAAA... # YOUR ACTUAL SERVER KEY

# Set Project ID
supabase secrets set FCM_PROJECT_ID=my-detail-area
```

**Alternative:** Set via Supabase Dashboard:
- Dashboard → Project → Edge Functions → Secrets
- Add: `FCM_SERVER_KEY` and `FCM_PROJECT_ID`

### 3. Deploy Database Migration

```bash
# Apply migration to create fcm_tokens table
supabase db push

# Or apply specific migration
supabase migration up --include-all
```

**Verify table creation:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM fcm_tokens LIMIT 1;
```

### 4. Deploy Edge Function

```bash
# Deploy FCM notification function
supabase functions deploy push-notification-fcm

# Verify deployment
supabase functions list
```

### 5. Install Firebase Dependencies

```bash
npm install firebase
```

### 6. Register Service Worker

The service worker should auto-register via `vite-plugin-pwa`. Verify in browser:

```javascript
// Browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

If not registered, manually register in your app:

```typescript
// src/main.tsx or appropriate entry point
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then(registration => {
      console.log('FCM SW registered:', registration);
    })
    .catch(err => {
      console.error('FCM SW registration failed:', err);
    });
}
```

## Usage in Application

### Basic Implementation

```typescript
import { useFCMNotifications } from '@/hooks/useFCMNotifications';

function NotificationSettings() {
  const {
    isSupported,
    isConfigured,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    testNotification,
    isSubscribing,
  } = useFCMNotifications();

  if (!isSupported) {
    return <div>Push notifications not supported in this browser</div>;
  }

  if (!isConfigured) {
    return <div>Firebase is not configured. Check environment variables.</div>;
  }

  return (
    <div>
      <p>Permission: {permission}</p>
      <p>Status: {isSubscribed ? 'Subscribed' : 'Not subscribed'}</p>

      {!isSubscribed ? (
        <button onClick={() => subscribe()} disabled={isSubscribing}>
          {isSubscribing ? 'Subscribing...' : 'Enable Notifications'}
        </button>
      ) : (
        <>
          <button onClick={() => unsubscribe()}>
            Disable Notifications
          </button>
          <button onClick={() => testNotification()}>
            Test Notification
          </button>
        </>
      )}
    </div>
  );
}
```

### Sending Notifications from Backend

```typescript
// From another Edge Function or service
const { data, error } = await supabase.functions.invoke('push-notification-fcm', {
  body: {
    userId: 'user-uuid',
    dealerId: 123,
    notification: {
      title: 'Vehicle Ready',
      body: 'Your vehicle service is complete',
    },
    data: {
      type: 'service_complete',
      orderId: 'order-uuid',
      url: '/orders/order-uuid',
    },
  },
});
```

## Testing

### 1. Test Configuration

```javascript
// Browser console
import { getFirebaseConfigStatus } from './src/config/firebase';
console.log(getFirebaseConfigStatus());
// Should show all values as true
```

### 2. Test Token Generation

1. Open app in browser
2. Open DevTools → Console
3. Click "Enable Notifications"
4. Check console for: `[FCM] Token received: ...`
5. Verify database:
   ```sql
   SELECT * FROM fcm_tokens WHERE is_active = true;
   ```

### 3. Test Notification Sending

**Method 1: Use Test Button**
- Click "Test Notification" in UI
- Check browser for notification

**Method 2: Supabase Edge Function Test**
```bash
# Test via CLI
supabase functions invoke push-notification-fcm --body '{"userId":"user-id","dealerId":123,"notification":{"title":"Test","body":"Testing FCM"}}'
```

**Method 3: Direct FCM API Test**
Use Postman or curl:
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "FCM_TOKEN_FROM_DATABASE",
    "notification": {
      "title": "Test Notification",
      "body": "Direct FCM API test"
    }
  }'
```

### 4. Verify Service Worker

```javascript
// Browser console
navigator.serviceWorker.ready.then(registration => {
  console.log('SW ready:', registration.scope);

  // Check messaging subscription
  return registration.pushManager.getSubscription();
}).then(subscription => {
  console.log('Push subscription:', subscription);
});
```

## Troubleshooting

### Issue: "Firebase is not configured"

**Solution:**
- Check `.env.local` has all `VITE_FIREBASE_*` variables
- Ensure no placeholders like `YOUR_API_KEY`
- Restart dev server: `npm run dev`

### Issue: "Failed to get FCM token"

**Possible Causes:**
1. Service Worker not registered
2. Notification permission denied
3. Firebase config mismatch

**Solution:**
```javascript
// Check SW registration
navigator.serviceWorker.getRegistrations()
  .then(regs => console.log('Registrations:', regs));

// Check permission
console.log('Notification permission:', Notification.permission);

// Re-request permission
Notification.requestPermission().then(console.log);
```

### Issue: "FCM_SERVER_KEY not configured"

**Solution:**
```bash
# Set via Supabase CLI
supabase secrets set FCM_SERVER_KEY=YOUR_SERVER_KEY

# Or via Dashboard
# Supabase → Edge Functions → Secrets → Add FCM_SERVER_KEY
```

### Issue: Notification not appearing

**Check:**
1. Browser notification settings (allow notifications)
2. Service Worker console logs
3. Edge Function logs:
   ```sql
   SELECT * FROM edge_function_logs
   WHERE function_name = 'push-notification-fcm'
   ORDER BY created_at DESC LIMIT 10;
   ```

### Issue: "InvalidRegistration" error

**Cause:** FCM token is invalid or expired

**Solution:**
- Token auto-marked as inactive in database
- User needs to re-subscribe
- Check `fcm_tokens` table for `is_active = false`

## Comparison: FCM vs. web-push

| Feature | FCM (NEW) | web-push (EXISTING) |
|---------|-----------|---------------------|
| **Implementation** | ✅ Created | ✅ Existing |
| **Token Type** | FCM token (simple string) | VAPID subscription (complex object) |
| **Edge Function** | `push-notification-fcm` | `push-notification-sender` |
| **Database Table** | `fcm_tokens` | `push_subscriptions` |
| **Service Worker** | `firebase-messaging-sw.js` | `sw.js` |
| **Hook** | `useFCMNotifications` | `usePushNotifications` |
| **Reliability** | High (Firebase infra) | Medium (web-push library issues) |
| **Setup Complexity** | Medium | High |
| **Browser Support** | Good | Good |
| **Status** | ✅ Ready to test | ⚠️ Issues with delivery |

## Migration Strategy (Optional)

To migrate from web-push to FCM:

1. **Parallel Operation** (Recommended for testing)
   - Keep both systems active
   - Let users choose in settings
   - Monitor FCM reliability

2. **Gradual Migration**
   - Enable FCM for new users
   - Migrate existing users over time
   - Keep web-push as fallback

3. **Complete Migration**
   - Switch all users to FCM
   - Deprecate web-push system
   - Remove `push_subscriptions` table (after backup)

## Security Considerations

### API Key Security
- ✅ Frontend API key is safe (restricted by Firebase domain settings)
- ✅ Configure authorized domains in Firebase Console
- ❌ NEVER expose Server Key in frontend

### Server Key Security
- ✅ Store only in Supabase Edge Function secrets
- ✅ Use OAuth2 with service account for production
- ❌ NEVER commit to git
- ❌ NEVER expose in frontend code

### Production Recommendations
1. Migrate from Legacy Server Key to OAuth2
2. Use Firebase service account JSON
3. Enable Firebase App Check
4. Configure Firebase Security Rules
5. Implement rate limiting on Edge Function

## Next Steps

1. ✅ Configure Firebase credentials
2. ✅ Deploy database migration
3. ✅ Deploy Edge Function
4. ✅ Test token generation
5. ✅ Test notification sending
6. ✅ Monitor logs and reliability
7. 🔄 Compare with web-push system
8. 🔄 Decide on migration strategy

## Support & Resources

- **Firebase Documentation:** https://firebase.google.com/docs/cloud-messaging
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **FCM HTTP v1 API:** https://firebase.google.com/docs/cloud-messaging/migrate-v1
- **Service Worker API:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

## Rollback Plan

If FCM doesn't work as expected:

1. **Frontend:** Simply don't use `useFCMNotifications` hook
2. **Backend:** Edge Function won't be called
3. **Database:** `fcm_tokens` table remains empty
4. **No Impact:** Existing web-push system continues working

**To completely remove:**
```bash
# Drop database table
supabase db reset

# Delete Edge Function
supabase functions delete push-notification-fcm

# Remove files
rm src/config/firebase.ts
rm src/hooks/useFCMNotifications.tsx
rm public/firebase-messaging-sw.js
```

---

**Last Updated:** 2025-10-18
**Maintainer:** Development Team
**Status:** ✅ Ready for Testing
