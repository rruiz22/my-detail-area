-- =====================================================
-- SLACK NOTIFICATION CHANNEL SUPPORT
-- Created: 2025-11-10
-- Description: Add Slack as a notification channel for dealer notifications
-- =====================================================

-- 1. Add slack column to dealer_notification_channel_defaults
ALTER TABLE dealer_notification_channel_defaults
  ADD COLUMN IF NOT EXISTS default_slack BOOLEAN DEFAULT false;

COMMENT ON COLUMN dealer_notification_channel_defaults.default_slack IS
  'Default setting for Slack notifications. Can be overridden per event in event_channel_config JSONB';

-- 2. Create helper function to check if Slack is enabled for a specific event
CREATE OR REPLACE FUNCTION is_slack_enabled_for_event(
  p_dealer_id BIGINT,
  p_module VARCHAR(50),
  p_event_type VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  -- Check event_channel_config JSONB first, fallback to default_slack
  SELECT COALESCE(
    (event_channel_config->p_event_type->>'slack')::BOOLEAN,
    default_slack
  )
  INTO v_enabled
  FROM dealer_notification_channel_defaults
  WHERE dealer_id = p_dealer_id AND module = p_module;

  -- If no config found, return false
  RETURN COALESCE(v_enabled, false);
END;
$$;

COMMENT ON FUNCTION is_slack_enabled_for_event IS
  'Check if Slack notifications are enabled for a specific dealer, module, and event type. Returns true if enabled, false otherwise.';

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_slack_enabled_for_event TO authenticated;

-- 4. Create index for better performance on slack lookups
CREATE INDEX IF NOT EXISTS idx_dealer_notification_defaults_slack
  ON dealer_notification_channel_defaults(dealer_id, module)
  WHERE default_slack = true;

COMMENT ON INDEX idx_dealer_notification_defaults_slack IS
  'Index to optimize Slack notification queries for dealers with Slack enabled';

-- 5. Add validation to ensure event_channel_config includes only valid channels
-- This is a soft validation via comment (hard validation would break existing data)
COMMENT ON COLUMN dealer_notification_channel_defaults.event_channel_config IS
  'JSONB matrix of event-to-channel mappings. Valid channels: in_app, email, sms, push, slack. Example: {"order_created": {"in_app": true, "email": false, "sms": false, "push": true, "slack": true}}';

-- 6. Migration log
DO $$
BEGIN
  RAISE NOTICE '✅ Slack notification channel support added successfully';
  RAISE NOTICE '   - Added default_slack column to dealer_notification_channel_defaults';
  RAISE NOTICE '   - Created is_slack_enabled_for_event() helper function';
  RAISE NOTICE '   - Created performance index for Slack lookups';
  RAISE NOTICE '   - Granted execute permission to authenticated users';
END $$;
