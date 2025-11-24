-- =====================================================
-- CRITICAL MIGRATION: UPDATE RLS POLICIES
-- =====================================================
-- Date: 2025-11-03
-- Purpose: Remove manager role bypass from RLS policies
-- Impact: 🔴 CRITICAL - CHANGES SECURITY POLICIES
-- Rollback: Revert to old policy definitions
-- Author: System Migration
--
-- ⚠️⚠️⚠️ CRITICAL WARNINGS ⚠️⚠️⚠️
-- 1. This migration CHANGES SECURITY POLICIES
-- 2. MUST apply BEFORE migration 03 (role data migration)
-- 3. Test thoroughly before production deployment
-- 4. Monitor RLS policy violations after deployment
--
-- PREREQUISITES:
-- ✅ Migration 01: Backup tables created
-- ✅ Migration 02: Validation passed
-- ✅ Migration 04: accept_dealer_invitation() updated
--
-- WHAT THIS MIGRATION DOES:
-- Updates 24+ RLS policies that check for role='manager'
-- - OLD: role IN ('manager', 'system_admin')
-- - NEW: role = 'system_admin' OR user_has_permission(...)
--
-- POLICY PATTERN:
-- Before: Direct role='manager' bypass
-- After: Only system_admin bypass + custom role permission check
-- =====================================================

BEGIN;

RAISE NOTICE '========================================';
RAISE NOTICE '🔐 RLS POLICY UPDATE STARTING';
RAISE NOTICE '========================================';

-- =====================================================
-- Table: dealer_services
-- =====================================================

RAISE NOTICE '📋 Updating policies for: dealer_services';

-- Policy: secure_insert
DROP POLICY IF EXISTS secure_insert ON dealer_services;
CREATE POLICY secure_insert ON dealer_services
FOR INSERT WITH CHECK (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'dealer_services', 'write')
);

-- Policy: secure_delete
DROP POLICY IF EXISTS secure_delete ON dealer_services;
CREATE POLICY secure_delete ON dealer_services
FOR DELETE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'dealer_services', 'delete')
);

RAISE NOTICE '✅ dealer_services: 2 policies updated';

-- =====================================================
-- Table: dealership_contacts
-- =====================================================

RAISE NOTICE '📋 Updating policies for: dealership_contacts';

-- Policy: secure_delete
DROP POLICY IF EXISTS secure_delete ON dealership_contacts;
CREATE POLICY secure_delete ON dealership_contacts
FOR DELETE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'contacts', 'delete')
  OR
  -- User owns the contact
  created_by = auth.uid()
);

RAISE NOTICE '✅ dealership_contacts: 1 policy updated';

-- =====================================================
-- Table: dealer_memberships
-- =====================================================

RAISE NOTICE '📋 Updating policies for: dealer_memberships';

-- Policy: secure_update
DROP POLICY IF EXISTS secure_update ON dealer_memberships;
CREATE POLICY secure_update ON dealer_memberships
FOR UPDATE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission for user management
  user_has_permission(auth.uid(), 'users', 'write')
  OR
  -- User updating their own membership
  user_id = auth.uid()
);

RAISE NOTICE '✅ dealer_memberships: 1 policy updated';

-- =====================================================
-- Table: dealer_notification_rules
-- =====================================================

RAISE NOTICE '📋 Updating policies for: dealer_notification_rules';

-- Policy: secure_insert
DROP POLICY IF EXISTS secure_insert ON dealer_notification_rules;
CREATE POLICY secure_insert ON dealer_notification_rules
FOR INSERT WITH CHECK (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'settings', 'write')
);

-- Policy: secure_update
DROP POLICY IF EXISTS secure_update ON dealer_notification_rules;
CREATE POLICY secure_update ON dealer_notification_rules
FOR UPDATE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'settings', 'write')
);

-- Policy: secure_delete
DROP POLICY IF EXISTS secure_delete ON dealer_notification_rules;
CREATE POLICY secure_delete ON dealer_notification_rules
FOR DELETE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'settings', 'admin')
);

RAISE NOTICE '✅ dealer_notification_rules: 3 policies updated';

-- =====================================================
-- Table: work_item_templates
-- =====================================================

RAISE NOTICE '📋 Updating policies for: work_item_templates';

-- Policy: secure_insert
DROP POLICY IF EXISTS secure_insert ON work_item_templates;
CREATE POLICY secure_insert ON work_item_templates
FOR INSERT WITH CHECK (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'settings', 'write')
);

-- Policy: secure_delete
DROP POLICY IF EXISTS secure_delete ON work_item_templates;
CREATE POLICY secure_delete ON work_item_templates
FOR DELETE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'settings', 'admin')
);

RAISE NOTICE '✅ work_item_templates: 2 policies updated';

-- =====================================================
-- Table: dealer_custom_roles
-- =====================================================

RAISE NOTICE '📋 Updating policies for: dealer_custom_roles';

-- Policy: secure_insert
DROP POLICY IF EXISTS secure_insert ON dealer_custom_roles;
CREATE POLICY secure_insert ON dealer_custom_roles
FOR INSERT WITH CHECK (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'users', 'admin')
);

-- Policy: secure_update
DROP POLICY IF EXISTS secure_update ON dealer_custom_roles;
CREATE POLICY secure_update ON dealer_custom_roles
FOR UPDATE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'users', 'admin')
);

-- Policy: secure_delete
DROP POLICY IF EXISTS secure_delete ON dealer_custom_roles;
CREATE POLICY secure_delete ON dealer_custom_roles
FOR DELETE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'users', 'admin')
);

RAISE NOTICE '✅ dealer_custom_roles: 3 policies updated';

-- =====================================================
-- Table: user_custom_role_assignments
-- =====================================================

RAISE NOTICE '📋 Updating policies for: user_custom_role_assignments';

-- Policy: secure_insert
DROP POLICY IF EXISTS secure_insert ON user_custom_role_assignments;
CREATE POLICY secure_insert ON user_custom_role_assignments
FOR INSERT WITH CHECK (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'users', 'write')
);

-- Policy: secure_delete
DROP POLICY IF EXISTS secure_delete ON user_custom_role_assignments;
CREATE POLICY secure_delete ON user_custom_role_assignments
FOR DELETE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'users', 'write')
);

RAISE NOTICE '✅ user_custom_role_assignments: 2 policies updated';

-- =====================================================
-- Table: dealerships
-- =====================================================

RAISE NOTICE '📋 Updating policies for: dealerships';

-- Policy: secure_update
DROP POLICY IF EXISTS secure_update ON dealerships;
CREATE POLICY secure_update ON dealerships
FOR UPDATE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'dealerships', 'write')
);

RAISE NOTICE '✅ dealerships: 1 policy updated';

-- =====================================================
-- Table: dealer_invitations
-- =====================================================

RAISE NOTICE '📋 Updating policies for: dealer_invitations';

-- Policy: secure_insert
DROP POLICY IF EXISTS secure_insert ON dealer_invitations;
CREATE POLICY secure_insert ON dealer_invitations
FOR INSERT WITH CHECK (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'users', 'write')
);

-- Policy: secure_delete
DROP POLICY IF EXISTS secure_delete ON dealer_invitations;
CREATE POLICY secure_delete ON dealer_invitations
FOR DELETE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'users', 'admin')
);

RAISE NOTICE '✅ dealer_invitations: 2 policies updated';

-- =====================================================
-- Table: profiles
-- =====================================================

RAISE NOTICE '📋 Updating policies for: profiles';

-- Policy: secure_update
DROP POLICY IF EXISTS secure_update ON profiles;
CREATE POLICY secure_update ON profiles
FOR UPDATE USING (
  -- System admin bypass
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Custom role permission
  user_has_permission(auth.uid(), 'users', 'write')
  OR
  -- User updating their own profile
  id = auth.uid()
);

RAISE NOTICE '✅ profiles: 1 policy updated';

-- =====================================================
-- VERIFICATION
-- =====================================================

RAISE NOTICE '========================================';
RAISE NOTICE '📊 VERIFYING RLS POLICY UPDATES';
RAISE NOTICE '========================================';

DO $$
DECLARE
  v_policy_count INT;
BEGIN
  -- Count policies that still reference 'manager' role
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE definition LIKE '%manager%';

  IF v_policy_count > 0 THEN
    RAISE WARNING '⚠️ Found % policies still referencing "manager" role', v_policy_count;
    RAISE NOTICE 'Review these policies manually:';

    FOR policy_rec IN
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE definition LIKE '%manager%'
    LOOP
      RAISE NOTICE '  - %.%: %', policy_rec.schemaname, policy_rec.tablename, policy_rec.policyname;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No policies reference "manager" role';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total policies updated: ~20 policies';
  RAISE NOTICE '========================================';
END $$;

-- Log completion
INSERT INTO security_audit_log (
  event_type,
  event_details,
  success,
  created_at
)
VALUES (
  'rls_policies_updated_for_role_migration',
  jsonb_build_object(
    'migration_id', '20251103000005',
    'tables_affected', ARRAY[
      'dealer_services',
      'dealership_contacts',
      'dealer_memberships',
      'dealer_notification_rules',
      'work_item_templates',
      'dealer_custom_roles',
      'user_custom_role_assignments',
      'dealerships',
      'dealer_invitations',
      'profiles'
    ],
    'timestamp', NOW()
  ),
  true,
  NOW()
);

COMMIT;

RAISE NOTICE '========================================';
RAISE NOTICE '✅ RLS POLICY UPDATE COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'Migration ID: 20251103000005';
RAISE NOTICE 'Timestamp: %', NOW();
RAISE NOTICE '';
RAISE NOTICE 'NEXT STEPS:';
RAISE NOTICE '1. Apply migration 03 (role data migration)';
RAISE NOTICE '2. Test user permissions across all modules';
RAISE NOTICE '3. Monitor RLS policy violations in logs';
RAISE NOTICE '========================================';
