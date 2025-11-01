-- =====================================================
-- FIX: Activity Log RLS Policy - Allow Trigger Inserts
-- Date: 2025-10-16
-- Issue: RLS policy blocks INSERTs from triggers (auth.uid() is NULL)
-- Solution: Allow NULL auth.uid() (system/trigger actions)
-- =====================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "System can insert activity" ON public.get_ready_vehicle_activity_log;

-- Create new policy that allows both user and system inserts
CREATE POLICY "System can insert activity"
  ON public.get_ready_vehicle_activity_log FOR INSERT
  WITH CHECK (
    -- Allow system/trigger inserts (auth.uid() is NULL in trigger context)
    auth.uid() IS NULL
    OR
    -- Allow user inserts (must have dealer membership)
    user_has_active_dealer_membership(auth.uid(), dealer_id)
  );

-- Add comment explaining the NULL check
COMMENT ON POLICY "System can insert activity" ON public.get_ready_vehicle_activity_log IS
  'Allows activity log inserts from both authenticated users (with dealer membership) and system triggers (auth.uid() = NULL)';
