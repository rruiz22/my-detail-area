-- Migration: Fix RLS policies using incorrect user_type field for system_admin check
-- Date: 2025-10-08
-- Purpose: Change RLS policies to use profiles.role instead of profiles.user_type
-- Issue: user_type can be 'dealer' while role is 'system_admin'
-- This was causing system admins to not see data they should have access to

-- ============================================================================
-- FIX 1: order_activity_log - System admin access
-- ============================================================================

-- Drop the incorrect policy
DROP POLICY IF EXISTS "System admins can view all activity logs"
ON order_activity_log;

-- Create corrected policy using 'role' field
CREATE POLICY "System admins can view all activity logs"
ON order_activity_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'system_admin'  -- ✅ Changed from user_type to role
  )
);

-- Add comment for documentation
COMMENT ON POLICY "System admins can view all activity logs" ON order_activity_log IS
'Allows users with role=system_admin to view all activity logs across all dealerships';

-- ============================================================================
-- FIX 2: dealer_memberships - System admin access (bonus fix)
-- ============================================================================

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Users can view dealership members"
ON dealer_memberships;

-- Create corrected policy using 'role' field
CREATE POLICY "Users can view dealership members"
ON dealer_memberships
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (
      p.role = 'system_admin'  -- ✅ Changed from user_type to role
      OR EXISTS (
        -- Regular users can see members of their own dealership
        SELECT 1 FROM dealer_memberships dm
        WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = dealer_memberships.dealer_id
        AND dm.is_active = true
      )
    )
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Users can view dealership members" ON dealer_memberships IS
'Allows system admins to view all memberships, and regular users to view their dealership members';

-- ============================================================================
-- VERIFICATION: Check that policies were updated correctly
-- ============================================================================

DO $$
DECLARE
  activity_log_policy_exists BOOLEAN;
  dealer_memberships_policy_exists BOOLEAN;
BEGIN
  -- Check order_activity_log policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'order_activity_log'
    AND policyname = 'System admins can view all activity logs'
  ) INTO activity_log_policy_exists;

  -- Check dealer_memberships policy
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'dealer_memberships'
    AND policyname = 'Users can view dealership members'
  ) INTO dealer_memberships_policy_exists;

  IF activity_log_policy_exists AND dealer_memberships_policy_exists THEN
    RAISE NOTICE '✅ Both RLS policies successfully updated to use role field';
  ELSE
    RAISE EXCEPTION 'Failed to update one or more RLS policies';
  END IF;
END $$;

-- Migration complete
-- After this migration, system admins (role='system_admin') will be able to see:
-- 1. All activity logs in order_activity_log table
-- 2. All dealer memberships across all dealerships
