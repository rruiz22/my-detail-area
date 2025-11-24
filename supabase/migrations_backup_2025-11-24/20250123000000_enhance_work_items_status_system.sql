-- ============================================================================
-- Migration: Enhanced Work Items Status System (Option 2: Simplified)
-- Description: Expands work item status from 4 to 9 states with improved workflow
-- Author: Claude Code
-- Date: 2025-01-23
-- Version: 1.0.0
-- ============================================================================
--
-- CHANGES SUMMARY:
-- - Add new status values: awaiting_approval, rejected, ready, scheduled, on_hold, blocked, cancelled
-- - Add new reason columns: blocked_reason, on_hold_reason, cancelled_reason
-- - Add cancellation tracking: cancelled_by, cancelled_at
-- - Migrate existing data from old statuses to new statuses
-- - Update CHECK constraints to include new statuses
-- - Preserve all existing data (non-destructive migration)
--
-- OLD STATUSES (4):
--   pending, in_progress, completed, declined
--
-- NEW STATUSES (9):
--   awaiting_approval, rejected, ready, scheduled, in_progress, on_hold, blocked, completed, cancelled
--
-- MIGRATION STRATEGY:
--   pending + approval_required=true  → awaiting_approval
--   pending + approval_required=false → ready
--   declined                          → rejected
--   in_progress                       → in_progress (no change)
--   completed                         → completed (no change)
-- ============================================================================

-- Step 1: Add new columns to get_ready_work_items table
-- ============================================================================
DO $$
BEGIN
    -- Add blocked_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'get_ready_work_items'
        AND column_name = 'blocked_reason'
    ) THEN
        ALTER TABLE get_ready_work_items
        ADD COLUMN blocked_reason TEXT;

        COMMENT ON COLUMN get_ready_work_items.blocked_reason IS
        'Reason for blocking the work item (e.g., waiting for parts, dependencies)';
    END IF;

    -- Add on_hold_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'get_ready_work_items'
        AND column_name = 'on_hold_reason'
    ) THEN
        ALTER TABLE get_ready_work_items
        ADD COLUMN on_hold_reason TEXT;

        COMMENT ON COLUMN get_ready_work_items.on_hold_reason IS
        'Reason for putting the work item on hold';
    END IF;

    -- Add cancelled_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'get_ready_work_items'
        AND column_name = 'cancelled_reason'
    ) THEN
        ALTER TABLE get_ready_work_items
        ADD COLUMN cancelled_reason TEXT;

        COMMENT ON COLUMN get_ready_work_items.cancelled_reason IS
        'Reason for cancelling the work item';
    END IF;

    -- Add cancelled_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'get_ready_work_items'
        AND column_name = 'cancelled_by'
    ) THEN
        ALTER TABLE get_ready_work_items
        ADD COLUMN cancelled_by UUID REFERENCES auth.users(id);

        COMMENT ON COLUMN get_ready_work_items.cancelled_by IS
        'User who cancelled the work item';
    END IF;

    -- Add cancelled_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'get_ready_work_items'
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE get_ready_work_items
        ADD COLUMN cancelled_at TIMESTAMPTZ;

        COMMENT ON COLUMN get_ready_work_items.cancelled_at IS
        'Timestamp when the work item was cancelled';
    END IF;
END $$;

-- Step 2: Drop existing CHECK constraint on status (if exists)
-- ============================================================================
DO $$
BEGIN
    -- Drop the old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'get_ready_work_items_status_check'
        AND table_name = 'get_ready_work_items'
    ) THEN
        ALTER TABLE get_ready_work_items
        DROP CONSTRAINT get_ready_work_items_status_check;
    END IF;
END $$;

-- Step 3: Create backup of current data (for rollback safety)
-- ============================================================================
DO $$
BEGIN
    -- Create backup table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'get_ready_work_items_backup_pre_status_migration'
    ) THEN
        CREATE TABLE get_ready_work_items_backup_pre_status_migration AS
        SELECT
            id,
            status,
            approval_required,
            approval_status,
            decline_reason,
            updated_at,
            NOW() as backup_created_at
        FROM get_ready_work_items;

        COMMENT ON TABLE get_ready_work_items_backup_pre_status_migration IS
        'Backup of work items status before migration to enhanced status system. Safe to drop after 30 days if migration is successful.';
    END IF;
END $$;

-- Step 4: Migrate existing data to new status values
-- ============================================================================
-- This is the critical migration step that transforms old statuses to new ones

-- Log migration start
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Work Items Status Migration';
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
END $$;

-- Migration 1: pending + approval_required=true → awaiting_approval
UPDATE get_ready_work_items
SET
    status = 'awaiting_approval',
    updated_at = NOW()
WHERE
    status = 'pending'
    AND approval_required = true
    AND (approval_status IS NULL OR approval_status != 'approved');

-- Log migration step 1
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Migration Step 1: % work items moved from pending to awaiting_approval', affected_rows;
END $$;

-- Migration 2: pending + approval_required=false OR approved → ready
UPDATE get_ready_work_items
SET
    status = 'ready',
    updated_at = NOW()
WHERE
    status = 'pending'
    AND (
        approval_required = false
        OR approval_status = 'approved'
    );

-- Log migration step 2
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Migration Step 2: % work items moved from pending to ready', affected_rows;
END $$;

-- Migration 3: declined → rejected
UPDATE get_ready_work_items
SET
    status = 'rejected',
    updated_at = NOW()
WHERE
    status = 'declined';

-- Log migration step 3
DO $$
DECLARE
    affected_rows INTEGER;
BEGIN
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RAISE NOTICE 'Migration Step 3: % work items moved from declined to rejected', affected_rows;
END $$;

-- Migration 4: Preserve existing in_progress and completed (no change needed)
-- These statuses remain the same in the new system

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
END $$;

-- Step 5: Add new CHECK constraint with all status values
-- ============================================================================
ALTER TABLE get_ready_work_items
ADD CONSTRAINT get_ready_work_items_status_check
CHECK (status IN (
    'awaiting_approval',
    'rejected',
    'ready',
    'scheduled',
    'in_progress',
    'on_hold',
    'blocked',
    'completed',
    'cancelled'
));

COMMENT ON CONSTRAINT get_ready_work_items_status_check ON get_ready_work_items IS
'Ensures work item status is one of the 9 valid values in the enhanced status system';

-- Step 6: Create indexes for performance optimization
-- ============================================================================
-- Index for status queries (most common filter)
CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_status
ON get_ready_work_items(status);

-- Index for cancelled work items queries
CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_cancelled
ON get_ready_work_items(status, cancelled_at)
WHERE status = 'cancelled';

-- Index for blocked work items queries
CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_blocked
ON get_ready_work_items(status, blocked_reason)
WHERE status = 'blocked';

-- Step 7: Update table comments
-- ============================================================================
COMMENT ON TABLE get_ready_work_items IS
'Work items for vehicle reconditioning with enhanced 9-state status system: awaiting_approval, rejected, ready, scheduled, in_progress, on_hold, blocked, completed, cancelled';

-- Step 8: Verify migration integrity
-- ============================================================================
DO $$
DECLARE
    orphaned_statuses INTEGER;
BEGIN
    -- Check for any work items with invalid statuses (should be 0)
    SELECT COUNT(*) INTO orphaned_statuses
    FROM get_ready_work_items
    WHERE status NOT IN (
        'awaiting_approval',
        'rejected',
        'ready',
        'scheduled',
        'in_progress',
        'on_hold',
        'blocked',
        'completed',
        'cancelled'
    );

    IF orphaned_statuses > 0 THEN
        RAISE WARNING 'Found % work items with invalid status values after migration!', orphaned_statuses;
        RAISE EXCEPTION 'Migration integrity check failed. Please review data before proceeding.';
    ELSE
        RAISE NOTICE '✓ Migration integrity check passed: All work items have valid status values';
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration completed successfully!';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Test the application thoroughly';
    RAISE NOTICE '2. Monitor for any issues';
    RAISE NOTICE '3. After 30 days of successful operation, drop backup table:';
    RAISE NOTICE '   DROP TABLE IF EXISTS get_ready_work_items_backup_pre_status_migration;';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT (Use only if migration needs to be reversed)
-- ============================================================================
-- IMPORTANT: Save this rollback script separately for emergency use
--
-- -- Rollback Step 1: Restore status values from backup
-- UPDATE get_ready_work_items wi
-- SET
--     status = backup.status,
--     updated_at = NOW()
-- FROM get_ready_work_items_backup_pre_status_migration backup
-- WHERE wi.id = backup.id;
--
-- -- Rollback Step 2: Remove new columns
-- ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS blocked_reason;
-- ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS on_hold_reason;
-- ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_reason;
-- ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_by;
-- ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_at;
--
-- -- Rollback Step 3: Restore old CHECK constraint
-- ALTER TABLE get_ready_work_items DROP CONSTRAINT IF EXISTS get_ready_work_items_status_check;
-- ALTER TABLE get_ready_work_items
-- ADD CONSTRAINT get_ready_work_items_status_check
-- CHECK (status IN ('pending', 'in_progress', 'completed', 'declined'));
--
-- -- Rollback Step 4: Drop indexes
-- DROP INDEX IF EXISTS idx_get_ready_work_items_status;
-- DROP INDEX IF EXISTS idx_get_ready_work_items_cancelled;
-- DROP INDEX IF EXISTS idx_get_ready_work_items_blocked;
-- ============================================================================
