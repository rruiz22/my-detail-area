-- =====================================================
-- Drop Legacy Tables (FUTURE MIGRATION - DO NOT RUN YET)
-- =====================================================
-- Description: Physically drops legacy tables after 30-day grace period
-- Author: Claude Code
-- Date: 2025-11-20 (30 days after cleanup)
-- WARNING: This migration will permanently delete these tables
-- Prerequisites:
--   1. Confirm no code references dealer_groups or user_group_memberships
--   2. Confirm system running stable with Custom Roles only
--   3. Rename this file to remove "FUTURE_" prefix when ready to execute
-- =====================================================

-- =====================================================
-- PART 1: Final Verification
-- =====================================================

DO $$
DECLARE
  v_groups_count INTEGER;
  v_memberships_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 Verifying legacy tables before dropping...';

  -- Verify tables are empty (should be 0 after previous migration)
  SELECT COUNT(*) INTO v_groups_count FROM dealer_groups;
  SELECT COUNT(*) INTO v_memberships_count FROM user_group_memberships;

  IF v_groups_count > 0 OR v_memberships_count > 0 THEN
    RAISE EXCEPTION '❌ ABORT: Legacy tables contain data! Groups: %, Memberships: %. Run cleanup migration first.',
      v_groups_count, v_memberships_count;
  END IF;

  RAISE NOTICE '✅ Verified: Legacy tables are empty';
END $$;

-- =====================================================
-- PART 2: Drop Tables
-- =====================================================

-- Drop dependent table first
DROP TABLE IF EXISTS user_group_memberships CASCADE;
RAISE NOTICE '✅ Dropped table: user_group_memberships';

-- Drop parent table
DROP TABLE IF EXISTS dealer_groups CASCADE;
RAISE NOTICE '✅ Dropped table: dealer_groups';

-- =====================================================
-- PART 3: Drop Related Functions/Triggers (if any)
-- =====================================================

-- Drop any functions related to groups
DROP FUNCTION IF EXISTS set_membership_groups(UUID, UUID[]) CASCADE;

-- =====================================================
-- PART 4: Confirmation
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ✅ ✅ LEGACY TABLES DROPPED SUCCESSFULLY ✅ ✅ ✅';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Dropped tables:';
  RAISE NOTICE '   ✓ user_group_memberships';
  RAISE NOTICE '   ✓ dealer_groups';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  System now uses ONLY Custom Roles (dealer_custom_roles)';
  RAISE NOTICE '✅ Migration to modern role system complete';
END $$;
