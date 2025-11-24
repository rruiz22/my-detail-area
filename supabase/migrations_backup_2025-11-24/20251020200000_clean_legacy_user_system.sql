-- =====================================================
-- Clean Legacy User System
-- =====================================================
-- Description: Removes all legacy group system data and preserves only system_admin
-- Author: Claude Code
-- Date: 2025-10-20
-- User preserved: rruiz@lima.llc (system_admin)
-- Actions:
--   1. Verify rruiz@lima.llc exists and has system_admin role
--   2. Delete ALL records from user_group_memberships
--   3. Delete ALL records from dealer_groups
--   4. Add deprecation comments to legacy tables
-- =====================================================

-- =====================================================
-- PART 1: Verification
-- =====================================================

DO $$
DECLARE
  v_admin_exists BOOLEAN;
  v_admin_role TEXT;
  v_groups_count INTEGER;
  v_memberships_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 Starting legacy system cleanup...';

  -- Verify rruiz@lima.llc exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE email = 'rruiz@lima.llc'
  ) INTO v_admin_exists;

  IF NOT v_admin_exists THEN
    RAISE EXCEPTION '❌ CRITICAL: rruiz@lima.llc does not exist in profiles table';
  END IF;

  RAISE NOTICE '✅ Verified: rruiz@lima.llc exists';

  -- Verify system_admin role
  SELECT role INTO v_admin_role
  FROM profiles
  WHERE email = 'rruiz@lima.llc';

  IF v_admin_role != 'system_admin' THEN
    RAISE WARNING '⚠️  rruiz@lima.llc has role: %, expected: system_admin', v_admin_role;
  ELSE
    RAISE NOTICE '✅ Verified: rruiz@lima.llc has system_admin role';
  END IF;

  -- Count records to be deleted
  SELECT COUNT(*) INTO v_groups_count FROM dealer_groups;
  SELECT COUNT(*) INTO v_memberships_count FROM user_group_memberships;

  RAISE NOTICE '📊 Records to be deleted:';
  RAISE NOTICE '   - dealer_groups: %', v_groups_count;
  RAISE NOTICE '   - user_group_memberships: %', v_memberships_count;

END $$;

-- =====================================================
-- PART 2: Clean Legacy Data
-- =====================================================

-- Delete all user group memberships
DELETE FROM user_group_memberships;

RAISE NOTICE '✅ Deleted all records from user_group_memberships';

-- Delete all dealer groups
DELETE FROM dealer_groups;

RAISE NOTICE '✅ Deleted all records from dealer_groups';

-- =====================================================
-- PART 3: Add Deprecation Comments
-- =====================================================

COMMENT ON TABLE dealer_groups IS
'⚠️ DEPRECATED (2025-10-20): This table is no longer used. System migrated to dealer_custom_roles. All data deleted. Table will be dropped in 30 days.';

COMMENT ON TABLE user_group_memberships IS
'⚠️ DEPRECATED (2025-10-20): This table is no longer used. System migrated to user_custom_role_assignments. All data deleted. Table will be dropped in 30 days.';

-- =====================================================
-- PART 4: Final Verification
-- =====================================================

DO $$
DECLARE
  v_groups_remaining INTEGER;
  v_memberships_remaining INTEGER;
  v_admin_can_login BOOLEAN;
BEGIN
  -- Verify tables are empty
  SELECT COUNT(*) INTO v_groups_remaining FROM dealer_groups;
  SELECT COUNT(*) INTO v_memberships_remaining FROM user_group_memberships;

  IF v_groups_remaining > 0 OR v_memberships_remaining > 0 THEN
    RAISE EXCEPTION '❌ FAILED: Legacy tables not empty. Groups: %, Memberships: %',
      v_groups_remaining, v_memberships_remaining;
  END IF;

  -- Verify admin user
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE email = 'rruiz@lima.llc'
    AND role = 'system_admin'
  ) INTO v_admin_can_login;

  IF NOT v_admin_can_login THEN
    RAISE EXCEPTION '❌ CRITICAL: rruiz@lima.llc cannot login as system_admin';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ ✅ ✅ LEGACY SYSTEM CLEANUP COMPLETED SUCCESSFULLY ✅ ✅ ✅';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary:';
  RAISE NOTICE '   ✓ All dealer_groups deleted';
  RAISE NOTICE '   ✓ All user_group_memberships deleted';
  RAISE NOTICE '   ✓ Deprecation comments added';
  RAISE NOTICE '   ✓ rruiz@lima.llc preserved as system_admin';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Test login as rruiz@lima.llc before proceeding';
  RAISE NOTICE '⏰ Legacy tables will be physically dropped in 30 days';

END $$;
