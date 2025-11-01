-- ============================================================================
-- UPDATE RATE LIMIT FUNCTION - Use notification_delivery_log
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-31
-- Description: Update check_user_rate_limit function to use the new
--              notification_delivery_log table for accurate rate limiting
-- ============================================================================

BEGIN;

-- Drop the existing placeholder function
DROP FUNCTION IF EXISTS public.check_user_rate_limit(UUID, BIGINT, VARCHAR, VARCHAR);

-- ============================================================================
-- FUNCTION: check_user_rate_limit (UPDATED)
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

    -- If no rate limits configured, allow (fail open for better UX)
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

    -- Count notifications sent in last hour
    SELECT COUNT(*)
    INTO v_count_last_hour
    FROM public.notification_delivery_log
    WHERE user_id = p_user_id
    AND dealer_id = p_dealer_id
    AND channel = p_channel
    AND created_at >= NOW() - INTERVAL '1 hour'
    AND status NOT IN ('failed', 'bounced', 'rejected'); -- Only count successful/pending

    -- Count notifications sent in last day
    SELECT COUNT(*)
    INTO v_count_last_day
    FROM public.notification_delivery_log
    WHERE user_id = p_user_id
    AND dealer_id = p_dealer_id
    AND channel = p_channel
    AND created_at >= NOW() - INTERVAL '1 day'
    AND status NOT IN ('failed', 'bounced', 'rejected');

    -- Check hourly limit
    IF v_max_per_hour IS NOT NULL AND v_count_last_hour >= v_max_per_hour THEN
        RAISE NOTICE 'Rate limit exceeded: user % hit %/hour limit for % (current: %)',
            p_user_id, v_max_per_hour, p_channel, v_count_last_hour;
        RETURN false;
    END IF;

    -- Check daily limit
    IF v_max_per_day IS NOT NULL AND v_count_last_day >= v_max_per_day THEN
        RAISE NOTICE 'Rate limit exceeded: user % hit %/day limit for % (current: %)',
            p_user_id, v_max_per_day, p_channel, v_count_last_day;
        RETURN false;
    END IF;

    -- Under limits
    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.check_user_rate_limit IS
    'Verifies user has not exceeded rate limits for a specific notification channel using notification_delivery_log';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.check_user_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_rate_limit TO service_role;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'RATE LIMIT FUNCTION UPDATED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ check_user_rate_limit now uses notification_delivery_log';
    RAISE NOTICE '✓ Counts deliveries in last hour/day per channel';
    RAISE NOTICE '✓ Excludes failed/bounced/rejected from count';
    RAISE NOTICE '✓ Provides detailed NOTICE messages when limits exceeded';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for production use';
    RAISE NOTICE '======================================================================';
END $$;
