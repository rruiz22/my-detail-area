# 🔧 SMS Notification Diagnostics - Detail Manager Issue

## 📋 Problem Summary

**User:** Detail Department (`f2875799-7e7b-4622-9923-83d1965d99b0`)
**Role:** `detail_manager`
**Issue:** Receiving SMS notifications when UI shows all switches OFF

**Evidence:**
- UI Screenshot: All notification switches are OFF (0 of 10 events enabled)
- Edge Function Logs: `✅ LEVEL 2 PASSED: Role "detail_manager" allows event "status_changed"`

**Conclusion:** Database has `enabled=true` but UI shows `enabled=false` - **DATA INCONSISTENCY**

---

## 🚀 Quick Start

### Option A: Using Supabase CLI

```bash
cd C:\Users\rudyr\apps\mydetailarea

# 1. Run diagnostic
npx supabase db execute --file supabase/diagnostics/diagnose_detail_manager_sms.sql

# 2. Review output, then apply fix
npx supabase db execute --file supabase/diagnostics/fix_detail_manager_sms.sql
```

### Option B: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
2. Copy contents of `diagnose_detail_manager_sms.sql`
3. Paste and click "Run"
4. Review results
5. Copy contents of `fix_detail_manager_sms.sql`
6. Paste and click "Run"

### Option C: Using psql (Direct Connection)

```bash
# Get connection string from Supabase Dashboard → Settings → Database
psql "postgresql://postgres.[PROJECT_REF]@...supabase.co:5432/postgres"

# Run diagnostic
\i supabase/diagnostics/diagnose_detail_manager_sms.sql

# Run fix
\i supabase/diagnostics/fix_detail_manager_sms.sql
```

---

## 📊 Diagnostic Script Output

The diagnostic script (`diagnose_detail_manager_sms.sql`) will show:

### 🔍 DIAGNOSTIC 1: Role Notification Configuration
Shows current `enabled` status for `status_changed` event:
```
role_name      | module        | event_type     | ⚠️ ENABLED
----------------|---------------|----------------|------------
detail_manager | sales_orders  | status_changed | true  ← PROBLEM
detail_manager | service_orders| status_changed | true  ← PROBLEM
```

### 👥 DIAGNOSTIC 2: All "Detail" Roles
Lists all roles with "detail" in the name and user counts.

### 🧑 DIAGNOSTIC 3: User "Detail Department" Info
Confirms user ID, role assignment, and dealer association.

### 📊 DIAGNOSTIC 4: All Events for Detail Manager
Shows ALL notification events (not just `status_changed`).

### 📜 DIAGNOSTIC 5: Recent SMS History
Last 10 SMS sent to Detail Department's phone.

---

## 🔧 Fix Script Actions

The fix script (`fix_detail_manager_sms.sql`) will:

1. **Show BEFORE state** - Current `enabled` values
2. **Apply UPDATE** - Set `enabled = false` for `status_changed` events
3. **Show AFTER state** - Verify all values are now `false`

**SQL Query:**
```sql
UPDATE role_notification_events
SET enabled = false, updated_at = NOW()
WHERE role_id IN (
  SELECT id FROM dealer_custom_roles
  WHERE role_name ILIKE '%detail%manager%'
)
AND event_type = 'status_changed';
```

---

## ✅ Verification Steps

After running the fix script:

### 1. Check Database State
Run diagnostic script again - all `enabled` should be `false`:
```bash
npx supabase db execute --file supabase/diagnostics/diagnose_detail_manager_sms.sql
```

### 2. Test in Application
1. Go to a sales order where "Detail Department" is a follower
2. Change the order status (e.g., "in_progress" → "completed")
3. Verify Detail Department does **NOT** receive SMS

### 3. Check Edge Function Logs
View logs at: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/logs/edge-functions

Should see:
```
❌ LEVEL 2 FAILED: Role "detail_manager" does NOT allow event "status_changed"
```

Instead of:
```
✅ LEVEL 2 PASSED: Role "detail_manager" allows event "status_changed"
```

### 4. Verify UI
1. Go to Management → Roles
2. Select "Detail Manager" role
3. Click "Notification Settings" 🔔
4. Confirm "Status Changed" toggle is still OFF
5. UI and DB should now match

---

## 🔄 Rollback Instructions

If you need to revert the changes:

```sql
UPDATE role_notification_events
SET enabled = true, updated_at = NOW()
WHERE role_id IN (
  SELECT id FROM dealer_custom_roles
  WHERE role_name ILIKE '%detail%manager%'
)
AND event_type = 'status_changed';
```

---

## 📁 Files in This Directory

```
supabase/diagnostics/
├── README.md                           ← You are here
├── diagnose_detail_manager_sms.sql     ← Run this FIRST (read-only)
└── fix_detail_manager_sms.sql          ← Run this AFTER reviewing diagnostic
```

---

## 🔍 Root Cause Analysis

**Why did this happen?**

1. **Default Configuration:** Migration `20251108000006_populate_default_role_events.sql` auto-creates `enabled=true` for detail roles
2. **UI Load Issue:** Hook `useRoleNotificationEvents` may not be loading the correct role_id
3. **Save Failure:** User changed toggle to OFF but save operation failed silently
4. **Cache Problem:** UI showing cached state that doesn't match DB reality

**Evidence:**
- Edge Function logs show `enabled=true` (DB reality)
- UI screenshot shows all switches OFF (UI display)
- **Conclusion:** DB is source of truth, UI is stale/incorrect

---

## 🎯 Expected Outcome

After applying fix:
- ✅ Database: `enabled = false`
- ✅ UI: Shows switches OFF (matches DB)
- ✅ SMS Behavior: Detail Department will NOT receive status change SMS
- ✅ Edge Function: LEVEL 2 validation will FAIL (reject notifications)

---

## ⚠️ Important Notes

1. **Scope:** Only affects `status_changed` event for detail_manager role
2. **Other Events:** Order Created, Order Assigned, etc. remain unchanged
3. **Other Roles:** No impact on other roles (sales_manager, service_advisor, etc.)
4. **Reversible:** Can easily revert using rollback SQL above
5. **No Data Loss:** Only updates notification flags, no order/user data affected

---

## 📞 Support

If issues persist after running fix:

1. Check that role_id in diagnostic output matches user's role
2. Verify there aren't multiple "detail_manager" roles in different dealerships
3. Review Edge Function code: `supabase/functions/send-order-sms-notification/index.ts` (lines 534-559)
4. Check UI hook: `src/hooks/useRoleNotificationEvents.ts` (lines 42-67)

---

## 📚 Related Files

- **Edge Function:** `supabase/functions/send-order-sms-notification/index.ts`
- **UI Modal:** `src/components/dealer/RoleNotificationsModal.tsx`
- **Data Hook:** `src/hooks/useRoleNotificationEvents.ts`
- **Table Schema:** `supabase/migrations/20251108000004_create_role_notification_events.sql`
- **Default Config:** `supabase/migrations/20251108000006_populate_default_role_events.sql`
