-- Migration: Remove 'approved' status and simplify workflow to 'queued'
-- Author: Claude Code
-- Date: 2025-10-23
-- Description: Simplifies work item workflow by eliminating intermediate 'approved' state
--
-- New Workflow:
-- awaiting_approval → [Approve] → queued → [Start] → in_progress
--              ↓
--         [Decline] → rejected
--
-- This migration:
-- 1. Migrates all 'approved' items to 'queued'
-- 2. Updates documentation
-- 3. Validates the migration

BEGIN;

-- 1. Check how many work items have status 'approved'
DO $$
DECLARE
  approved_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO approved_count
  FROM get_ready_work_items
  WHERE status = 'approved';

  RAISE NOTICE '=== Work Items Migration: approved → queued ===';
  RAISE NOTICE 'Found % work items with status ''approved''', approved_count;

  IF approved_count = 0 THEN
    RAISE NOTICE 'No work items to migrate - migration complete';
  END IF;
END $$;

-- 2. Migrate all work items from 'approved' to 'queued'
UPDATE get_ready_work_items
SET
  status = 'queued',
  updated_at = NOW()
WHERE status = 'approved';

-- 3. Update table comment to reflect the simplified workflow
COMMENT ON COLUMN get_ready_work_items.status IS
  'Work item status - Simplified workflow: awaiting_approval → queued → ready → scheduled → in_progress → on_hold/blocked → completed/cancelled. DEPRECATED: approved (migrated to queued on 2025-10-23)';

-- 4. Verify migration success
DO $$
DECLARE
  remaining_approved INTEGER;
  new_queued INTEGER;
  total_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_approved
  FROM get_ready_work_items
  WHERE status = 'approved';

  SELECT COUNT(*) INTO new_queued
  FROM get_ready_work_items
  WHERE status = 'queued';

  SELECT COUNT(*) INTO total_items
  FROM get_ready_work_items;

  RAISE NOTICE '=== Migration Results ===';
  RAISE NOTICE 'Total work items in table: %', total_items;
  RAISE NOTICE 'Items with status ''queued'': %', new_queued;
  RAISE NOTICE 'Remaining items with ''approved'': %', remaining_approved;

  IF remaining_approved > 0 THEN
    RAISE EXCEPTION 'Migration failed: % items still have status ''approved''', remaining_approved;
  ELSE
    RAISE NOTICE 'Migration successful - no approved items remain';
  END IF;
END $$;

-- 5. Log status distribution after migration
DO $$
DECLARE
  status_record RECORD;
BEGIN
  RAISE NOTICE '=== Current Status Distribution ===';
  FOR status_record IN
    SELECT status, COUNT(*) as count
    FROM get_ready_work_items
    GROUP BY status
    ORDER BY
      CASE status
        WHEN 'awaiting_approval' THEN 1
        WHEN 'rejected' THEN 2
        WHEN 'queued' THEN 3
        WHEN 'ready' THEN 4
        WHEN 'scheduled' THEN 5
        WHEN 'in_progress' THEN 6
        WHEN 'on_hold' THEN 7
        WHEN 'blocked' THEN 8
        WHEN 'completed' THEN 9
        WHEN 'cancelled' THEN 10
        ELSE 99
      END
  LOOP
    RAISE NOTICE '  % : %', RPAD(status_record.status::text, 20), status_record.count;
  END LOOP;
END $$;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '=== Migration Complete ===';
  RAISE NOTICE 'All ''approved'' work items have been successfully migrated to ''queued''';
  RAISE NOTICE 'Simplified workflow: awaiting_approval → queued → in_progress';
  RAISE NOTICE 'The application can now safely remove ''approved'' from WorkItemStatus type';
END $$;
