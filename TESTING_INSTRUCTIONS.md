# 🧪 Testing Instructions - Dealership Modules Fix

**Date:** 2025-10-27
**Purpose:** Verify that the dealership modules fix resolves access issues
**Estimated Time:** 15-20 minutes

---

## 📋 Pre-Testing Checklist

Before running tests, ensure:
- [ ] You have access to Supabase SQL Editor
- [ ] You have system admin credentials
- [ ] You have test user credentials for Dealer 5 (detail_manager)
- [ ] Browser DevTools is open (F12) to check console
- [ ] PermissionsDebugger is visible in the app (🐛 button)

---

## 🎯 Test Plan Overview

1. **Pre-Fix Verification** - Confirm the problem exists
2. **Execute Immediate Fix** - Run SQL for Dealer 5
3. **Post-Fix Verification** - Confirm Dealer 5 is fixed
4. **Execute Migration** - Run backfill for all dealers
5. **System-Wide Verification** - Confirm all dealers are fixed
6. **Execute Trigger Setup** - Install auto-initialization
7. **Trigger Testing** - Test with new dealership
8. **User Access Testing** - Login as custom role user
9. **Regression Testing** - Ensure nothing broke

---

## 🔍 Step 1: Pre-Fix Verification

### 1.1 Check Dealer 5 Module Status

**Query:**
```sql
-- Should return 0 rows (no modules configured)
SELECT * FROM dealership_modules WHERE dealer_id = 5;
```

**Expected Result:** Empty (0 rows)

**Actual Result:** _______________

### 1.2 Check Console Warnings

**Steps:**
1. Login to the app as system admin
2. Navigate to `/admin/5`
3. Open browser DevTools (F12) → Console tab
4. Click on PermissionsDebugger (🐛) button

**Expected Console Output:**
```
[hasModuleAccess] ⚠️ No modules configured - DENYING dashboard (fail-closed security)
[hasModuleAccess] ⚠️ No modules configured - DENYING sales_orders (fail-closed security)
...
This should not happen - dealership may need module configuration
```

**Observed:** ✅ YES / ❌ NO

### 1.3 Check All Affected Dealerships

**Query:**
```sql
-- List all dealerships without modules
SELECT
  d.id,
  d.name,
  d.created_at,
  COUNT(dm.module) as module_count
FROM dealerships d
LEFT JOIN dealership_modules dm ON d.id = dm.dealer_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.created_at
HAVING COUNT(dm.module) = 0
ORDER BY d.id;
```

**Expected Result:** List of dealerships (including Dealer 5)

**Number of Affected Dealerships:** _______________

---

## 🔧 Step 2: Execute Immediate Fix

### 2.1 Run Immediate Fix Script

**File:** `FIX_DEALER_5_MODULES_IMMEDIATE.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `FIX_DEALER_5_MODULES_IMMEDIATE.sql`
3. Paste into SQL Editor
4. Click **Run**
5. Review output messages

**Expected Output:**
```
BEFORE FIX: dealer_id=5, module_count=0
✅ initialize_dealership_modules executed
✅ UPDATE executed (8 rows affected)
AFTER FIX: 16 rows showing modules with enabled/disabled status
```

**Script Executed:** ✅ YES / ❌ NO
**Errors Encountered:** _______________

### 2.2 Verify Module Creation

**Query:**
```sql
SELECT
  module,
  is_enabled,
  CASE
    WHEN is_enabled THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM dealership_modules
WHERE dealer_id = 5
ORDER BY is_enabled DESC, module;
```

**Expected Result:** 16 rows (8 enabled, 8 disabled)

**Actual Count:**
- Total modules: _______________
- Enabled: _______________
- Disabled: _______________

**Test Status:** ✅ PASS / ❌ FAIL

---

## ✅ Step 3: Post-Fix Verification

### 3.1 Check Console (Should be Clean)

**Steps:**
1. Refresh the browser (F5)
2. Navigate to `/admin/5`
3. Check console for warnings

**Expected:** No "No modules configured" warnings

**Actual:** ✅ Clean / ❌ Still showing warnings

### 3.2 Check PermissionsDebugger

**Steps:**
1. Click PermissionsDebugger (🐛) button
2. Go to "Modules" tab
3. Check status for each module

**Expected Status:**
- ✅ dashboard - GREEN
- ✅ sales_orders - GREEN
- ✅ service_orders - GREEN
- ✅ recon_orders - GREEN
- ✅ stock - GREEN
- ✅ contacts - GREEN
- ✅ users - GREEN
- ✅ settings - GREEN
- ❌ car_wash - YELLOW/RED (disabled)
- ❌ chat - YELLOW/RED (disabled)

**Observed Status:** ✅ Matches / ❌ Doesn't match

### 3.3 Copy Debug Info

**Steps:**
1. In PermissionsDebugger, go to "Raw" tab
2. Click "Copy Debug Info" button
3. Paste below:

**Debug Info:**
```json
(Paste here)
```

**`dealerModules` array length:** _______________

**Test Status:** ✅ PASS / ❌ FAIL

---

## 🗄️ Step 4: Execute Migration

### 4.1 Run Backfill Migration

**File:** `supabase/migrations/20251027_backfill_dealership_modules.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of migration file
3. Paste into SQL Editor
4. Click **Run**
5. Review NOTICE messages

**Expected Output:**
```
==========================================
DEALERSHIP MODULES BACKFILL MIGRATION
==========================================
Found X dealership(s) without module configuration
Starting initialization process...
------------------------------------------
✅ [1] Initialized modules for: Dealership A
✅ [2] Initialized modules for: Dealership B
...
------------------------------------------
Initialization complete:
  ✅ Successfully initialized: X dealership(s)
==========================================
```

**Migration Executed:** ✅ YES / ❌ NO
**Dealerships Initialized:** _______________
**Errors Encountered:** _______________

### 4.2 Verify Migration Results

**Query:**
```sql
-- Should return 0 rows (all dealers have modules)
SELECT d.id, d.name
FROM dealerships d
WHERE d.deleted_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM dealership_modules dm WHERE dm.dealer_id = d.id
);
```

**Expected Result:** 0 rows (empty)

**Actual Result:** _______________

**Test Status:** ✅ PASS / ❌ FAIL

---

## ⚙️ Step 5: System-Wide Verification

### 5.1 Check Module Summary

**Query:**
```sql
SELECT
  COUNT(DISTINCT dealer_id) as total_dealerships,
  COUNT(*) as total_module_records,
  COUNT(*) FILTER (WHERE is_enabled = true) as enabled_modules,
  COUNT(*) FILTER (WHERE is_enabled = false) as disabled_modules
FROM dealership_modules;
```

**Results:**
- Total Dealerships: _______________
- Total Module Records: _______________
- Enabled Modules: _______________
- Disabled Modules: _______________

### 5.2 Check Per-Dealership Status

**Query:**
```sql
SELECT
  d.id,
  d.name,
  COUNT(dm.module) as total_modules,
  COUNT(*) FILTER (WHERE dm.is_enabled = true) as enabled_count,
  CASE
    WHEN COUNT(dm.module) = 0 THEN '❌ NO MODULES'
    WHEN COUNT(*) FILTER (WHERE dm.is_enabled = true) = 0 THEN '⚠️ ALL DISABLED'
    ELSE '✅ CONFIGURED'
  END as status
FROM dealerships d
LEFT JOIN dealership_modules dm ON d.id = dm.dealer_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name
ORDER BY d.id;
```

**Results:** (Copy output here)

```
(Paste query results)
```

**All dealerships configured:** ✅ YES / ❌ NO

**Test Status:** ✅ PASS / ❌ FAIL

---

## 🔄 Step 6: Execute Trigger Setup

### 6.1 Run Trigger Verification Script

**File:** `VERIFY_DEALERSHIP_MODULE_TRIGGER.sql`

**Steps:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of verification script
3. Paste into SQL Editor
4. Click **Run**
5. Review output

**Expected Output:**
```
✅ TRIGGER VERIFICATION: auto_initialize_dealership_modules EXISTS
✅ FUNCTION VERIFICATION: initialize_dealership_modules EXISTS
✅ FUNCTION VERIFICATION: trigger_initialize_dealership_modules EXISTS
✅ TRIGGER POST-CREATION CHECK: INSTALLED
✅ FINAL SUMMARY: ALL DEALERSHIPS CONFIGURED
```

**Script Executed:** ✅ YES / ❌ NO
**Trigger Installed:** ✅ YES / ❌ NO

### 6.2 Verify Trigger Exists

**Query:**
```sql
SELECT
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'dealerships'
AND trigger_name = 'auto_initialize_dealership_modules';
```

**Expected Result:** 1 row showing trigger details

**Actual Result:** _______________

**Test Status:** ✅ PASS / ❌ FAIL

---

## 🧪 Step 7: Trigger Testing

### 7.1 Create Test Dealership

**Query:**
```sql
-- Create test dealership
INSERT INTO dealerships (
  name,
  city,
  state,
  country,
  status
) VALUES (
  'TEST - Auto Init Trigger Test',
  'Test City',
  'TX',
  'USA',
  'active'
)
RETURNING id, name;
```

**Test Dealership ID:** _______________

### 7.2 Verify Automatic Module Initialization

**Query:**
```sql
-- Should return 16 rows (modules auto-created by trigger)
SELECT
  module,
  is_enabled,
  created_at
FROM dealership_modules
WHERE dealer_id = <TEST_DEALERSHIP_ID>
ORDER BY module;
```

**Expected Result:** 16 rows with modules

**Actual Count:** _______________

**Trigger Worked:** ✅ YES / ❌ NO

### 7.3 Clean Up Test Data

**Query:**
```sql
-- Delete test dealership
DELETE FROM dealerships WHERE name = 'TEST - Auto Init Trigger Test';
```

**Test Cleanup:** ✅ DONE / ❌ SKIPPED

**Test Status:** ✅ PASS / ❌ FAIL

---

## 👤 Step 8: User Access Testing

### 8.1 Login as Custom Role User

**Test User:**
- Email: _______________
- Dealership: Dealer 5
- Role: detail_manager (or other custom role)

**Steps:**
1. Logout from system admin account
2. Login with test user credentials
3. Navigate to dashboard

**Can Access Dashboard:** ✅ YES / ❌ NO

### 8.2 Test Module Access

**Try to access each enabled module:**

| Module | Can Access | Notes |
|--------|------------|-------|
| Dashboard | ⬜ YES / ⬜ NO | |
| Sales Orders | ⬜ YES / ⬜ NO | |
| Service Orders | ⬜ YES / ⬜ NO | |
| Recon Orders | ⬜ YES / ⬜ NO | |
| Stock | ⬜ YES / ⬜ NO | |
| Contacts | ⬜ YES / ⬜ NO | |
| Users | ⬜ YES / ⬜ NO | |
| Settings | ⬜ YES / ⬜ NO | |

**Try to access disabled module:**
- Chat: ⬜ Should be denied / ⬜ Incorrectly allowed

### 8.3 Check Console (User Session)

**Console Status:**
- ⬜ Clean (no errors)
- ⬜ Has warnings: _______________

### 8.4 Check PermissionsDebugger (User Session)

**Click 🐛 button and review:**
- Quick Stats → Module Permissions: _______________
- Modules Tab → Status: _______________
- All enabled modules show green: ✅ YES / ❌ NO

**Test Status:** ✅ PASS / ❌ FAIL

---

## 🔄 Step 9: Regression Testing

### 9.1 System Admin Access (Should Still Work)

**Login as system admin:**
- Email: rruiz@lima.llc

**Can access all modules:** ✅ YES / ❌ NO

**No errors in console:** ✅ YES / ❌ NO

### 9.2 Other Dealerships

**Test another dealership:**
- Navigate to `/admin/<OTHER_DEALER_ID>`
- Check modules are configured
- No console errors

**Dealership ID tested:** _______________

**Status:** ✅ WORKING / ❌ ISSUES

### 9.3 Create New User

**Test user creation flow:**
1. Go to Users management
2. Create new user in Dealer 5
3. Assign detail_manager role
4. Login as new user
5. Verify access

**New User Created:** ✅ YES / ⬜ SKIPPED

**New User Can Access:** ✅ YES / ❌ NO

**Test Status:** ✅ PASS / ❌ FAIL

---

## 📊 Final Test Summary

### Test Results

| Test Step | Status | Notes |
|-----------|--------|-------|
| 1. Pre-Fix Verification | ⬜ PASS / ⬜ FAIL | |
| 2. Immediate Fix | ⬜ PASS / ⬜ FAIL | |
| 3. Post-Fix Verification | ⬜ PASS / ⬜ FAIL | |
| 4. Migration Execution | ⬜ PASS / ⬜ FAIL | |
| 5. System-Wide Verification | ⬜ PASS / ⬜ FAIL | |
| 6. Trigger Setup | ⬜ PASS / ⬜ FAIL | |
| 7. Trigger Testing | ⬜ PASS / ⬜ FAIL | |
| 8. User Access Testing | ⬜ PASS / ⬜ FAIL | |
| 9. Regression Testing | ⬜ PASS / ⬜ FAIL | |

**Overall Status:** ✅ ALL PASS / ⚠️ SOME ISSUES / ❌ FAILED

### Issues Encountered

(List any issues found during testing)

1. _______________
2. _______________
3. _______________

### Recommendations

(List any recommendations based on test results)

1. _______________
2. _______________
3. _______________

---

## 🆘 Troubleshooting

### Issue: Modules Not Created After Running Script

**Possible Causes:**
- Function `initialize_dealership_modules` doesn't exist
- Insufficient permissions
- Dealership ID doesn't exist

**Solution:**
```sql
-- Check if function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'initialize_dealership_modules';

-- Verify dealership exists
SELECT id, name FROM dealerships WHERE id = 5;
```

### Issue: User Still Can't Access After Fix

**Possible Causes:**
- Browser cache not cleared
- User has no role assigned
- Role has no permissions

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check user's role assignment:
```sql
SELECT
  p.email,
  dm.custom_role_id,
  dcr.role_name
FROM profiles p
JOIN dealer_memberships dm ON p.id = dm.user_id
LEFT JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
WHERE p.email = 'user@example.com';
```

### Issue: Trigger Not Firing

**Possible Causes:**
- Trigger not properly created
- Function has errors
- Permissions issue

**Solution:**
```sql
-- Test trigger function manually (won't work - just for diagnostic)
-- Instead, create actual test dealership
INSERT INTO dealerships (name, city, state, country, status)
VALUES ('Trigger Test', 'Test', 'TX', 'USA', 'active')
RETURNING id;

-- Check if modules were created
SELECT COUNT(*) FROM dealership_modules WHERE dealer_id = <returned_id>;
```

---

## ✅ Sign-Off

**Tester Name:** _______________
**Date:** _______________
**Time:** _______________

**Fix Approved:** ⬜ YES / ⬜ NO / ⬜ WITH RESERVATIONS

**Comments:**

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________

---

**End of Testing Instructions**

