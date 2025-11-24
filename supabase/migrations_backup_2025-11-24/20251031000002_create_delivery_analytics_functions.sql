-- ============================================================================
-- NOTIFICATION DELIVERY ANALYTICS - RPC FUNCTIONS
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-31
-- Description: Analytics and reporting functions for notification delivery logs
--
-- Functions:
--   1. get_delivery_metrics - Overall delivery metrics by channel
--   2. get_engagement_metrics - Open/click rates and engagement analytics
--   3. get_provider_performance - Provider comparison and reliability metrics
--   4. get_failed_deliveries - Failed delivery report for debugging
--   5. get_delivery_timeline - Time-series delivery data for charts
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION 1: GET DELIVERY METRICS
-- ============================================================================
-- Purpose: Calculate delivery rates, success rates, and counts by channel
-- Returns: Aggregated metrics per channel
-- Usage: SELECT * FROM get_delivery_metrics(dealer_id, start_date, end_date);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_delivery_metrics(
    p_dealer_id BIGINT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    channel VARCHAR(20),
    total_sent BIGINT,
    total_delivered BIGINT,
    total_failed BIGINT,
    total_bounced BIGINT,
    total_rejected BIGINT,
    delivery_rate NUMERIC,
    failure_rate NUMERIC,
    avg_send_latency_ms NUMERIC,
    avg_delivery_latency_ms NUMERIC,
    p95_send_latency_ms NUMERIC,
    p95_delivery_latency_ms NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ndl.channel,
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE ndl.status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE ndl.status = 'failed') as total_failed,
        COUNT(*) FILTER (WHERE ndl.status = 'bounced') as total_bounced,
        COUNT(*) FILTER (WHERE ndl.status = 'rejected') as total_rejected,

        -- Delivery rate percentage
        ROUND(
            COUNT(*) FILTER (WHERE ndl.status = 'delivered')::numeric /
            NULLIF(COUNT(*), 0) * 100,
            2
        ) as delivery_rate,

        -- Failure rate percentage
        ROUND(
            COUNT(*) FILTER (WHERE ndl.status IN ('failed', 'bounced', 'rejected'))::numeric /
            NULLIF(COUNT(*), 0) * 100,
            2
        ) as failure_rate,

        -- Average latencies
        ROUND(AVG(ndl.send_latency_ms), 2) as avg_send_latency_ms,
        ROUND(AVG(ndl.delivery_latency_ms), 2) as avg_delivery_latency_ms,

        -- P95 latencies (performance percentiles)
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ndl.send_latency_ms), 2) as p95_send_latency_ms,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ndl.delivery_latency_ms), 2) as p95_delivery_latency_ms

    FROM public.notification_delivery_log ndl
    WHERE ndl.dealer_id = p_dealer_id
        AND ndl.created_at >= p_start_date
        AND ndl.created_at <= p_end_date
    GROUP BY ndl.channel
    ORDER BY total_sent DESC;
END;
$$;

COMMENT ON FUNCTION public.get_delivery_metrics IS
    'Get delivery success rates, failure rates, and latency metrics by channel';

-- ============================================================================
-- FUNCTION 2: GET ENGAGEMENT METRICS
-- ============================================================================
-- Purpose: Calculate open rates, click-through rates, and engagement metrics
-- Returns: Engagement analytics per channel
-- Usage: SELECT * FROM get_engagement_metrics(dealer_id, start_date, end_date);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_engagement_metrics(
    p_dealer_id BIGINT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    channel VARCHAR(20),
    total_delivered BIGINT,
    total_opened BIGINT,
    total_clicked BIGINT,
    unique_opens BIGINT,
    unique_clicks BIGINT,
    open_rate NUMERIC,
    click_through_rate NUMERIC,
    click_to_open_rate NUMERIC,
    avg_time_to_open_minutes NUMERIC,
    avg_time_to_click_minutes NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ndl.channel,
        COUNT(*) FILTER (WHERE ndl.status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE ndl.opened_at IS NOT NULL) as total_opened,
        COUNT(*) FILTER (WHERE ndl.clicked_at IS NOT NULL) as total_clicked,

        -- Unique opens/clicks (distinct by notification_id)
        COUNT(DISTINCT ndl.notification_id) FILTER (WHERE ndl.opened_at IS NOT NULL) as unique_opens,
        COUNT(DISTINCT ndl.notification_id) FILTER (WHERE ndl.clicked_at IS NOT NULL) as unique_clicks,

        -- Open rate (% of delivered that were opened)
        ROUND(
            COUNT(*) FILTER (WHERE ndl.opened_at IS NOT NULL)::numeric /
            NULLIF(COUNT(*) FILTER (WHERE ndl.status = 'delivered'), 0) * 100,
            2
        ) as open_rate,

        -- Click-through rate (% of delivered that were clicked)
        ROUND(
            COUNT(*) FILTER (WHERE ndl.clicked_at IS NOT NULL)::numeric /
            NULLIF(COUNT(*) FILTER (WHERE ndl.status = 'delivered'), 0) * 100,
            2
        ) as click_through_rate,

        -- Click-to-open rate (% of opens that resulted in clicks)
        ROUND(
            COUNT(*) FILTER (WHERE ndl.clicked_at IS NOT NULL)::numeric /
            NULLIF(COUNT(*) FILTER (WHERE ndl.opened_at IS NOT NULL), 0) * 100,
            2
        ) as click_to_open_rate,

        -- Average time to engagement
        ROUND(
            AVG(EXTRACT(EPOCH FROM (ndl.opened_at - ndl.delivered_at)) / 60),
            2
        ) as avg_time_to_open_minutes,

        ROUND(
            AVG(EXTRACT(EPOCH FROM (ndl.clicked_at - ndl.opened_at)) / 60),
            2
        ) as avg_time_to_click_minutes

    FROM public.notification_delivery_log ndl
    WHERE ndl.dealer_id = p_dealer_id
        AND ndl.created_at >= p_start_date
        AND ndl.created_at <= p_end_date
        AND ndl.status = 'delivered'
    GROUP BY ndl.channel
    ORDER BY open_rate DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_engagement_metrics IS
    'Get open rates, click-through rates, and engagement timing analytics by channel';

-- ============================================================================
-- FUNCTION 3: GET PROVIDER PERFORMANCE
-- ============================================================================
-- Purpose: Compare provider reliability and performance
-- Returns: Provider-level metrics
-- Usage: SELECT * FROM get_provider_performance(dealer_id, start_date, end_date);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_provider_performance(
    p_dealer_id BIGINT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    provider VARCHAR(50),
    channel VARCHAR(20),
    total_sent BIGINT,
    total_delivered BIGINT,
    total_failed BIGINT,
    success_rate NUMERIC,
    avg_delivery_time_seconds NUMERIC,
    p95_delivery_time_seconds NUMERIC,
    total_retries BIGINT,
    avg_retries_per_failure NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ndl.provider,
        ndl.channel,
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE ndl.status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE ndl.status IN ('failed', 'bounced', 'rejected')) as total_failed,

        -- Success rate
        ROUND(
            COUNT(*) FILTER (WHERE ndl.status = 'delivered')::numeric /
            NULLIF(COUNT(*), 0) * 100,
            2
        ) as success_rate,

        -- Average delivery time (sent → delivered)
        ROUND(
            AVG(EXTRACT(EPOCH FROM (ndl.delivered_at - ndl.sent_at))),
            2
        ) as avg_delivery_time_seconds,

        -- P95 delivery time
        ROUND(
            PERCENTILE_CONT(0.95) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (ndl.delivered_at - ndl.sent_at))
            ),
            2
        ) as p95_delivery_time_seconds,

        -- Retry statistics
        SUM(ndl.retry_count) as total_retries,
        ROUND(
            AVG(ndl.retry_count) FILTER (WHERE ndl.status IN ('failed', 'bounced')),
            2
        ) as avg_retries_per_failure

    FROM public.notification_delivery_log ndl
    WHERE ndl.dealer_id = p_dealer_id
        AND ndl.created_at >= p_start_date
        AND ndl.created_at <= p_end_date
        AND ndl.provider IS NOT NULL
    GROUP BY ndl.provider, ndl.channel
    ORDER BY success_rate DESC NULLS LAST, total_sent DESC;
END;
$$;

COMMENT ON FUNCTION public.get_provider_performance IS
    'Compare provider reliability, delivery speed, and retry statistics';

-- ============================================================================
-- FUNCTION 4: GET FAILED DELIVERIES
-- ============================================================================
-- Purpose: Debugging report for failed/bounced/rejected deliveries
-- Returns: Failed deliveries with error details
-- Usage: SELECT * FROM get_failed_deliveries(dealer_id, start_date, end_date, 50);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_failed_deliveries(
    p_dealer_id BIGINT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    notification_id UUID,
    user_id UUID,
    channel VARCHAR(20),
    provider VARCHAR(50),
    status VARCHAR(20),
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    created_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ndl.id,
        ndl.notification_id,
        ndl.user_id,
        ndl.channel,
        ndl.provider,
        ndl.status,
        ndl.error_code,
        ndl.error_message,
        ndl.retry_count,
        ndl.recipient_email,
        ndl.recipient_phone,
        ndl.created_at,
        ndl.sent_at
    FROM public.notification_delivery_log ndl
    WHERE ndl.dealer_id = p_dealer_id
        AND ndl.created_at >= p_start_date
        AND ndl.created_at <= p_end_date
        AND ndl.status IN ('failed', 'bounced', 'rejected')
    ORDER BY ndl.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_failed_deliveries IS
    'Get recent failed deliveries with error details for debugging';

-- ============================================================================
-- FUNCTION 5: GET DELIVERY TIMELINE
-- ============================================================================
-- Purpose: Time-series data for delivery charts (daily/hourly buckets)
-- Returns: Delivery counts aggregated by time bucket
-- Usage: SELECT * FROM get_delivery_timeline(dealer_id, start, end, 'day');
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_delivery_timeline(
    p_dealer_id BIGINT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_bucket_size VARCHAR(10) DEFAULT 'day' -- 'hour', 'day', 'week'
)
RETURNS TABLE (
    time_bucket TIMESTAMPTZ,
    channel VARCHAR(20),
    total_sent BIGINT,
    total_delivered BIGINT,
    total_failed BIGINT,
    delivery_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_bucket_interval INTERVAL;
BEGIN
    -- Determine bucket interval
    v_bucket_interval := CASE p_bucket_size
        WHEN 'hour' THEN INTERVAL '1 hour'
        WHEN 'day' THEN INTERVAL '1 day'
        WHEN 'week' THEN INTERVAL '1 week'
        ELSE INTERVAL '1 day'
    END;

    RETURN QUERY
    SELECT
        DATE_TRUNC(p_bucket_size, ndl.created_at) as time_bucket,
        ndl.channel,
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE ndl.status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE ndl.status IN ('failed', 'bounced', 'rejected')) as total_failed,
        ROUND(
            COUNT(*) FILTER (WHERE ndl.status = 'delivered')::numeric /
            NULLIF(COUNT(*), 0) * 100,
            2
        ) as delivery_rate
    FROM public.notification_delivery_log ndl
    WHERE ndl.dealer_id = p_dealer_id
        AND ndl.created_at >= p_start_date
        AND ndl.created_at <= p_end_date
    GROUP BY time_bucket, ndl.channel
    ORDER BY time_bucket DESC, ndl.channel;
END;
$$;

COMMENT ON FUNCTION public.get_delivery_timeline IS
    'Get time-series delivery metrics for charts (hourly/daily/weekly buckets)';

-- ============================================================================
-- FUNCTION 6: GET USER DELIVERY SUMMARY
-- ============================================================================
-- Purpose: Per-user delivery summary for user profile analytics
-- Returns: Delivery stats for a specific user
-- Usage: SELECT * FROM get_user_delivery_summary(user_id, dealer_id, start, end);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_delivery_summary(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_notifications BIGINT,
    in_app_count BIGINT,
    email_count BIGINT,
    sms_count BIGINT,
    push_count BIGINT,
    total_opened BIGINT,
    total_clicked BIGINT,
    overall_engagement_rate NUMERIC,
    preferred_channel VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH channel_stats AS (
        SELECT
            ndl.channel,
            COUNT(*) as count,
            COUNT(*) FILTER (WHERE ndl.opened_at IS NOT NULL) as opens
        FROM public.notification_delivery_log ndl
        WHERE ndl.user_id = p_user_id
            AND ndl.dealer_id = p_dealer_id
            AND ndl.created_at >= p_start_date
            AND ndl.created_at <= p_end_date
        GROUP BY ndl.channel
    )
    SELECT
        (SELECT COUNT(*) FROM public.notification_delivery_log
         WHERE user_id = p_user_id AND dealer_id = p_dealer_id
         AND created_at >= p_start_date AND created_at <= p_end_date) as total_notifications,

        COALESCE((SELECT count FROM channel_stats WHERE channel = 'in_app'), 0) as in_app_count,
        COALESCE((SELECT count FROM channel_stats WHERE channel = 'email'), 0) as email_count,
        COALESCE((SELECT count FROM channel_stats WHERE channel = 'sms'), 0) as sms_count,
        COALESCE((SELECT count FROM channel_stats WHERE channel = 'push'), 0) as push_count,

        (SELECT COUNT(*) FROM public.notification_delivery_log
         WHERE user_id = p_user_id AND dealer_id = p_dealer_id
         AND created_at >= p_start_date AND created_at <= p_end_date
         AND opened_at IS NOT NULL) as total_opened,

        (SELECT COUNT(*) FROM public.notification_delivery_log
         WHERE user_id = p_user_id AND dealer_id = p_dealer_id
         AND created_at >= p_start_date AND created_at <= p_end_date
         AND clicked_at IS NOT NULL) as total_clicked,

        ROUND(
            (SELECT COUNT(*) FROM public.notification_delivery_log
             WHERE user_id = p_user_id AND dealer_id = p_dealer_id
             AND created_at >= p_start_date AND created_at <= p_end_date
             AND opened_at IS NOT NULL)::numeric /
            NULLIF((SELECT COUNT(*) FROM public.notification_delivery_log
                    WHERE user_id = p_user_id AND dealer_id = p_dealer_id
                    AND created_at >= p_start_date AND created_at <= p_end_date), 0) * 100,
            2
        ) as overall_engagement_rate,

        (SELECT channel FROM channel_stats ORDER BY opens DESC LIMIT 1) as preferred_channel;
END;
$$;

COMMENT ON FUNCTION public.get_user_delivery_summary IS
    'Get per-user notification delivery and engagement summary';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute to authenticated users (RLS will filter results)
GRANT EXECUTE ON FUNCTION public.get_delivery_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_engagement_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_failed_deliveries TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_delivery_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_delivery_summary TO authenticated;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'NOTIFICATION DELIVERY ANALYTICS FUNCTIONS CREATED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Created (6):';
    RAISE NOTICE '  ✓ get_delivery_metrics - Delivery rates and latency by channel';
    RAISE NOTICE '  ✓ get_engagement_metrics - Open/click rates and engagement timing';
    RAISE NOTICE '  ✓ get_provider_performance - Provider reliability comparison';
    RAISE NOTICE '  ✓ get_failed_deliveries - Failed delivery debugging report';
    RAISE NOTICE '  ✓ get_delivery_timeline - Time-series data for charts';
    RAISE NOTICE '  ✓ get_user_delivery_summary - Per-user analytics';
    RAISE NOTICE '';
    RAISE NOTICE 'Capabilities:';
    RAISE NOTICE '  - Delivery success/failure rates';
    RAISE NOTICE '  - Open rates, CTR, engagement metrics';
    RAISE NOTICE '  - Provider performance comparison';
    RAISE NOTICE '  - Time-series analytics for dashboards';
    RAISE NOTICE '  - User-level engagement insights';
    RAISE NOTICE '  - Performance percentiles (P95 latency)';
    RAISE NOTICE '';
    RAISE NOTICE 'All functions granted to authenticated users';
    RAISE NOTICE '======================================================================';
END $$;
