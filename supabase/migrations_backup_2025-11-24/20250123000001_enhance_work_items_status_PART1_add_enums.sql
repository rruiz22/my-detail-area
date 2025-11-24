-- ============================================================================
-- Migration: Enhanced Work Items Status System - PART 1 of 2
-- Description: Add new ENUM values and columns (MUST run before Part 2)
-- Author: Claude Code
-- Date: 2025-01-23
-- Version: 1.2.0 (Two-Part Migration - Part 1)
-- ============================================================================
--
-- CRITICAL: This is Part 1 of a 2-part migration
-- PostgreSQL requires ENUM values to be committed before use
--
-- EXECUTION ORDER:
--   1. Run this script (Part 1) - Adds ENUM values and columns
--   2. Wait for transaction commit (automatic)
--   3. Run Part 2 - Migrates existing data
--
-- CHANGES IN PART 1:
-- - Add new columns: blocked_reason, on_hold_reason, cancelled_reason, cancelled_by, cancelled_at
-- - Add new ENUM values to work_item_status type
-- - Create backup table for rollback safety
-- - Create performance indexes
--
-- NEW ENUM VALUES:
--   awaiting_approval, rejected, ready, scheduled, on_hold, blocked, cancelled
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

    RAISE NOTICE '✓ New columns added successfully';
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

        RAISE NOTICE '✓ Backup table created successfully';
    ELSE
        RAISE NOTICE '✓ Backup table already exists, skipping...';
    END IF;
END $$;

-- Step 3: Add new values to the ENUM type
-- ============================================================================
-- PostgreSQL requires these to be in a separate transaction from their usage
-- This is why we split into Part 1 and Part 2

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

    RAISE NOTICE '✓ ENUM values added successfully';
END $$;

-- Step 4: Create indexes for performance optimization
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_status
ON get_ready_work_items(status);

CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_cancelled
ON get_ready_work_items(status, cancelled_at)
WHERE status = 'cancelled';

CREATE INDEX IF NOT EXISTS idx_get_ready_work_items_blocked
ON get_ready_work_items(status, blocked_reason)
WHERE status = 'blocked';

RAISE NOTICE '✓ Performance indexes created successfully';

-- Step 5: Update table comments
-- ============================================================================
COMMENT ON TABLE get_ready_work_items IS
'Work items for vehicle reconditioning with enhanced 9-state status system: awaiting_approval, rejected, ready, scheduled, in_progress, on_hold, blocked, completed, cancelled';

-- Final message for Part 1
DO $$
BEGIN
    RAISE NOTICE '========================================'
    RAISE NOTICE '✓ PART 1 COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Timestamp: %', NOW();
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT NEXT STEPS:';
    RAISE NOTICE '1. This transaction will now commit';
    RAISE NOTICE '2. Run Part 2 migration immediately after';
    RAISE NOTICE '3. Part 2 will migrate existing data to new statuses';
    RAISE NOTICE '';
    RAISE NOTICE 'File: 20250123000002_enhance_work_items_status_PART2_migrate_data.sql';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- END OF PART 1
-- ============================================================================
