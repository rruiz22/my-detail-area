-- =====================================================
-- Push Notification RPC Functions
-- =====================================================
-- Purpose: Provide stored procedures for push notification validation
-- Functions:
--   1. is_push_enabled_for_event() - 4-level validation cascade
--   2. get_user_push_devices() - Fetch active user devices
--   3. deactivate_fcm_token() - Soft delete token
-- =====================================================

-- =====================================================
-- Function 1: is_push_enabled_for_event
-- =====================================================
-- Purpose: 4-level validation cascade to determine if push should be sent
-- Validation levels:
--   1. Dealer enabled for module + event?
--   2. User enabled push globally?
--   3. User has active FCM token?
--   4. Not in quiet hours?
-- Returns: TRUE if all checks pass, FALSE otherwise
-- =====================================================

CREATE OR REPLACE FUNCTION is_push_enabled_for_event(
  p_user_id UUID,
  p_dealer_id INTEGER,
  p_module VARCHAR(50),
  p_event_type VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dealer_enabled BOOLEAN;
  v_user_enabled BOOLEAN;
  v_has_active_token BOOLEAN;
  v_quiet_hours_enabled BOOLEAN;
  v_quiet_hours_start TIME;
  v_quiet_hours_end TIME;
  v_current_time TIME;
  v_in_quiet_hours BOOLEAN;
BEGIN
  -- ========================================
  -- LEVEL 1: Dealer Configuration
  -- ========================================
  -- Check if dealer has enabled this event for this module
  SELECT COALESCE(enabled, true) INTO v_dealer_enabled
  FROM dealer_push_notification_preferences
  WHERE dealer_id = p_dealer_id
    AND module = p_module
    AND event_type = p_event_type;

  -- If no configuration exists, default to TRUE (enabled)
  v_dealer_enabled := COALESCE(v_dealer_enabled, true);

  IF NOT v_dealer_enabled THEN
    RAISE LOG '[is_push_enabled_for_event] LEVEL 1 FAILED: Dealer % disabled % for %', p_dealer_id, p_event_type, p_module;
    RETURN FALSE;
  END IF;

  RAISE LOG '[is_push_enabled_for_event] LEVEL 1 PASSED: Dealer % enabled % for %', p_dealer_id, p_event_type, p_module;

  -- ========================================
  -- LEVEL 2: User Preferences
  -- ========================================
  -- Check if user has enabled push notifications globally
  SELECT push_enabled INTO v_user_enabled
  FROM user_push_notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences exist, default to FALSE (disabled)
  v_user_enabled := COALESCE(v_user_enabled, false);

  IF NOT v_user_enabled THEN
    RAISE LOG '[is_push_enabled_for_event] LEVEL 2 FAILED: User % disabled push globally', p_user_id;
    RETURN FALSE;
  END IF;

  RAISE LOG '[is_push_enabled_for_event] LEVEL 2 PASSED: User % enabled push globally', p_user_id;

  -- ========================================
  -- LEVEL 3: Active FCM Token
  -- ========================================
  -- Check if user has at least one active FCM token
  SELECT EXISTS (
    SELECT 1 FROM fcm_tokens
    WHERE user_id = p_user_id
      AND dealer_id = p_dealer_id
      AND is_active = true
  ) INTO v_has_active_token;

  IF NOT v_has_active_token THEN
    RAISE LOG '[is_push_enabled_for_event] LEVEL 3 FAILED: User % has no active FCM tokens', p_user_id;
    RETURN FALSE;
  END IF;

  RAISE LOG '[is_push_enabled_for_event] LEVEL 3 PASSED: User % has active FCM token(s)', p_user_id;

  -- ========================================
  -- LEVEL 4: Quiet Hours Check
  -- ========================================
  -- Check if user has quiet hours enabled and if we're currently in that window
  SELECT
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  INTO
    v_quiet_hours_enabled,
    v_quiet_hours_start,
    v_quiet_hours_end
  FROM user_push_notification_preferences
  WHERE user_id = p_user_id;

  -- If quiet hours not enabled, skip this check
  IF NOT COALESCE(v_quiet_hours_enabled, false) THEN
    RAISE LOG '[is_push_enabled_for_event] LEVEL 4 SKIPPED: User % has quiet hours disabled', p_user_id;
    RETURN TRUE;
  END IF;

  -- Get current time in user's timezone (using server time for now)
  v_current_time := CURRENT_TIME;

  -- Check if current time is within quiet hours window
  -- Handle midnight-spanning ranges (e.g., 22:00 - 08:00)
  IF v_quiet_hours_start <= v_quiet_hours_end THEN
    -- Normal range (e.g., 08:00 - 22:00)
    v_in_quiet_hours := v_current_time BETWEEN v_quiet_hours_start AND v_quiet_hours_end;
  ELSE
    -- Midnight-spanning range (e.g., 22:00 - 08:00)
    v_in_quiet_hours := v_current_time >= v_quiet_hours_start OR v_current_time <= v_quiet_hours_end;
  END IF;

  IF v_in_quiet_hours THEN
    RAISE LOG '[is_push_enabled_for_event] LEVEL 4 FAILED: User % in quiet hours (% - %)', p_user_id, v_quiet_hours_start, v_quiet_hours_end;
    RETURN FALSE;
  END IF;

  RAISE LOG '[is_push_enabled_for_event] LEVEL 4 PASSED: User % not in quiet hours', p_user_id;

  -- ========================================
  -- ALL CHECKS PASSED
  -- ========================================
  RAISE LOG '[is_push_enabled_for_event]  ALL LEVELS PASSED for user %', p_user_id;
  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    -- Log error and fail-safe to FALSE
    RAISE WARNING '[is_push_enabled_for_event] ERROR: % - %', SQLERRM, SQLSTATE;
    RETURN FALSE;
END;
$$;

-- Add comment
COMMENT ON FUNCTION is_push_enabled_for_event IS '4-level validation cascade: Dealer ’ User ’ Token ’ Quiet Hours';

-- =====================================================
-- Function 2: get_user_push_devices
-- =====================================================
-- Purpose: Fetch active FCM tokens for a user in a specific dealership
-- Returns: Array of FCM token records with device metadata
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_push_devices(
  p_user_id UUID,
  p_dealer_id INTEGER
)
RETURNS TABLE (
  id UUID,
  device_name TEXT,
  browser TEXT,
  os TEXT,
  fcm_token TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.id,
    ft.device_name,
    ft.browser,
    ft.os,
    ft.fcm_token,
    ft.last_used_at,
    ft.created_at
  FROM fcm_tokens ft
  WHERE ft.user_id = p_user_id
    AND ft.dealer_id = p_dealer_id
    AND ft.is_active = true
  ORDER BY ft.last_used_at DESC NULLS LAST, ft.created_at DESC;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[get_user_push_devices] ERROR: % - %', SQLERRM, SQLSTATE;
    RETURN;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_user_push_devices IS 'Fetch active FCM tokens for a user with device metadata';

-- =====================================================
-- Function 3: deactivate_fcm_token
-- =====================================================
-- Purpose: Soft delete an FCM token (set is_active = false)
-- Security: Users can only deactivate their own tokens
-- Returns: TRUE if successful, FALSE otherwise
-- =====================================================

CREATE OR REPLACE FUNCTION deactivate_fcm_token(
  p_token_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user_id of the token
  SELECT user_id INTO v_user_id
  FROM fcm_tokens
  WHERE id = p_token_id;

  -- Security check: Only allow users to deactivate their own tokens
  IF v_user_id IS NULL THEN
    RAISE WARNING '[deactivate_fcm_token] Token % not found', p_token_id;
    RETURN FALSE;
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE WARNING '[deactivate_fcm_token] User % attempted to deactivate token owned by %', auth.uid(), v_user_id;
    RETURN FALSE;
  END IF;

  -- Soft delete the token
  UPDATE fcm_tokens
  SET is_active = false,
      updated_at = now()
  WHERE id = p_token_id;

  RAISE LOG '[deactivate_fcm_token] Deactivated token % for user %', p_token_id, v_user_id;
  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[deactivate_fcm_token] ERROR: % - %', SQLERRM, SQLSTATE;
    RETURN FALSE;
END;
$$;

-- Add comment
COMMENT ON FUNCTION deactivate_fcm_token IS 'Soft delete an FCM token (users can only deactivate their own tokens)';

-- =====================================================
-- Grant Execute Permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION is_push_enabled_for_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_push_devices TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_fcm_token TO authenticated;
