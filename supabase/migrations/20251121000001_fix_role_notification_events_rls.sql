-- ============================================================================
-- Fix RLS Policy for role_notification_events
-- ============================================================================
-- Date: 2025-11-21
-- Issue: Old policy uses obsolete tables (role_module_permissions_new, module_permissions)
-- Fix: Update policy to work with current Custom Roles system
-- ============================================================================

-- Drop old policy (uses obsolete tables)
DROP POLICY IF EXISTS "Dealer admins manage role notification events" ON role_notification_events;

-- Create new simplified policy for system admins and dealer admins
CREATE POLICY "System and dealer admins manage role notification events"
ON role_notification_events
FOR ALL
USING (
  -- System admins have full access
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.user_type = 'system_admin'
  )
  OR
  -- Dealer admins/managers can manage events for their dealership's roles
  EXISTS (
    SELECT 1 FROM dealer_custom_roles dcr
    INNER JOIN dealer_memberships dm ON dm.dealer_id = dcr.dealer_id
    WHERE dcr.id = role_notification_events.role_id
    AND dm.user_id = auth.uid()
    AND dm.is_active = true
    AND dm.is_supermanager = true  -- Only supermanagers (dealer admins)
  )
);

-- Keep the existing "Users can view own role notification events" policy (it's correct)
-- This policy already exists and allows users to view their own role's config

-- ============================================================================
-- Verification Query
-- ============================================================================
-- After applying this migration, run:
--
-- SELECT * FROM role_notification_events
-- WHERE role_id = 'edbbc889-8740-497b-9e16-d4a055e756e1'
-- LIMIT 5;
--
-- You should see events returned (not blocked by RLS)
-- ============================================================================

COMMENT ON POLICY "System and dealer admins manage role notification events" ON role_notification_events
IS 'Allows system admins and dealer supermanagers to manage notification events for their dealership roles. Updated 2025-11-21 to fix obsolete table references.';
