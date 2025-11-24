-- ============================================================================
-- HELPER FUNCTIONS (MINIMAL VERSION - Critical functions only)
-- ============================================================================

BEGIN;

-- FUNCTION 1: Get user notification config (CRITICAL)
CREATE OR REPLACE FUNCTION public.get_user_notification_config(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_module VARCHAR(50)
)
RETURNS TABLE (
    in_app_enabled BOOLEAN,
    email_enabled BOOLEAN,
    sms_enabled BOOLEAN,
    push_enabled BOOLEAN,
    event_preferences JSONB,
    quiet_hours_enabled BOOLEAN,
    phone_number_override VARCHAR(20),
    config_exists BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(unp.in_app_enabled, true),
        COALESCE(unp.email_enabled, false),
        COALESCE(unp.sms_enabled, false),
        COALESCE(unp.push_enabled, false),
        COALESCE(unp.event_preferences, '{}'::jsonb),
        COALESCE(unp.quiet_hours_enabled, false),
        unp.phone_number_override,
        (unp.id IS NOT NULL) AS config_exists
    FROM public.user_notification_preferences_universal unp
    WHERE unp.user_id = p_user_id
      AND unp.dealer_id = p_dealer_id
      AND unp.module = p_module;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            true AS in_app_enabled,
            false AS email_enabled,
            false AS sms_enabled,
            false AS push_enabled,
            '{}'::jsonb AS event_preferences,
            false AS quiet_hours_enabled,
            NULL::VARCHAR(20) AS phone_number_override,
            false AS config_exists;
    END IF;
END;
$$;

-- FUNCTION 2: Create default preferences (CRITICAL)
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_module VARCHAR(50)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pref_id UUID;
BEGIN
    INSERT INTO public.user_notification_preferences_universal (
        user_id,
        dealer_id,
        module,
        in_app_enabled,
        email_enabled,
        sms_enabled,
        push_enabled
    ) VALUES (
        p_user_id,
        p_dealer_id,
        p_module,
        true,
        false,
        false,
        false
    )
    ON CONFLICT (user_id, dealer_id, module) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_pref_id;

    RETURN v_pref_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_notification_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_notification_preferences TO authenticated;

COMMIT;
