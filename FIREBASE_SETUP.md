# Firebase Cloud Messaging (FCM) - Configuration Guide

## 📋 Overview

This document describes the complete Firebase Cloud Messaging setup for MyDetailArea push notifications.

## 🎯 What's Configured

### 1. Firebase Configuration (`src/lib/firebase.ts`)

Core Firebase initialization and FCM utilities:

- **Firebase App Initialization** - Using environment variables from `.env.local`
- **FCM Token Management** - Request, store, and manage FCM tokens
- **Notification Permissions** - Request and check notification permissions
- **Foreground Message Handler** - Listen for messages when app is open
- **Browser Support Detection** - Check if browser supports notifications

### 2. Service Worker (`public/firebase-messaging-sw.js`)

Handles background push notifications:

- **Background Message Handler** - Receive notifications when app is closed
- **Notification Display** - Show system notifications with custom styling
- **Click Actions** - Handle notification clicks to open specific URLs
- **Service Worker Lifecycle** - Install, activate, and update management

### 3. React Hook (`src/hooks/useFirebaseMessaging.ts`)

React integration for FCM:

- **Permission Management** - Request and track notification permissions
- **Token Lifecycle** - Generate, save, refresh, and clear tokens
- **Database Integration** - Save tokens to Supabase `fcm_tokens` table
- **Foreground Notifications** - Display toast notifications in-app
- **Auto-initialization** - Automatically request token if permission granted

### 4. Database Table (`fcm_tokens`)

Supabase table structure:

```sql
CREATE TABLE fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  dealer_id bigint NOT NULL REFERENCES dealerships(id),
  fcm_token text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## 🚀 Usage

### Basic Implementation

```tsx
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

function NotificationSettings() {
  const { t } = useTranslation();
  const {
    permission,
    isSupported,
    loading,
    requestPermission,
    clearToken,
  } = useFirebaseMessaging();

  if (!isSupported) {
    return <p>{t('notifications.not_supported')}</p>;
  }

  return (
    <div>
      <h2>{t('notifications.title')}</h2>
      <p>
        {t('notifications.status')}: {permission || t('common.unknown')}
      </p>

      {permission !== 'granted' ? (
        <Button onClick={requestPermission} disabled={loading}>
          {loading ? t('common.loading') : t('notifications.enable')}
        </Button>
      ) : (
        <Button onClick={clearToken} variant="destructive" disabled={loading}>
          {t('notifications.disable')}
        </Button>
      )}
    </div>
  );
}
```

### Auto-enable for All Users

```tsx
import { useEffect } from 'react';
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import { useAuth } from '@/contexts/AuthContext';

function App() {
  const { user } = useAuth();
  const { requestPermission, isSupported } = useFirebaseMessaging();

  useEffect(() => {
    if (user && isSupported) {
      // Auto-request permission on login
      requestPermission();
    }
  }, [user, isSupported, requestPermission]);

  return <YourApp />;
}
```

## 📡 Sending Notifications

### Via Supabase Edge Function

Create an Edge Function to send notifications:

```typescript
// supabase/functions/send-notification/index.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')!;

Deno.serve(async (req) => {
  const { userId, title, body, url, dealerId } = await req.json();

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user's FCM tokens
  const { data: tokens } = await supabase
    .from('fcm_tokens')
    .select('fcm_token')
    .eq('user_id', userId)
    .eq('dealer_id', dealerId)
    .eq('is_active', true);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ error: 'No tokens found' }), {
      status: 404,
    });
  }

  // Send notification via FCM
  const notifications = tokens.map((tokenData) =>
    fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: tokenData.fcm_token,
        notification: {
          title,
          body,
          icon: '/favicon-mda.svg',
        },
        data: {
          url,
          timestamp: Date.now().toString(),
        },
      }),
    })
  );

  await Promise.all(notifications);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Direct FCM API Call

```typescript
async function sendNotification(
  fcmToken: string,
  title: string,
  body: string,
  url?: string
) {
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      to: fcmToken,
      notification: {
        title,
        body,
        icon: '/favicon-mda.svg',
        click_action: url,
      },
      data: {
        url: url || '/',
        timestamp: Date.now().toString(),
      },
    }),
  });

  return response.json();
}
```

## 🔧 Configuration

### Environment Variables

Required in `.env.local`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyD3QeCOdORBuMSpbeqsfML9lPS5wFMOXmQ
VITE_FIREBASE_AUTH_DOMAIN=my-detail-area.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-detail-area
VITE_FIREBASE_STORAGE_BUCKET=my-detail-area.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=242154179799
VITE_FIREBASE_APP_ID=1:242154179799:web:7c5b71cdcdeedac9277492
VITE_FIREBASE_MEASUREMENT_ID=G-39ZK4JR77C

# FCM VAPID Key (Web Push Certificate)
VITE_FCM_VAPID_KEY=BKxpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8ZI6rOVVUgtVtn6LCpRj07anNaUSLnqO0PkpkXUPm6Q
```

### Server-side (For Edge Functions)

```env
FCM_SERVER_KEY=your-fcm-server-key-from-firebase-console
```

## 🧪 Testing

### 1. Test Notification Support

```typescript
import { isNotificationSupported } from '@/lib/firebase';

console.log('Notifications supported:', isNotificationSupported());
```

### 2. Test Token Generation

```typescript
import { requestNotificationPermission } from '@/lib/firebase';

const token = await requestNotificationPermission();
console.log('FCM Token:', token);
```

### 3. Send Test Notification (via Firebase Console)

1. Go to Firebase Console → Cloud Messaging
2. Click "Send test message"
3. Enter the FCM token from step 2
4. Customize title and body
5. Click "Test"

### 4. Test with cURL

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Content-Type: application/json" \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -d '{
    "to": "YOUR_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test from cURL",
      "icon": "/favicon-mda.svg"
    },
    "data": {
      "url": "/dashboard"
    }
  }'
```

## 🐛 Troubleshooting

### Issue: "Notification permission denied"

**Solution:** User needs to manually enable notifications in browser settings:

- **Chrome:** Settings → Privacy and security → Site Settings → Notifications
- **Firefox:** Preferences → Privacy & Security → Permissions → Notifications
- **Safari:** Preferences → Websites → Notifications

### Issue: "Service worker registration failed"

**Solution:** Ensure the service worker file is accessible:

```bash
# Check if file exists and is served correctly
curl http://localhost:8080/firebase-messaging-sw.js
```

### Issue: "No FCM token received"

**Possible causes:**

1. Notification permission not granted
2. Service worker not registered
3. Invalid VAPID key
4. Browser doesn't support notifications

### Issue: "Token not saved to database"

**Check:**

1. User is logged in (`user.id` exists)
2. User has `dealership_id` in profile
3. RLS policies allow INSERT on `fcm_tokens` table

## 📊 Monitoring

### Check Active Tokens

```sql
SELECT
  u.email,
  d.name as dealership_name,
  ft.fcm_token,
  ft.is_active,
  ft.updated_at
FROM fcm_tokens ft
JOIN profiles u ON ft.user_id = u.id
JOIN dealerships d ON ft.dealer_id = d.id
WHERE ft.is_active = true
ORDER BY ft.updated_at DESC;
```

### Clean Inactive Tokens

```sql
DELETE FROM fcm_tokens
WHERE is_active = false
AND updated_at < NOW() - INTERVAL '30 days';
```

## 🔐 Security

### VAPID Keys

- **Public Key** (VITE_FCM_VAPID_KEY): Safe to expose in client-side code
- **Server Key** (FCM_SERVER_KEY): Keep secret, only use server-side

### RLS Policies

Recommended Row Level Security policies:

```sql
-- Users can only insert their own tokens
CREATE POLICY "Users can insert own tokens"
ON fcm_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only view their own tokens
CREATE POLICY "Users can view own tokens"
ON fcm_tokens FOR SELECT
USING (auth.uid() = user_id);

-- Users can only update their own tokens
CREATE POLICY "Users can update own tokens"
ON fcm_tokens FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can manage all tokens (for edge functions)
CREATE POLICY "Service role full access"
ON fcm_tokens
USING (auth.jwt()->>'role' = 'service_role');
```

## 📚 Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

## ✅ Next Steps

1. **Add Translations** - Add notification-related strings to translation files
2. **Create UI Component** - Build notification settings page/component
3. **Test on Mobile** - Verify notifications work on iOS/Android browsers
4. **Create Edge Function** - Build server-side notification sender
5. **Add Analytics** - Track notification delivery and engagement

---

**Configuration Status:** ✅ Complete
**Last Updated:** $(date)
**Version:** 1.0.0
