# FCM Installation Steps - Quick Start

**Date:** 2025-10-18
**Status:** Ready to Install
**Time Required:** 30 minutes

## Prerequisites Check

Before starting, ensure you have:
- ✅ Firebase credentials (API Key, App ID, Server Key)
- ✅ Supabase access (database + Edge Functions)
- ✅ Node.js and npm installed
- ✅ Git access to project

## Installation Steps

### Step 1: Install Firebase SDK (5 minutes)

```bash
cd C:\Users\rudyr\apps\mydetailarea

# Install Firebase
npm install firebase

# Verify installation
npm list firebase
```

**Expected output:**
```
└── firebase@10.x.x
```

### Step 2: Configure Environment Variables (5 minutes)

1. **Open `.env.local`:**
   ```bash
   notepad .env.local
   ```

2. **Add Firebase configuration:**
   ```bash
   # Firebase Cloud Messaging Configuration
   VITE_FIREBASE_API_KEY=AIzaSyD...  # REPLACE WITH YOUR KEY
   VITE_FIREBASE_AUTH_DOMAIN=my-detail-area.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=my-detail-area
   VITE_FIREBASE_STORAGE_BUCKET=my-detail-area.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=242154179799
   VITE_FIREBASE_APP_ID=1:242154179799:web:7c5b71cdcdeedac9277492  # REPLACE
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX  # OPTIONAL
   ```

3. **Save and close**

**Where to get credentials:** See [FCM_CREDENTIALS_TEMPLATE.md](./FCM_CREDENTIALS_TEMPLATE.md)

### Step 3: Update Service Worker (3 minutes)

1. **Open `public/firebase-messaging-sw.js`:**
   ```bash
   notepad public\firebase-messaging-sw.js
   ```

2. **Find line ~12 and replace placeholders:**
   ```javascript
   const firebaseConfig = {
     apiKey: 'AIzaSyD...',  // 👈 YOUR ACTUAL KEY
     authDomain: 'my-detail-area.firebaseapp.com',
     projectId: 'my-detail-area',
     storageBucket: 'my-detail-area.firebasestorage.app',
     messagingSenderId: '242154179799',
     appId: '1:242154179799:web:7c5b71cdcdeedac9277492',  // 👈 YOUR ACTUAL APP ID
   };
   ```

3. **Save and close**

### Step 4: Deploy Database Migration (3 minutes)

```bash
# Apply migration to create fcm_tokens table
supabase db push

# Verify table created
# Go to Supabase Dashboard > SQL Editor > Run:
SELECT * FROM fcm_tokens LIMIT 1;
```

**Expected:** Empty result (table exists but no data)

### Step 5: Set Supabase Secrets (5 minutes)

**Method 1: Via CLI (Recommended)**
```bash
# Set FCM Server Key (get from Firebase Console > Cloud Messaging)
supabase secrets set FCM_SERVER_KEY=AAAA...  # YOUR ACTUAL SERVER KEY

# Set Project ID
supabase secrets set FCM_PROJECT_ID=my-detail-area

# Verify secrets set
supabase secrets list
```

**Method 2: Via Dashboard**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Edge Functions** → **Secrets**
4. Add:
   - `FCM_SERVER_KEY`: `AAAA...` (your server key)
   - `FCM_PROJECT_ID`: `my-detail-area`

### Step 6: Deploy Edge Function (3 minutes)

```bash
# Deploy FCM notification sender
supabase functions deploy push-notification-fcm

# Verify deployment
supabase functions list
```

**Expected output:**
```
push-notification-fcm (deployed)
```

### Step 7: Restart Development Server (1 minute)

```bash
# Stop current dev server (Ctrl+C)
# Start fresh
npm run dev
```

**Expected:** Server starts on port 8080 without errors

### Step 8: Verify Installation (5 minutes)

#### A. Check Configuration in Browser

1. Open: http://localhost:8080
2. Open DevTools → Console
3. Run:
   ```javascript
   console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...');
   console.log('Firebase Project:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
   ```

**Expected:**
```
Firebase API Key: AIzaSyD...
Firebase Project: my-detail-area
```

#### B. Check Service Worker

In browser console:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach(r => console.log('  -', r.scope));
});
```

**Expected:** At least 1 service worker registered

#### C. Test Configuration Status

```javascript
// In browser console (if useFCMNotifications is accessible)
// Or create a test component

import { getFirebaseConfigStatus } from './src/config/firebase';
console.log(getFirebaseConfigStatus());
```

**Expected:**
```javascript
{
  apiKey: true,
  authDomain: true,
  projectId: true,
  storageBucket: true,
  messagingSenderId: true,
  appId: true,
  measurementId: true,
  isFullyConfigured: true
}
```

## Quick Test (After Installation)

### Test 1: Generate FCM Token

1. Create a test component:
   ```typescript
   // src/components/test/FCMTest.tsx
   import { useFCMNotifications } from '@/hooks/useFCMNotifications';

   export function FCMTest() {
     const {
       isSupported,
       isConfigured,
       isSubscribed,
       subscribe,
       testNotification,
     } = useFCMNotifications();

     return (
       <div style={{ padding: '20px', border: '1px solid #ccc' }}>
         <h2>FCM Test</h2>
         <p>Supported: {isSupported ? 'Yes' : 'No'}</p>
         <p>Configured: {isConfigured ? 'Yes' : 'No'}</p>
         <p>Subscribed: {isSubscribed ? 'Yes' : 'No'}</p>

         {!isSubscribed && (
           <button onClick={() => subscribe()}>
             Enable FCM Notifications
           </button>
         )}

         {isSubscribed && (
           <button onClick={() => testNotification()}>
             Send Test Notification
           </button>
         )}
       </div>
     );
   }
   ```

2. Add to a page temporarily
3. Click "Enable FCM Notifications"
4. Check browser console for: `[FCM] Token received: ...`
5. Check database: `SELECT * FROM fcm_tokens;`

### Test 2: Send Test Notification

1. Click "Send Test Notification" button
2. Check browser for notification popup
3. Check Edge Function logs:
   ```sql
   SELECT * FROM edge_function_logs
   WHERE function_name = 'push-notification-fcm'
   ORDER BY created_at DESC LIMIT 5;
   ```

## Troubleshooting Installation

### Issue: `npm install firebase` fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install firebase

# Or use specific version
npm install firebase@10.7.1
```

### Issue: "Firebase is not configured" in browser

**Checklist:**
- [ ] `.env.local` has all `VITE_FIREBASE_*` variables
- [ ] No placeholder values like `YOUR_API_KEY`
- [ ] Dev server restarted after adding variables

**Fix:**
```bash
# Verify env vars loaded
cat .env.local | grep FIREBASE

# Restart dev server
npm run dev
```

### Issue: Migration fails

**Error:** `relation "fcm_tokens" already exists`

**Solution:** Table already exists, skip migration
```bash
# Check if table exists
# In Supabase SQL Editor:
SELECT * FROM fcm_tokens;
```

**Error:** `permission denied`

**Solution:** Check database permissions
```bash
# Verify you're connected to correct project
supabase status
```

### Issue: Edge Function deployment fails

**Error:** `No project found`

**Solution:**
```bash
# Link to Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Then deploy
supabase functions deploy push-notification-fcm
```

### Issue: Secrets not set

**Verify:**
```bash
supabase secrets list
```

**Should show:**
- `FCM_SERVER_KEY`
- `FCM_PROJECT_ID`

**If missing:**
```bash
supabase secrets set FCM_SERVER_KEY=YOUR_KEY
supabase secrets set FCM_PROJECT_ID=my-detail-area
```

## Post-Installation Checklist

After completing all steps, verify:

### ✅ Installation Complete
- [ ] Firebase npm package installed
- [ ] `.env.local` has Firebase credentials
- [ ] `firebase-messaging-sw.js` updated with credentials
- [ ] Database migration applied (fcm_tokens table exists)
- [ ] Supabase secrets set (FCM_SERVER_KEY, FCM_PROJECT_ID)
- [ ] Edge Function deployed successfully
- [ ] Dev server running without errors

### ✅ Configuration Valid
- [ ] Browser console shows Firebase config loaded
- [ ] Service Worker registered successfully
- [ ] No TypeScript import errors
- [ ] No runtime errors in console

### ✅ Basic Functionality
- [ ] FCM token can be generated
- [ ] Token saves to database
- [ ] Test notification can be sent
- [ ] Notification appears in browser

## Next Steps

1. ✅ Installation complete
2. 📖 Read: [FCM_SETUP_GUIDE.md](./FCM_SETUP_GUIDE.md) for detailed usage
3. 🧪 Follow: [FCM_COMPARISON_TESTING.md](./FCM_COMPARISON_TESTING.md) for testing
4. 🔄 Compare with existing web-push system
5. 📊 Monitor reliability and performance
6. 🎯 Decide on migration strategy

## Support

If you encounter issues:

1. Check troubleshooting section above
2. Review error messages in:
   - Browser console
   - Edge Function logs (`edge_function_logs` table)
   - Dev server terminal
3. Consult: [FCM_SETUP_GUIDE.md](./FCM_SETUP_GUIDE.md)
4. Check Firebase Console for API errors

## Quick Reference

**Files Created:**
- `src/config/firebase.ts` - Firebase initialization
- `src/hooks/useFCMNotifications.tsx` - FCM React hook
- `public/firebase-messaging-sw.js` - Service Worker
- `supabase/functions/push-notification-fcm/` - Edge Function
- `supabase/migrations/20251018000001_create_fcm_tokens_table.sql` - Database

**Environment Variables:**
```bash
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

**Supabase Secrets:**
```bash
FCM_SERVER_KEY
FCM_PROJECT_ID
```

**Database:**
```sql
fcm_tokens (id, user_id, dealer_id, fcm_token, is_active, created_at, updated_at)
```

---

**Installation Time:** ~30 minutes
**Difficulty:** Medium
**Reversible:** Yes (see [FCM_ROLLBACK_INSTRUCTIONS.md](./FCM_ROLLBACK_INSTRUCTIONS.md))

**Last Updated:** 2025-10-18
