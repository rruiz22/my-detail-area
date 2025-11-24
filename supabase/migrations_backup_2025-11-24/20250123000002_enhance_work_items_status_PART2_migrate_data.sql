-- ============================================================================
-- Migration: Enhanced Work Items Status System - PART 2 of 2
-- Description: Migrate existing data to new status values
-- Author: Claude Code
-- Date: 2025-01-23
-- Version: 1.2.0 (Two-Part Migration - Part 2)
-- ============================================================================
--
-- CRITICAL: This is Part 2 of a 2-part migration
-- MUST run AFTER Part 1 has been committed
--
-- EXECUTION ORDER:
--   1. Ensure Part 1 completed successfully
--   2. Run this script (Part 2) - Migrates data to new ENUM values
--
-- MIGRATION STRATEGY:
--   pending + approval_required=true  → awaiting_approval
--   pending + approval_required=false → ready
--   declined                          → rejected
--   in_progress                       → in_progress (no change)
--   completed                         → completed (no change)
--
-- VERIFICATION:
--   - Counts records before and after migration
--   - Verifies no orphaned statuses remain
--   - Provides detailed migration statistics
-- ============================================================================

-- Log migration start
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Work Items Status Migration';
    RAISE NOTICE 'Part 2 of 2: Data Migration';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '========================================';
END $$;

-- Count records before migration
DO $$
DECLARE
    total_records INTEGER;
    pending_count INTEGER;
    in_progress_count INTEGER;
    completed_count INTEGER;
    declined_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM get_ready_work_items;
    SELECT COUNT(*) INTO pending_count FROM get_ready_work_items WHERE status = 'pending';
    SELECT COUNT(*) INTO in_progress_count FROM get_ready_work_items WHERE status = 'in_progress';
    SELECT COUNT(*) INTO completed_count FROM get_ready_work_items WHERE status = 'completed';
    SELECT COUNT(*) INTO declined_count FROM get_ready_work_items WHERE status = 'declined';

    RAISE NOTICE 'Pre-Migration Status Counts:';
    RAISE NOTICE '  Total Records: %', total_records;
    RAISE NOTICE '  pending: %', pending_count;
    RAISE NOTICE '  in_progress: %', in_progress_count;
    RAISE NOTICE '  completed: %', completed_count;
    RAISE NOTICE '  declined: %', declined_count;
    RAISE NOTICE '';
END $$;

-- Migration 1: pending + approval_required=true → awaiting_approval
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE get_ready_work_items
    SET
        status = 'awaiting_approval'::work_item_status,
        updated_at = NOW()
    WHERE
        status = 'pending'
        AND approval_required = true
        AND (approval_status IS NULL OR approval_status != 'approved');

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Migration Step 1: % work items moved from pending to awaiting_approval', affected_rows;
END $$;

-- Migration 2: pending + approval_required=false OR approved → ready
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE get_ready_work_items
    SET
        status = 'ready'::work_item_status,
        updated_at = NOW()
    WHERE
        status = 'pending'
        AND (
            approval_required = false
            OR approval_status = 'approved'
        );

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Migration Step 2: % work items moved from pending to ready', affected_rows;
END $$;

-- Migration 3: declined → rejected
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE get_ready_work_items
    SET
        status = 'rejected'::work_item_status,
        updated_at = NOW()
    WHERE
        status = 'declined';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Migration Step 3: % work items moved from declined to rejected', affected_rows;
    RAISE NOTICE '';
END $$;

-- Count records after migration
DO $$
DECLARE
    total_records INTEGER;
    awaiting_approval_count INTEGER;
    rejected_count INTEGER;
    ready_count INTEGER;
    scheduled_count INTEGER;
    in_progress_count INTEGER;
    on_hold_count INTEGER;
    blocked_count INTEGER;
    completed_count INTEGER;
    cancelled_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_records FROM get_ready_work_items;
    SELECT COUNT(*) INTO awaiting_approval_count FROM get_ready_work_items WHERE status = 'awaiting_approval';
    SELECT COUNT(*) INTO rejected_count FROM get_ready_work_items WHERE status = 'rejected';
    SELECT COUNT(*) INTO ready_count FROM get_ready_work_items WHERE status = 'ready';
    SELECT COUNT(*) INTO scheduled_count FROM get_ready_work_items WHERE status = 'scheduled';
    SELECT COUNT(*) INTO in_progress_count FROM get_ready_work_items WHERE status = 'in_progress';
    SELECT COUNT(*) INTO on_hold_count FROM get_ready_work_items WHERE status = 'on_hold';
    SELECT COUNT(*) INTO blocked_count FROM get_ready_work_items WHERE status = 'blocked';
    SELECT COUNT(*) INTO completed_count FROM get_ready_work_items WHERE status = 'completed';
    SELECT COUNT(*) INTO cancelled_count FROM get_ready_work_items WHERE status = 'cancelled';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Post-Migration Status Counts:';
    RAISE NOTICE '  Total Records: %', total_records;
    RAISE NOTICE '  awaiting_approval: %', awaiting_approval_count;
    RAISE NOTICE '  rejected: %', rejected_count;
    RAISE NOTICE '  ready: %', ready_count;
    RAISE NOTICE '  scheduled: %', scheduled_count;
    RAISE NOTICE '  in_progress: %', in_progress_count;
    RAISE NOTICE '  on_hold: %', on_hold_count;
    RAISE NOTICE '  blocked: %', blocked_count;
    RAISE NOTICE '  completed: %', completed_count;
    RAISE NOTICE '  cancelled: %', cancelled_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

-- Verify migration integrity
DO $$
DECLARE
    orphaned_statuses INTEGER;
BEGIN
    -- Check for any work items with old statuses that should have been migrated
    SELECT COUNT(*) INTO orphaned_statuses
    FROM get_ready_work_items
    WHERE status = 'pending' OR status = 'declined';

    IF orphaned_statuses > 0 THEN
        RAISE WARNING 'Found % work items with old status values after migration!', orphaned_statuses;
        RAISE WARNING 'Please review these records manually';
    ELSE
        RAISE NOTICE '✓ Migration integrity check passed: All work items migrated successfully';
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Test the application thoroughly';
    RAISE NOTICE '2. Verify all status transitions work correctly';
    RAISE NOTICE '3. Monitor for any issues';
    RAISE NOTICE '4. After 30 days of successful operation, you can optionally:';
    RAISE NOTICE '   - Drop backup table: DROP TABLE IF EXISTS get_ready_work_items_backup_pre_status_migration;';
    RAISE NOTICE '   - Remove old ENUM values (optional, not recommended): pending, declined';
    RAISE NOTICE '';
    RAISE NOTICE 'ROLLBACK INSTRUCTIONS:';
    RAISE NOTICE 'If you need to rollback, run the following:';
    RAISE NOTICE '';
    RAISE NOTICE '-- Restore status values from backup';
    RAISE NOTICE 'UPDATE get_ready_work_items wi';
    RAISE NOTICE 'SET status = backup.status::work_item_status, updated_at = NOW()';
    RAISE NOTICE 'FROM get_ready_work_items_backup_pre_status_migration backup';
    RAISE NOTICE 'WHERE wi.id = backup.id;';
    RAISE NOTICE '';
    RAISE NOTICE '-- Remove new columns';
    RAISE NOTICE 'ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS blocked_reason;';
    RAISE NOTICE 'ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS on_hold_reason;';
    RAISE NOTICE 'ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_reason;';
    RAISE NOTICE 'ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_by;';
    RAISE NOTICE 'ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_at;';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- END OF PART 2 - MIGRATION COMPLETE
-- ============================================================================
