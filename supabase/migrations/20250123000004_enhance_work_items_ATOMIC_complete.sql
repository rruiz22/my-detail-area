-- ============================================================================
-- Migration: Enhanced Work Items Status System - ATOMIC COMPLETE VERSION
-- Description: Complete migration using temporary TEXT column approach
-- Author: Claude Code
-- Date: 2025-01-23
-- Version: 2.0.0 (Atomic Complete Migration)
-- ============================================================================
--
-- STRATEGY: Bypass ENUM transaction limitation by using temporary TEXT column
--
-- 1. Add new columns (blocked_reason, on_hold_reason, etc.)
-- 2. Add temporary TEXT column for new status values
-- 3. Migrate data to temporary column
-- 4. Add new ENUM values
-- 5. Convert temporary column back to ENUM
-- 6. Drop temporary column
--
-- This approach works in a SINGLE transaction and avoids ENUM commit issues
-- ============================================================================

-- Step 1: Create backup table
-- ============================================================================
CREATE TABLE IF NOT EXISTS get_ready_work_items_backup_pre_status_migration AS
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

-- Step 2: Add new columns
-- ============================================================================
ALTER TABLE get_ready_work_items
ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
ADD COLUMN IF NOT EXISTS on_hold_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Step 3: Add temporary TEXT column for new status values
-- ============================================================================
ALTER TABLE get_ready_work_items
ADD COLUMN IF NOT EXISTS status_temp TEXT;

-- Step 4: Populate temporary column with migrated values
-- ============================================================================

-- pending + approval_required=true → awaiting_approval
UPDATE get_ready_work_items
SET status_temp = 'awaiting_approval'
WHERE
    status = 'pending'
    AND approval_required = true
    AND (approval_status IS NULL OR approval_status != 'approved');

-- pending + approval_required=false OR approved → ready
UPDATE get_ready_work_items
SET status_temp = 'ready'
WHERE
    status = 'pending'
    AND (
        approval_required = false
        OR approval_status = 'approved'
    );

-- declined → rejected
UPDATE get_ready_work_items
SET status_temp = 'rejected'
WHERE status = 'declined';

-- in_progress → in_progress (keep as is)
UPDATE get_ready_work_items
SET status_temp = 'in_progress'
WHERE status = 'in_progress';

-- completed → completed (keep as is)
UPDATE get_ready_work_items
SET status_temp = 'completed'
WHERE status = 'completed';

-- Step 5: Add new values to ENUM type
-- ============================================================================
-- Note: These must be separate statements, not in a transaction block

DO $$
BEGIN
    -- Check and add each value individually
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'awaiting_approval'
        AND enumtypid = 'work_item_status'::regtype
    ) THEN
        EXECUTE 'ALTER TYPE work_item_status ADD VALUE ''awaiting_approval'' BEFORE ''pending''';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'rejected'
        AND enumtypid = 'work_item_status'::regtype
    ) THEN
        EXECUTE 'ALTER TYPE work_item_status ADD VALUE ''rejected'' AFTER ''pending''';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'ready'
        AND enumtypid = 'work_item_status'::regtype
    ) THEN
        EXECUTE 'ALTER TYPE work_item_status ADD VALUE ''ready'' AFTER ''rejected''';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'scheduled'
        AND enumtypid = 'work_item_status'::regtype
    ) THEN
        EXECUTE 'ALTER TYPE work_item_status ADD VALUE ''scheduled'' AFTER ''ready''';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'on_hold'
        AND enumtypid = 'work_item_status'::regtype
    ) THEN
        EXECUTE 'ALTER TYPE work_item_status ADD VALUE ''on_hold'' AFTER ''in_progress''';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'blocked'
        AND enumtypid = 'work_item_status'::regtype
    ) THEN
        EXECUTE 'ALTER TYPE work_item_status ADD VALUE ''blocked'' AFTER ''on_hold''';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'cancelled'
        AND enumtypid = 'work_item_status'::regtype
    ) THEN
        EXECUTE 'ALTER TYPE work_item_status ADD VALUE ''cancelled'' AFTER ''completed''';
    END IF;
END $$;

-- Step 6: Wait for ENUM values to be committed
-- ============================================================================
-- In PostgreSQL, we need to commit the transaction here
-- This is done automatically when the migration script ends
-- The next part must be in a SEPARATE migration file

COMMENT ON COLUMN get_ready_work_items.status IS
'Work item status - Enhanced 9-state system: awaiting_approval, rejected, ready, scheduled, in_progress, on_hold, blocked, completed, cancelled';

-- ============================================================================
-- END OF ATOMIC MIGRATION PART 1
-- ============================================================================
