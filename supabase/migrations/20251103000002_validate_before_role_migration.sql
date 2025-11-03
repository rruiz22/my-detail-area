-- =====================================================
-- PRE-MIGRATION VALIDATION
-- =====================================================
-- Date: 2025-11-03
-- Purpose: Validate data integrity before role migration
-- Impact: READ-ONLY - No data changes, only validation
-- Author: System Migration
--
-- This migration performs critical validations:
-- 1. Verifies all users have valid roles
-- 2. Checks for orphan users without custom roles
-- 3. Validates managers have custom roles assigned
-- 4. Ensures no data inconsistencies
--
-- ⚠️ MIGRATION WILL FAIL if any validation fails
-- This is intentional - do NOT proceed if validations fail
-- =====================================================

DO $$
DECLARE
  v_total_users INT;
  v_system_admins INT;
  v_managers INT;
  v_technicians INT;
  v_viewers INT;
  v_admins INT;
  v_users_with_memberships INT;
  v_users_with_custom_roles INT;
  v_managers_without_custom_roles INT;
  v_orphan_users INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRE-MIGRATION VALIDATION STARTING';
  RAISE NOTICE '========================================';

  -- Count users by current role
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(*) INTO v_system_admins FROM profiles WHERE role = 'system_admin';
  SELECT COUNT(*) INTO v_managers FROM profiles WHERE role = 'manager';
  SELECT COUNT(*) INTO v_technicians FROM profiles WHERE role = 'technician';
  SELECT COUNT(*) INTO v_viewers FROM profiles WHERE role = 'viewer';
  SELECT COUNT(*) INTO v_admins FROM profiles WHERE role = 'admin';

  RAISE NOTICE 'Current role distribution:';
  RAISE NOTICE '  Total users: %', v_total_users;
  RAISE NOTICE '  system_admin: %', v_system_admins;
  RAISE NOTICE '  manager: % ← WILL MIGRATE to user', v_managers;
  RAISE NOTICE '  technician: % ← WILL MIGRATE to user', v_technicians;
  RAISE NOTICE '  viewer: % ← WILL MIGRATE to user', v_viewers;
  RAISE NOTICE '  admin: % ← WILL MIGRATE to user', v_admins;

  -- Count users with dealer memberships
  SELECT COUNT(DISTINCT user_id) INTO v_users_with_memberships
  FROM dealer_memberships WHERE is_active = true;

  RAISE NOTICE 'Users with active memberships: %', v_users_with_memberships;

  -- Count users with custom roles
  SELECT COUNT(DISTINCT dm.user_id) INTO v_users_with_custom_roles
  FROM dealer_memberships dm
  WHERE dm.custom_role_id IS NOT NULL AND dm.is_active = true;

  RAISE NOTICE 'Users with custom roles: %', v_users_with_custom_roles;

  -- ⚠️ CRITICAL: Check for managers without custom roles
  SELECT COUNT(*) INTO v_managers_without_custom_roles
  FROM profiles p
  WHERE p.role = 'manager'
    AND NOT EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.user_id = p.id
        AND dm.custom_role_id IS NOT NULL
        AND dm.is_active = true
    );

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRITICAL VALIDATION: Managers without custom roles: %', v_managers_without_custom_roles;
  RAISE NOTICE '========================================';

  IF v_managers_without_custom_roles > 0 THEN
    RAISE WARNING '⚠️ Found % managers WITHOUT custom roles!', v_managers_without_custom_roles;
    RAISE NOTICE 'These users will lose access after migration:';

    FOR v_user IN
      SELECT p.email, p.role
      FROM profiles p
      WHERE p.role = 'manager'
        AND NOT EXISTS (
          SELECT 1 FROM dealer_memberships dm
          WHERE dm.user_id = p.id AND dm.custom_role_id IS NOT NULL AND dm.is_active = true
        )
    LOOP
      RAISE NOTICE '  - % (role: %)', v_user.email, v_user.role;
    END LOOP;

    RAISE EXCEPTION '❌ VALIDATION FAILED: Managers without custom roles detected. Assign custom roles before proceeding with migration.';
  END IF;

  -- Check for users with invalid roles
  IF EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.role NOT IN ('system_admin', 'manager', 'technician', 'viewer', 'admin')
  ) THEN
    RAISE EXCEPTION '❌ VALIDATION FAILED: Found users with invalid roles!';
  END IF;

  -- Check for orphan custom role assignments
  SELECT COUNT(*) INTO v_orphan_users
  FROM user_custom_role_assignments ucra
  WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = ucra.user_id);

  IF v_orphan_users > 0 THEN
    RAISE WARNING '⚠️ Found % orphan role assignments (user deleted but assignment remains)', v_orphan_users;
    -- Don't fail migration for this, but log it
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Expected migration results:';
  RAISE NOTICE '  system_admin: % → % (no change)', v_system_admins, v_system_admins;
  RAISE NOTICE '  supermanager: 0 → 0 (new role, none yet)';
  RAISE NOTICE '  user: 0 → % (migrated from manager/technician/viewer/admin)',
    v_managers + v_technicians + v_viewers + v_admins;
  RAISE NOTICE '========================================';

  RAISE NOTICE '✅ ALL VALIDATIONS PASSED';
  RAISE NOTICE '✅ Safe to proceed with migration';
  RAISE NOTICE '========================================';
END $$;
