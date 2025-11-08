-- Create role_notification_events table for Custom Role notification configuration
-- Migration: 20251108000004_create_role_notification_events.sql
--
-- ARCHITECTURE: Level 2 of 3-level validation
-- This table defines WHICH EVENTS a Custom Role can receive notifications for
-- Configured by dealer admins, inherited by all users with that role

-- =====================================================
-- Create role_notification_events table
-- =====================================================

CREATE TABLE IF NOT EXISTS role_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES dealer_custom_roles(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready')),
  event_type TEXT NOT NULL, -- 'order_created', 'order_assigned', 'status_changed', etc.

  -- Global enable/disable for this event
  enabled BOOLEAN DEFAULT false,

  -- Event-specific configuration (JSONB for flexibility)
  -- Examples:
  --   status_changed: {"allowed_statuses": ["completed", "in_progress"]}
  --   due_date_approaching: {"default_minutes_before": 30}
  --   field_updated: {"allowed_fields": ["vehicle_vin", "stock_number"]}
  event_config JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(role_id, module, event_type)
);

-- =====================================================
-- Indexes for performance
-- =====================================================

-- Index for querying all events for a specific role
CREATE INDEX IF NOT EXISTS idx_role_notif_events_role
ON role_notification_events(role_id);

-- Index for querying enabled events by module (most common query)
CREATE INDEX IF NOT EXISTS idx_role_notif_events_module_enabled
ON role_notification_events(module, event_type)
WHERE enabled = true;

-- Composite index for specific lookups (role + module + event)
CREATE INDEX IF NOT EXISTS idx_role_notif_events_lookup
ON role_notification_events(role_id, module, event_type);

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_role_notif_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Trigger to auto-update updated_at
-- =====================================================

CREATE TRIGGER set_role_notif_events_updated_at
BEFORE UPDATE ON role_notification_events
FOR EACH ROW
EXECUTE FUNCTION update_role_notif_events_updated_at();

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE role_notification_events ENABLE ROW LEVEL SECURITY;

-- Dealer admins can manage notification events for their dealership's roles
CREATE POLICY "Dealer admins manage role notification events"
ON role_notification_events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM dealer_custom_roles dcr
    INNER JOIN dealer_memberships dm ON dm.dealer_id = dcr.dealer_id
    INNER JOIN role_module_permissions_new rmp ON dm.custom_role_id = rmp.role_id
    INNER JOIN module_permissions mp ON rmp.permission_id = mp.id
    WHERE dcr.id = role_notification_events.role_id
    AND dm.user_id = auth.uid()
    AND dm.is_active = true
    AND mp.module = 'management'
    AND mp.permission_key = 'manage_roles'
  )
);

-- Service role can read/write (for Edge Functions)
CREATE POLICY "Service role full access to role notification events"
ON role_notification_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Users can view their own role's notification event configuration (read-only)
CREATE POLICY "Users can view own role notification events"
ON role_notification_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dealer_memberships dm
    INNER JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
    WHERE dcr.id = role_notification_events.role_id
    AND dm.user_id = auth.uid()
    AND dm.is_active = true
  )
);

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE role_notification_events IS 'Defines which notification events each Custom Role can receive. Part of 3-level notification architecture: Follower → Role → User.';
COMMENT ON COLUMN role_notification_events.role_id IS 'References dealer_custom_roles - the role this configuration applies to';
COMMENT ON COLUMN role_notification_events.module IS 'Module this event belongs to (sales_orders, service_orders, etc.)';
COMMENT ON COLUMN role_notification_events.event_type IS 'Type of event (order_created, status_changed, comment_added, etc.)';
COMMENT ON COLUMN role_notification_events.enabled IS 'Whether users with this role can receive notifications for this event';
COMMENT ON COLUMN role_notification_events.event_config IS 'JSONB containing event-specific configuration (e.g., allowed_statuses for status_changed)';

-- =====================================================
-- Verification queries (for testing)
-- =====================================================

-- Run these after migration to verify:
--
-- SELECT COUNT(*) FROM role_notification_events;
--
-- SELECT * FROM pg_indexes WHERE tablename = 'role_notification_events';
--
-- SELECT policy_name FROM information_schema.table_privileges
-- WHERE table_name = 'role_notification_events';
