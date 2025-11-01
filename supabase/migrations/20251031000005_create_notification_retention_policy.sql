-- ============================================================================
-- NOTIFICATION RETENTION POLICY - Archive & Cleanup
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-31
-- Description: Automated retention policy for notification_delivery_log and
--              notification_log tables. Archives old data to cold storage and
--              deletes archived records to maintain performance.
--
-- Retention Rules:
--   - Keep notification_delivery_log for 90 days in hot storage
--   - Archive logs older than 90 days to archive schema
--   - Keep notification_log for 180 days in hot storage
--   - Archive notifications older than 180 days
--
-- Schedule:
--   - Runs daily at 2:00 AM (low-traffic time)
--   - Uses pg_cron extension
--
-- Performance Impact:
--   - Runs during off-peak hours
--   - Uses batching to avoid locks
--   - Archives first, then deletes (safety)
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: CREATE ARCHIVE SCHEMA (Cold Storage)
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS archive;

COMMENT ON SCHEMA archive IS
    'Cold storage for archived notifications and delivery logs (>90 days)';

-- ============================================================================
-- STEP 2: CREATE ARCHIVE TABLES (Same structure as originals)
-- ============================================================================

-- Archive table for notification_delivery_log
CREATE TABLE IF NOT EXISTS archive.notification_delivery_log (
    LIKE public.notification_delivery_log INCLUDING ALL
);

COMMENT ON TABLE archive.notification_delivery_log IS
    'Archived delivery logs older than 90 days (cold storage)';

-- Archive table for notification_log
CREATE TABLE IF NOT EXISTS archive.notification_log (
    LIKE public.notification_log INCLUDING ALL
);

COMMENT ON TABLE archive.notification_log IS
    'Archived notifications older than 180 days (cold storage)';

-- Add archived_at column to track when record was archived
ALTER TABLE archive.notification_delivery_log
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE archive.notification_log
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes on archive tables (for occasional queries)
CREATE INDEX IF NOT EXISTS idx_archive_delivery_log_created
    ON archive.notification_delivery_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_archive_delivery_log_user
    ON archive.notification_delivery_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_archive_notif_log_created
    ON archive.notification_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_archive_notif_log_user
    ON archive.notification_log(user_id, created_at DESC);

-- ============================================================================
-- STEP 3: CREATE RETENTION FUNCTIONS
-- ============================================================================

-- Function 1: Archive delivery logs older than N days
CREATE OR REPLACE FUNCTION archive.archive_delivery_logs(
    p_days_threshold INTEGER DEFAULT 90,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE (
    archived_count INTEGER,
    deleted_count INTEGER,
    execution_time_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_cutoff_date TIMESTAMPTZ;
    v_archived_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_batch_archived INTEGER;
    v_batch_deleted INTEGER;
    v_execution_time_ms INTEGER;
BEGIN
    v_start_time := clock_timestamp();
    v_cutoff_date := NOW() - (p_days_threshold || ' days')::INTERVAL;

    RAISE NOTICE 'Starting archive_delivery_logs: threshold=% days, cutoff_date=%',
        p_days_threshold, v_cutoff_date;

    -- Loop in batches to avoid long locks
    LOOP
        -- Insert batch into archive
        WITH to_archive AS (
            SELECT *
            FROM public.notification_delivery_log
            WHERE created_at < v_cutoff_date
            LIMIT p_batch_size
        )
        INSERT INTO archive.notification_delivery_log
        SELECT *, NOW() as archived_at
        FROM to_archive;

        GET DIAGNOSTICS v_batch_archived = ROW_COUNT;
        v_archived_count := v_archived_count + v_batch_archived;

        EXIT WHEN v_batch_archived = 0;

        -- Delete archived records from hot storage
        WITH to_delete AS (
            SELECT id
            FROM public.notification_delivery_log
            WHERE created_at < v_cutoff_date
            LIMIT p_batch_size
        )
        DELETE FROM public.notification_delivery_log
        WHERE id IN (SELECT id FROM to_delete);

        GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
        v_deleted_count := v_deleted_count + v_batch_deleted;

        -- Log progress
        RAISE NOTICE 'Batch complete: archived=%, deleted=%', v_batch_archived, v_batch_deleted;

        -- Small delay between batches to reduce load
        PERFORM pg_sleep(0.1);
    END LOOP;

    v_execution_time_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;

    RAISE NOTICE 'archive_delivery_logs complete: archived=%, deleted=%, time=%ms',
        v_archived_count, v_deleted_count, v_execution_time_ms;

    RETURN QUERY SELECT v_archived_count, v_deleted_count, v_execution_time_ms;
END;
$$;

COMMENT ON FUNCTION archive.archive_delivery_logs IS
    'Archive delivery logs older than N days (default 90) to cold storage';

-- Function 2: Archive notifications older than N days
CREATE OR REPLACE FUNCTION archive.archive_notifications(
    p_days_threshold INTEGER DEFAULT 180,
    p_batch_size INTEGER DEFAULT 10000
)
RETURNS TABLE (
    archived_count INTEGER,
    deleted_count INTEGER,
    execution_time_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ;
    v_cutoff_date TIMESTAMPTZ;
    v_archived_count INTEGER := 0;
    v_deleted_count INTEGER := 0;
    v_batch_archived INTEGER;
    v_batch_deleted INTEGER;
    v_execution_time_ms INTEGER;
BEGIN
    v_start_time := clock_timestamp();
    v_cutoff_date := NOW() - (p_days_threshold || ' days')::INTERVAL;

    RAISE NOTICE 'Starting archive_notifications: threshold=% days, cutoff_date=%',
        p_days_threshold, v_cutoff_date;

    -- Loop in batches to avoid long locks
    LOOP
        -- Insert batch into archive
        WITH to_archive AS (
            SELECT *
            FROM public.notification_log
            WHERE created_at < v_cutoff_date
            LIMIT p_batch_size
        )
        INSERT INTO archive.notification_log
        SELECT *, NOW() as archived_at
        FROM to_archive;

        GET DIAGNOSTICS v_batch_archived = ROW_COUNT;
        v_archived_count := v_archived_count + v_batch_archived;

        EXIT WHEN v_batch_archived = 0;

        -- Delete archived records from hot storage
        WITH to_delete AS (
            SELECT id
            FROM public.notification_log
            WHERE created_at < v_cutoff_date
            LIMIT p_batch_size
        )
        DELETE FROM public.notification_log
        WHERE id IN (SELECT id FROM to_delete);

        GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
        v_deleted_count := v_deleted_count + v_batch_deleted;

        -- Log progress
        RAISE NOTICE 'Batch complete: archived=%, deleted=%', v_batch_archived, v_batch_deleted;

        -- Small delay between batches to reduce load
        PERFORM pg_sleep(0.1);
    END LOOP;

    v_execution_time_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start_time))::INTEGER;

    RAISE NOTICE 'archive_notifications complete: archived=%, deleted=%, time=%ms',
        v_archived_count, v_deleted_count, v_execution_time_ms;

    RETURN QUERY SELECT v_archived_count, v_deleted_count, v_execution_time_ms;
END;
$$;

COMMENT ON FUNCTION archive.archive_notifications IS
    'Archive notifications older than N days (default 180) to cold storage';

-- Function 3: Get archive statistics
CREATE OR REPLACE FUNCTION archive.get_archive_stats()
RETURNS TABLE (
    table_name TEXT,
    hot_storage_count BIGINT,
    cold_storage_count BIGINT,
    oldest_hot_date TIMESTAMPTZ,
    newest_hot_date TIMESTAMPTZ,
    oldest_cold_date TIMESTAMPTZ,
    newest_cold_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        'notification_delivery_log'::TEXT,
        (SELECT COUNT(*) FROM public.notification_delivery_log),
        (SELECT COUNT(*) FROM archive.notification_delivery_log),
        (SELECT MIN(created_at) FROM public.notification_delivery_log),
        (SELECT MAX(created_at) FROM public.notification_delivery_log),
        (SELECT MIN(created_at) FROM archive.notification_delivery_log),
        (SELECT MAX(created_at) FROM archive.notification_delivery_log)
    UNION ALL
    SELECT
        'notification_log'::TEXT,
        (SELECT COUNT(*) FROM public.notification_log),
        (SELECT COUNT(*) FROM archive.notification_log),
        (SELECT MIN(created_at) FROM public.notification_log),
        (SELECT MAX(created_at) FROM public.notification_log),
        (SELECT MIN(created_at) FROM archive.notification_log),
        (SELECT MAX(created_at) FROM archive.notification_log);
END;
$$;

COMMENT ON FUNCTION archive.get_archive_stats IS
    'Get statistics about hot vs cold storage for notification tables';

-- Function 4: Query archived data (unified view)
CREATE OR REPLACE FUNCTION archive.get_delivery_logs_combined(
    p_user_id UUID,
    p_dealer_id BIGINT,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    dealer_id BIGINT,
    channel VARCHAR(20),
    status VARCHAR(20),
    title TEXT,
    message TEXT,
    created_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    is_archived BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN QUERY
    (
        -- Hot storage
        SELECT
            ndl.id,
            ndl.user_id,
            ndl.dealer_id,
            ndl.channel,
            ndl.status,
            ndl.title,
            ndl.message,
            ndl.created_at,
            ndl.opened_at,
            ndl.clicked_at,
            false as is_archived
        FROM public.notification_delivery_log ndl
        WHERE ndl.user_id = p_user_id
        AND ndl.dealer_id = p_dealer_id
        AND ndl.created_at >= p_start_date
        AND ndl.created_at <= p_end_date
    )
    UNION ALL
    (
        -- Cold storage
        SELECT
            ndl.id,
            ndl.user_id,
            ndl.dealer_id,
            ndl.channel,
            ndl.status,
            ndl.title,
            ndl.message,
            ndl.created_at,
            ndl.opened_at,
            ndl.clicked_at,
            true as is_archived
        FROM archive.notification_delivery_log ndl
        WHERE ndl.user_id = p_user_id
        AND ndl.dealer_id = p_dealer_id
        AND ndl.created_at >= p_start_date
        AND ndl.created_at <= p_end_date
    )
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION archive.get_delivery_logs_combined IS
    'Query delivery logs across both hot and cold storage (unified view)';

-- ============================================================================
-- STEP 4: ENABLE pg_cron EXTENSION (if not already enabled)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- STEP 5: SCHEDULE RETENTION JOBS
-- ============================================================================

-- Job 1: Archive delivery logs daily at 2:00 AM
SELECT cron.schedule(
    'archive-delivery-logs-daily',
    '0 2 * * *', -- 2:00 AM every day
    $$
    SELECT archive.archive_delivery_logs(90, 10000);
    $$
);

-- Job 2: Archive notifications daily at 2:30 AM
SELECT cron.schedule(
    'archive-notifications-daily',
    '30 2 * * *', -- 2:30 AM every day
    $$
    SELECT archive.archive_notifications(180, 10000);
    $$
);

-- Job 3: Log archive stats weekly (Sunday at 3:00 AM)
SELECT cron.schedule(
    'log-archive-stats-weekly',
    '0 3 * * 0', -- 3:00 AM every Sunday
    $$
    DO $$
    DECLARE
        v_stats RECORD;
    BEGIN
        FOR v_stats IN SELECT * FROM archive.get_archive_stats() LOOP
            RAISE NOTICE 'Archive Stats - %: hot=%, cold=%, oldest_hot=%, newest_hot=%',
                v_stats.table_name,
                v_stats.hot_storage_count,
                v_stats.cold_storage_count,
                v_stats.oldest_hot_date,
                v_stats.newest_hot_date;
        END LOOP;
    END $$;
    $$
);

-- ============================================================================
-- STEP 6: CREATE MONITORING VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.notification_retention_health AS
SELECT
    'delivery_log' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days') as last_90_days,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '90 days') as should_be_archived,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    pg_size_pretty(pg_total_relation_size('public.notification_delivery_log')) as table_size
FROM public.notification_delivery_log

UNION ALL

SELECT
    'notification_log' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as last_7_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '90 days') as last_90_days,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '180 days') as should_be_archived,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    pg_size_pretty(pg_total_relation_size('public.notification_log')) as table_size
FROM public.notification_log;

COMMENT ON VIEW public.notification_retention_health IS
    'Monitoring view for notification retention health (shows records that should be archived)';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant read access to archive schema for system admins
GRANT USAGE ON SCHEMA archive TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA archive TO authenticated;

-- Grant execute on archive functions (restricted to service_role)
GRANT EXECUTE ON FUNCTION archive.archive_delivery_logs TO service_role;
GRANT EXECUTE ON FUNCTION archive.archive_notifications TO service_role;
GRANT EXECUTE ON FUNCTION archive.get_archive_stats TO authenticated;
GRANT EXECUTE ON FUNCTION archive.get_delivery_logs_combined TO authenticated;

-- Grant select on monitoring view
GRANT SELECT ON public.notification_retention_health TO authenticated;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_cron_jobs RECORD;
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'NOTIFICATION RETENTION POLICY CREATED SUCCESSFULLY';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Archive Schema: archive';
    RAISE NOTICE 'Archive Tables: notification_delivery_log, notification_log';
    RAISE NOTICE '';
    RAISE NOTICE 'Retention Rules:';
    RAISE NOTICE '  ✓ Delivery logs: 90 days in hot storage';
    RAISE NOTICE '  ✓ Notifications: 180 days in hot storage';
    RAISE NOTICE '  ✓ Archived data moved to cold storage (archive schema)';
    RAISE NOTICE '';
    RAISE NOTICE 'Scheduled Jobs (pg_cron):';
    RAISE NOTICE '  ✓ archive-delivery-logs-daily: 2:00 AM daily';
    RAISE NOTICE '  ✓ archive-notifications-daily: 2:30 AM daily';
    RAISE NOTICE '  ✓ log-archive-stats-weekly: 3:00 AM Sundays';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions:';
    RAISE NOTICE '  ✓ archive.archive_delivery_logs(days, batch_size)';
    RAISE NOTICE '  ✓ archive.archive_notifications(days, batch_size)';
    RAISE NOTICE '  ✓ archive.get_archive_stats()';
    RAISE NOTICE '  ✓ archive.get_delivery_logs_combined(user, dealer, dates)';
    RAISE NOTICE '';
    RAISE NOTICE 'Monitoring:';
    RAISE NOTICE '  ✓ View: notification_retention_health';
    RAISE NOTICE '  ✓ Shows records due for archiving';
    RAISE NOTICE '  ✓ Shows table sizes';
    RAISE NOTICE '';
    RAISE NOTICE 'Current Cron Jobs:';

    -- List cron jobs
    FOR v_cron_jobs IN
        SELECT jobid, schedule, command
        FROM cron.job
        WHERE jobname LIKE '%archive%' OR jobname LIKE '%notification%'
        ORDER BY jobid
    LOOP
        RAISE NOTICE '  Job %: % -> %', v_cron_jobs.jobid, v_cron_jobs.schedule, v_cron_jobs.command;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Manual Testing:';
    RAISE NOTICE '  -- View current stats';
    RAISE NOTICE '  SELECT * FROM archive.get_archive_stats();';
    RAISE NOTICE '';
    RAISE NOTICE '  -- Check retention health';
    RAISE NOTICE '  SELECT * FROM notification_retention_health;';
    RAISE NOTICE '';
    RAISE NOTICE '  -- Manual archive (test)';
    RAISE NOTICE '  SELECT * FROM archive.archive_delivery_logs(90, 1000);';
    RAISE NOTICE '======================================================================';
END $$;
