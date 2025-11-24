-- =====================================================
-- GET READY MODULE - FIX TRIGGER TO SET APPROVED_AT
-- When all work items are approved, mark vehicle as approved with timestamp
-- Date: 2025-10-16
-- Version: 2.0 with rollback capability
-- =====================================================

-- =====================================================
-- 1. BACKUP ORIGINAL FUNCTION (Safety measure)
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_vehicle_approval_from_work_items_v1_backup()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  needs_approval BOOLEAN;
  all_approved BOOLEAN;
  unapproved_count INTEGER;
BEGIN
  -- Get vehicle_id from NEW or OLD record
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);

  IF v_vehicle_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check if vehicle needs approval based on work items
  needs_approval := check_vehicle_approval_needed(v_vehicle_id);

  -- Count unapproved work items
  SELECT COUNT(*) INTO unapproved_count
  FROM public.get_ready_work_items
  WHERE vehicle_id = v_vehicle_id
    AND approval_required = true
    AND (approval_status IS NULL OR approval_status NOT IN ('approved'));

  all_approved := unapproved_count = 0;

  -- Update vehicle approval status (ORIGINAL VERSION - without approved_at)
  IF needs_approval THEN
    -- There are work items needing approval
    UPDATE public.get_ready_vehicles
    SET
      requires_approval = true,
      approval_status = 'pending',
      updated_at = NOW()
    WHERE id = v_vehicle_id
      AND (requires_approval IS NOT true OR approval_status != 'pending');

  ELSIF all_approved THEN
    -- All work items are approved - check if vehicle was waiting for this
    UPDATE public.get_ready_vehicles
    SET
      requires_approval = false,
      approval_status = 'not_required',
      updated_at = NOW()
    WHERE id = v_vehicle_id
      AND requires_approval = true
      AND approval_status = 'pending';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.sync_vehicle_approval_from_work_items_v1_backup IS 'Backup of original trigger function (v1) for rollback purposes';

-- =====================================================
-- 2. CREATE NEW TRIGGER FUNCTION (v2)
-- With approved_at and approved_by tracking
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_vehicle_approval_from_work_items()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  needs_approval BOOLEAN;
  all_approved BOOLEAN;
  unapproved_count INTEGER;
  last_approver_id UUID;
BEGIN
  -- Get vehicle_id from NEW or OLD record
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);

  IF v_vehicle_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Check if vehicle needs approval based on work items
  needs_approval := check_vehicle_approval_needed(v_vehicle_id);

  -- Count unapproved work items
  SELECT COUNT(*) INTO unapproved_count
  FROM public.get_ready_work_items
  WHERE vehicle_id = v_vehicle_id
    AND approval_required = true
    AND (approval_status IS NULL OR approval_status NOT IN ('approved'));

  all_approved := unapproved_count = 0;

  -- Update vehicle approval status
  IF needs_approval THEN
    -- There are work items needing approval
    UPDATE public.get_ready_vehicles
    SET
      requires_approval = true,
      approval_status = 'pending',
      updated_at = NOW()
    WHERE id = v_vehicle_id
      AND (requires_approval IS NOT true OR approval_status != 'pending');

  ELSIF all_approved THEN
    -- ✅ NEW: Get the user who approved the last work item
    SELECT approved_by INTO last_approver_id
    FROM public.get_ready_work_items
    WHERE vehicle_id = v_vehicle_id
      AND approval_required = true
      AND approval_status = 'approved'
    ORDER BY approved_at DESC NULLS LAST
    LIMIT 1;

    -- All work items are approved - mark vehicle as approved with timestamp
    UPDATE public.get_ready_vehicles
    SET
      requires_approval = false,
      approval_status = 'approved',  -- ✅ Changed from 'not_required' to 'approved'
      approved_at = NOW(),           -- ✅ NEW: Set approval timestamp
      approved_by = last_approver_id,-- ✅ NEW: Track who approved
      updated_at = NOW()
    WHERE id = v_vehicle_id
      AND requires_approval = true
      AND approval_status = 'pending';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.sync_vehicle_approval_from_work_items IS 'Auto-sync vehicle approval status when work items change (v2 - sets approved_at)';

-- =====================================================
-- 3. ROLLBACK INSTRUCTIONS (Safety measure)
-- =====================================================
-- IF THERE ARE ISSUES, run this to rollback to v1:
--
-- DROP FUNCTION IF EXISTS public.sync_vehicle_approval_from_work_items();
-- ALTER FUNCTION public.sync_vehicle_approval_from_work_items_v1_backup()
--   RENAME TO sync_vehicle_approval_from_work_items;
--
-- Then recreate triggers:
-- DROP TRIGGER IF EXISTS trigger_sync_vehicle_approval_insert ON public.get_ready_work_items;
-- DROP TRIGGER IF EXISTS trigger_sync_vehicle_approval_update ON public.get_ready_work_items;
-- DROP TRIGGER IF EXISTS trigger_sync_vehicle_approval_delete ON public.get_ready_work_items;
--
-- CREATE TRIGGER trigger_sync_vehicle_approval_insert
--   AFTER INSERT ON public.get_ready_work_items
--   FOR EACH ROW WHEN (NEW.approval_required = true)
--   EXECUTE FUNCTION public.sync_vehicle_approval_from_work_items();
--
-- CREATE TRIGGER trigger_sync_vehicle_approval_update
--   AFTER UPDATE ON public.get_ready_work_items
--   FOR EACH ROW WHEN (OLD.approval_required IS DISTINCT FROM NEW.approval_required
--     OR OLD.approval_status IS DISTINCT FROM NEW.approval_status)
--   EXECUTE FUNCTION public.sync_vehicle_approval_from_work_items();
--
-- CREATE TRIGGER trigger_sync_vehicle_approval_delete
--   AFTER DELETE ON public.get_ready_work_items
--   FOR EACH ROW WHEN (OLD.approval_required = true)
--   EXECUTE FUNCTION public.sync_vehicle_approval_from_work_items();

-- =====================================================
-- 4. UPDATE EXISTING VEHICLES THAT WERE AUTO-APPROVED
-- Fix historical data: vehicles with all work items approved but no approved_at
-- =====================================================
UPDATE public.get_ready_vehicles v
SET
  approval_status = 'approved',
  approved_at = (
    SELECT MAX(approved_at)
    FROM public.get_ready_work_items wi
    WHERE wi.vehicle_id = v.id
      AND wi.approval_status = 'approved'
  ),
  approved_by = (
    SELECT approved_by
    FROM public.get_ready_work_items wi
    WHERE wi.vehicle_id = v.id
      AND wi.approval_status = 'approved'
    ORDER BY approved_at DESC NULLS LAST
    LIMIT 1
  )
WHERE v.approval_status = 'not_required'
  AND v.approved_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.get_ready_work_items wi
    WHERE wi.vehicle_id = v.id
      AND wi.approval_required = true
      AND wi.approval_status = 'approved'
  );

-- =====================================================
-- 5. VERIFICATION QUERY
-- Run this to verify the migration worked
-- =====================================================
-- SELECT
--   stock_number,
--   requires_approval,
--   approval_status,
--   approved_at,
--   approved_by
-- FROM public.get_ready_vehicles
-- WHERE approval_status IN ('approved', 'not_required')
-- ORDER BY updated_at DESC;
