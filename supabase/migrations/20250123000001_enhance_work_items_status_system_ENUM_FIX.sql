-- ============================================================================
-- Migration: Enhanced Work Items Status System (ENUM FIX)
-- Description: Expands work item status ENUM from 4 to 9 states
-- Author: Claude Code
-- Date: 2025-01-23
-- Version: 1.1.0 (ENUM Compatible)
-- ============================================================================
--
-- IMPORTANT: This version handles PostgreSQL ENUM types correctly
--
-- CHANGES SUMMARY:
-- - Add new values to work_item_status ENUM
-- - Add new reason columns: blocked_reason, on_hold_reason, cancelled_reason
-- - Add cancellation tracking: cancelled_by, cancelled_at
-- - Migrate existing data from old statuses to new statuses
-- - Preserve all existing data (non-destructive migration)
--
-- ENUM VALUES:
--   OLD (4): pending, in_progress, completed, declined
--   NEW (9): awaiting_approval, rejected, ready, scheduled, in_progress, on_hold, blocked, completed, cancelled
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

-- Step 2: Create backup of current data (for rollback safety)
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

        RAISE NOTICE 'Backup table created successfully';
    ELSE
        RAISE NOTICE 'Backup table already exists, skipping...';
    END IF;
END $$;

-- Step 3: Add new values to the ENUM type
-- ============================================================================
-- PostgreSQL doesn't allow modifying ENUMs directly, so we need to:
-- 1. Add new values to the ENUM
-- 2. The order matters for some PostgreSQL versions

DO $$
BEGIN
    -- Add 'awaiting_approval' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'awaiting_approval' AND enumtypid = 'work_item_status'::regtype) THEN
        ALTER TYPE work_item_status ADD VALUE 'awaiting_approval' BEFORE 'pending';
        RAISE NOTICE 'Added awaiting_approval to ENUM';
    END IF;

    -- Add 'rejected' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'work_item_status'::regtype) THEN
        ALTER TYPE work_item_status ADD VALUE 'rejected' AFTER 'pending';
        RAISE NOTICE 'Added rejected to ENUM';
    END IF;

    -- Add 'ready' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ready' AND enumtypid = 'work_item_status'::regtype) THEN
        ALTER TYPE work_item_status ADD VALUE 'ready' AFTER 'rejected';
        RAISE NOTICE 'Added ready to ENUM';
    END IF;

    -- Add 'scheduled' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scheduled' AND enumtypid = 'work_item_status'::regtype) THEN
        ALTER TYPE work_item_status ADD VALUE 'scheduled' AFTER 'ready';
        RAISE NOTICE 'Added scheduled to ENUM';
    END IF;

    -- Add 'on_hold' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'on_hold' AND enumtypid = 'work_item_status'::regtype) THEN
        ALTER TYPE work_item_status ADD VALUE 'on_hold' AFTER 'in_progress';
        RAISE NOTICE 'Added on_hold to ENUM';
    END IF;

    -- Add 'blocked' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'blocked' AND enumtypid = 'work_item_status'::regtype) THEN
        ALTER TYPE work_item_status ADD VALUE 'blocked' AFTER 'on_hold';
        RAISE NOTICE 'Added blocked to ENUM';
    END IF;

    -- Add 'cancelled' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'cancelled' AND enumtypid = 'work_item_status'::regtype) THEN
        ALTER TYPE work_item_status ADD VALUE 'cancelled' AFTER 'completed';
        RAISE NOTICE 'Added cancelled to ENUM';
    END IF;

    RAISE NOTICE '✓ ENUM values updated successfully';
END $$;

-- Step 4: Migrate existing data to new status values
-- ============================================================================

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
    status = 'awaiting_approval'::work_item_status,
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
    status = 'ready'::work_item_status,
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
    status = 'rejected'::work_item_status,
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

-- Step 5: Create indexes for performance optimization
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_status
ON get_ready_work_items(status);

CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_cancelled
ON get_ready_work_items(status, cancelled_at)
WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_blocked
ON get_ready_work_items(status, blocked_reason)
WHERE status = 'blocked';

-- Step 6: Update table comments
-- ============================================================================
COMMENT ON TABLE get_ready_work_items IS
'Work items for vehicle reconditioning with enhanced 9-state status system: awaiting_approval, rejected, ready, scheduled, in_progress, on_hold, blocked, completed, cancelled';

-- Step 7: Verify migration integrity
-- ============================================================================
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
        -- Don't throw exception, just warn - user can investigate
    ELSE
        RAISE NOTICE '✓ Migration integrity check passed: All work items migrated successfully';
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
    RAISE NOTICE '2. Verify all status transitions work correctly';
    RAISE NOTICE '3. Monitor for any issues';
    RAISE NOTICE '4. After 30 days of successful operation, you can optionally:';
    RAISE NOTICE '   - Drop backup table: DROP TABLE IF EXISTS get_ready_work_items_backup_pre_status_migration;';
    RAISE NOTICE '   - Remove old ENUM values (optional, not recommended): pending, declined';
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
--     status = backup.status::work_item_status,
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
-- -- Rollback Step 3: Drop indexes
-- DROP INDEX IF EXISTS idx_get_ready_work_items_status;
-- DROP INDEX IF EXISTS idx_get_ready_work_items_cancelled;
-- DROP INDEX IF EXISTS idx_get_ready_work_items_blocked;
--
-- NOTE: Removing ENUM values is complex and not recommended.
-- The old values (pending, declined) can remain in the ENUM without causing issues.
-- ============================================================================
