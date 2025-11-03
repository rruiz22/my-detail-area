# 🔴 PHASE 3 PLAN - Critical SQL Migrations

**Date**: 2025-11-03
**Status**: ⏸️ AWAITING PHASE 2 COMPLETION
**Prerequisites**: ✅ Phase 1 Complete, ⚠️ Phase 2 Pending
**Risk Level**: 🔴 CRITICAL (Changes production data)

---

## ⚠️ CRITICAL WARNINGS

### DO NOT PROCEED UNLESS:
- ✅ **Phase 1 Complete**: Frontend deployed, translations live, types updated
- ✅ **Phase 2 Complete**: Edge Functions deployed and tested
- ✅ **Backups Verified**: Can restore from `profiles_backup_role_migration_20251103`
- ✅ **Validation Passed**: Migration 02 confirmed no managers without custom roles
- ✅ **Team Notified**: All stakeholders aware of maintenance window
- ✅ **Rollback Plan Ready**: Team knows how to rollback if needed
- ✅ **Staging Tested**: All migrations tested in staging environment first

### IMPACT:
- 🔴 **Data Changes**: 29 user roles will change from manager/technician/viewer → 'user'
- 🔴 **Security Changes**: 20+ RLS policies will be updated
- 🔴 **Function Changes**: accept_dealer_invitation() behavior changes
- ⚠️ **Downtime**: Minimal (< 5 minutes) but users may need to re-login
- ⚠️ **Irreversible**: Can only rollback via backup tables (data loss possible)

---

## 📋 EXECUTIVE SUMMARY

### What We're Doing
Applying the final 3 critical migrations that will:
1. Update SQL function `accept_dealer_invitation()` to assign role='user'
2. Update 20+ RLS security policies to remove manager bypass
3. Migrate user roles in database (5 → 3 role system)

### Why This Order Matters
```
04 (function) → 05 (policies) → 03 (data)
```

**Critical**: We must update the function and policies BEFORE changing user data, otherwise:
- New invitations will fail (function tries to assign old roles)
- Permissions will break (policies check for old roles)
- Users will lose access (data migrated but policies not ready)

### Estimated Time
- **Migration 04**: 1 minute
- **Migration 05**: 2 minutes
- **Migration 03**: 2 minutes
- **Verification**: 10 minutes
- **Total**: 15-20 minutes (maintenance window)

---

## 🎯 PHASE 1 & 2 RECAP

### Phase 1: Frontend Preparation ✅ COMPLETE
```
✅ TypeScript types updated (is_supermanager added)
✅ Translations complete (EN, ES, PT-BR)
✅ Permission logic prepared for 3-role system
✅ UI components updated (SystemUsersManagement)
✅ Commits: 26c02a4, 9fd13ae
```

### Phase 2: Backend Preparation ⚠️ PENDING
```
⚠️ Edge Function create-dealer-user updated
⚠️ Edge Function create-system-user created
⚠️ Both functions deployed to Supabase
⚠️ Both functions tested in isolation
⚠️ No errors in Supabase logs
```

**⛔ DO NOT PROCEED WITH PHASE 3 UNTIL PHASE 2 IS COMPLETE**

---

## 📁 MIGRATION FILES

### Migration 04: Update SQL Function
**File**: `supabase/migrations/20251103000004_update_accept_dealer_invitation.sql`
**Impact**: 🟡 MEDIUM - Changes invitation behavior
**Rollback**: Restore function from git history

**What it does**:
- Updates `accept_dealer_invitation()` function
- Always assigns `role = 'user'` to new dealer users
- Preserves `system_admin`/`supermanager` if they accept invitation (edge case)

**Risk**: If not applied, new invitations will fail after migration 03

---

### Migration 05: Update RLS Policies
**File**: `supabase/migrations/20251103000005_update_rls_policies_remove_manager_bypass.sql`
**Impact**: 🔴 HIGH - Changes 20+ security policies
**Rollback**: Revert to old policy definitions (tedious)

**What it does**:
- Updates 20+ RLS policies across 10 tables
- Removes `role = 'manager'` bypass
- Adds `role = 'system_admin'` bypass
- Adds `user_has_permission()` check for custom roles

**Tables affected**:
1. dealer_services (2 policies)
2. dealership_contacts (1 policy)
3. dealer_memberships (1 policy)
4. dealer_notification_rules (3 policies)
5. work_item_templates (2 policies)
6. dealer_custom_roles (3 policies)
7. user_custom_role_assignments (2 policies)
8. dealerships (1 policy)
9. dealer_invitations (2 policies)
10. profiles (1 policy)

**Risk**: If not applied, users with old roles will have incorrect permissions

---

### Migration 03: Migrate User Roles (THE BIG ONE)
**File**: `supabase/migrations/20251103000003_migrate_profiles_role_to_3_levels.sql`
**Impact**: 🔴 CRITICAL - Changes 29 user roles
**Rollback**: Restore from backup tables

**What it does**:
1. Drops old role constraint (allows 5 roles)
2. Updates 29 user roles:
   - manager → user (8 users)
   - technician → user (19 users)
   - viewer → user (2 users)
   - admin → user (0 users)
3. Adds new role constraint (only allows system_admin, supermanager, user)
4. Sets default role to 'user'
5. Verifies migration success

**Risk**: If it fails, users may be locked out (hence why we need backups)

---

## 🚀 DEPLOYMENT PROCEDURE

### Pre-Deployment Checklist
- [ ] **Phase 2 complete**: Edge Functions deployed and tested
- [ ] **Staging tested**: All 3 migrations applied successfully in staging
- [ ] **Backups verified**: Can query `profiles_backup_role_migration_20251103`
- [ ] **Team notified**: Email sent to all stakeholders
- [ ] **Maintenance window scheduled**: 2-hour window (15 min needed + buffer)
- [ ] **Rollback script ready**: Team has backup restoration SQL
- [ ] **Monitor access**: Can view Supabase logs in real-time
- [ ] **Test accounts ready**: Have test accounts for post-migration verification

---

### Step-by-Step Deployment

#### Step 1: Apply Migration 04 (SQL Function)
```typescript
// Via Claude Code MCP tool
mcp__supabase__apply_migration(
  name: "update_accept_dealer_invitation",
  query: "... (contents of 20251103000004_update_accept_dealer_invitation.sql)"
)
```

**Expected Output**:
```
✅ Function accept_dealer_invitation created successfully
✅ FUNCTION UPDATE COMPLETED
Migration ID: 20251103000004
```

**Verification**:
```sql
-- Check function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'accept_dealer_invitation';
-- Expected: Function found with updated code
```

**⏸️ PAUSE**: Wait 2 minutes, check for errors in logs

---

#### Step 2: Apply Migration 05 (RLS Policies)
```typescript
// Via Claude Code MCP tool
mcp__supabase__apply_migration(
  name: "update_rls_policies_remove_manager_bypass",
  query: "... (contents of 20251103000005_update_rls_policies_remove_manager_bypass.sql)"
)
```

**Expected Output**:
```
✅ dealer_services: 2 policies updated
✅ dealership_contacts: 1 policy updated
... (10 tables total)
✅ RLS POLICY UPDATE COMPLETED
Migration ID: 20251103000005
```

**Verification**:
```sql
-- Check policies updated
SELECT schemaname, tablename, policyname, definition
FROM pg_policies
WHERE definition LIKE '%manager%';
-- Expected: 0 policies (none should reference 'manager' anymore)
```

**⏸️ PAUSE**: Wait 2 minutes, check for errors in logs

---

#### Step 3: Apply Migration 03 (THE CRITICAL ONE)
```typescript
// Via Claude Code MCP tool
mcp__supabase__apply_migration(
  name: "migrate_profiles_role_to_3_levels",
  query: "... (contents of 20251103000003_migrate_profiles_role_to_3_levels.sql)"
)
```

**Expected Output**:
```
BEFORE MIGRATION - Role Distribution:
  Total users: 30
  system_admin: 1 (will NOT change)
  manager: 8 (will become user)
  technician: 19 (will become user)
  viewer: 2 (will become user)
  admin: 0 (will become user)

🔧 Step 1/4: Dropping old role constraint...
✅ Old constraint dropped

🔧 Step 2/4: Migrating user roles...
✅ Updated 29 user roles to "user"

🔧 Step 3/4: Adding new role constraint...
✅ New constraint added

🔧 Step 4/4: Setting default role to "user"...
✅ Default role set to "user"

AFTER MIGRATION - Role Distribution:
  Total users: 30
  system_admin: 1
  supermanager: 0
  user: 29

✅ ALL VERIFICATIONS PASSED
🎉 MIGRATION COMPLETED SUCCESSFULLY
```

**Verification**:
```sql
-- Verify role distribution
SELECT role, COUNT(*) as count
FROM profiles
GROUP BY role;
-- Expected: system_admin: 1, user: 29

-- Check constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'profiles_role_check';
-- Expected: CHECK role IN ('system_admin', 'supermanager', 'user')

-- Verify specific users
SELECT email, role FROM profiles WHERE email = 'rruiz@lima.llc';
-- Expected: role = 'system_admin'

SELECT email, role FROM profiles WHERE email IN (
  'bosdetail@mydetailarea.com',  -- Was manager
  'esuleymanов@herbchambers.com'  -- Was technician
);
-- Expected: Both have role = 'user'
```

**⏸️ PAUSE**: Wait 5 minutes, monitor logs intensively

---

## 🧪 POST-MIGRATION TESTING

### Test 1: User Login (5 minutes)
```bash
# Test as system_admin
curl https://your-project.supabase.co/auth/v1/token \
  -d "email=rruiz@lima.llc&password=..." \
  -d "grant_type=password"
# Expected: 200 OK, JWT token returned

# Test as former manager (now user)
curl https://your-project.supabase.co/auth/v1/token \
  -d "email=bosdetail@mydetailarea.com&password=..." \
  -d "grant_type=password"
# Expected: 200 OK, JWT token returned

# Test as former technician (now user)
curl https://your-project.supabase.co/auth/v1/token \
  -d "email=test-technician@example.com&password=..." \
  -d "grant_type=password"
# Expected: 200 OK, JWT token returned
```

---

### Test 2: Permission Checks (5 minutes)
```sql
-- Test custom role permissions
SELECT user_has_permission(
  (SELECT id FROM profiles WHERE email = 'bosdetail@mydetailarea.com'),
  'contacts',
  'write'
);
-- Expected: true (if custom role grants this permission)

-- Test system admin bypass
SELECT user_has_permission(
  (SELECT id FROM profiles WHERE email = 'rruiz@lima.llc'),
  'management',
  'admin'
);
-- Expected: true (system_admin bypasses all permissions)
```

---

### Test 3: Create New User (5 minutes)
```bash
# Test invitation flow
curl -X POST https://your-project.supabase.co/functions/v1/create-dealer-user \
  -H "Authorization: Bearer <system_admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "migration-test@example.com",
    "firstName": "Test",
    "lastName": "User",
    "dealershipId": 5,
    "role": "user",
    "userType": "dealer"
  }'
# Expected: 200 OK, user created with role='user'

# Verify in database
SELECT email, role, dealership_id FROM profiles
WHERE email = 'migration-test@example.com';
-- Expected: role = 'user', dealership_id = 5
```

---

### Test 4: RLS Policy Enforcement (5 minutes)
```sql
-- Test as regular user (should be restricted)
SET ROLE authenticated;
SET request.jwt.claim.sub TO '<user-uuid-without-permission>';

SELECT * FROM dealer_services WHERE dealer_id = 5;
-- Expected: Empty result (no permission)

-- Test as regular user WITH permission
SET request.jwt.claim.sub TO '<user-uuid-with-permission>';

SELECT * FROM dealer_services WHERE dealer_id = 5;
-- Expected: Results returned (custom role grants permission)

-- Reset
RESET ROLE;
```

---

## 🛟 ROLLBACK PROCEDURE

### If Migration 04 Fails:
```sql
-- Restore old function from git history
-- (Get SQL from pre-migration version)
CREATE OR REPLACE FUNCTION accept_dealer_invitation(token_input TEXT)
RETURNS VOID AS $$
-- ... (old code)
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### If Migration 05 Fails:
```sql
-- Revert policies one by one (tedious but safe)
-- Example for dealer_services:
DROP POLICY IF EXISTS secure_insert ON dealer_services;
CREATE POLICY secure_insert ON dealer_services
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'admin'))
  OR user_has_permission(auth.uid(), 'dealer_services', 'write')
);
-- Repeat for all 20 policies...
```

---

### If Migration 03 Fails (CRITICAL):
```sql
BEGIN;

-- Step 1: Drop new constraint
ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;

-- Step 2: Restore old constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'technician'::text, 'viewer'::text, 'system_admin'::text])));

-- Step 3: Restore user roles from backup
UPDATE profiles p
SET
  role = b.role,
  updated_at = NOW()
FROM profiles_backup_role_migration_20251103 b
WHERE p.id = b.id
  AND p.role != b.role;  -- Only update changed roles

-- Step 4: Verify restoration
SELECT role, COUNT(*) FROM profiles GROUP BY role;
-- Expected: Original distribution restored

COMMIT;
```

**⚠️ DATA LOSS RISK**: Any new users created BETWEEN migration and rollback will need manual fixing

---

## 📊 SUCCESS CRITERIA

### Phase 3 Complete When:
- ✅ All 3 migrations applied successfully
- ✅ No errors in Supabase logs
- ✅ All 4 test categories pass (Login, Permissions, New User, RLS)
- ✅ Role distribution matches expected (system_admin: 1, user: 29)
- ✅ No policies reference 'manager' role
- ✅ accept_dealer_invitation() assigns role='user'
- ✅ Users can login and access their features
- ✅ No permission errors reported by users
- ✅ Manual verification by system admin: rruiz@lima.llc can access everything

---

## 📈 MONITORING (24-48 HOURS POST-MIGRATION)

### Metrics to Watch:
1. **Auth Errors**: Should be 0 (if > 5, investigate immediately)
2. **RLS Policy Violations**: Should be minimal (if spiking, check permissions)
3. **Failed Logins**: Should be baseline (if increased, check user roles)
4. **New User Creations**: Should work (test daily for 1 week)
5. **Invitation Acceptances**: Should work (monitor closely)

### Log Queries:
```sql
-- Check for auth errors
SELECT * FROM security_audit_log
WHERE event_type LIKE '%error%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check for RLS violations
SELECT * FROM security_audit_log
WHERE event_type = 'rls_policy_violation'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check new user creations
SELECT * FROM security_audit_log
WHERE event_type = 'user_created_successfully'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## 🎉 POST-MIGRATION CLEANUP (30 DAYS LATER)

### After 30 days of successful operation:

```sql
-- Drop backup tables
DROP TABLE IF EXISTS profiles_backup_role_migration_20251103;
DROP TABLE IF EXISTS dealer_memberships_backup_role_migration_20251103;
DROP TABLE IF EXISTS user_custom_role_assignments_backup_role_migration_20251103;

-- Log cleanup
INSERT INTO security_audit_log (
  event_type,
  event_details,
  success
)
VALUES (
  'role_migration_backups_dropped',
  jsonb_build_object(
    'tables_dropped', ARRAY[
      'profiles_backup_role_migration_20251103',
      'dealer_memberships_backup_role_migration_20251103',
      'user_custom_role_assignments_backup_role_migration_20251103'
    ],
    'migration_date', '2025-11-03',
    'cleanup_date', NOW()
  ),
  true
);
```

---

## 📞 EMERGENCY CONTACTS

**Database Issues**:
- Primary: rruiz@lima.llc (system_admin)
- Supabase Dashboard: https://supabase.com/dashboard/project/[project-id]
- Supabase Support: support@supabase.com

**Rollback Decision Makers**:
- System Admin: rruiz@lima.llc
- Tech Lead: (assign)
- Product Owner: (assign)

---

## 📚 REFERENCES

- **Phase 1 Plan**: `ROLE_MIGRATION_STATUS.md`
- **Phase 2 Plan**: `PHASE2_PLAN.md`
- **Edge Function Changes**: `PHASE2_EDGE_FUNCTION_CHANGES.md`
- **Migration Files**: `supabase/migrations/20251103*`
- **Backup Tables**: `*_backup_role_migration_20251103`

---

**Last Updated**: 2025-11-03
**Next Review**: Before Phase 3 execution
**Estimated Duration**: 15-20 minutes (maintenance window)
**Risk Level**: 🔴 CRITICAL
**Proceed Only If**: Phase 2 complete + Team approval + Staging tested
