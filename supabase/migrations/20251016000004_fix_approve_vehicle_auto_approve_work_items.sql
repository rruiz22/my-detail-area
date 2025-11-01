-- =====================================================
-- GET READY MODULE - FIX APPROVE VEHICLE
-- Auto-approve work items when approving vehicle
-- Date: 2025-10-16
-- Version: 2.0 with rollback capability
-- =====================================================

-- =====================================================
-- 1. BACKUP ORIGINAL FUNCTION (Safety measure)
-- =====================================================
CREATE OR REPLACE FUNCTION public.approve_vehicle_v1_backup(
  p_vehicle_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
  v_dealer_id BIGINT;
  v_approver_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user
  v_approver_id := auth.uid();

  IF v_approver_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get vehicle details
  SELECT * INTO v_vehicle
  FROM public.get_ready_vehicles
  WHERE id = p_vehicle_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle not found'
    );
  END IF;

  v_dealer_id := v_vehicle.dealer_id;

  -- Check if user has permission
  IF NOT user_has_group_permission(v_approver_id, v_dealer_id, 'get_ready.approve') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions to approve vehicles'
    );
  END IF;

  -- Check if vehicle requires approval
  IF NOT v_vehicle.requires_approval THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle does not require approval'
    );
  END IF;

  -- Check if already approved
  IF v_vehicle.approval_status = 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle is already approved'
    );
  END IF;

  -- Update vehicle approval status (ORIGINAL - without work items)
  UPDATE public.get_ready_vehicles
  SET
    approval_status = 'approved',
    approved_by = v_approver_id,
    approved_at = NOW(),
    approval_notes = p_notes,
    rejected_by = NULL,
    rejected_at = NULL,
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- Insert into approval history
  INSERT INTO public.get_ready_approval_history (
    vehicle_id,
    dealer_id,
    action,
    action_by,
    notes,
    vehicle_step_id,
    vehicle_workflow_type,
    vehicle_priority
  ) VALUES (
    p_vehicle_id,
    v_dealer_id,
    'approved',
    v_approver_id,
    p_notes,
    v_vehicle.step_id,
    v_vehicle.workflow_type::TEXT,
    v_vehicle.priority::TEXT
  );

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'vehicle_id', p_vehicle_id,
    'approved_by', v_approver_id,
    'approved_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.approve_vehicle_v1_backup IS 'Backup of original approve_vehicle function (v1) for rollback purposes';

-- =====================================================
-- 2. CREATE NEW APPROVE VEHICLE FUNCTION (v2)
-- With auto-approval of pending work items
-- =====================================================
CREATE OR REPLACE FUNCTION public.approve_vehicle(
  p_vehicle_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
  v_dealer_id BIGINT;
  v_approver_id UUID;
  v_result JSONB;
  v_work_items_approved INTEGER := 0;
BEGIN
  -- Get current user
  v_approver_id := auth.uid();

  IF v_approver_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get vehicle details
  SELECT * INTO v_vehicle
  FROM public.get_ready_vehicles
  WHERE id = p_vehicle_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle not found'
    );
  END IF;

  v_dealer_id := v_vehicle.dealer_id;

  -- Check if user has permission
  IF NOT user_has_group_permission(v_approver_id, v_dealer_id, 'get_ready.approve') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions to approve vehicles'
    );
  END IF;

  -- Check if vehicle requires approval
  IF NOT v_vehicle.requires_approval THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle does not require approval'
    );
  END IF;

  -- Check if already approved
  IF v_vehicle.approval_status = 'approved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle is already approved'
    );
  END IF;

  -- ✅ NEW: Auto-approve all pending work items for this vehicle
  UPDATE public.get_ready_work_items
  SET
    approval_status = 'approved',
    approved_by = v_approver_id,
    approved_at = NOW(),
    status = CASE
      WHEN status = 'pending' AND approval_status IS NULL THEN 'pending'  -- Keep pending so they can be started
      ELSE status
    END,
    updated_at = NOW()
  WHERE vehicle_id = p_vehicle_id
    AND approval_required = true
    AND (approval_status IS NULL OR approval_status NOT IN ('approved'));

  -- Count how many work items were auto-approved
  GET DIAGNOSTICS v_work_items_approved = ROW_COUNT;

  -- Update vehicle approval status
  UPDATE public.get_ready_vehicles
  SET
    approval_status = 'approved',
    approved_by = v_approver_id,
    approved_at = NOW(),
    approval_notes = p_notes,
    rejected_by = NULL,
    rejected_at = NULL,
    rejection_reason = NULL,
    updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- Insert into approval history
  INSERT INTO public.get_ready_approval_history (
    vehicle_id,
    dealer_id,
    action,
    action_by,
    notes,
    vehicle_step_id,
    vehicle_workflow_type,
    vehicle_priority
  ) VALUES (
    p_vehicle_id,
    v_dealer_id,
    'approved',
    v_approver_id,
    CASE
      WHEN v_work_items_approved > 0 THEN
        CONCAT(p_notes, E'\n\n[Auto-approved ', v_work_items_approved, ' pending work item(s)]')
      ELSE
        p_notes
    END,
    v_vehicle.step_id,
    v_vehicle.workflow_type::TEXT,
    v_vehicle.priority::TEXT
  );

  -- Build success response with work items count
  v_result := jsonb_build_object(
    'success', true,
    'vehicle_id', p_vehicle_id,
    'approved_by', v_approver_id,
    'approved_at', NOW(),
    'work_items_auto_approved', v_work_items_approved
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.approve_vehicle IS 'Approve vehicle and auto-approve all pending work items (v2 - 2025-10-16)';

-- =====================================================
-- 3. ROLLBACK INSTRUCTIONS (Safety measure)
-- =====================================================
-- IF THERE ARE ISSUES, run this to rollback to v1:
--
-- DROP FUNCTION IF EXISTS public.approve_vehicle(UUID, TEXT);
-- ALTER FUNCTION public.approve_vehicle_v1_backup(UUID, TEXT) RENAME TO approve_vehicle;
--
-- This will restore the original function without auto-approve work items.

-- =====================================================
-- 4. VERIFICATION QUERY
-- Run this to verify the migration worked
-- =====================================================
-- SELECT
--   routine_name
-- FROM information_schema.routines
-- WHERE routine_name IN ('approve_vehicle', 'approve_vehicle_v1_backup')
--   AND routine_schema = 'public';
