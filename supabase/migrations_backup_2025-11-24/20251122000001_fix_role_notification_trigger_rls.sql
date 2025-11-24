-- ============================================================================
-- Fix RLS bypass for role_notification_events trigger
-- ============================================================================
-- Date: 2025-11-22
-- Issue: Trigger fails with RLS error when creating custom roles
-- Root cause: create_default_notification_events_for_role function runs as
--             invoker, not definer, so it's subject to RLS policy
-- Fix: Add SECURITY DEFINER to function so it bypasses RLS
-- Additional: Update RLS policy to allow system_admin role
-- ============================================================================

-- First, update RLS policy to allow system_admin
DROP POLICY IF EXISTS "System and dealer admins manage role notification events" ON role_notification_events;

CREATE POLICY "System and dealer admins manage role notification events"
ON role_notification_events
FOR ALL
USING (
  -- System admins have full access
  (SELECT user_type FROM profiles WHERE id = auth.uid() LIMIT 1) = 'system_admin'
  OR
  -- Dealer members can manage events for their dealership's roles
  EXISTS (
    SELECT 1 FROM dealer_custom_roles dcr
    INNER JOIN dealer_memberships dm ON dm.dealer_id = dcr.dealer_id
    WHERE dcr.id = role_notification_events.role_id
    AND dm.user_id = auth.uid()
    AND dm.is_active = true
  )
);

COMMENT ON POLICY "System and dealer admins manage role notification events" ON role_notification_events
IS 'Allows system admins and dealer supermanagers to manage notification events for roles. System admins have global access, dealer admins only for their dealerships.';

-- ============================================================================
-- Now update function with SECURITY DEFINER
-- ============================================================================

-- Recreate function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION create_default_notification_events_for_role(
  p_role_id UUID,
  p_role_name TEXT,
  p_module TEXT
) RETURNS void
SECURITY DEFINER  -- ⭐ This bypasses RLS for INSERT operations
SET search_path = public
AS $$
DECLARE
  default_events JSONB;
  event RECORD;
BEGIN
  -- Determine default events based on role name
  -- ============================================

  -- SALES/SERVICE ADVISORS: Full notifications including completed
  IF p_role_name ~* '(sales|service).*(advisor|agent|representative|rep)' THEN
    default_events := '[
      {"event_type": "order_created", "enabled": false, "config": {}},
      {"event_type": "order_assigned", "enabled": true, "config": {}},
      {"event_type": "status_changed", "enabled": true, "config": {"allowed_statuses": ["completed", "in_progress", "cancelled"]}},
      {"event_type": "comment_added", "enabled": true, "config": {}},
      {"event_type": "attachment_added", "enabled": false, "config": {}},
      {"event_type": "follower_added", "enabled": false, "config": {}},
      {"event_type": "due_date_approaching", "enabled": true, "config": {"default_minutes_before": 30}},
      {"event_type": "overdue", "enabled": true, "config": {}},
      {"event_type": "priority_changed", "enabled": true, "config": {}}
    ]'::jsonb;

  -- MANAGERS (UC, Sales Manager, Service Manager): All important events
  ELSIF p_role_name ~* '(manager|supervisor|lead)' THEN
    default_events := '[
      {"event_type": "order_created", "enabled": true, "config": {}},
      {"event_type": "order_assigned", "enabled": true, "config": {}},
      {"event_type": "status_changed", "enabled": true, "config": {"allowed_statuses": ["completed", "in_progress", "cancelled", "pending"]}},
      {"event_type": "comment_added", "enabled": true, "config": {}},
      {"event_type": "attachment_added", "enabled": false, "config": {}},
      {"event_type": "follower_added", "enabled": false, "config": {}},
      {"event_type": "due_date_approaching", "enabled": true, "config": {"default_minutes_before": 60}},
      {"event_type": "overdue", "enabled": true, "config": {}},
      {"event_type": "priority_changed", "enabled": true, "config": {}}
    ]'::jsonb;

  -- DETAIL DEPARTMENT / CAR WASH: Limited notifications, NO "completed"
  ELSIF p_role_name ~* '(detail|wash|clean|technician|attendant)' THEN
    default_events := '[
      {"event_type": "order_created", "enabled": false, "config": {}},
      {"event_type": "order_assigned", "enabled": true, "config": {}},
      {"event_type": "status_changed", "enabled": true, "config": {"allowed_statuses": ["in_progress"]}},
      {"event_type": "comment_added", "enabled": false, "config": {}},
      {"event_type": "attachment_added", "enabled": false, "config": {}},
      {"event_type": "follower_added", "enabled": false, "config": {}},
      {"event_type": "due_date_approaching", "enabled": false, "config": {}},
      {"event_type": "overdue", "enabled": false, "config": {}},
      {"event_type": "priority_changed", "enabled": false, "config": {}}
    ]'::jsonb;

  -- DEFAULT for unknown roles: Minimal notifications
  ELSE
    default_events := '[
      {"event_type": "order_created", "enabled": false, "config": {}},
      {"event_type": "order_assigned", "enabled": true, "config": {}},
      {"event_type": "status_changed", "enabled": true, "config": {"allowed_statuses": ["completed"]}},
      {"event_type": "comment_added", "enabled": false, "config": {}},
      {"event_type": "attachment_added", "enabled": false, "config": {}},
      {"event_type": "follower_added", "enabled": false, "config": {}},
      {"event_type": "due_date_approaching", "enabled": true, "config": {"default_minutes_before": 30}},
      {"event_type": "overdue", "enabled": true, "config": {}},
      {"event_type": "priority_changed", "enabled": false, "config": {}}
    ]'::jsonb;
  END IF;

  -- Insert events for this role (bypasses RLS due to SECURITY DEFINER)
  FOR event IN
    SELECT value FROM jsonb_array_elements(default_events)
  LOOP
    INSERT INTO role_notification_events (
      role_id,
      module,
      event_type,
      enabled,
      event_config
    )
    VALUES (
      p_role_id,
      p_module,
      event.value->>'event_type',
      (event.value->>'enabled')::boolean,
      (event.value->'config')::jsonb
    )
    ON CONFLICT (role_id, module, event_type) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created default notification events for role "%" in module "%"', p_role_name, p_module;
END;
$$ LANGUAGE plpgsql;

-- Update comment to document the SECURITY DEFINER change
COMMENT ON FUNCTION create_default_notification_events_for_role IS
'Creates intelligent default notification event configuration based on Custom Role name patterns.
Uses SECURITY DEFINER to bypass RLS when auto-populating events during role creation.';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Test by creating a new custom role and verifying events are created:
--
-- INSERT INTO dealer_custom_roles (dealer_id, role_name, display_name, is_active)
-- VALUES (5, 'test_advisor', 'Test Sales Advisor', true)
-- RETURNING id;
--
-- -- Check if events were created automatically
-- SELECT COUNT(*) FROM role_notification_events WHERE role_id = '<returned_id>';
-- -- Should return 36 (9 events × 4 modules)
-- ============================================================================

-- Migration completed successfully
-- Description: Fix RLS bypass for role_notification_events trigger by adding
--              SECURITY DEFINER to create_default_notification_events_for_role function
