-- ============================================================================
-- ENTERPRISE NOTIFICATION SYSTEM - FASE 1: HELPER FUNCTIONS
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-29
-- Description: Create RPC helper functions for notification system
--
-- FUNCTIONS:
--   1. get_user_notification_config - Get complete notification config for user
--   2. update_user_event_preference - Update specific event preference
--   3. get_notification_recipients - Calculate recipients for an event
--   4. is_user_in_quiet_hours - Check if user is in quiet hours
--   5. check_user_rate_limit - Verify user hasn't exceeded rate limits
--   6. create_default_notification_preferences - Initialize user preferences
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION 1: Get User Notification Configuration
-- ============================================================================
-- Purpose: Retrieve complete notification config for a user/dealer/module
-- Returns: Full config including preferences and applicable dealer rules
-- Usage: SELECT * FROM get_user_notification_config(user_id, dealer_id, 'sales_orders');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_notification_config(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_module VARCHAR(50)
)
RETURNS TABLE (
    -- User preferences
    in_app_enabled BOOLEAN,
    email_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    push_enabled BOOLEAN,
    event_preferences JSONB,
    quiet_hours_enabled BOOLEAN,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    quiet_hours_timezone VARCHAR(50),
    rate_limits JSONB,
    frequency VARCHAR(20),
    phone_number_override VARCHAR(20),
    -- Dealer rules
    applicable_dealer_rules JSONB,
    -- Metadata
    config_exists BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_config_exists BOOLEAN;
BEGIN
    -- Check if config exists
    SELECT EXISTS (
        SELECT 1
        FROM public.user_notification_preferences_universal
        WHERE user_id = p_user_id
        AND dealer_id = p_dealer_id
        AND module = p_module
    ) INTO v_config_exists;

    -- If config doesn't exist, create default preferences
    IF NOT v_config_exists THEN
        PERFORM public.create_default_notification_preferences(p_user_id, p_dealer_id, p_module);
    END IF;

    -- Return combined config
    RETURN QUERY
    SELECT
        -- User preferences
        unp.in_app_enabled,
        unp.email_enabled,
        unp.sms_enabled,
        unp.push_enabled,
        unp.event_preferences,
        unp.quiet_hours_enabled,
        unp.quiet_hours_start,
        unp.quiet_hours_end,
        unp.quiet_hours_timezone,
        unp.rate_limits,
        unp.frequency,
        unp.phone_number_override,
        -- Applicable dealer rules (as JSONB array)
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'rule_id', dnr.id,
                        'rule_name', dnr.rule_name,
                        'event', dnr.event,
                        'recipients', dnr.recipients,
                        'conditions', dnr.conditions,
                        'channels', dnr.channels,
                        'priority', dnr.priority
                    )
                )
                FROM public.dealer_notification_rules dnr
                WHERE dnr.dealer_id = p_dealer_id
                AND dnr.module = p_module
                AND dnr.enabled = true
            ),
            '[]'::jsonb
        ) AS applicable_dealer_rules,
        -- Metadata
        true AS config_exists
    FROM public.user_notification_preferences_universal unp
    WHERE unp.user_id = p_user_id
    AND unp.dealer_id = p_dealer_id
    AND unp.module = p_module;
END;
$$;

COMMENT ON FUNCTION public.get_user_notification_config IS
    'Retrieves complete notification configuration for a user including preferences and dealer rules';

-- ============================================================================
-- FUNCTION 2: Update User Event Preference
-- ============================================================================
-- Purpose: Update a specific event preference for a user
-- Usage: SELECT update_user_event_preference(user_id, dealer_id, 'sales_orders', 'order_created', 'sms', true);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_event_preference(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_module VARCHAR(50),
    p_event VARCHAR(100),
    p_channel VARCHAR(20), -- 'in_app', 'email', 'sms', 'push', or NULL for all channels
    p_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_prefs JSONB;
    v_channels JSONB;
BEGIN
    -- Ensure preferences exist
    PERFORM public.create_default_notification_preferences(p_user_id, p_dealer_id, p_module);

    -- Get current event preferences
    SELECT event_preferences INTO v_event_prefs
    FROM public.user_notification_preferences_universal
    WHERE user_id = p_user_id
    AND dealer_id = p_dealer_id
    AND module = p_module;

    -- If event doesn't exist in preferences, initialize it
    IF NOT (v_event_prefs ? p_event) THEN
        v_event_prefs := jsonb_set(
            v_event_prefs,
            ARRAY[p_event],
            '{"enabled": false, "channels": []}'::jsonb
        );
    END IF;

    -- Update enabled status
    v_event_prefs := jsonb_set(
        v_event_prefs,
        ARRAY[p_event, 'enabled'],
        to_jsonb(p_enabled)
    );

    -- Update channel-specific setting if channel is specified
    IF p_channel IS NOT NULL THEN
        -- Get current channels array
        v_channels := COALESCE(
            v_event_prefs->p_event->'channels',
            '[]'::jsonb
        );

        -- Add or remove channel
        IF p_enabled THEN
            -- Add channel if not already present
            IF NOT (v_channels @> to_jsonb(p_channel)) THEN
                v_channels := v_channels || to_jsonb(p_channel);
            END IF;
        ELSE
            -- Remove channel
            v_channels := (
                SELECT jsonb_agg(elem)
                FROM jsonb_array_elements_text(v_channels) elem
                WHERE elem <> p_channel
            );
            v_channels := COALESCE(v_channels, '[]'::jsonb);
        END IF;

        -- Update channels in event preferences
        v_event_prefs := jsonb_set(
            v_event_prefs,
            ARRAY[p_event, 'channels'],
            v_channels
        );
    END IF;

    -- Save updated preferences
    UPDATE public.user_notification_preferences_universal
    SET
        event_preferences = v_event_prefs,
        updated_at = NOW()
    WHERE user_id = p_user_id
    AND dealer_id = p_dealer_id
    AND module = p_module;

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.update_user_event_preference IS
    'Updates a specific event preference for a user with optional channel granularity';

-- ============================================================================
-- FUNCTION 3: Get Notification Recipients
-- ============================================================================
-- Purpose: Calculate who should receive a notification based on dealer rules
-- Returns: Array of user_ids who should receive the notification
-- Usage: SELECT * FROM get_notification_recipients(dealer_id, 'sales_orders', 'order_created', metadata);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_notification_recipients(
    p_dealer_id BIGINT,
    p_module VARCHAR(50),
    p_event VARCHAR(100),
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    user_id UUID,
    channels JSONB,
    rule_matched VARCHAR(100),
    priority INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH applicable_rules AS (
        -- Get all enabled rules for this event
        SELECT
            dnr.id,
            dnr.rule_name,
            dnr.recipients,
            dnr.conditions,
            dnr.channels,
            dnr.priority
        FROM public.dealer_notification_rules dnr
        WHERE dnr.dealer_id = p_dealer_id
        AND dnr.module = p_module
        AND dnr.event = p_event
        AND dnr.enabled = true
        ORDER BY dnr.priority DESC
    ),
    recipient_users AS (
        -- Expand rules to individual users
        SELECT DISTINCT
            CASE
                -- Direct user IDs from recipients.users array
                WHEN jsonb_typeof(ar.recipients->'users') = 'array' THEN
                    (SELECT unnest(ARRAY(SELECT jsonb_array_elements_text(ar.recipients->'users')))::UUID)
                -- Users by role
                WHEN jsonb_typeof(ar.recipients->'roles') = 'array' THEN
                    (
                        SELECT dm.user_id
                        FROM public.dealer_memberships dm
                        WHERE dm.dealer_id = p_dealer_id
                        AND dm.is_active = true
                        AND dm.role = ANY(
                            SELECT jsonb_array_elements_text(ar.recipients->'roles')
                        )
                    )
                -- Assigned user (from metadata)
                WHEN (ar.recipients->>'include_assigned_user')::BOOLEAN = true
                    AND p_metadata->>'assigned_user_id' IS NOT NULL THEN
                    (p_metadata->>'assigned_user_id')::UUID
                -- Creator (from metadata)
                WHEN (ar.recipients->>'include_creator')::BOOLEAN = true
                    AND p_metadata->>'created_by' IS NOT NULL THEN
                    (p_metadata->>'created_by')::UUID
                ELSE NULL
            END AS user_id,
            ar.channels,
            ar.rule_name,
            ar.priority
        FROM applicable_rules ar
    )
    SELECT
        ru.user_id,
        ru.channels,
        ru.rule_name,
        ru.priority
    FROM recipient_users ru
    WHERE ru.user_id IS NOT NULL
    -- Filter by user's notification preferences
    AND EXISTS (
        SELECT 1
        FROM public.user_notification_preferences_universal unp
        WHERE unp.user_id = ru.user_id
        AND unp.dealer_id = p_dealer_id
        AND unp.module = p_module
        -- Check if user has event enabled
        AND (
            unp.event_preferences->p_event->>'enabled' IS NULL
            OR (unp.event_preferences->p_event->>'enabled')::BOOLEAN = true
        )
    )
    ORDER BY ru.priority DESC, ru.user_id;
END;
$$;

COMMENT ON FUNCTION public.get_notification_recipients IS
    'Calculates notification recipients based on dealer rules and user preferences';

-- ============================================================================
-- FUNCTION 4: Check if User is in Quiet Hours
-- ============================================================================
-- Purpose: Determine if current time is within user's quiet hours
-- Returns: TRUE if in quiet hours, FALSE otherwise
-- Usage: SELECT is_user_in_quiet_hours(user_id, dealer_id, 'sales_orders');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_user_in_quiet_hours(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_module VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_quiet_hours_enabled BOOLEAN;
    v_quiet_hours_start TIME;
    v_quiet_hours_end TIME;
    v_quiet_hours_timezone VARCHAR(50);
    v_current_time TIME;
BEGIN
    -- Get quiet hours settings
    SELECT
        quiet_hours_enabled,
        quiet_hours_start,
        quiet_hours_end,
        COALESCE(quiet_hours_timezone, 'America/New_York')
    INTO
        v_quiet_hours_enabled,
        v_quiet_hours_start,
        v_quiet_hours_end,
        v_quiet_hours_timezone
    FROM public.user_notification_preferences_universal
    WHERE user_id = p_user_id
    AND dealer_id = p_dealer_id
    AND module = p_module;

    -- If quiet hours not enabled or no config, return false
    IF v_quiet_hours_enabled IS NULL OR v_quiet_hours_enabled = false THEN
        RETURN false;
    END IF;

    -- Get current time in user's timezone
    v_current_time := (NOW() AT TIME ZONE v_quiet_hours_timezone)::TIME;

    -- Check if current time is within quiet hours
    -- Handle cases where quiet hours span midnight
    IF v_quiet_hours_start <= v_quiet_hours_end THEN
        -- Normal case: 22:00 - 08:00 same day
        RETURN v_current_time >= v_quiet_hours_start
            AND v_current_time <= v_quiet_hours_end;
    ELSE
        -- Spanning midnight: 22:00 - 08:00 next day
        RETURN v_current_time >= v_quiet_hours_start
            OR v_current_time <= v_quiet_hours_end;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.is_user_in_quiet_hours IS
    'Checks if current time is within user''s configured quiet hours';

-- ============================================================================
-- FUNCTION 5: Check User Rate Limit
-- ============================================================================
-- Purpose: Verify user hasn't exceeded rate limits for a channel
-- Returns: TRUE if under limit, FALSE if exceeded
-- Usage: SELECT check_user_rate_limit(user_id, dealer_id, 'sales_orders', 'sms');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_user_rate_limit(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_module VARCHAR(50),
    p_channel VARCHAR(20)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_rate_limits JSONB;
    v_max_per_hour INTEGER;
    v_max_per_day INTEGER;
    v_count_last_hour INTEGER;
    v_count_last_day INTEGER;
BEGIN
    -- Get rate limits from user preferences
    SELECT rate_limits INTO v_rate_limits
    FROM public.user_notification_preferences_universal
    WHERE user_id = p_user_id
    AND dealer_id = p_dealer_id
    AND module = p_module;

    -- If no rate limits configured, allow (fail open)
    IF v_rate_limits IS NULL THEN
        RETURN true;
    END IF;

    -- Get channel-specific limits
    v_max_per_hour := (v_rate_limits->p_channel->>'max_per_hour')::INTEGER;
    v_max_per_day := (v_rate_limits->p_channel->>'max_per_day')::INTEGER;

    -- If no limits for this channel, allow
    IF v_max_per_hour IS NULL AND v_max_per_day IS NULL THEN
        RETURN true;
    END IF;

    -- Count notifications sent in last hour (requires notification_delivery_log table)
    -- TODO: Implement when notification_delivery_log table exists
    -- For now, return true (no rate limiting until delivery tracking is implemented)
    v_count_last_hour := 0;
    v_count_last_day := 0;

    -- Check limits
    IF v_max_per_hour IS NOT NULL AND v_count_last_hour >= v_max_per_hour THEN
        RETURN false;
    END IF;

    IF v_max_per_day IS NOT NULL AND v_count_last_day >= v_max_per_day THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.check_user_rate_limit IS
    'Verifies user has not exceeded rate limits for a specific notification channel';

-- ============================================================================
-- FUNCTION 6: Create Default Notification Preferences
-- ============================================================================
-- Purpose: Initialize default notification preferences for a user
-- Returns: TRUE if created, FALSE if already exists
-- Usage: SELECT create_default_notification_preferences(user_id, dealer_id, 'sales_orders');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_notification_preferences(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_module VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_default_event_prefs JSONB;
BEGIN
    -- Check if preferences already exist
    IF EXISTS (
        SELECT 1
        FROM public.user_notification_preferences_universal
        WHERE user_id = p_user_id
        AND dealer_id = p_dealer_id
        AND module = p_module
    ) THEN
        RETURN false; -- Already exists
    END IF;

    -- Define default event preferences based on module
    v_default_event_prefs := CASE p_module
        WHEN 'get_ready' THEN
            '{
                "sla_warning": {"enabled": true, "channels": ["in_app"]},
                "sla_critical": {"enabled": true, "channels": ["in_app", "push"]},
                "approval_pending": {"enabled": true, "channels": ["in_app"]},
                "approval_approved": {"enabled": true, "channels": ["in_app"]},
                "approval_rejected": {"enabled": true, "channels": ["in_app"]},
                "bottleneck_detected": {"enabled": true, "channels": ["in_app"]},
                "vehicle_status_change": {"enabled": false, "channels": []},
                "work_item_completed": {"enabled": false, "channels": []},
                "step_completed": {"enabled": true, "channels": ["in_app"]}
            }'::jsonb
        WHEN 'sales_orders' THEN
            '{
                "order_created": {"enabled": true, "channels": ["in_app"]},
                "order_assigned": {"enabled": true, "channels": ["in_app"]},
                "status_changed": {"enabled": true, "channels": ["in_app"]},
                "due_date_approaching": {"enabled": true, "channels": ["in_app"]},
                "overdue": {"enabled": true, "channels": ["in_app", "push"]}
            }'::jsonb
        WHEN 'service_orders' THEN
            '{
                "order_created": {"enabled": true, "channels": ["in_app"]},
                "order_assigned": {"enabled": true, "channels": ["in_app"]},
                "status_changed": {"enabled": true, "channels": ["in_app"]},
                "due_date_approaching": {"enabled": true, "channels": ["in_app"]}
            }'::jsonb
        WHEN 'recon_orders' THEN
            '{
                "order_created": {"enabled": true, "channels": ["in_app"]},
                "order_assigned": {"enabled": true, "channels": ["in_app"]},
                "status_changed": {"enabled": true, "channels": ["in_app"]}
            }'::jsonb
        WHEN 'car_wash' THEN
            '{
                "order_created": {"enabled": true, "channels": ["in_app"]},
                "order_assigned": {"enabled": true, "channels": ["in_app"]},
                "status_changed": {"enabled": true, "channels": ["in_app"]}
            }'::jsonb
        ELSE
            '{}'::jsonb
    END;

    -- Insert default preferences
    INSERT INTO public.user_notification_preferences_universal (
        user_id,
        dealer_id,
        module,
        in_app_enabled,
        email_enabled,
        sms_enabled,
        push_enabled,
        event_preferences,
        quiet_hours_enabled,
        frequency
    ) VALUES (
        p_user_id,
        p_dealer_id,
        p_module,
        true,  -- in_app_enabled
        false, -- email_enabled
        false, -- sms_enabled
        false, -- push_enabled
        v_default_event_prefs,
        false, -- quiet_hours_enabled
        'immediate'
    );

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.create_default_notification_preferences IS
    'Initializes default notification preferences for a user if they do not exist';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_notification_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_event_preference TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_recipients TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_in_quiet_hours TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_notification_preferences TO authenticated;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'ENTERPRISE NOTIFICATION SYSTEM - HELPER FUNCTIONS COMPLETED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Functions Created:';
    RAISE NOTICE '  ✓ get_user_notification_config - Get full notification config';
    RAISE NOTICE '  ✓ update_user_event_preference - Update specific event preference';
    RAISE NOTICE '  ✓ get_notification_recipients - Calculate recipients based on rules';
    RAISE NOTICE '  ✓ is_user_in_quiet_hours - Check quiet hours status';
    RAISE NOTICE '  ✓ check_user_rate_limit - Verify rate limits';
    RAISE NOTICE '  ✓ create_default_notification_preferences - Initialize defaults';
    RAISE NOTICE '';
    RAISE NOTICE 'All functions granted to authenticated users';
    RAISE NOTICE '======================================================================';
END $$;
