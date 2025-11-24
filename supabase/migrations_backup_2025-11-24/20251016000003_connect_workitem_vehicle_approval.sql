-- =====================================================
-- GET READY MODULE - CONNECT WORK ITEM & VEHICLE APPROVAL
-- Automatically mark vehicle for approval when work items need approval
-- Auto-approve vehicle when all work items are approved
-- Date: 2025-10-16
-- =====================================================

-- =====================================================
-- 1. FUNCTION TO CHECK IF VEHICLE NEEDS APPROVAL
-- Based on work items approval status
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_vehicle_approval_needed(p_vehicle_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  unapproved_count INTEGER;
BEGIN
  -- Count work items that require approval but haven't been approved yet
  SELECT COUNT(*) INTO unapproved_count
  FROM public.get_ready_work_items
  WHERE vehicle_id = p_vehicle_id
    AND approval_required = true
    AND (approval_status IS NULL OR approval_status NOT IN ('approved'));

  -- Vehicle needs approval if there are unapproved work items
  RETURN unapproved_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 2. FUNCTION TO AUTO-UPDATE VEHICLE APPROVAL STATUS
-- Called by trigger when work items change
-- =====================================================
CREATE OR REPLACE FUNCTION public.sync_vehicle_approval_from_work_items()
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

-- =====================================================
-- 3. CREATE TRIGGERS ON WORK ITEMS TABLE
-- Auto-sync vehicle approval when work items change
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_sync_vehicle_approval_insert ON public.get_ready_work_items;
DROP TRIGGER IF EXISTS trigger_sync_vehicle_approval_update ON public.get_ready_work_items;
DROP TRIGGER IF EXISTS trigger_sync_vehicle_approval_delete ON public.get_ready_work_items;

-- Trigger on INSERT
CREATE TRIGGER trigger_sync_vehicle_approval_insert
  AFTER INSERT ON public.get_ready_work_items
  FOR EACH ROW
  WHEN (NEW.approval_required = true)
  EXECUTE FUNCTION public.sync_vehicle_approval_from_work_items();

-- Trigger on UPDATE
CREATE TRIGGER trigger_sync_vehicle_approval_update
  AFTER UPDATE ON public.get_ready_work_items
  FOR EACH ROW
  WHEN (
    OLD.approval_required IS DISTINCT FROM NEW.approval_required
    OR OLD.approval_status IS DISTINCT FROM NEW.approval_status
  )
  EXECUTE FUNCTION public.sync_vehicle_approval_from_work_items();

-- Trigger on DELETE
CREATE TRIGGER trigger_sync_vehicle_approval_delete
  AFTER DELETE ON public.get_ready_work_items
  FOR EACH ROW
  WHEN (OLD.approval_required = true)
  EXECUTE FUNCTION public.sync_vehicle_approval_from_work_items();

-- =====================================================
-- 4. UPDATE EXISTING VEHICLES WITH UNAPPROVED WORK ITEMS
-- Mark vehicles that currently have work items needing approval
-- =====================================================
UPDATE public.get_ready_vehicles v
SET
  requires_approval = true,
  approval_status = 'pending',
  updated_at = NOW()
WHERE EXISTS (
  SELECT 1
  FROM public.get_ready_work_items wi
  WHERE wi.vehicle_id = v.id
    AND wi.approval_required = true
    AND (wi.approval_status IS NULL OR wi.approval_status NOT IN ('approved'))
)
AND (v.requires_approval IS NOT true OR v.approval_status != 'pending');

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON FUNCTION public.check_vehicle_approval_needed IS 'Check if vehicle needs approval based on work items';
COMMENT ON FUNCTION public.sync_vehicle_approval_from_work_items IS 'Auto-sync vehicle approval status when work items change';
