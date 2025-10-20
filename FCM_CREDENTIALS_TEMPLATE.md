# FCM Credentials Configuration Template

**IMPORTANT:** This file shows WHERE to paste your Firebase credentials. DO NOT commit credentials to git.

## Your Firebase Project Details

- **Project Name:** my-detail-area
- **Project ID:** my-detail-area
- **Sender ID:** 242154179799

## Frontend Configuration (.env.local)

Open: `C:\Users\rudyr\apps\mydetailarea\.env.local`

Add these lines (replace `YOUR_*` placeholders with actual values):

```bash
# ============================================
# Firebase Cloud Messaging (FCM)
# ============================================

# API Key (from Firebase Console > Project Settings > General > Web apps)
VITE_FIREBASE_API_KEY=YOUR_ACTUAL_API_KEY_HERE

# Auth Domain (usually: project-id.firebaseapp.com)
VITE_FIREBASE_AUTH_DOMAIN=my-detail-area.firebaseapp.com

# Project ID
VITE_FIREBASE_PROJECT_ID=my-detail-area

# Storage Bucket
VITE_FIREBASE_STORAGE_BUCKET=my-detail-area.firebasestorage.app

# Messaging Sender ID (from Cloud Messaging settings)
VITE_FIREBASE_MESSAGING_SENDER_ID=242154179799

# App ID (from Firebase Console > Project Settings > General > Web apps)
VITE_FIREBASE_APP_ID=YOUR_ACTUAL_APP_ID_HERE

# Measurement ID (optional - for Google Analytics)
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID_HERE
```

## Service Worker Configuration

Open: `C:\Users\rudyr\apps\mydetailarea\public\firebase-messaging-sw.js`

Find this section (around line 12):

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_FIREBASE_API_KEY', // 👈 REPLACE THIS
  authDomain: 'my-detail-area.firebaseapp.com',
  projectId: 'my-detail-area',
  storageBucket: 'my-detail-area.firebasestorage.app',
  messagingSenderId: '242154179799',
  appId: 'YOUR_FIREBASE_APP_ID', // 👈 REPLACE THIS
};
```

Replace:
- `YOUR_FIREBASE_API_KEY` → Your actual API key
- `YOUR_FIREBASE_APP_ID` → Your actual App ID

## Backend Configuration (Supabase Secrets)

### Option 1: Via Supabase CLI

```bash
# Navigate to project
cd C:\Users\rudyr\apps\mydetailarea

# Set FCM Server Key
supabase secrets set FCM_SERVER_KEY=YOUR_SERVER_KEY_HERE

# Set Project ID
supabase secrets set FCM_PROJECT_ID=my-detail-area
```

### Option 2: Via Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Edge Functions** → **Secrets**
4. Add secrets:
   - Name: `FCM_SERVER_KEY`, Value: `YOUR_SERVER_KEY`
   - Name: `FCM_PROJECT_ID`, Value: `my-detail-area`

## Where to Find Your Credentials

### API Key & App ID

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select: **my-detail-area** project
3. Click: **⚙️ (gear icon)** → **Project settings**
4. Scroll to: **Your apps** section
5. Find or create a **Web app**
6. Click: **Config** (looks like `</> ` icon)
7. Copy values from the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",           // 👈 This is VITE_FIREBASE_API_KEY
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "1:242154179799:web:...", // 👈 This is VITE_FIREBASE_APP_ID
  measurementId: "G-..."           // 👈 This is VITE_FIREBASE_MEASUREMENT_ID
};
```

### FCM Server Key (for Edge Function)

1. Firebase Console → **⚙️** → **Project settings**
2. Go to: **Cloud Messaging** tab
3. Scroll to: **Cloud Messaging API (Legacy)**
4. Find: **Server key** (starts with `AAAA...`)
5. Copy this to Supabase secrets as `FCM_SERVER_KEY`

**Note:** For production, migrate to OAuth2 with service account instead of legacy server key.

## Verification Checklist

After configuring credentials, verify:

### ✅ Frontend Configuration
```bash
# Restart dev server
npm run dev

# Open browser console
# Navigate to your app
# Run in console:
```

```javascript
// Check environment variables are loaded
console.log('API Key configured:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log('App ID configured:', !!import.meta.env.VITE_FIREBASE_APP_ID);
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

Should output:
```
API Key configured: true
App ID configured: true
Project ID: my-detail-area
```

### ✅ Service Worker Configuration
```javascript
// Check if service worker can initialize Firebase
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach(reg => console.log('SW scope:', reg.scope));
});
```

### ✅ Backend Configuration
```bash
# List Supabase secrets
supabase secrets list

# Should show:
# - FCM_SERVER_KEY
# - FCM_PROJECT_ID
```

## Security Best Practices

### ✅ DO
- Store credentials in `.env.local` (ignored by git)
- Use environment variables for all sensitive values
- Set Supabase secrets via CLI or Dashboard
- Configure Firebase authorized domains
- Keep `.env.fcm.example` as template only

### ❌ DON'T
- Commit `.env.local` to git
- Hardcode credentials in source files
- Share Server Key publicly
- Expose Server Key in frontend code
- Commit credential files to version control

## Troubleshooting

### "Firebase is not configured"

**Check:**
1. `.env.local` exists and has all `VITE_FIREBASE_*` variables
2. No placeholder values like `YOUR_API_KEY`
3. Dev server restarted after adding variables

**Fix:**
```bash
# Verify .env.local
cat .env.local | grep FIREBASE

# Restart dev server
npm run dev
```

### "FCM_SERVER_KEY not configured"

**Check:**
1. Supabase secrets are set
2. Edge Function has access to secrets

**Fix:**
```bash
# Set via CLI
supabase secrets set FCM_SERVER_KEY=YOUR_KEY

# Redeploy Edge Function
supabase functions deploy push-notification-fcm
```

### "Failed to initialize Firebase"

**Possible causes:**
- Invalid API Key
- Wrong Project ID
- Credentials mismatch

**Fix:**
1. Double-check all credentials from Firebase Console
2. Ensure API Key matches App ID
3. Verify Project ID is exactly: `my-detail-area`

## Your Actual Credentials

**Write your credentials here (for reference only - DO NOT COMMIT):**

```
API Key: ________________
App ID: ________________
Measurement ID: ________________
Server Key: ________________

Last updated: ___________
Updated by: ___________
```

---

**REMINDER:** After filling in credentials, keep this file LOCAL only. Never commit to git.

**Next Step:** Follow [FCM_SETUP_GUIDE.md](./FCM_SETUP_GUIDE.md) for deployment instructions.
