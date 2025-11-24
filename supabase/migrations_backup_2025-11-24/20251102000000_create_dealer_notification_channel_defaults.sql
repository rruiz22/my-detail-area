-- =====================================================
-- Migration: Dealer Notification Channel Defaults
-- =====================================================
-- Description: Per-dealership configuration for which notification channels
--              (SMS, Email, Push, In-App) should be enabled for each event type.
--
-- Purpose: Allow dealerships to customize notification behavior at scale.
--          Users inherit these defaults, but can override personally.
--
-- Author: Claude Code
-- Date: 2025-11-02
-- Version: 1.0
-- Safety: Backward compatible - no breaking changes
-- =====================================================

-- =====================================================
-- 1. Create Main Table
-- =====================================================

CREATE TABLE IF NOT EXISTS dealer_notification_channel_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id BIGINT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL CHECK (
    module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready')
  ),

  -- Event-specific channel configuration (JSONB Matrix)
  -- Structure: { "order_created": {"in_app": true, "email": false, "sms": false, "push": true}, ... }
  event_channel_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Global defaults for each channel (applied to unconfigured events)
  default_in_app BOOLEAN NOT NULL DEFAULT true,
  default_email BOOLEAN NOT NULL DEFAULT false,
  default_sms BOOLEAN NOT NULL DEFAULT false,
  default_push BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: One configuration per dealer per module
  CONSTRAINT unique_dealer_module UNIQUE(dealer_id, module)
);

-- =====================================================
-- 2. Indexes for Performance
-- =====================================================

-- Fast lookups by dealer and module
CREATE INDEX idx_dealer_channel_defaults_lookup
ON dealer_notification_channel_defaults(dealer_id, module);

-- GIN index for JSONB queries (event-specific lookups)
CREATE INDEX idx_dealer_channel_config_gin
ON dealer_notification_channel_defaults USING GIN(event_channel_config);

-- Index for audit queries (who updated when)
CREATE INDEX idx_dealer_channel_updated
ON dealer_notification_channel_defaults(dealer_id, updated_at DESC);

-- =====================================================
-- 3. Row Level Security (RLS)
-- =====================================================

ALTER TABLE dealer_notification_channel_defaults ENABLE ROW LEVEL SECURITY;

-- Policy 1: System admins have full access
CREATE POLICY "System admins full access to dealer channel defaults"
ON dealer_notification_channel_defaults
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'system_admin'
  )
);

-- Policy 2: Dealer admins can manage their own dealership's configuration
CREATE POLICY "Dealer admins manage own dealership channel defaults"
ON dealer_notification_channel_defaults
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM dealer_memberships dm
    INNER JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
    WHERE dm.user_id = auth.uid()
    AND dm.dealer_id = dealer_notification_channel_defaults.dealer_id
    AND dm.is_active = true
    AND dcr.role_name IN ('dealer_admin', 'dealer_manager')
  )
);

-- Policy 3: All dealer members can READ their dealership's configuration
CREATE POLICY "Dealer members read own dealership channel defaults"
ON dealer_notification_channel_defaults
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM dealer_memberships dm
    WHERE dm.user_id = auth.uid()
    AND dm.dealer_id = dealer_notification_channel_defaults.dealer_id
    AND dm.is_active = true
  )
);

-- =====================================================
-- 4. Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dealer_channel_defaults_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dealer_channel_defaults_updated_at
BEFORE UPDATE ON dealer_notification_channel_defaults
FOR EACH ROW
EXECUTE FUNCTION update_dealer_channel_defaults_updated_at();

-- =====================================================
-- 5. Helper Functions
-- =====================================================

-- Get dealer defaults for a specific module
-- Returns JSONB with event-channel matrix
CREATE OR REPLACE FUNCTION get_dealer_channel_defaults(
  p_dealer_id BIGINT,
  p_module VARCHAR(50)
)
RETURNS JSONB AS $$
DECLARE
  v_config JSONB;
BEGIN
  SELECT event_channel_config INTO v_config
  FROM dealer_notification_channel_defaults
  WHERE dealer_id = p_dealer_id
    AND module = p_module;

  -- Return config or empty object if not found
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if specific event-channel combination is enabled for dealer
CREATE OR REPLACE FUNCTION is_dealer_channel_enabled(
  p_dealer_id BIGINT,
  p_module VARCHAR(50),
  p_event_type TEXT,
  p_channel TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_config JSONB;
  v_event_config JSONB;
  v_enabled BOOLEAN;
  v_default_enabled BOOLEAN;
BEGIN
  -- Get dealer configuration
  SELECT event_channel_config INTO v_config
  FROM dealer_notification_channel_defaults
  WHERE dealer_id = p_dealer_id AND module = p_module;

  -- If no configuration exists, return true (allow all by default for backward compatibility)
  IF v_config IS NULL THEN
    RETURN true;
  END IF;

  -- Get event-specific configuration
  v_event_config := v_config -> p_event_type;

  -- If event not configured, check global defaults
  IF v_event_config IS NULL THEN
    CASE p_channel
      WHEN 'in_app' THEN
        SELECT default_in_app INTO v_default_enabled
        FROM dealer_notification_channel_defaults
        WHERE dealer_id = p_dealer_id AND module = p_module;
      WHEN 'email' THEN
        SELECT default_email INTO v_default_enabled
        FROM dealer_notification_channel_defaults
        WHERE dealer_id = p_dealer_id AND module = p_module;
      WHEN 'sms' THEN
        SELECT default_sms INTO v_default_enabled
        FROM dealer_notification_channel_defaults
        WHERE dealer_id = p_dealer_id AND module = p_module;
      WHEN 'push' THEN
        SELECT default_push INTO v_default_enabled
        FROM dealer_notification_channel_defaults
        WHERE dealer_id = p_dealer_id AND module = p_module;
      ELSE
        RETURN true; -- Unknown channel, allow by default
    END CASE;

    RETURN COALESCE(v_default_enabled, true);
  END IF;

  -- Get channel-specific setting
  v_enabled := (v_event_config ->> p_channel)::boolean;

  RETURN COALESCE(v_enabled, true);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 6. Comments (Documentation)
-- =====================================================

COMMENT ON TABLE dealer_notification_channel_defaults IS
'Per-dealership defaults for notification channel configuration. Defines which channels (SMS, Email, Push, In-App) should be enabled for each event type. Users inherit these defaults but can override personally.';

COMMENT ON COLUMN dealer_notification_channel_defaults.event_channel_config IS
'JSONB matrix of event types to channel configuration. Example: {"order_created": {"in_app": true, "email": true, "sms": false, "push": true}}';

COMMENT ON COLUMN dealer_notification_channel_defaults.default_in_app IS
'Default for In-App channel when event not explicitly configured. Defaults to true.';

COMMENT ON COLUMN dealer_notification_channel_defaults.default_email IS
'Default for Email channel when event not explicitly configured. Defaults to false.';

COMMENT ON COLUMN dealer_notification_channel_defaults.default_sms IS
'Default for SMS channel when event not explicitly configured. Defaults to false (cost consideration).';

COMMENT ON COLUMN dealer_notification_channel_defaults.default_push IS
'Default for Push channel when event not explicitly configured. Defaults to false.';

-- =====================================================
-- 7. Validation & Verification
-- =====================================================

-- Verify table was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'dealer_notification_channel_defaults'
  ) THEN
    RAISE EXCEPTION 'Migration failed: dealer_notification_channel_defaults table was not created';
  END IF;

  -- Verify indexes exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'dealer_notification_channel_defaults'
    AND indexname = 'idx_dealer_channel_defaults_lookup'
  ) THEN
    RAISE EXCEPTION 'Migration failed: idx_dealer_channel_defaults_lookup index was not created';
  END IF;

  -- Verify RLS is enabled
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'dealer_notification_channel_defaults'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'Migration failed: RLS not enabled on dealer_notification_channel_defaults';
  END IF;

  RAISE NOTICE 'Migration successful: dealer_notification_channel_defaults table created with all constraints, indexes, and RLS policies';
END $$;
