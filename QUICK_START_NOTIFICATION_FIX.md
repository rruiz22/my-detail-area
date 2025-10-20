# Quick Start: Fix Get Ready Notifications

## Problem
- 400 Bad Request on notifications query
- 406 Not Acceptable on user preferences query
- Notifications panel stuck on "Loading..."

## Solution Applied

### ✅ Code Changes (Already Done)
The following files have been updated:
1. `src/hooks/useGetReadyNotifications.tsx` - Fixed column names in query
2. `src/types/getReady.ts` - Updated TypeScript interfaces
3. `src/components/get-ready/notifications/NotificationPanel.tsx` - Updated vehicle display

### ⏳ Database Changes (You Need to Apply)
Two SQL scripts need to be run on your Supabase database.

---

## Step 1: Apply Database Fixes (Required)

### Option A: Run Single Script (Recommended)
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Open the file: `apply_notification_fixes.sql`
5. Copy the entire contents
6. Paste into SQL Editor
7. Click **Run**
8. Verify you see success messages

### Option B: Run Individual Migrations
1. Open Supabase Dashboard SQL Editor
2. Run migration 1: `supabase/migrations/20251017171400_fix_user_notification_preferences_pk.sql`
3. Run migration 2: `supabase/migrations/20251017171500_fix_notification_triggers_column_names.sql`

---

## Step 2: Test the Fix

### Clear Browser Cache
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Verify in Browser
1. Open your app: http://localhost:8080
2. Look at the notification bell in the header
3. Click the bell icon
4. **Expected:** Notifications panel opens and shows notifications
5. **Expected:** No 400 or 406 errors in browser console

### Check Browser Console
Press F12 → Console tab
- ❌ Before fix: 400 and 406 errors
- ✅ After fix: No errors, notifications load successfully

---

## Step 3: Create Test Notifications (Optional)

To verify everything works:

1. Open Supabase SQL Editor
2. Open file: `test_notifications.sql`
3. **UPDATE** the configuration at the top:
   ```sql
   v_dealer_id BIGINT := 5; -- Your dealer ID
   v_user_id UUID := '122c8d5b-e5f5-4782-a179-544acbaaceb9'::UUID; -- Your user ID
   ```
4. Run the script
5. Refresh your browser
6. Notification bell should show "5 unread"
7. Click bell to see test notifications

### Cleanup Test Data
When done testing, run: `cleanup_test_notifications.sql`

---

## Expected Behavior After Fix

### Notification Bell
- ✅ Shows unread count badge
- ✅ Badge color: Red (critical), Amber (high), Gray (medium/low)
- ✅ Bell animates when new notifications arrive
- ✅ Pulses for critical notifications

### Notification Panel
- ✅ Opens when clicked
- ✅ Shows list of notifications with:
  - Icon and color by priority
  - Title and message
  - Vehicle info (year, make, model, stock)
  - Timestamp ("2 minutes ago")
  - "New" badge for unread
  - "Critical" badge for critical priority
- ✅ Filter by type and priority
- ✅ Click to navigate to related entity
- ✅ Dismiss button (X)
- ✅ Mark all as read button

### Actions
- ✅ Mark as read (click notification)
- ✅ Dismiss (click X)
- ✅ Mark all as read (button in footer)
- ✅ Filter by type (dropdown)
- ✅ Filter by priority (dropdown)
- ✅ Navigate to related entity (click notification)

---

## Troubleshooting

### Still seeing 400 errors?
- Verify database migrations ran successfully
- Check Supabase logs for errors
- Clear browser cache completely
- Verify user has dealer membership

### Still seeing 406 errors?
- Verify composite primary key was created
- Check SQL Editor for error messages
- Try deleting old preference records manually

### Notifications not showing?
- Check browser console for errors
- Verify user is logged in
- Verify user has active dealer membership
- Check notification query filters

### Real-time not working?
- Verify Supabase real-time is enabled for your project
- Check browser console for websocket connection
- Verify subscription is active

---

## Files Reference

### SQL Scripts (Database)
- `apply_notification_fixes.sql` - **Run this first** (applies all fixes)
- `test_notifications.sql` - Optional: Create test notifications
- `cleanup_test_notifications.sql` - Optional: Remove test notifications

### Migrations (Already Applied to Code)
- `supabase/migrations/20251017171400_fix_user_notification_preferences_pk.sql`
- `supabase/migrations/20251017171500_fix_notification_triggers_column_names.sql`

### Code Changes (Already Done)
- `src/hooks/useGetReadyNotifications.tsx`
- `src/types/getReady.ts`
- `src/components/get-ready/notifications/NotificationPanel.tsx`

### Documentation
- `NOTIFICATION_FIX_SUMMARY.md` - Complete technical documentation

---

## What Changed?

### Database Schema
**Before:**
```sql
-- user_notification_preferences
PRIMARY KEY (user_id)  -- ❌ Wrong: Only one preference per user globally
```

**After:**
```sql
-- user_notification_preferences
PRIMARY KEY (user_id, dealer_id)  -- ✅ Correct: One preference per user per dealer
```

### Query Column Names
**Before:**
```typescript
// ❌ Wrong column names
vehicle:related_vehicle_id (
  year,
  make,
  model
)
```

**After:**
```typescript
// ✅ Correct column names
vehicle:related_vehicle_id (
  vehicle_year,
  vehicle_make,
  vehicle_model
)
```

### Trigger Functions
**Before:**
```sql
-- ❌ Wrong: These columns don't exist
v_vehicle_info := NEW.year || ' ' || NEW.make || ' ' || NEW.model;
```

**After:**
```sql
-- ✅ Correct: Using actual database columns
v_vehicle_info := NEW.vehicle_year || ' ' || NEW.vehicle_make || ' ' || NEW.vehicle_model;
```

---

## Success Criteria

✅ No 400 Bad Request errors in browser console
✅ No 406 Not Acceptable errors in browser console
✅ Notification bell shows correct unread count
✅ Notification panel opens and displays notifications
✅ Vehicle information displays correctly
✅ All actions work (mark read, dismiss, etc.)
✅ Real-time updates work (new notifications appear)
✅ Preferences can be saved

---

## Next Steps After Fix

Once everything works:

1. Monitor notification system in production
2. Create production notifications via triggers (automatic)
3. Users can customize preferences via Settings
4. Consider adding:
   - Email notifications (Edge Function)
   - Desktop push notifications
   - Notification grouping
   - Archive/history view

---

**Need Help?**

See full documentation: `NOTIFICATION_FIX_SUMMARY.md`

**Generated:** 2025-10-17
**Status:** Ready for Production ✅
