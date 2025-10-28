# 🚀 Firebase Push Notifications - Deployment Guide

## 📋 Overview

Complete deployment guide for the Firebase Cloud Messaging (FCM) push notification system in MyDetailArea.

---

## ✅ What Was Implemented

### 1. **Frontend Components** ✅

#### A. Firebase Configuration (`src/lib/firebase.ts`)
- Firebase app initialization
- FCM token management
- Notification permission handling
- Foreground message listener

#### B. React Hook (`src/hooks/useFirebaseMessaging.ts`)
- Permission state management
- Token lifecycle (request, save, clear)
- Automatic Supabase integration
- Error handling and toast notifications

#### C. Settings Page Component (`src/components/settings/notifications/PushNotificationSettings.tsx`)
- User-friendly UI for managing push notifications
- Status display (granted/denied/default)
- Enable/disable toggle
- Real-time FCM token display (dev mode)

#### D. Service Worker (`public/firebase-messaging-sw.js`) ✅ (Pre-existing)
- Background notification handler
- Click action handlers
- Notification display customization

### 2. **Backend Components** ✅

#### A. Edge Function (`supabase/functions/send-notification/`)
- Receives notification requests
- Queries active FCM tokens from database
- Sends notifications via Firebase API
- Complete error handling and logging
- **10 files total**: code, tests, documentation

#### B. Notification Service (`src/services/pushNotificationHelper.ts`)
- High-level API for sending notifications
- Convenience methods for order events
- Automatic follower resolution
- TypeScript strict mode compliance
- **6 files total**: service, tests, documentation, examples

### 3. **Database Integration** ✅

#### Table: `fcm_tokens` (Pre-existing)
```sql
- id (uuid)
- user_id (uuid) → profiles.id
- dealer_id (bigint) → dealerships.id
- fcm_token (text)
- is_active (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

### 4. **Integration with Order Events** ✅

#### A. Order Comments (`src/hooks/useOrderComments.ts`)
- Sends push notification when comment is added
- Notifies all order followers
- Non-blocking (fire-and-forget)

#### B. Order Status Changes (`src/hooks/useOrderManagement.ts`)
- Sends push notification when status changes
- Notifies all order followers
- Includes changed-by user name

### 5. **Translations** ✅

Added to all 3 languages:
- `public/translations/en.json` ✅
- `public/translations/es.json` ✅
- `public/translations/pt-BR.json` ✅

Translation keys:
```json
{
  "notifications": {
    "title": "Notifications",
    "enable": "Enable Notifications",
    "disable": "Disable Notifications",
    "enabled": "Notifications enabled",
    "disabled": "Notifications disabled",
    "status": "Status",
    "permission_denied": "Notification permission denied",
    "not_supported": "Notifications are not supported",
    "error": "Error managing notifications",
    "new_message": "New notification",
    "settings": { ... }
  }
}
```

---

## 🔧 Deployment Steps

### Step 1: **Obtain Firebase Server Key**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project "my-detail-area"
3. Go to **Project Settings** → **Cloud Messaging** tab
4. Under "Cloud Messaging API (Legacy)", copy the **Server key**

### Step 2: **Configure Supabase Secret**

```bash
# Set the FCM server key as a Supabase secret
supabase secrets set FCM_SERVER_KEY=your-firebase-server-key-here
```

### Step 3: **Deploy Edge Function**

```bash
# Navigate to project directory
cd C:\Users\rudyr\apps\mydetailarea

# Deploy the send-notification function
supabase functions deploy send-notification

# Verify deployment
supabase functions list
```

### Step 4: **Verify Edge Function**

```bash
# Check function logs
supabase functions logs send-notification --follow

# Test with curl (replace with actual values)
curl -X POST https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/send-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "userId": "user-uuid",
    "dealerId": 5,
    "title": "Test Notification",
    "body": "This is a test",
    "url": "/dashboard"
  }'
```

### Step 5: **Build and Deploy Frontend**

```bash
# Build production version
npm run build

# Deploy to hosting (Railway/Vercel/etc.)
# The build output is in the dist/ folder
```

### Step 6: **Test Push Notifications**

1. **Open the app** in a browser
2. **Login** with a dealer user account
3. **Go to Settings** → **Notifications** tab → **Preferences** sub-tab
4. **Enable Push Notifications** (should see browser permission prompt)
5. **Verify token saved** (check `fcm_tokens` table in Supabase)
6. **Test notification**:
   - Add a comment to an order
   - Change order status
   - Should receive push notification

---

## 🧪 Testing Procedures

### Test 1: **Permission Request**
```
1. Open Settings → Notifications
2. Click "Enable Notifications"
3. ✅ Browser permission prompt appears
4. ✅ After granting, status shows "Enabled"
5. ✅ Token is saved to fcm_tokens table
```

### Test 2: **Comment Notifications**
```
1. User A adds comment to Order #123
2. ✅ User B (follower of order) receives push notification
3. ✅ Notification shows commenter name and excerpt
4. ✅ Clicking notification opens order detail page
```

### Test 3: **Status Change Notifications**
```
1. User A changes Order #123 status to "In Progress"
2. ✅ All followers receive push notification
3. ✅ Notification shows new status and changer name
4. ✅ Clicking notification opens order detail page
```

### Test 4: **Background Notifications**
```
1. Close the MyDetailArea browser tab
2. Have another user add comment/change status
3. ✅ Notification appears even when app is closed
4. ✅ Clicking notification opens app to correct page
```

### Test 5: **Permission Denied State**
```
1. Deny browser notification permission
2. ✅ Settings page shows "Permission Denied" badge
3. ✅ User sees instructions to enable in browser settings
4. ✅ Re-enabling in browser settings allows retry
```

---

## 📊 Monitoring & Logging

### Check FCM Tokens in Database

```sql
-- See all active tokens
SELECT
  u.email,
  d.name as dealership,
  ft.fcm_token,
  ft.is_active,
  ft.updated_at
FROM fcm_tokens ft
JOIN profiles u ON ft.user_id = u.id
JOIN dealerships d ON ft.dealer_id = d.id
WHERE ft.is_active = true
ORDER BY ft.updated_at DESC;
```

### Check Edge Function Logs

```bash
# Real-time logs
supabase functions logs send-notification --follow

# Recent logs
supabase functions logs send-notification --limit 50
```

### Check Notification Failures

```sql
-- If you have an edge_function_logs table
SELECT *
FROM edge_function_logs
WHERE function_name = 'send-notification'
AND level = 'error'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🐛 Troubleshooting

### Issue: "Permission denied" persists
**Solution:**
1. Go to browser settings → Site Settings → Notifications
2. Find "dds.mydetailarea.com" (or your domain)
3. Change permission from "Block" to "Allow"
4. Refresh page and try again

### Issue: No tokens in database
**Check:**
1. User has granted browser permission
2. Service worker is registered (`/firebase-messaging-sw.js` accessible)
3. VAPID key is correct in `.env.local`
4. User has a dealership_id in their profile

### Issue: Notifications not sending
**Check:**
1. Edge Function is deployed: `supabase functions list`
2. FCM_SERVER_KEY is set: `supabase secrets list`
3. FCM tokens are active in database
4. Edge Function logs for errors: `supabase functions logs send-notification`

### Issue: Service worker not loading
**Solution:**
1. Verify file exists: `public/firebase-messaging-sw.js`
2. Check file is served: `curl http://localhost:8080/firebase-messaging-sw.js`
3. Clear service worker: DevTools → Application → Service Workers → Unregister
4. Refresh page

---

## 🔐 Security Checklist

- [ ] FCM_SERVER_KEY stored as Supabase secret (not in code)
- [ ] VAPID public key in `.env.local` (safe to expose)
- [ ] RLS policies on `fcm_tokens` table restrict user access
- [ ] Edge Function validates user permissions
- [ ] Notification content doesn't expose sensitive data
- [ ] URLs in notifications are validated/sanitized

---

## 📈 Performance Considerations

### Database Indexes
```sql
-- Ensure these indexes exist for fast queries
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_dealer
ON fcm_tokens(user_id, dealer_id)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active
ON fcm_tokens(is_active, updated_at);
```

### Token Cleanup
```sql
-- Schedule this to run periodically (monthly)
DELETE FROM fcm_tokens
WHERE is_active = false
AND updated_at < NOW() - INTERVAL '30 days';
```

### Rate Limiting
Consider adding rate limiting to Edge Function:
- Max 100 notifications per user per minute
- Max 1000 notifications per dealer per minute

---

## 📚 Documentation Reference

### Frontend Documentation
- **`FIREBASE_SETUP.md`** - Complete Firebase setup guide
- **`src/services/PUSH_NOTIFICATION_README.md`** - Service API documentation
- **`src/services/PUSH_NOTIFICATION_HELPER_GUIDE.md`** - Usage guide with examples
- **`src/services/PUSH_NOTIFICATION_INTEGRATION_EXAMPLES.tsx`** - 10 integration examples

### Backend Documentation
- **`supabase/functions/send-notification/README.md`** - Edge Function API
- **`supabase/functions/send-notification/INTEGRATION.md`** - Integration guide
- **`supabase/functions/send-notification/DEPLOYMENT.md`** - Deployment guide
- **`supabase/functions/send-notification/QUICK-REFERENCE.md`** - Quick reference

---

## 🎯 Next Steps (Optional Enhancements)

### 1. **Notification Preferences**
Allow users to customize which events trigger notifications:
- Order status changes
- New comments
- New attachments
- Order assignments

### 2. **Notification History**
Create a notification log table:
```sql
CREATE TABLE notification_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  dealer_id bigint REFERENCES dealerships(id),
  title text,
  body text,
  url text,
  sent_at timestamptz DEFAULT now(),
  delivered boolean DEFAULT false,
  clicked boolean DEFAULT false,
  clicked_at timestamptz
);
```

### 3. **Scheduled Notifications**
Implement scheduled notifications for:
- Upcoming due dates
- Overdue orders
- Daily/weekly summaries

### 4. **Rich Notifications**
Add images and action buttons to notifications:
```javascript
{
  notification: {
    title: "Order Ready",
    body: "Vehicle #ABC123 is ready for pickup",
    image: "https://your-domain.com/vehicles/abc123.jpg",
    actions: [
      { action: "view", title: "View Order" },
      { action: "notify-customer", title: "Notify Customer" }
    ]
  }
}
```

### 5. **Analytics**
Track notification metrics:
- Delivery rate
- Click-through rate
- Opt-out rate
- Most engaging notification types

---

## ✅ Deployment Checklist

Before going live:

- [ ] Firebase Server Key configured in Supabase
- [ ] Edge Function deployed and tested
- [ ] Frontend build completed successfully
- [ ] Service worker accessible at `/firebase-messaging-sw.js`
- [ ] Translations verified in all 3 languages
- [ ] Database indexes created
- [ ] RLS policies reviewed
- [ ] Test notifications sent successfully
- [ ] Browser permission flow tested
- [ ] Background notifications tested
- [ ] Error handling verified
- [ ] Logs reviewed for issues
- [ ] Documentation reviewed
- [ ] Team trained on notification system

---

## 📞 Support

For issues or questions:
1. Check **troubleshooting section** above
2. Review **Edge Function logs**: `supabase functions logs send-notification`
3. Check **browser console** for client-side errors
4. Verify **FCM tokens** in database
5. Review **documentation** in respective README files

---

**System Status:** ✅ Ready for Production
**Last Updated:** 2025-10-27
**Version:** 1.0.0
