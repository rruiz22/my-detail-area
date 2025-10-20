# FCM Implementation Rollback Instructions

**Created:** 2025-10-18
**Purpose:** Complete rollback procedure if FCM implementation needs to be removed

## Overview

This FCM implementation is **completely additive** and runs in parallel to the existing web-push system. Rolling back is safe and non-destructive.

## Impact Assessment

### ✅ SAFE - No Existing Code Modified
- Existing `usePushNotifications` hook: **UNCHANGED**
- Existing `sw.js` service worker: **UNCHANGED**
- Existing `push-notification-sender` Edge Function: **UNCHANGED**
- Existing `push_subscriptions` table: **UNCHANGED**
- All other application code: **UNCHANGED**

### 📁 NEW Files Created (Can Be Deleted)

**Frontend:**
- `src/config/firebase.ts`
- `src/hooks/useFCMNotifications.tsx`
- `public/firebase-messaging-sw.js`

**Backend:**
- `supabase/functions/push-notification-fcm/index.ts`
- `supabase/functions/push-notification-fcm/deno.json`

**Database:**
- `supabase/migrations/20251018000001_create_fcm_tokens_table.sql`

**Documentation:**
- `FCM_SETUP_GUIDE.md`
- `FCM_CREDENTIALS_TEMPLATE.md`
- `FCM_COMPARISON_TESTING.md`
- `FCM_ROLLBACK_INSTRUCTIONS.md` (this file)
- `.env.fcm.example`

## Rollback Options

### Option 1: Minimal Rollback (Keep Files, Don't Use)

**Impact:** Zero
**Effort:** None
**Recommendation:** Best for "wait and see"

Simply don't use the FCM system:
- Don't call `useFCMNotifications` in any components
- Don't configure Firebase credentials
- Don't deploy Edge Function

**Result:**
- FCM code exists but is never executed
- web-push continues working normally
- No performance impact
- Easy to re-enable later

### Option 2: Soft Rollback (Disable but Keep Structure)

**Impact:** Low
**Effort:** 5 minutes
**Recommendation:** If FCM has issues but want to retry later

#### Steps:

1. **Remove Firebase credentials from .env.local**
   ```bash
   # Edit C:\Users\rudyr\apps\mydetailarea\.env.local
   # Comment out or delete these lines:
   # VITE_FIREBASE_API_KEY=...
   # VITE_FIREBASE_AUTH_DOMAIN=...
   # VITE_FIREBASE_PROJECT_ID=...
   # VITE_FIREBASE_STORAGE_BUCKET=...
   # VITE_FIREBASE_MESSAGING_SENDER_ID=...
   # VITE_FIREBASE_APP_ID=...
   # VITE_FIREBASE_MEASUREMENT_ID=...
   ```

2. **Remove Supabase secrets**
   ```bash
   supabase secrets unset FCM_SERVER_KEY
   supabase secrets unset FCM_PROJECT_ID
   ```

3. **Mark FCM tokens as inactive (optional)**
   ```sql
   -- In Supabase SQL Editor
   UPDATE fcm_tokens SET is_active = false;
   ```

**Result:**
- FCM won't work (missing credentials)
- Code structure remains for future use
- Database table preserved but empty
- Easy to re-enable

### Option 3: Complete Rollback (Remove Everything)

**Impact:** Medium
**Effort:** 15 minutes
**Recommendation:** Only if definitively abandoning FCM

#### Step 1: Remove Frontend Files

```bash
cd C:\Users\rudyr\apps\mydetailarea

# Remove configuration
rm src/config/firebase.ts

# Remove hook
rm src/hooks/useFCMNotifications.tsx

# Remove service worker
rm public/firebase-messaging-sw.js

# Remove documentation
rm FCM_SETUP_GUIDE.md
rm FCM_CREDENTIALS_TEMPLATE.md
rm FCM_COMPARISON_TESTING.md
rm FCM_ROLLBACK_INSTRUCTIONS.md
rm .env.fcm.example
```

#### Step 2: Remove Backend Files

```bash
# Remove Edge Function directory
rm -rf supabase/functions/push-notification-fcm

# Delete Edge Function from Supabase
supabase functions delete push-notification-fcm
```

#### Step 3: Remove Database Migration

**Option A: Revert Migration (if recently applied)**
```bash
# Check migration status
supabase migration list

# Revert specific migration
supabase db reset --db-url <YOUR_DB_URL>

# Then manually reapply all other migrations
supabase db push
```

**Option B: Create Down Migration (safer)**
```bash
# Create new migration to drop table
cat > supabase/migrations/20251018999999_drop_fcm_tokens.sql << EOF
-- Rollback FCM implementation
-- Drop FCM tokens table and related objects

DROP TRIGGER IF EXISTS update_fcm_tokens_updated_at_trigger ON fcm_tokens;
DROP FUNCTION IF EXISTS update_fcm_tokens_updated_at();
DROP POLICY IF EXISTS "Service role can manage all fcm tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can delete own fcm tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can update own fcm tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can insert own fcm tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can view own fcm tokens" ON fcm_tokens;
DROP TABLE IF EXISTS fcm_tokens;
EOF

# Apply migration
supabase db push
```

#### Step 4: Remove npm Dependencies (optional)

```bash
# Only if firebase was ONLY installed for FCM
npm uninstall firebase
```

**Note:** Check if Firebase is used elsewhere before uninstalling!

#### Step 5: Clean Environment Variables

Edit `.env.local` and remove:
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

#### Step 6: Remove Supabase Secrets

```bash
supabase secrets unset FCM_SERVER_KEY
supabase secrets unset FCM_PROJECT_ID
```

#### Step 7: Verify Rollback

```bash
# 1. Check files deleted
ls src/config/firebase.ts          # Should not exist
ls src/hooks/useFCMNotifications.tsx  # Should not exist

# 2. Check Edge Function removed
supabase functions list            # Should NOT show push-notification-fcm

# 3. Check database table removed
# Run in Supabase SQL Editor:
SELECT * FROM fcm_tokens;          # Should error: relation does not exist

# 4. Restart dev server
npm run dev

# 5. Verify app works normally
# Navigate to app, test existing web-push notifications
```

## Verification Checklist

After rollback, verify:

### ✅ Application Still Works
- [ ] App starts without errors
- [ ] No console errors about Firebase
- [ ] No import errors about `useFCMNotifications`
- [ ] Existing web-push system still functional
- [ ] Users can still use app normally

### ✅ FCM Completely Removed (if Option 3)
- [ ] No Firebase config files
- [ ] No FCM hook file
- [ ] No FCM service worker
- [ ] No FCM Edge Function
- [ ] No fcm_tokens table
- [ ] No Firebase env variables
- [ ] No Supabase FCM secrets

### ✅ No Breaking Changes
- [ ] Existing notifications still work (web-push)
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass (if any)

## Re-enabling After Rollback

If you rolled back but want to try FCM again:

### After Option 1 (Minimal):
- Just start using `useFCMNotifications` hook
- Configure Firebase credentials
- Deploy Edge Function

### After Option 2 (Soft):
1. Re-add credentials to `.env.local`
2. Re-set Supabase secrets
3. Restart dev server

### After Option 3 (Complete):
1. Re-create all deleted files (use backup or git)
2. Re-run migration: `supabase db push`
3. Re-deploy Edge Function
4. Re-configure credentials
5. Reinstall dependencies: `npm install firebase`

## Backup Before Rollback

**Recommended:** Create backup before complete rollback

```bash
cd C:\Users\rudyr\apps\mydetailarea

# Create backup directory
mkdir -p backups/fcm-implementation-$(date +%Y%m%d)

# Copy all FCM files
cp src/config/firebase.ts backups/fcm-implementation-$(date +%Y%m%d)/
cp src/hooks/useFCMNotifications.tsx backups/fcm-implementation-$(date +%Y%m%d)/
cp public/firebase-messaging-sw.js backups/fcm-implementation-$(date +%Y%m%d)/
cp -r supabase/functions/push-notification-fcm backups/fcm-implementation-$(date +%Y%m%d)/
cp supabase/migrations/20251018000001_create_fcm_tokens_table.sql backups/fcm-implementation-$(date +%Y%m%d)/
cp FCM_*.md backups/fcm-implementation-$(date +%Y%m%d)/

# Backup database data (if any)
# Run in Supabase SQL Editor and save result:
SELECT * FROM fcm_tokens;
```

## Troubleshooting Rollback Issues

### Issue: Import errors after deletion

**Error:**
```
Cannot find module '@/config/firebase'
```

**Solution:**
```bash
# Search for any remaining imports
grep -r "from '@/config/firebase'" src/
grep -r "useFCMNotifications" src/

# Remove any found references
```

### Issue: Service Worker still trying to load Firebase

**Error:**
```
Failed to load 'firebase-messaging-sw.js'
```

**Solution:**
```bash
# Unregister all service workers
# In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
});

# Then refresh page
```

### Issue: Database migration can't be reverted

**Error:**
```
Migration already applied
```

**Solution:**
Use down migration (Option B in Step 3 above) instead of reverting.

### Issue: Build fails after rollback

**Error:**
```
Type error: Cannot find name 'useFCMNotifications'
```

**Solution:**
```bash
# Clear build cache
rm -rf dist/
rm -rf node_modules/.vite/

# Rebuild
npm run build
```

## Support

If rollback causes issues:

1. **Check this guide** for troubleshooting
2. **Review git history** to see what changed
3. **Restore from backup** if created
4. **Contact development team** with specific error messages

## Decision Tree

```
Do you want to remove FCM?
│
├─ Just want to disable temporarily
│  └─ Use Option 1 (Minimal Rollback)
│
├─ FCM has issues, might retry later
│  └─ Use Option 2 (Soft Rollback)
│
└─ Definitively abandoning FCM
   └─ Use Option 3 (Complete Rollback)
      ├─ Create backup first
      └─ Follow all steps carefully
```

## Rollback Impact Summary

| Rollback Option | Impact | Reversibility | Recommended When |
|----------------|--------|---------------|------------------|
| **Option 1: Minimal** | None | Instant | Testing, waiting |
| **Option 2: Soft** | Low | Easy (5 min) | FCM not working |
| **Option 3: Complete** | Medium | Moderate (30 min) | Abandoning FCM |

**Remember:** The existing web-push system continues working normally regardless of which rollback option you choose.

---

**Last Updated:** 2025-10-18
**Safe to Execute:** Yes (all options are non-destructive to existing system)
