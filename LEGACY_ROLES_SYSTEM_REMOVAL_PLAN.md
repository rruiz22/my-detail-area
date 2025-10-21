# Legacy Roles System Removal Plan

## Overview

This document outlines the plan to remove the legacy roles system (`roles` and `user_role_assignments` tables) and fully migrate to the custom roles system (`dealer_custom_roles` and `user_custom_role_assignments`).

---

## Current State

### Legacy System Components

**Database Tables:**
- `roles` - Generic system roles (dealer_role, detail_role enums)
- `user_role_assignments` - Maps users to legacy roles with expiration dates

**Components Using Legacy System:**
- `src/components/permissions/RoleAssignmentModal.tsx`
- `src/components/permissions/UserRoleManager.tsx`
- `src/components/management/EnhancedUserManagementSection.tsx`

**Database Functions:**
- `get_user_roles` - RPC function to fetch user's legacy roles

### Custom Roles System (Current)

**Database Tables:**
- `dealer_custom_roles` - Dealer-specific custom roles
- `user_custom_role_assignments` - Maps users to custom roles
- `role_system_permissions` - System-level permissions per role
- `role_module_permissions_new` - Module-specific permissions per role
- `system_permissions` - Catalog of system permissions
- `module_permissions` - Catalog of module permissions

**Components:**
- `src/components/permissions/ManageCustomRolesModal.tsx` ✅ NEW
- `src/components/permissions/GranularPermissionManager.tsx`
- `src/components/dealer/DealerRoles.tsx`
- `src/components/dealer/EditRoleModal.tsx`

---

## Migration Strategy

### Phase 1: Data Migration (SQL Script)

Create a migration script to convert existing legacy role assignments to custom roles.

**Steps:**

1. **Audit Existing Data**
   ```sql
   -- Count users with legacy roles
   SELECT COUNT(DISTINCT user_id) FROM user_role_assignments WHERE is_active = true;

   -- List all active legacy roles
   SELECT r.name, r.display_name, COUNT(ura.id) as users_count
   FROM roles r
   LEFT JOIN user_role_assignments ura ON r.id = ura.role_id AND ura.is_active = true
   GROUP BY r.id, r.name, r.display_name
   ORDER BY users_count DESC;
   ```

2. **Create Equivalent Custom Roles**

   Map each legacy role to a custom role for each dealership:

   | Legacy Role | Custom Role Equivalent | Permissions |
   |------------|------------------------|-------------|
   | dealer_manager | Dealer Manager | All permissions |
   | dealer_staff | Dealer Staff | View + Edit (limited) |
   | detail_manager | Detail Manager | Detail operations + reports |
   | detail_worker | Detail Worker | View + Edit orders only |

3. **Migrate Assignments**
   ```sql
   -- For each user with legacy roles, create custom role assignments
   INSERT INTO user_custom_role_assignments (
     user_id,
     dealer_id,
     custom_role_id,
     is_active,
     assigned_at
   )
   SELECT
     ura.user_id,
     dm.dealer_id,
     dcr.id as custom_role_id,
     true,
     ura.assigned_at
   FROM user_role_assignments ura
   JOIN roles r ON ura.role_id = r.id
   JOIN dealer_memberships dm ON ura.user_id = dm.user_id
   JOIN dealer_custom_roles dcr ON dm.dealer_id = dcr.dealer_id
     AND dcr.role_name = CASE
       WHEN r.dealer_role = 'manager' THEN 'dealer_manager'
       WHEN r.dealer_role = 'staff' THEN 'dealer_staff'
       WHEN r.detail_role = 'manager' THEN 'detail_manager'
       WHEN r.detail_role = 'worker' THEN 'detail_worker'
       ELSE 'custom_default'
     END
   WHERE ura.is_active = true
   ON CONFLICT (user_id, dealer_id, custom_role_id) DO NOTHING;
   ```

4. **Verification Query**
   ```sql
   -- Verify all users have at least one custom role
   SELECT
     p.email,
     COUNT(ucra.id) as custom_roles_count,
     COUNT(ura.id) as legacy_roles_count
   FROM profiles p
   LEFT JOIN user_custom_role_assignments ucra ON p.id = ucra.user_id AND ucra.is_active = true
   LEFT JOIN user_role_assignments ura ON p.id = ura.user_id AND ura.is_active = true
   GROUP BY p.id, p.email
   HAVING COUNT(ucra.id) = 0 AND COUNT(ura.id) > 0;

   -- Should return 0 rows (all users migrated)
   ```

### Phase 2: Code Removal

**Files to Delete:**
1. `src/components/permissions/RoleAssignmentModal.tsx`
2. `src/components/permissions/UserRoleManager.tsx` (if not used elsewhere)
3. References in `src/components/management/EnhancedUserManagementSection.tsx`

**Functions to Remove from `usePermissions` hook:**
- `assignRole(userId, roleId, expiresAt)` - Legacy role assignment
- `removeRole(userId, roleId)` - Legacy role removal
- Any code that queries `user_role_assignments` table

**Update Components:**

`src/components/users/UnifiedUserManagement.tsx`:
- Remove `RoleAssignmentModal` import
- Remove `isRoleModalOpen` state
- Remove `handleManageRoles`, `handleRoleModalClose`, `handleRoleModalSuccess`
- Keep only `ManageCustomRolesModal` and its handlers

### Phase 3: Database Cleanup

**Archive Legacy Data:**
```sql
-- Create archive tables
CREATE TABLE IF NOT EXISTS roles_archive AS
SELECT *, NOW() as archived_at FROM roles;

CREATE TABLE IF NOT EXISTS user_role_assignments_archive AS
SELECT *, NOW() as archived_at FROM user_role_assignments;
```

**Drop Foreign Key Constraints:**
```sql
ALTER TABLE user_role_assignments
DROP CONSTRAINT IF EXISTS user_role_assignments_role_id_fkey;

ALTER TABLE user_role_assignments
DROP CONSTRAINT IF EXISTS user_role_assignments_user_id_fkey;

ALTER TABLE user_role_assignments
DROP CONSTRAINT IF EXISTS user_role_assignments_assigned_by_fkey;
```

**Drop Tables:**
```sql
DROP TABLE IF EXISTS user_role_assignments;
DROP TABLE IF EXISTS roles;
```

**Drop Functions:**
```sql
DROP FUNCTION IF EXISTS get_user_roles(uuid);
```

**Drop Types/Enums (if no longer referenced):**
```sql
-- Check if any other tables reference these enums
SELECT
  n.nspname as schema,
  t.typname as enum_name,
  string_agg(c.relname, ', ') as used_in_tables
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
LEFT JOIN pg_attribute a ON a.atttypid = t.oid
LEFT JOIN pg_class c ON a.attrelid = c.oid
WHERE t.typname IN ('dealer_role', 'detail_role')
GROUP BY n.nspname, t.typname;

-- If safe, drop the enums
-- DROP TYPE IF EXISTS dealer_role;
-- DROP TYPE IF EXISTS detail_role;
```

---

## Rollback Plan

If issues are discovered after migration:

1. **Restore from Archive:**
   ```sql
   -- Restore roles table
   CREATE TABLE roles AS SELECT * FROM roles_archive;

   -- Restore user_role_assignments
   CREATE TABLE user_role_assignments AS
   SELECT * FROM user_role_assignments_archive WHERE archived_at IS NULL;

   -- Restore foreign keys
   ALTER TABLE user_role_assignments
   ADD CONSTRAINT user_role_assignments_role_id_fkey
   FOREIGN KEY (role_id) REFERENCES roles(id);
   ```

2. **Restore Code from Git:**
   ```bash
   git checkout <commit-before-removal> -- src/components/permissions/RoleAssignmentModal.tsx
   git checkout <commit-before-removal> -- src/components/permissions/UserRoleManager.tsx
   ```

3. **Re-deploy Application**

---

## Testing Checklist

Before removing legacy system:

- [ ] All users have at least one custom role assigned
- [ ] Custom roles have equivalent permissions to legacy roles
- [ ] No console errors referencing `roles` or `user_role_assignments`
- [ ] User management UI works correctly with only custom roles
- [ ] Permission checks work correctly (users can access their authorized modules)
- [ ] Role assignment/removal works via `ManageCustomRolesModal`
- [ ] Backup of legacy data created
- [ ] Migration script tested on staging environment
- [ ] Rollback plan tested

---

## Timeline

**Recommended Schedule:**

1. **Week 1:** Create and test data migration script on staging
2. **Week 2:** Deploy `ManageCustomRolesModal` to production (already done ✅)
3. **Week 3:** Run data migration in production during low-traffic window
4. **Week 4:** Monitor system, verify no legacy role references
5. **Week 5:** Remove legacy code components
6. **Week 6:** Drop legacy database tables after final verification

---

## Success Criteria

Migration is considered successful when:

✅ All users can log in and access their authorized modules
✅ Role assignments can be managed via `ManageCustomRolesModal`
✅ No console errors related to legacy roles system
✅ No database queries to `roles` or `user_role_assignments` tables
✅ Legacy tables archived and dropped without application errors
✅ System performance maintained or improved

---

## Notes

- The custom roles system provides significantly more flexibility and granularity
- Legacy system removal will simplify codebase and reduce maintenance burden
- Archive tables should be retained for at least 90 days before permanent deletion
- Consider exporting archive data to CSV for long-term record keeping

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Author:** AI Assistant
**Status:** Planning Phase
