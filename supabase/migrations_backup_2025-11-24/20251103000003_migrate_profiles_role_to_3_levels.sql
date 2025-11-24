-- =====================================================
-- CRITICAL MIGRATION: ROLE CONSTRAINT UPDATE + DATA MIGRATION
-- =====================================================
-- Date: 2025-11-03
-- Purpose: Migrate from 5-role system to 3-role system
-- Impact: 🔴 CRITICAL - CHANGES USER DATA
-- Rollback: Available via backup tables (20251103000001)
-- Author: System Migration
--
-- ⚠️⚠️⚠️ CRITICAL WARNINGS ⚠️⚠️⚠️
-- 1. This migration CHANGES USER ROLES IN PRODUCTION
-- 2. MUST apply migrations in order: 04 → 05 → 03
-- 3. REQUIRES maintenance window (users may need to re-login)
-- 4. CANNOT be undone without rollback script
-- 5. TEST in staging environment FIRST
--
-- PREREQUISITES (MUST BE COMPLETED FIRST):
-- ✅ Migration 01: Backup tables created
-- ✅ Migration 02: Validation passed (no managers without custom roles)
-- ✅ Migration 04: accept_dealer_invitation() updated
-- ✅ Migration 05: RLS policies updated
-- ✅ Edge Functions: create-dealer-user and create-system-user updated
-- ✅ Frontend: Deployed with new translations and types
--
-- WHAT THIS MIGRATION DOES:
-- 1. Drops old role constraint (allows 5 roles)
-- 2. Migrates user roles: manager/technician/viewer/admin → 'user'
-- 3. Adds new role constraint (only allows 3 roles)
-- 4. Sets default role to 'user' for new users
-- 5. Logs migration results
--
-- AFFECTED USERS:
-- - system_admin: NO CHANGE (1 user)
-- - manager → user (8 users)
-- - technician → user (19 users)
-- - viewer → user (2 users)
-- - admin → user (0 users)
-- Total affected: 29 users
-- =====================================================

BEGIN;

-- Step 1: Log migration start
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔴 CRITICAL MIGRATION STARTING';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration: 5-role → 3-role system';
  RAISE NOTICE 'Timestamp: %', NOW();
  RAISE NOTICE '========================================';
END $$;

-- Step 2: Count users BEFORE migration
DO $$
DECLARE
  v_total_users INT;
  v_system_admins INT;
  v_managers INT;
  v_technicians INT;
  v_viewers INT;
  v_admins INT;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(*) INTO v_system_admins FROM profiles WHERE role = 'system_admin';
  SELECT COUNT(*) INTO v_managers FROM profiles WHERE role = 'manager';
  SELECT COUNT(*) INTO v_technicians FROM profiles WHERE role = 'technician';
  SELECT COUNT(*) INTO v_viewers FROM profiles WHERE role = 'viewer';
  SELECT COUNT(*) INTO v_admins FROM profiles WHERE role = 'admin';

  RAISE NOTICE 'BEFORE MIGRATION - Role Distribution:';
  RAISE NOTICE '  Total users: %', v_total_users;
  RAISE NOTICE '  system_admin: % (will NOT change)', v_system_admins;
  RAISE NOTICE '  manager: % (will become user)', v_managers;
  RAISE NOTICE '  technician: % (will become user)', v_technicians;
  RAISE NOTICE '  viewer: % (will become user)', v_viewers;
  RAISE NOTICE '  admin: % (will become user)', v_admins;
  RAISE NOTICE '========================================';

  -- Sanity check: ensure validation passed
  IF v_managers + v_technicians + v_viewers + v_admins > 30 THEN
    RAISE EXCEPTION '❌ Migration aborted: Unexpected high number of users to migrate. Re-run validation (migration 02).';
  END IF;
END $$;

-- Step 3: Drop old constraint
DO $$
BEGIN
  RAISE NOTICE '🔧 Step 1/4: Dropping old role constraint...';
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  RAISE NOTICE '✅ Old constraint dropped';
END $$;

-- Step 4: Migrate user roles (THE CRITICAL STEP)
DO $$
DECLARE
  v_updated_count INT;
BEGIN
  RAISE NOTICE '🔧 Step 2/4: Migrating user roles...';
  RAISE NOTICE '   Updating: manager, technician, viewer, admin → user';

  UPDATE profiles
  SET
    role = 'user',
    updated_at = NOW()
  WHERE role IN ('manager', 'technician', 'viewer', 'admin');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RAISE NOTICE '✅ Updated % user roles to "user"', v_updated_count;

  IF v_updated_count = 0 THEN
    RAISE WARNING '⚠️ No users were updated (expected if all users already migrated)';
  END IF;
END $$;

-- Step 5: Add new constraint (only allows 3 roles)
DO $$
BEGIN
  RAISE NOTICE '🔧 Step 3/4: Adding new role constraint...';
  RAISE NOTICE '   Allowed roles: system_admin, supermanager, user';

  ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK ((role = ANY (ARRAY['system_admin'::text, 'supermanager'::text, 'user'::text])));

  RAISE NOTICE '✅ New constraint added';
END $$;

-- Step 6: Set default role to 'user'
DO $$
BEGIN
  RAISE NOTICE '🔧 Step 4/4: Setting default role to "user"...';

  ALTER TABLE profiles
  ALTER COLUMN role SET DEFAULT 'user';

  RAISE NOTICE '✅ Default role set to "user"';
END $$;

-- Step 7: Verify migration results
DO $$
DECLARE
  v_total_users INT;
  v_system_admins INT;
  v_supermanagers INT;
  v_users INT;
  v_invalid_roles INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 VERIFYING MIGRATION RESULTS';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO v_total_users FROM profiles;
  SELECT COUNT(*) INTO v_system_admins FROM profiles WHERE role = 'system_admin';
  SELECT COUNT(*) INTO v_supermanagers FROM profiles WHERE role = 'supermanager';
  SELECT COUNT(*) INTO v_users FROM profiles WHERE role = 'user';

  RAISE NOTICE 'AFTER MIGRATION - Role Distribution:';
  RAISE NOTICE '  Total users: %', v_total_users;
  RAISE NOTICE '  system_admin: %', v_system_admins;
  RAISE NOTICE '  supermanager: %', v_supermanagers;
  RAISE NOTICE '  user: %', v_users;

  -- Verify no invalid roles remain
  SELECT COUNT(*) INTO v_invalid_roles
  FROM profiles
  WHERE role NOT IN ('system_admin', 'supermanager', 'user');

  IF v_invalid_roles > 0 THEN
    RAISE EXCEPTION '❌ Migration verification failed: % users have invalid roles!', v_invalid_roles;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL VERIFICATIONS PASSED';
  RAISE NOTICE '========================================';
END $$;

-- Step 8: Log migration completion
INSERT INTO security_audit_log (
  event_type,
  event_details,
  success,
  created_at
)
VALUES (
  'role_system_migration_completed',
  jsonb_build_object(
    'migration_id', '20251103000003',
    'migration_type', 'role_constraint_update',
    'from_roles', ARRAY['system_admin', 'manager', 'admin', 'technician', 'viewer'],
    'to_roles', ARRAY['system_admin', 'supermanager', 'user'],
    'timestamp', NOW()
  ),
  true,
  NOW()
);

-- Add comment for documentation
COMMENT ON TABLE profiles IS
'User profiles table. Role system migrated to 3-level system on 2025-11-03. Allowed roles: system_admin, supermanager, user. All dealer users have role=user with permissions defined by custom roles.';

COMMIT;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration ID: 20251103000003';
  RAISE NOTICE 'Timestamp: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Test user logins across all roles';
  RAISE NOTICE '2. Verify permissions work correctly';
  RAISE NOTICE '3. Monitor error logs for 24 hours';
  RAISE NOTICE '4. Keep backup tables for 30 days';
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback available via:';
  RAISE NOTICE '  profiles_backup_role_migration_20251103';
  RAISE NOTICE '========================================';
END $$;
