-- =====================================================
-- BACKUP MIGRATION - BEFORE ROLE SYSTEM REDESIGN
-- =====================================================
-- Date: 2025-11-03
-- Purpose: Create backup tables before critical role migration
-- Impact: READ-ONLY - Creates backup tables, no data changes
-- Rollback: DROP the backup tables if needed
-- Author: System Migration
--
-- CRITICAL CONTEXT:
-- This migration prepares for a major role system redesign:
-- - Current: 5 system roles (system_admin, manager, admin, technician, viewer)
-- - New: 3 system roles (system_admin, supermanager, user)
-- - All dealer users will have role='user' + custom role for permissions
-- - System users (system_admin/supermanager) will have dealership_id = NULL
--
-- This backup allows us to rollback if migration fails.
-- =====================================================

-- Backup profiles table
CREATE TABLE IF NOT EXISTS profiles_backup_role_migration_20251103 AS
SELECT * FROM profiles;

-- Backup dealer_memberships table
CREATE TABLE IF NOT EXISTS dealer_memberships_backup_role_migration_20251103 AS
SELECT * FROM dealer_memberships;

-- Backup user_custom_role_assignments table
CREATE TABLE IF NOT EXISTS user_custom_role_assignments_backup_role_migration_20251103 AS
SELECT * FROM user_custom_role_assignments;

-- Add metadata columns to backups
ALTER TABLE profiles_backup_role_migration_20251103
ADD COLUMN backup_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE dealer_memberships_backup_role_migration_20251103
ADD COLUMN backup_created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE user_custom_role_assignments_backup_role_migration_20251103
ADD COLUMN backup_created_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON TABLE profiles_backup_role_migration_20251103 IS
'Backup of profiles table before role system migration (2025-11-03). Safe to drop after successful migration and 30-day validation period.';

COMMENT ON TABLE dealer_memberships_backup_role_migration_20251103 IS
'Backup of dealer_memberships table before role system migration (2025-11-03). Safe to drop after successful migration and 30-day validation period.';

COMMENT ON TABLE user_custom_role_assignments_backup_role_migration_20251103 IS
'Backup of user_custom_role_assignments table before role system migration (2025-11-03). Safe to drop after successful migration and 30-day validation period.';

-- Verification: Count records in backups
DO $$
DECLARE
  v_profiles_count INT;
  v_memberships_count INT;
  v_assignments_count INT;
BEGIN
  SELECT COUNT(*) INTO v_profiles_count FROM profiles_backup_role_migration_20251103;
  SELECT COUNT(*) INTO v_memberships_count FROM dealer_memberships_backup_role_migration_20251103;
  SELECT COUNT(*) INTO v_assignments_count FROM user_custom_role_assignments_backup_role_migration_20251103;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'BACKUP MIGRATION COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profiles backed up: %', v_profiles_count;
  RAISE NOTICE 'Memberships backed up: %', v_memberships_count;
  RAISE NOTICE 'Role assignments backed up: %', v_assignments_count;
  RAISE NOTICE '========================================';

  IF v_profiles_count = 0 THEN
    RAISE EXCEPTION 'Backup failed: No profiles backed up!';
  END IF;

  RAISE NOTICE '✅ All backups created successfully';
END $$;
