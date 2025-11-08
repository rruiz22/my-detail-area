-- Migration: 20251108000002_implement_soft_delete.sql
-- Purpose: Implement enterprise-grade soft delete system for users
-- Author: Claude Code (database-expert agent)
-- Date: 2025-11-08
--
-- FEATURES:
-- - Soft delete columns (deleted_at, deleted_by, deletion_reason)
-- - RLS policies updated to exclude soft-deleted users
-- - Functions: soft_delete_user() and restore_deleted_user()
-- - Complete audit trail
-- - Reversible deletions

-- ============================================================================
-- STEP 1: ADD SOFT DELETE COLUMNS TO PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_by ON profiles(deleted_by) WHERE deleted_by IS NOT NULL;

-- ============================================================================
-- STEP 2: UPDATE EXISTING SELECT POLICIES TO EXCLUDE SOFT-DELETED USERS
-- ============================================================================

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "profiles_view_own" ON profiles;
DROP POLICY IF EXISTS "profiles_view_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_select_system_admin" ON profiles;

-- Policy 1: View own profile (even if soft-deleted, for transparency)
CREATE POLICY "profiles_select_own"
ON profiles
FOR SELECT
USING (id = auth.uid());

-- Policy 2: View profiles in same dealership (exclude soft-deleted)
CREATE POLICY "profiles_select_dealership"
ON profiles
FOR SELECT
USING (
  id != auth.uid()
  AND dealership_id IS NOT NULL
  AND user_has_dealer_membership(auth.uid(), dealership_id)
  AND deleted_at IS NULL  -- ✅ Hide soft-deleted users from regular users
);

-- Policy 3: System admins can view all users (including soft-deleted)
CREATE POLICY "profiles_select_system_admin"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('system_admin', 'supermanager')
  )
);

-- ============================================================================
-- STEP 3: UPDATE EXISTING UPDATE POLICIES
-- ============================================================================

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_update_managers" ON profiles;

-- Policy 1: Update own profile (exclude soft-deleted users from updating themselves)
CREATE POLICY "profiles_update_own"
ON profiles
FOR UPDATE
USING (
  id = auth.uid()
  AND deleted_at IS NULL  -- Soft-deleted users cannot update
)
WITH CHECK (
  id = auth.uid()
  AND deleted_at IS NULL
);

-- Policy 2: Admins can update other profiles (including soft delete operation)
CREATE POLICY "profiles_update_admin"
ON profiles
FOR UPDATE
USING (
  id != auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('system_admin', 'supermanager')
    AND p.deleted_at IS NULL
  )
);

-- ============================================================================
-- STEP 4: UPDATE DELETE POLICY TO ALLOW SOFT DELETE VIA UPDATE
-- ============================================================================

-- Note: The profiles_delete_system_admin policy from previous migration
-- will continue to allow hard deletes for system admins
-- Soft delete is preferred and done via UPDATE, not DELETE

-- ============================================================================
-- STEP 5: CREATE SOFT DELETE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION soft_delete_user(
  target_user_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_user RECORD;
  caller_role TEXT;
BEGIN
  -- Get caller's role
  SELECT role INTO caller_role
  FROM profiles
  WHERE id = auth.uid()
  AND deleted_at IS NULL;

  -- Verify caller is admin
  IF caller_role NOT IN ('system_admin', 'supermanager') THEN
    RAISE EXCEPTION 'Only system admins and supermanagers can delete users';
  END IF;

  -- Prevent deleting yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- Soft delete the user
  UPDATE profiles
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid(),
    deletion_reason = COALESCE(reason, 'No reason provided')
  WHERE id = target_user_id
  AND deleted_at IS NULL  -- Prevent double deletion
  RETURNING * INTO deleted_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or already deleted';
  END IF;

  -- Deactivate all dealer memberships
  UPDATE dealer_memberships
  SET is_active = false
  WHERE user_id = target_user_id;

  -- Log audit event
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    event_details,
    success
  ) VALUES (
    'user_soft_deleted',
    auth.uid(),
    jsonb_build_object(
      'deleted_user_id', target_user_id,
      'deleted_user_email', deleted_user.email,
      'deleted_user_name', COALESCE(deleted_user.first_name || ' ' || deleted_user.last_name, deleted_user.email),
      'deleted_user_role', deleted_user.role,
      'reason', COALESCE(reason, 'No reason provided'),
      'deletion_timestamp', NOW(),
      'performed_by', auth.uid(),
      'performer_role', caller_role
    ),
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'deleted_user_id', target_user_id,
    'deleted_user_email', deleted_user.email,
    'deleted_at', deleted_user.deleted_at,
    'reason', COALESCE(reason, 'No reason provided')
  );
END;
$$;

-- ============================================================================
-- STEP 6: CREATE RESTORE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_deleted_user(
  target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  restored_user RECORD;
  caller_role TEXT;
BEGIN
  -- Get caller's role
  SELECT role INTO caller_role
  FROM profiles
  WHERE id = auth.uid();

  -- Verify caller is admin
  IF caller_role NOT IN ('system_admin', 'supermanager') THEN
    RAISE EXCEPTION 'Only system admins and supermanagers can restore users';
  END IF;

  -- Restore the user
  UPDATE profiles
  SET
    deleted_at = NULL,
    deleted_by = NULL,
    deletion_reason = NULL
  WHERE id = target_user_id
  AND deleted_at IS NOT NULL  -- Only restore deleted users
  RETURNING * INTO restored_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or not deleted';
  END IF;

  -- Reactivate dealer memberships
  UPDATE dealer_memberships
  SET is_active = true
  WHERE user_id = target_user_id;

  -- Log audit event
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    event_details,
    success
  ) VALUES (
    'user_restored',
    auth.uid(),
    jsonb_build_object(
      'restored_user_id', target_user_id,
      'restored_user_email', restored_user.email,
      'restored_user_name', COALESCE(restored_user.first_name || ' ' || restored_user.last_name, restored_user.email),
      'restoration_timestamp', NOW(),
      'performed_by', auth.uid(),
      'performer_role', caller_role
    ),
    true
  );

  RETURN jsonb_build_object(
    'success', true,
    'restored_user_id', target_user_id,
    'restored_user_email', restored_user.email,
    'restored_at', NOW()
  );
END;
$$;

-- ============================================================================
-- STEP 7: CREATE HELPER FUNCTION TO GET DELETED USERS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_deleted_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  deleter_email TEXT,
  deletion_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('system_admin', 'supermanager')
  ) THEN
    RAISE EXCEPTION 'Only system admins can view deleted users';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as full_name,
    p.role,
    p.deleted_at,
    p.deleted_by,
    deleter.email as deleter_email,
    p.deletion_reason
  FROM profiles p
  LEFT JOIN profiles deleter ON p.deleted_by = deleter.id
  WHERE p.deleted_at IS NOT NULL
  ORDER BY p.deleted_at DESC;
END;
$$;

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION soft_delete_user TO service_role;
GRANT EXECUTE ON FUNCTION restore_deleted_user TO authenticated;
GRANT EXECUTE ON FUNCTION restore_deleted_user TO service_role;
GRANT EXECUTE ON FUNCTION get_deleted_users TO authenticated;
GRANT EXECUTE ON FUNCTION get_deleted_users TO service_role;

-- ============================================================================
-- STEP 9: VERIFICATION AND INFORMATION
-- ============================================================================

DO $$
DECLARE
  column_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check if deleted_at column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'deleted_at'
  ) INTO column_exists;

  -- Count active policies on profiles
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'SOFT DELETE SYSTEM IMPLEMENTED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  ✓ Soft delete columns added: deleted_at, deleted_by, deletion_reason';
  RAISE NOTICE '  ✓ Column exists: %', column_exists;
  RAISE NOTICE '  ✓ Indexes created for performance';
  RAISE NOTICE '  ✓ RLS policies updated (total: %)', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '  → soft_delete_user(user_id, reason)';
  RAISE NOTICE '  → restore_deleted_user(user_id)';
  RAISE NOTICE '  → get_deleted_users()';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✓ Reversible deletions';
  RAISE NOTICE '  ✓ Complete audit trail';
  RAISE NOTICE '  ✓ Soft-deleted users hidden from regular users';
  RAISE NOTICE '  ✓ System admins can view and restore deleted users';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage examples:';
  RAISE NOTICE '  -- Soft delete a user';
  RAISE NOTICE '  SELECT soft_delete_user(''user-uuid'', ''Violated terms of service'');';
  RAISE NOTICE '';
  RAISE NOTICE '  -- View deleted users';
  RAISE NOTICE '  SELECT * FROM get_deleted_users();';
  RAISE NOTICE '';
  RAISE NOTICE '  -- Restore a user';
  RAISE NOTICE '  SELECT restore_deleted_user(''user-uuid'');';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END;
$$;
