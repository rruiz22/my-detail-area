-- ================================================
-- Slack Multi-Channel Configuration System
-- ================================================
-- Allows dealers to map modules (sales_orders, service_orders, etc.)
-- to specific Slack channels within their workspace.
-- Only system_admin and dealer_admin roles can configure.

-- ================================================
-- Table: dealer_slack_channel_mappings
-- ================================================
CREATE TABLE IF NOT EXISTS dealer_slack_channel_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id bigint NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES dealer_integrations(id) ON DELETE CASCADE,
  module varchar(50) NOT NULL,
  channel_id varchar(50) NOT NULL,
  channel_name varchar(100) NOT NULL,
  enabled boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(dealer_id, integration_id, module)
);

-- Indexes for performance
CREATE INDEX idx_slack_channel_mappings_dealer ON dealer_slack_channel_mappings(dealer_id);
CREATE INDEX idx_slack_channel_mappings_integration ON dealer_slack_channel_mappings(integration_id);
CREATE INDEX idx_slack_channel_mappings_module ON dealer_slack_channel_mappings(dealer_id, module, enabled);

-- ================================================
-- RLS Policies - Role-Based Access Control
-- ================================================
ALTER TABLE dealer_slack_channel_mappings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view channel mappings for their dealer
CREATE POLICY "Users view own dealer channel mappings"
  ON dealer_slack_channel_mappings FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only system_admin and dealer_admin can insert/update/delete
-- system_admin: Can configure for any dealer
-- dealer_admin: Can configure for their own dealer only
CREATE POLICY "Admins manage channel mappings"
  ON dealer_slack_channel_mappings FOR ALL
  USING (
    -- Check if user is system_admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'system_admin'
    )
    OR
    -- Check if user is dealer_admin for this dealer
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE user_id = auth.uid()
      AND dealer_id = dealer_slack_channel_mappings.dealer_id
      AND role = 'dealer_admin'
    )
  );

-- ================================================
-- Extend dealer_slack_event_preferences with module
-- ================================================
-- Add module column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dealer_slack_event_preferences'
    AND column_name = 'module'
  ) THEN
    ALTER TABLE dealer_slack_event_preferences
      ADD COLUMN module varchar(50);
  END IF;
END $$;

-- Index for fast queries by module
CREATE INDEX IF NOT EXISTS idx_slack_event_prefs_module
  ON dealer_slack_event_preferences(dealer_id, module, enabled);

-- ================================================
-- Helper Function: Check if user can configure Slack
-- ================================================
CREATE OR REPLACE FUNCTION can_configure_slack_integration(
  user_id uuid,
  dealer_id bigint
)
RETURNS boolean AS $$
BEGIN
  -- System admins can configure any dealer
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND role = 'system_admin'
  ) THEN
    RETURN true;
  END IF;

  -- Dealer admins can configure their own dealer
  IF EXISTS (
    SELECT 1 FROM dealer_memberships
    WHERE user_id = user_id
    AND dealer_id = dealer_id
    AND role = 'dealer_admin'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_configure_slack_integration TO authenticated;

-- ================================================
-- Comments for documentation
-- ================================================
COMMENT ON TABLE dealer_slack_channel_mappings IS 'Maps dealer modules to specific Slack channels for targeted notifications';
COMMENT ON COLUMN dealer_slack_channel_mappings.module IS 'Module identifier: sales_orders, service_orders, recon_orders, car_wash, stock, contacts';
COMMENT ON COLUMN dealer_slack_channel_mappings.channel_id IS 'Slack channel ID (e.g., C12345ABC)';
COMMENT ON COLUMN dealer_slack_channel_mappings.channel_name IS 'Display name with # prefix (e.g., #bmw-sales)';
COMMENT ON FUNCTION can_configure_slack_integration IS 'Returns true if user has permission to configure Slack (system_admin or dealer_admin)';
