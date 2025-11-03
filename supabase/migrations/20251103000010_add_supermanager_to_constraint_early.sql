-- =====================================================
-- EARLY CONSTRAINT UPDATE: Add supermanager role
-- =====================================================
-- Date: 2025-11-03
-- Purpose: Add 'supermanager' to role constraint BEFORE full migration
-- Impact: 🟡 LOW - Only modifies constraint, no data changes
-- Reason: User needs to create supermanager before Phases 2-3 complete
-- Author: System Migration (Early Step)
--
-- CONTEXT:
-- This migration was applied EARLY (before Phase 2/3) because
-- a supermanager user needs to be created NOW. This is SAFE because:
-- 1. Only adds 'supermanager' to allowed roles
-- 2. Does NOT change existing user data
-- 3. Does NOT affect ongoing operations
-- 4. Full migration (Phase 3) will still work as planned
--
-- WHAT THIS DOES:
-- - Drops current constraint (5 roles)
-- - Adds new constraint (6 roles: adds 'supermanager')
-- - Allows creation of supermanager users immediately
-- =====================================================

BEGIN;

RAISE NOTICE '========================================';
RAISE NOTICE '🔧 EARLY CONSTRAINT UPDATE';
RAISE NOTICE '========================================';
RAISE NOTICE 'Adding supermanager to allowed roles';
RAISE NOTICE 'This is a SAFE operation (no data changes)';
RAISE NOTICE '========================================';

-- Drop old constraint
DO $$
BEGIN
  RAISE NOTICE 'Step 1: Dropping old constraint...';
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  RAISE NOTICE '✅ Old constraint dropped';
END $$;

-- Add new constraint with supermanager
DO $$
BEGIN
  RAISE NOTICE 'Step 2: Adding new constraint with supermanager...';
  ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK ((role = ANY (ARRAY[
    'admin'::text,
    'manager'::text,
    'technician'::text,
    'viewer'::text,
    'system_admin'::text,
    'supermanager'::text  -- NEW: Added early for immediate use
  ])));
  RAISE NOTICE '✅ New constraint added';
END $$;

-- Verify constraint
DO $$
DECLARE
  v_constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_constraint_def
  FROM pg_constraint
  WHERE conname = 'profiles_role_check';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Constraint definition:';
  RAISE NOTICE '%', v_constraint_def;
  RAISE NOTICE '========================================';

  IF v_constraint_def LIKE '%supermanager%' THEN
    RAISE NOTICE '✅ Constraint includes supermanager';
  ELSE
    RAISE EXCEPTION '❌ Constraint verification failed';
  END IF;
END $$;

-- Log to audit
INSERT INTO security_audit_log (
  event_type,
  event_details,
  success,
  created_at
)
VALUES (
  'early_constraint_update_for_supermanager',
  jsonb_build_object(
    'migration_id', '20251103000010',
    'reason', 'User needed to create supermanager before Phase 2-3',
    'safe', true,
    'data_changed', false,
    'allowed_roles', ARRAY['admin', 'manager', 'technician', 'viewer', 'system_admin', 'supermanager']
  ),
  true,
  NOW()
);

COMMIT;

RAISE NOTICE '========================================';
RAISE NOTICE '✅ CONSTRAINT UPDATE COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'You can now create supermanager users';
RAISE NOTICE '';
RAISE NOTICE 'IMPORTANT NOTES:';
RAISE NOTICE '1. This is a TEMPORARY 6-role constraint';
RAISE NOTICE '2. Phase 3 migration will update to final 3-role constraint';
RAISE NOTICE '3. No existing user data was changed';
RAISE NOTICE '4. This is a safe operation';
RAISE NOTICE '========================================';
