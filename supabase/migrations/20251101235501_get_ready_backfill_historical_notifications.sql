-- ============================================================================
-- GET READY HISTORICAL BACKFILL - Migrate Existing Notifications
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-11-01
-- Purpose: Backfill existing get_ready_notifications into notification_log
--
-- IMPORTANT: This is OPTIONAL and should be run AFTER the dual-write trigger
--            is verified working correctly (20251101235500_get_ready_dual_write_trigger.sql)
--
-- Use Case:
--   - Migrate historical Get Ready notifications to unified notification_log
--   - Ensure complete notification history in single table
--   - Enable unified reporting and analytics
--
-- Safety Features:
--   - Uses INSERT ... ON CONFLICT DO NOTHING (idempotent)
--   - Same UUID preservation for correlation
--   - Progress tracking with DO blocks
--   - Can be run multiple times safely
--   - Does NOT modify get_ready_notifications
--
-- Timing:
--   - Run during low-traffic period
--   - Estimated time: ~100ms per 1000 notifications
--   - Consider batching for very large datasets (>100k notifications)
-- ============================================================================

BEGIN;

-- ============================================================================
-- BACKFILL FUNCTION (Reusable for batch processing)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.backfill_get_ready_notifications_batch(
  p_batch_size INTEGER DEFAULT 1000,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  total_processed BIGINT,
  successfully_inserted BIGINT,
  already_existed BIGINT,
  batch_start TIMESTAMPTZ,
  batch_end TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
  v_inserted_count BIGINT;
BEGIN
  v_start_time := clock_timestamp();

  -- Insert batch from get_ready_notifications to notification_log
  WITH batch AS (
    SELECT
      grn.id,
      grn.dealer_id,
      grn.user_id,
      grn.notification_type,
      grn.priority,
      grn.title,
      grn.message,
      grn.action_url,
      grn.action_label,
      grn.related_vehicle_id,
      grn.related_step_id,
      grn.related_work_item_id,
      grn.metadata,
      grn.created_at
    FROM public.get_ready_notifications grn
    ORDER BY grn.created_at ASC
    LIMIT p_batch_size
    OFFSET p_offset
  ),
  inserted AS (
    INSERT INTO public.notification_log (
      id,
      user_id,
      dealer_id,
      module,
      event,
      entity_type,
      entity_id,
      thread_id,
      title,
      message,
      action_url,
      action_label,
      priority,
      is_read,
      is_dismissed,
      target_channels,
      metadata,
      created_at
    )
    SELECT
      b.id,
      b.user_id,
      b.dealer_id,
      'get_ready'::VARCHAR(50),
      b.notification_type::text,
      'get_ready_vehicle'::VARCHAR(50),
      b.related_vehicle_id::TEXT,
      CASE
        WHEN b.related_vehicle_id IS NOT NULL THEN 'vehicle_' || b.related_vehicle_id::TEXT
        ELSE NULL
      END,
      b.title,
      b.message,
      b.action_url,
      b.action_label,
      CASE b.priority
        WHEN 'low' THEN 'low'
        WHEN 'medium' THEN 'normal'
        WHEN 'high' THEN 'high'
        WHEN 'critical' THEN 'critical'
        ELSE 'normal'
      END,
      false,  -- is_read
      false,  -- is_dismissed
      '["in_app"]'::jsonb,
      jsonb_build_object(
        'source', 'get_ready_notifications',
        'original_priority', b.priority::text,
        'related_step_id', b.related_step_id,
        'related_work_item_id', b.related_work_item_id,
        'original_metadata', b.metadata,
        'backfilled', true,
        'backfill_timestamp', NOW()
      ),
      b.created_at
    FROM batch b
    ON CONFLICT (id) DO NOTHING  -- Skip if already exists
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted_count FROM inserted;

  v_end_time := clock_timestamp();

  -- Return statistics
  RETURN QUERY
  SELECT
    p_batch_size::BIGINT as total_processed,
    v_inserted_count as successfully_inserted,
    (p_batch_size - v_inserted_count)::BIGINT as already_existed,
    v_start_time as batch_start,
    v_end_time as batch_end;
END;
$$;

COMMENT ON FUNCTION public.backfill_get_ready_notifications_batch IS
  'Backfill historical Get Ready notifications to notification_log in batches. '
  'Idempotent - uses ON CONFLICT DO NOTHING to skip existing records.';

-- ============================================================================
-- FULL BACKFILL EXECUTION
-- ============================================================================

DO $$
DECLARE
  v_total_notifications BIGINT;
  v_already_migrated BIGINT;
  v_to_migrate BIGINT;
  v_batch_size INTEGER := 1000;
  v_current_offset INTEGER := 0;
  v_batch_result RECORD;
  v_total_inserted BIGINT := 0;
  v_total_skipped BIGINT := 0;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  v_start_time := clock_timestamp();

  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'GET READY NOTIFICATIONS HISTORICAL BACKFILL';
  RAISE NOTICE '======================================================================';
  RAISE NOTICE '';

  -- Count total notifications
  SELECT COUNT(*) INTO v_total_notifications
  FROM public.get_ready_notifications;

  RAISE NOTICE 'Total Get Ready notifications: %', v_total_notifications;

  -- Count already migrated
  SELECT COUNT(*) INTO v_already_migrated
  FROM public.notification_log
  WHERE module = 'get_ready';

  RAISE NOTICE 'Already in notification_log: %', v_already_migrated;

  -- Calculate to migrate
  v_to_migrate := v_total_notifications - v_already_migrated;
  RAISE NOTICE 'To migrate: %', v_to_migrate;
  RAISE NOTICE '';

  -- Exit early if nothing to migrate
  IF v_to_migrate <= 0 THEN
    RAISE NOTICE 'Status: ✅ All notifications already migrated';
    RAISE NOTICE 'No backfill needed - skipping batch processing';
    RAISE NOTICE '======================================================================';
    RETURN;
  END IF;

  RAISE NOTICE 'Starting batch processing...';
  RAISE NOTICE 'Batch size: %', v_batch_size;
  RAISE NOTICE '';

  -- Process in batches
  LOOP
    -- Process batch
    SELECT * INTO v_batch_result
    FROM public.backfill_get_ready_notifications_batch(v_batch_size, v_current_offset);

    -- Accumulate statistics
    v_total_inserted := v_total_inserted + v_batch_result.successfully_inserted;
    v_total_skipped := v_total_skipped + v_batch_result.already_existed;

    -- Progress report
    RAISE NOTICE 'Batch % complete: % inserted, % skipped (offset: %)',
      (v_current_offset / v_batch_size) + 1,
      v_batch_result.successfully_inserted,
      v_batch_result.already_existed,
      v_current_offset;

    -- Move to next batch
    v_current_offset := v_current_offset + v_batch_size;

    -- Exit if no more records
    EXIT WHEN v_batch_result.successfully_inserted = 0 AND v_batch_result.already_existed = 0;

    -- Safety check: prevent infinite loop
    IF v_current_offset > v_total_notifications + v_batch_size THEN
      EXIT;
    END IF;
  END LOOP;

  v_end_time := clock_timestamp();

  RAISE NOTICE '';
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'BACKFILL COMPLETE';
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'Total notifications processed: %', v_total_notifications;
  RAISE NOTICE 'Successfully migrated: %', v_total_inserted;
  RAISE NOTICE 'Already existed (skipped): %', v_total_skipped;
  RAISE NOTICE 'Duration: %', v_end_time - v_start_time;
  RAISE NOTICE '';

  -- Verification query
  RAISE NOTICE 'Post-backfill counts:';
  RAISE NOTICE '  get_ready_notifications: %', v_total_notifications;

  SELECT COUNT(*) INTO v_already_migrated
  FROM public.notification_log
  WHERE module = 'get_ready';
  RAISE NOTICE '  notification_log (get_ready): %', v_already_migrated;

  IF v_total_notifications = v_already_migrated THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Status: ✅ PERFECT MATCH - All notifications migrated';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE 'Status: ⚠️  COUNT MISMATCH';
    RAISE NOTICE 'Difference: %', v_total_notifications - v_already_migrated;
    RAISE NOTICE 'This may indicate:';
    RAISE NOTICE '  - Foreign key violations (missing dealers/users)';
    RAISE NOTICE '  - Constraint violations (invalid data)';
    RAISE NOTICE '  - Check PostgreSQL logs for details';
  END IF;

  RAISE NOTICE '======================================================================';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify backfill completeness
DO $$
DECLARE
  v_missing_count BIGINT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '======================================================================';
  RAISE NOTICE 'BACKFILL VERIFICATION';
  RAISE NOTICE '======================================================================';

  -- Find any notifications that failed to migrate
  SELECT COUNT(*) INTO v_missing_count
  FROM public.get_ready_notifications grn
  LEFT JOIN public.notification_log nl ON grn.id = nl.id
  WHERE nl.id IS NULL;

  IF v_missing_count > 0 THEN
    RAISE WARNING 'Found % notifications not migrated', v_missing_count;
    RAISE NOTICE 'Run this query to investigate:';
    RAISE NOTICE '  SELECT grn.* FROM get_ready_notifications grn';
    RAISE NOTICE '  LEFT JOIN notification_log nl ON grn.id = nl.id';
    RAISE NOTICE '  WHERE nl.id IS NULL;';
  ELSE
    RAISE NOTICE '✅ All notifications successfully migrated';
  END IF;

  RAISE NOTICE '';

  -- Priority distribution comparison
  RAISE NOTICE 'Priority distribution verification:';
  RAISE NOTICE '  (Checking if priority mapping preserved distribution)';
  RAISE NOTICE '';

  -- This will be compared visually
  FOR rec IN
    SELECT
      'get_ready_notifications' as source,
      priority,
      COUNT(*) as count
    FROM public.get_ready_notifications
    GROUP BY priority
    UNION ALL
    SELECT
      'notification_log' as source,
      CASE priority
        WHEN 'low' THEN 'low'
        WHEN 'normal' THEN 'medium'
        WHEN 'high' THEN 'high'
        WHEN 'critical' THEN 'critical'
        ELSE priority
      END as priority,
      COUNT(*) as count
    FROM public.notification_log
    WHERE module = 'get_ready'
    GROUP BY
      CASE priority
        WHEN 'low' THEN 'low'
        WHEN 'normal' THEN 'medium'
        WHEN 'high' THEN 'high'
        WHEN 'critical' THEN 'critical'
        ELSE priority
      END
    ORDER BY source, priority
  LOOP
    RAISE NOTICE '  % | Priority: % | Count: %', rec.source, rec.priority, rec.count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '======================================================================';
END $$;

COMMIT;

-- ============================================================================
-- POST-BACKFILL CLEANUP (OPTIONAL)
-- ============================================================================

-- Drop backfill function if not needed for future use
-- Uncomment if you want to clean up:

-- DROP FUNCTION IF EXISTS public.backfill_get_ready_notifications_batch(INTEGER, INTEGER);

-- ============================================================================
-- MANUAL VERIFICATION QUERIES (Run after backfill)
-- ============================================================================

-- Query 1: Sample comparison
-- SELECT
--   grn.id,
--   grn.title as original_title,
--   nl.title as migrated_title,
--   grn.priority as original_priority,
--   nl.priority as migrated_priority,
--   grn.created_at as original_created,
--   nl.created_at as migrated_created
-- FROM get_ready_notifications grn
-- JOIN notification_log nl ON grn.id = nl.id
-- LIMIT 10;

-- Query 2: Find unmigrated notifications
-- SELECT
--   grn.id,
--   grn.title,
--   grn.notification_type,
--   grn.priority,
--   grn.dealer_id,
--   grn.user_id,
--   grn.created_at,
--   'Not migrated' as status
-- FROM get_ready_notifications grn
-- LEFT JOIN notification_log nl ON grn.id = nl.id
-- WHERE nl.id IS NULL;

-- Query 3: Count by day comparison
-- SELECT
--   DATE(grn.created_at) as date,
--   COUNT(grn.id) as get_ready_count,
--   COUNT(nl.id) as notification_log_count,
--   COUNT(grn.id) = COUNT(nl.id) as perfect_match
-- FROM get_ready_notifications grn
-- LEFT JOIN notification_log nl ON grn.id = nl.id
-- GROUP BY DATE(grn.created_at)
-- ORDER BY date DESC
-- LIMIT 30;

-- Query 4: Metadata verification
-- SELECT
--   id,
--   title,
--   metadata->>'source' as source,
--   metadata->>'original_priority' as original_priority,
--   (metadata->>'backfilled')::boolean as was_backfilled,
--   metadata->>'backfill_timestamp' as backfill_time
-- FROM notification_log
-- WHERE module = 'get_ready'
-- ORDER BY created_at DESC
-- LIMIT 10;
