-- Migration: Migrate 'pending' status to 'queued' and remove legacy status
-- Author: Claude Code
-- Date: 2025-10-23
-- Description: Elimina el estado legacy 'pending' y migra todos los registros a 'queued'
--
-- Background: The 'pending' status was deprecated in favor of a clearer workflow:
-- - 'awaiting_approval' → waiting for manager approval
-- - 'approved' → approved, ready to be queued
-- - 'queued' → in queue, waiting to start
-- - 'ready' → ready to begin work immediately
--
-- This migration ensures all legacy 'pending' items are moved to 'queued'

BEGIN;

-- 1. Verificar cuántos work items tienen status 'pending'
DO $$
DECLARE
  pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM get_ready_work_items
  WHERE status = 'pending';

  RAISE NOTICE '=== Work Items Migration: pending → queued ===';
  RAISE NOTICE 'Found % work items with status ''pending''', pending_count;

  IF pending_count = 0 THEN
    RAISE NOTICE 'No work items to migrate - migration complete';
  END IF;
END $$;

-- 2. Migrar todos los work items de 'pending' a 'queued'
UPDATE get_ready_work_items
SET
  status = 'queued',
  updated_at = NOW()
WHERE status = 'pending';

-- 3. Agregar comentario en tabla para documentar el cambio
COMMENT ON COLUMN get_ready_work_items.status IS
  'Work item status - Valid values: awaiting_approval, approved, rejected, queued, ready, scheduled, in_progress, on_hold, blocked, completed, cancelled. DEPRECATED: pending (migrated to queued on 2025-10-23)';

-- 4. Verificar que la migración fue exitosa
DO $$
DECLARE
  remaining_pending INTEGER;
  new_queued INTEGER;
  total_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_pending
  FROM get_ready_work_items
  WHERE status = 'pending';

  SELECT COUNT(*) INTO new_queued
  FROM get_ready_work_items
  WHERE status = 'queued';

  SELECT COUNT(*) INTO total_items
  FROM get_ready_work_items;

  RAISE NOTICE '=== Migration Results ===';
  RAISE NOTICE 'Total work items in table: %', total_items;
  RAISE NOTICE 'Items with status ''queued'': %', new_queued;
  RAISE NOTICE 'Remaining items with ''pending'': %', remaining_pending;

  IF remaining_pending > 0 THEN
    RAISE EXCEPTION 'Migration failed: % items still have status ''pending''', remaining_pending;
  ELSE
    RAISE NOTICE 'Migration successful - no pending items remain';
  END IF;
END $$;

-- 5. Log de distribución de estados después de la migración
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
        WHEN 'approved' THEN 3
        WHEN 'queued' THEN 4
        WHEN 'ready' THEN 5
        WHEN 'scheduled' THEN 6
        WHEN 'in_progress' THEN 7
        WHEN 'on_hold' THEN 8
        WHEN 'blocked' THEN 9
        WHEN 'completed' THEN 10
        WHEN 'cancelled' THEN 11
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
  RAISE NOTICE 'All ''pending'' work items have been successfully migrated to ''queued''';
  RAISE NOTICE 'The application can now safely remove ''pending'' from WorkItemStatus type';
END $$;
