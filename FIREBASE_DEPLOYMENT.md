# Firebase Cloud Messaging - Deployment Guide

## 📋 Overview

This document explains how to configure Firebase Cloud Messaging (FCM) for push notifications in production (Vercel).

---

## 🚀 Vercel Environment Variables Configuration

### Required Variables

Add these environment variables in your Vercel project dashboard:

**Path**: Vercel Dashboard → Your Project → Settings → Environment Variables

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `VITE_FIREBASE_API_KEY` | `AIzaSyD3QeCOdORBuMSpbeqsfML9lPS5wFMOXmQ` | Production, Preview, Development |
| `VITE_FIREBASE_AUTH_DOMAIN` | `my-detail-area.firebaseapp.com` | Production, Preview, Development |
| `VITE_FIREBASE_PROJECT_ID` | `my-detail-area` | Production, Preview, Development |
| `VITE_FIREBASE_STORAGE_BUCKET` | `my-detail-area.firebasestorage.app` | Production, Preview, Development |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `242154179799` | Production, Preview, Development |
| `VITE_FIREBASE_APP_ID` | `1:242154179799:web:7c5b71cdcdeedac9277492` | Production, Preview, Development |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-XXXXXXXXXX` | Production, Preview, Development |
| `VITE_FCM_VAPID_KEY` | `BKxpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8ZI6rOVVUgtVtn6LCpRj07anNaUSLnqO0PkpkXUPm6Q` | Production, Preview, Development |

---

## 📝 Step-by-Step Instructions

### 1. Access Vercel Dashboard

```bash
# Open your Vercel project
https://vercel.com/dashboard
```

### 2. Navigate to Environment Variables

1. Select your project (MyDetailArea)
2. Click **Settings** in the top navigation
3. Select **Environment Variables** from the sidebar

### 3. Add Each Variable

For each variable listed above:

1. Click **"Add New"**
2. **Name**: Enter the variable name (e.g., `VITE_FIREBASE_API_KEY`)
3. **Value**: Paste the corresponding value
4. **Environments**: Select all three checkboxes:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
5. Click **Save**

### 4. Redeploy

After adding all variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **⋯** (three dots) menu
4. Select **Redeploy**
5. Confirm the redeployment

---

## ✅ Verification

After redeployment completes:

### Check 1: Firebase Initialization

1. Open your production URL: `https://dds.mydetailarea.com`
2. Open browser DevTools console (F12)
3. Look for: `🔥 Firebase Cloud Messaging initialized successfully`

**✓ Success**: You see the initialization message
**✗ Failure**: You see `⚠️ Firebase not configured - FCM features disabled`

### Check 2: Environment Variables Loaded

Run this in the browser console:

```javascript
console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY);
console.log('Firebase Project:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

**Expected output**:
```
Firebase API Key: AIzaSyD3QeCOdORBuMSpbeqsfML9lPS5wFMOXmQ
Firebase Project: my-detail-area
```

### Check 3: Push Notifications Toggle

1. Navigate to `/profile` → **Notifications** tab
2. Toggle **"Enable push notifications"** to ON
3. **Expected behavior**:
   - Native browser permission dialog appears
   - After granting permission: Success toast
   - Console shows: `FCM Token obtained: ey...`

**If you see an error**:
- `Registration failed - push service error` → See Firebase Console Setup below

---

## 🔧 Firebase Console Setup (If Needed)

If you get `Registration failed - push service error`:

### Enable Cloud Messaging API

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=my-detail-area)
2. Click **"Enable"** on Firebase Cloud Messaging API
3. Wait 5-10 minutes for propagation

### Verify VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com/project/my-detail-area)
2. Click ⚙️ **Project Settings** → **Cloud Messaging** tab
3. Under **Web Push certificates**, verify the key matches:
   ```
   BKxpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8ZI6rOVVUgtVtn6LCpRj07anNaUSLnqO0PkpkXUPm6Q
   ```

### Check Authorized Domains

1. Firebase Console → **Project Settings** → **General** tab
2. Scroll to **"Authorized domains"**
3. Ensure these domains are listed:
   - `dds.mydetailarea.com`
   - `localhost`
   - `*.vercel.app` (for preview deployments)

---

## 🐛 Troubleshooting

### Issue: `Firebase not configured` in console

**Cause**: Environment variables not set in Vercel
**Solution**: Follow steps 1-4 above to add variables and redeploy

---

### Issue: `AbortError: Registration failed - push service error`

**Cause**: Firebase Cloud Messaging API not enabled in Google Cloud
**Solution**:
1. Enable FCM API in [Google Cloud Console](https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=my-detail-area)
2. Wait 5-10 minutes
3. Try toggle again

---

### Issue: Browser permission dialog doesn't appear

**Cause**: Browser already denied permission
**Solution**: Reset browser permissions:

**Chrome**:
1. Go to `chrome://settings/content/notifications`
2. Find `dds.mydetailarea.com`
3. Change to **"Allow"**

**Firefox**:
1. Click padlock icon in address bar
2. Permissions → Notifications → Allow

---

### Issue: Variables not loading after redeploy

**Cause**: Vercel cache or incorrect environment selection
**Solution**:
1. Verify variables are set for **Production** environment
2. Do a **full redeploy** (not just rerun)
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| [.env](.env) | Local development environment variables |
| [.env.example](.env.example) | Template for environment variables |
| [src/lib/firebase.ts](src/lib/firebase.ts) | Firebase initialization logic |
| [src/hooks/useFirebaseMessaging.ts](src/hooks/useFirebaseMessaging.ts) | FCM permission request hook |
| [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js) | Service worker for background notifications |

---

## ✨ Features After Setup

Once Firebase is properly configured, users can:

- ✅ Enable/disable push notifications from `/profile`
- ✅ Receive real-time browser notifications for:
  - New orders assigned to them
  - Order status changes
  - @mentions in comments
  - Follower activity updates
- ✅ Configure notification preferences:
  - Sound
  - Vibration
  - Background notifications
  - Quiet hours

---

## 🔐 Security Notes

- **Public variables**: All `VITE_*` variables are **public** and exposed to the browser
- **These are NOT secrets**: Firebase client config is designed to be public
- **Security is enforced by**:
  - Firebase Security Rules (server-side)
  - Supabase Row Level Security (RLS)
  - Domain restrictions in Firebase Console

---

## 📊 Monitoring

After deployment, monitor FCM token creation:

```sql
-- Check FCM tokens in Supabase
SELECT
  user_id,
  fcm_token,
  device_name,
  browser,
  is_active,
  last_used_at,
  created_at
FROM fcm_tokens
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 10;
```

---

**Last Updated**: 2025-12-24
**MyDetailArea Version**: 1.3.99
