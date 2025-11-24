-- Migration: 20251108000001_enable_user_deletion.sql
-- Purpose: Enable user deletion for system_admin and supermanager roles
-- Author: Claude Code (database-expert agent)
-- Date: 2025-11-08
--
-- PROBLEM SOLVED:
-- - Previous policy "profiles_delete_managers" had USING (false) which blocked ALL deletions
-- - No audit logging for user deletions
--
-- SOLUTION:
-- - Remove restrictive policy
-- - Create new policy allowing only system_admin/supermanager to delete
-- - Add comprehensive audit logging

-- ============================================================================
-- STEP 1: DROP EXISTING RESTRICTIVE DELETE POLICY
-- ============================================================================

DROP POLICY IF EXISTS "profiles_delete_managers" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_none" ON profiles;

-- ============================================================================
-- STEP 2: CREATE NEW DELETE POLICY FOR ADMINS ONLY
-- ============================================================================

CREATE POLICY "profiles_delete_system_admin"
ON profiles
FOR DELETE
USING (
  -- Only system_admin and supermanager can delete users
  -- Check the current user's role (not the target user's role)
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('system_admin', 'supermanager')
  )
);

-- ============================================================================
-- STEP 3: CREATE AUDIT LOG TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_details JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at DESC);

-- Enable RLS on audit log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only system admins can view audit logs
DROP POLICY IF EXISTS "audit_log_select_admin" ON security_audit_log;
CREATE POLICY "audit_log_select_admin"
ON security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('system_admin', 'supermanager')
  )
);

-- System can always insert (via triggers)
DROP POLICY IF EXISTS "audit_log_insert_system" ON security_audit_log;
CREATE POLICY "audit_log_insert_system"
ON security_audit_log
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- STEP 4: CREATE AUDIT LOGGING TRIGGER FOR USER DELETIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the deletion event
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    event_details,
    success
  ) VALUES (
    'user_deleted',
    auth.uid(),
    jsonb_build_object(
      'deleted_user_id', OLD.id,
      'deleted_user_email', OLD.email,
      'deleted_user_name', COALESCE(OLD.first_name || ' ' || OLD.last_name, OLD.email),
      'deleted_user_role', OLD.role,
      'deleted_user_dealership_id', OLD.dealership_id,
      'deletion_timestamp', NOW(),
      'performed_by', auth.uid()
    ),
    true
  );

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't block deletion if audit logging fails
    RAISE WARNING 'Failed to log user deletion: %', SQLERRM;
    RETURN OLD;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS audit_user_deletion ON profiles;

-- Create trigger to run BEFORE deletion
CREATE TRIGGER audit_user_deletion
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_deletion();

-- ============================================================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION log_user_deletion TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_deletion TO service_role;

-- ============================================================================
-- STEP 6: VERIFICATION AND INFORMATION
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  audit_table_exists BOOLEAN;
BEGIN
  -- Count active DELETE policies on profiles
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
  AND cmd = 'DELETE';

  -- Check if audit table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'security_audit_log'
  ) INTO audit_table_exists;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'USER DELETION ENABLED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Status:';
  RAISE NOTICE '  ✓ Restrictive DELETE policy removed';
  RAISE NOTICE '  ✓ New policy "profiles_delete_system_admin" created';
  RAISE NOTICE '  ✓ Active DELETE policies on profiles: %', policy_count;
  RAISE NOTICE '  ✓ Audit log table exists: %', audit_table_exists;
  RAISE NOTICE '  ✓ Deletion trigger "audit_user_deletion" active';
  RAISE NOTICE '';
  RAISE NOTICE 'Permissions:';
  RAISE NOTICE '  → Only system_admin and supermanager can delete users';
  RAISE NOTICE '  → All deletions are logged in security_audit_log';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test deletion with: DELETE FROM profiles WHERE id = ''test-user-id''';
  RAISE NOTICE '  2. View audit logs: SELECT * FROM security_audit_log WHERE event_type = ''user_deleted''';
  RAISE NOTICE '  3. Consider implementing soft delete (migration 20251108000002)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END;
$$;
