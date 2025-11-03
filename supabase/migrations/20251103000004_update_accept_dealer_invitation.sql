-- =====================================================
-- UPDATE FUNCTION: accept_dealer_invitation
-- =====================================================
-- Date: 2025-11-03
-- Purpose: Update invitation system for new role model
-- Impact: 🟡 MEDIUM - Affects user invitation flow
-- Rollback: Restore original function from git history
-- Author: System Migration
--
-- ⚠️ CRITICAL: This MUST be applied BEFORE migration 03
-- (which changes the role constraint)
--
-- WHAT THIS FUNCTION DOES (NEW BEHAVIOR):
-- 1. Accepts dealer invitation
-- 2. Assigns role='user' to all dealer users
-- 3. Preserves system_admin/supermanager if they accept invitation (edge case)
-- 4. Updates dealership_id
-- 5. Creates/updates dealer membership
-- 6. Logs to audit table
--
-- CHANGES FROM OLD VERSION:
-- - OLD: Assigns role from invitation
-- - NEW: Always assigns role='user' (unless system_admin/supermanager)
-- =====================================================

BEGIN;

RAISE NOTICE '========================================';
RAISE NOTICE '🔧 UPDATING FUNCTION: accept_dealer_invitation';
RAISE NOTICE '========================================';

CREATE OR REPLACE FUNCTION accept_dealer_invitation(token_input TEXT)
RETURNS VOID AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_profile RECORD;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM dealer_invitations
  WHERE token = token_input
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Get user ID from auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get current profile
  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;

  -- Update profile with new role logic
  UPDATE profiles
  SET
    role = CASE
      -- Don't downgrade system admins or supermanagers
      WHEN role IN ('system_admin', 'supermanager') THEN role
      -- All dealer users get 'user' role
      ELSE 'user'
    END,
    dealership_id = v_invitation.dealer_id,
    full_name = COALESCE(full_name, v_invitation.full_name),
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Create or update dealer membership
  INSERT INTO dealer_memberships (
    user_id,
    dealer_id,
    custom_role_id,
    is_active,
    created_at
  )
  VALUES (
    v_user_id,
    v_invitation.dealer_id,
    v_invitation.custom_role_id,
    true,
    NOW()
  )
  ON CONFLICT (user_id, dealer_id)
  DO UPDATE SET
    custom_role_id = v_invitation.custom_role_id,
    is_active = true,
    updated_at = NOW();

  -- Mark invitation as accepted
  UPDATE dealer_invitations
  SET
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = v_invitation.id;

  -- Audit log
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  VALUES (
    v_user_id,
    'accept_dealer_invitation',
    'dealer_invitations',
    v_invitation.id,
    jsonb_build_object(
      'dealer_id', v_invitation.dealer_id,
      'custom_role_id', v_invitation.custom_role_id,
      'assigned_role', CASE
        WHEN v_profile.role IN ('system_admin', 'supermanager') THEN v_profile.role
        ELSE 'user'
      END
    )
  );

  RAISE NOTICE '✅ Invitation accepted for user: %', v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION accept_dealer_invitation(TEXT) IS
'Updated for 3-role system: assigns role=user to dealer users, preserves system_admin/supermanager. Migration: 20251103000004';

-- Verify function was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'accept_dealer_invitation'
  ) THEN
    RAISE NOTICE '✅ Function accept_dealer_invitation created successfully';
  ELSE
    RAISE EXCEPTION '❌ Function creation failed';
  END IF;
END $$;

-- Log completion
INSERT INTO security_audit_log (
  event_type,
  event_details,
  success,
  created_at
)
VALUES (
  'sql_function_updated_for_role_migration',
  jsonb_build_object(
    'migration_id', '20251103000004',
    'function_name', 'accept_dealer_invitation',
    'change_summary', 'Always assigns role=user to dealer users',
    'timestamp', NOW()
  ),
  true,
  NOW()
);

COMMIT;

RAISE NOTICE '========================================';
RAISE NOTICE '✅ FUNCTION UPDATE COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'Migration ID: 20251103000004';
RAISE NOTICE 'Function: accept_dealer_invitation';
RAISE NOTICE 'Timestamp: %', NOW();
RAISE NOTICE '';
RAISE NOTICE 'NEXT STEPS:';
RAISE NOTICE '1. Test invitation flow with test user';
RAISE NOTICE '2. Verify new users get role=user';
RAISE NOTICE '3. Continue with migration 05 (RLS policies)';
RAISE NOTICE '========================================';
