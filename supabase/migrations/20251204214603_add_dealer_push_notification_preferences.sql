-- =====================================================
-- Dealer Push Notification Preferences
-- =====================================================
-- Purpose: Store dealer-level configuration for which events trigger push notifications
-- Access: dealer_admin, system_admin only
-- Scope: Per dealership, per module, per event
-- =====================================================

-- Create dealer_push_notification_preferences table
CREATE TABLE IF NOT EXISTS dealer_push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL, -- 'sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready'
  event_type VARCHAR(50) NOT NULL, -- 'order_created', 'order_status_changed', 'order_completed', etc.
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure one configuration per dealer + module + event combination
  CONSTRAINT dealer_push_notification_preferences_unique UNIQUE (dealer_id, module, event_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dealer_push_prefs_dealer ON dealer_push_notification_preferences(dealer_id);
CREATE INDEX IF NOT EXISTS idx_dealer_push_prefs_module ON dealer_push_notification_preferences(module);
CREATE INDEX IF NOT EXISTS idx_dealer_push_prefs_event ON dealer_push_notification_preferences(event_type);
CREATE INDEX IF NOT EXISTS idx_dealer_push_prefs_enabled ON dealer_push_notification_preferences(enabled) WHERE enabled = true;

-- Enable RLS
ALTER TABLE dealer_push_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: dealer_admin and system_admin can view their dealership's configuration
CREATE POLICY "Dealer admins can view their dealership push config"
  ON dealer_push_notification_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = dealer_push_notification_preferences.dealer_id
        AND dm.user_id = auth.uid()
        AND (dm.role = 'dealer_admin' OR dm.role = 'system_admin')
    )
  );

-- RLS Policy: dealer_admin and system_admin can insert/update their dealership's configuration
CREATE POLICY "Dealer admins can manage their dealership push config"
  ON dealer_push_notification_preferences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = dealer_push_notification_preferences.dealer_id
        AND dm.user_id = auth.uid()
        AND (dm.role = 'dealer_admin' OR dm.role = 'system_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = dealer_push_notification_preferences.dealer_id
        AND dm.user_id = auth.uid()
        AND (dm.role = 'dealer_admin' OR dm.role = 'system_admin')
    )
  );

-- Add updated_at trigger
CREATE TRIGGER set_dealer_push_notification_preferences_updated_at
  BEFORE UPDATE ON dealer_push_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE dealer_push_notification_preferences IS 'Dealer-level configuration for which events trigger push notifications across modules';
