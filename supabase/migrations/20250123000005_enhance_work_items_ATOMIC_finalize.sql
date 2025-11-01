-- ============================================================================
-- Migration: Enhanced Work Items Status System - ATOMIC FINALIZE
-- Description: Convert temporary TEXT column to ENUM and finalize migration
-- Author: Claude Code
-- Date: 2025-01-23
-- Version: 2.0.0 (Atomic Finalize)
-- ============================================================================
--
-- IMPORTANT: Run this IMMEDIATELY after 20250123000004
-- This converts the temporary TEXT column to the ENUM type
-- ============================================================================

-- Step 1: Verify ENUM values exist
-- ============================================================================
DO $$
DECLARE
    missing_enums TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check for each required ENUM value
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'awaiting_approval' AND enumtypid = 'work_item_status'::regtype) THEN
        missing_enums := array_append(missing_enums, 'awaiting_approval');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'work_item_status'::regtype) THEN
        missing_enums := array_append(missing_enums, 'rejected');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ready' AND enumtypid = 'work_item_status'::regtype) THEN
        missing_enums := array_append(missing_enums, 'ready');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduled' AND enumtypid = 'work_item_status'::regtype) THEN
        missing_enums := array_append(missing_enums, 'scheduled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'on_hold' AND enumtypid = 'work_item_status'::regtype) THEN
        missing_enums := array_append(missing_enums, 'on_hold');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'blocked' AND enumtypid = 'work_item_status'::regtype) THEN
        missing_enums := array_append(missing_enums, 'blocked');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = 'work_item_status'::regtype) THEN
        missing_enums := array_append(missing_enums, 'cancelled');
    END IF;

    IF array_length(missing_enums, 1) > 0 THEN
        RAISE EXCEPTION 'Missing ENUM values: %. Please run Part 1 first.', array_to_string(missing_enums, ', ');
    END IF;

    RAISE NOTICE '✓ All required ENUM values exist';
END $$;

-- Step 2: Convert status_temp to ENUM and update main status column
-- ============================================================================
UPDATE get_ready_work_items
SET
    status = status_temp::work_item_status,
    updated_at = NOW()
WHERE status_temp IS NOT NULL;

-- Step 3: Verify no NULL values in status_temp (all records migrated)
-- ============================================================================
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM get_ready_work_items
    WHERE status_temp IS NULL;

    IF null_count > 0 THEN
        RAISE WARNING 'Found % records with NULL status_temp. These were not migrated.', null_count;
    ELSE
        RAISE NOTICE '✓ All records migrated successfully';
    END IF;
END $$;

-- Step 4: Drop temporary column
-- ============================================================================
ALTER TABLE get_ready_work_items
DROP COLUMN IF EXISTS status_temp;

-- Step 5: Create performance indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_status
ON get_ready_work_items(status);

CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_cancelled
ON get_ready_work_items(status, cancelled_at)
WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_blocked
ON get_ready_work_items(status, blocked_reason)
WHERE status = 'blocked';

-- Step 6: Display migration statistics
-- ============================================================================
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
    RAISE NOTICE '✓ MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Final Status Distribution:';
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
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Test application thoroughly';
    RAISE NOTICE '2. Verify all status transitions work';
    RAISE NOTICE '3. Monitor for 30 days';
    RAISE NOTICE '4. After 30 days, optionally drop backup:';
    RAISE NOTICE '   DROP TABLE get_ready_work_items_backup_pre_status_migration;';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- END OF ATOMIC FINALIZE
-- ============================================================================
