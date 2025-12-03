-- =====================================================
-- FIX: Update is_slack_enabled_for_event to use correct table
-- Date: 2025-12-02
-- Description: Function was querying dealer_notification_channel_defaults (old system)
--              instead of dealer_slack_event_preferences (new multi-channel system)
-- =====================================================

-- Drop the old function
DROP FUNCTION IF EXISTS public.is_slack_enabled_for_event(bigint, varchar, varchar);

-- Recreate with correct logic for multi-channel Slack system (SHARED OAUTH MODEL)
CREATE OR REPLACE FUNCTION public.is_slack_enabled_for_event(
  p_dealer_id BIGINT,
  p_module VARCHAR,
  p_event_type VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_integration_id UUID;
  v_integration_active BOOLEAN;
BEGIN
  -- Step 1: Get webhook_id from event preferences (supports shared OAuth)
  -- In shared OAuth model, multiple dealers use the same integration_id
  SELECT webhook_id INTO v_integration_id
  FROM dealer_slack_event_preferences
  WHERE dealer_id = p_dealer_id
    AND module = p_module
    AND event_type = p_event_type
  LIMIT 1;

  -- If no preference found, return false
  IF v_integration_id IS NULL THEN
    RETURN false;
  END IF;

  -- Step 2: Verify the integration is active (check owner's integration status)
  SELECT (status = 'active' AND enabled = true) INTO v_integration_active
  FROM dealer_integrations
  WHERE id = v_integration_id
    AND integration_type = 'slack';

  -- If integration is not active, return false
  IF NOT COALESCE(v_integration_active, false) THEN
    RETURN false;
  END IF;

  -- Step 3: Check if event is enabled in preferences
  SELECT enabled INTO v_enabled
  FROM dealer_slack_event_preferences
  WHERE dealer_id = p_dealer_id
    AND webhook_id = v_integration_id
    AND module = p_module
    AND event_type = p_event_type;

  -- Return true only if event preference exists and is enabled
  RETURN COALESCE(v_enabled, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_slack_enabled_for_event(bigint, varchar, varchar) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_slack_enabled_for_event IS 'Check if Slack notification is enabled for a dealer/module/event. Supports shared OAuth model where multiple dealers use the same integration.';
