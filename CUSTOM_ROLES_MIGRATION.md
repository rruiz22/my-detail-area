# Custom Roles System Migration Guide

## Overview
This migration transitions the permission system from legacy `profiles.role` + `user_type` + `groups` to a unified **dealer_custom_roles** system with granular module-level permissions.

**Risk Level**: CRITICAL but ZERO-DOWNTIME
**Rollback**: Instant via feature flag
**System**: Dual-system approach (legacy + custom roles run in parallel)

---

## Pre-Deployment Checklist

### ✅ Code Changes Complete
- [x] Database migrations created (4 files)
- [x] `usePermissions.tsx` refactored with dual system
- [x] TypeScript compilation successful
- [x] Feature flag defaults to OFF (legacy system active)

### ✅ Migration Files Created
1. `20250926000001_create_user_custom_role_assignments.sql` - Link users to custom roles
2. `20250926000002_add_custom_roles_feature_flag.sql` - Feature flag in system_settings
3. `20250926000003_create_default_viewer_roles.sql` - Default roles for Dealer 5
4. `20250926000004_assign_viewer_users_to_custom_roles.sql` - Assign 3 viewer users

---

## Deployment Steps

### PHASE 1: Run Database Migrations (Safe, No Behavior Change)

```bash
# Apply all 4 migrations
npm run supabase:migration:apply

# Or manually via Supabase CLI
supabase db push
```

**Expected Results:**
- New table: `user_custom_role_assignments`
- New system_settings entry: `use_custom_roles_system = false` (OFF)
- 2 new custom roles for dealer_id=5:
  - `dealer_viewer_full` (ar@lima.llc)
  - `dealer_viewer_basic` (2 other viewers)
- 3 role assignments created

**Verification Query:**
```sql
-- Should return 3 assignments
SELECT
  p.email,
  dcr.display_name as role_name,
  ucra.is_active
FROM user_custom_role_assignments ucra
JOIN profiles p ON ucra.user_id = p.id
JOIN dealer_custom_roles dcr ON ucra.custom_role_id = dcr.id
WHERE ucra.dealer_id = 5 AND ucra.is_active = true;
```

---

### PHASE 2: Deploy Code (Still No Behavior Change)

```bash
# Build frontend
npm run build

# Deploy to production (Railway/Vercel)
git add .
git commit -m "feat: Add custom roles permission system with feature flag

- Dual-system architecture (legacy + custom roles)
- Feature flag OFF by default (zero risk)
- Database migrations for role assignments
- Instant rollback capability

🤖 Generated with Claude Code"

git push origin main
```

**After Deploy - Verify Legacy System Still Active:**
1. Login as `rruiz@lima.llc` (system_admin) → Should have full access ✅
2. Login as `ar@lima.llc` (viewer) → Should have dashboard/sales/reports ✅
3. Check browser console: Should see `🟡 Using LEGACY system`

---

### PHASE 3: Enable Custom Roles (TEST IN STAGING FIRST!)

**⚠️ CRITICAL: Do this AFTER thoroughly testing in staging**

```sql
-- Flip the feature flag ON
UPDATE system_settings
SET setting_value = 'true'::jsonb,
    updated_at = now()
WHERE setting_key = 'use_custom_roles_system';
```

**Immediate Effects:**
- All users reload → `usePermissions` fetches flag
- System admin (`rruiz@lima.llc`) → Still has full access (profiles.role check)
- 3 viewers → Now use custom role permissions

**Verification Steps:**
1. Check browser console → Should see `🟢 Using CUSTOM ROLES system`
2. Login as each user and verify access:

#### User: rruiz@lima.llc (system_admin)
```
Expected Access:
✅ Dashboard (view)
✅ Sales Orders (admin)
✅ Service Orders (admin)
✅ Reports (admin)
✅ Settings (admin)
✅ Users (admin)
✅ Dealerships (admin)
✅ Management (admin)
```

#### User: ar@lima.llc (dealer_viewer_full)
```
Expected Access:
✅ Dashboard (view)
✅ Sales Orders (edit)
✅ Reports (view)
✅ Chat (view)
✅ Stock (view)
❌ Service Orders (no access)
❌ Settings (no access)
❌ Users (no access)
```

#### Users: ruizpires86@gmail.com, rudyruiz22@hotmail.com (dealer_viewer_basic)
```
Expected Access:
✅ Dashboard (view)
✅ Chat (view)
✅ Stock (view)
❌ Sales Orders (no access)
❌ Reports (no access)
❌ Settings (no access)
```

---

## Rollback Procedure (Instant)

**If ANY issues occur after enabling custom roles:**

```sql
-- Disable custom roles immediately
UPDATE system_settings
SET setting_value = 'false'::jsonb,
    updated_at = now()
WHERE setting_key = 'use_custom_roles_system';
```

**Effect**: Next page refresh → All users back to legacy system

**Rollback is safe because:**
- No data was deleted
- Legacy tables (profiles.role, user_group_memberships) untouched
- Feature flag controls behavior only

---

## Post-Migration Tasks (After Successful Custom Roles Enable)

### Week 1: Monitor & Validate
- Check application logs for permission errors
- Verify all 4 users can access their expected modules
- Monitor Sentry/error tracking for permission-related issues

### Week 2: Create Additional Roles
```sql
-- Example: Create "sales_rep" role
INSERT INTO dealer_custom_roles (dealer_id, role_name, display_name, description)
VALUES (5, 'sales_rep', 'Sales Representative', 'Full access to sales orders only');

INSERT INTO dealer_role_permissions (role_id, module, permission_level)
SELECT id, module, level
FROM dealer_custom_roles dcr,
     (VALUES
       ('dashboard', 'view'),
       ('sales_orders', 'admin'),
       ('contacts', 'edit'),
       ('chat', 'view')
     ) AS perms(module, level)
WHERE dcr.role_name = 'sales_rep' AND dcr.dealer_id = 5;
```

### Month 1: Deprecate Legacy Code
- Remove `@deprecated` types from `usePermissions.tsx`
- Remove `fetchLegacyPermissions()` function
- Drop legacy tables: `dealer_groups`, `user_group_memberships`, `roles`, `role_permissions`

---

## Troubleshooting

### Issue: "Feature flag not found, using legacy system"
**Cause**: Migration 2 didn't run
**Fix**: Run migration manually or insert flag:
```sql
INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES ('use_custom_roles_system', 'false'::jsonb, 'boolean', 'Enable custom roles system');
```

### Issue: Viewer users have NO access after enabling
**Cause**: Role assignments didn't create
**Fix**: Run migration 4 again (it's idempotent):
```bash
supabase db execute --file supabase/migrations/20250926000004_assign_viewer_users_to_custom_roles.sql
```

### Issue: System admin locked out
**Cause**: `profiles.role !== 'system_admin'` check failed
**Fix**: This should NEVER happen (system_admin check is first), but if it does:
```sql
-- Emergency: Disable custom roles
UPDATE system_settings SET setting_value = 'false'::jsonb WHERE setting_key = 'use_custom_roles_system';

-- Verify admin role
SELECT id, email, role FROM profiles WHERE email = 'rruiz@lima.llc';
-- Should show: role = 'system_admin'
```

### Issue: TypeScript errors after deployment
**Cause**: Deprecated types still in use
**Fix**: Check files importing from `usePermissions`:
```bash
grep -r "UserRole\|UserType\|EnhancedUser" src/
```

---

## Architecture Details

### Permission Hierarchy
```
none (0) < view (1) < edit (2) < delete (3) < admin (4)
```

### Dual System Logic
```typescript
if (feature_flag === 'true') {
  // Custom Roles System
  if (profiles.role === 'system_admin') → Full Access
  else → Query user_custom_role_assignments → Aggregate permissions
} else {
  // Legacy System
  if (profiles.role === 'system_admin') → Full Access
  else if (profiles.role === 'manager') → Conditional access
  else if (profiles.user_type === 'detail') → All orders
  else → Check groups
}
```

### Database Schema
```
profiles (id, email, role, dealership_id)
    ↓
user_custom_role_assignments (user_id, dealer_id, custom_role_id)
    ↓
dealer_custom_roles (id, role_name, display_name, dealer_id)
    ↓
dealer_role_permissions (role_id, module, permission_level)
```

---

## Success Criteria

✅ All 4 migrations applied without errors
✅ Code deployed, legacy system still active
✅ Feature flag flipped, custom roles active
✅ System admin has full access
✅ 3 viewers have expected access levels
✅ No permission-related errors in logs
✅ All 22+ dependent files still functional

---

**Contact**: For issues, check console logs for `🟢 Using CUSTOM ROLES` or `🟡 Using LEGACY system`
**Rollback**: One SQL UPDATE, instant effect
**Risk**: MINIMAL with feature flag approach