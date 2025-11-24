-- =====================================================
-- GET READY MODULE - APPROVAL SYSTEM
-- Complete approval workflow for vehicle reconditioning
-- Date: 2025-10-16
-- =====================================================

-- =====================================================
-- 1. CREATE APPROVAL STATUS ENUM
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'not_required');
  END IF;
END $$;

-- =====================================================
-- 2. ADD APPROVAL COLUMNS TO get_ready_vehicles
-- =====================================================
DO $$
BEGIN
  -- Add requires_approval column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'requires_approval'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN requires_approval BOOLEAN DEFAULT false;
  END IF;

  -- Add approval_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN approval_status approval_status DEFAULT 'not_required';
  END IF;

  -- Add approved_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add approved_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  -- Add approval_notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'approval_notes'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN approval_notes TEXT;
  END IF;

  -- Add rejected_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'rejected_by'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN rejected_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add rejected_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN rejected_at TIMESTAMPTZ;
  END IF;

  -- Add rejection_reason column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- =====================================================
-- 3. CREATE APPROVAL HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.get_ready_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Action details
  action approval_status NOT NULL,
  action_by UUID NOT NULL REFERENCES auth.users(id),
  action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional information
  notes TEXT,
  reason TEXT,

  -- Vehicle state at time of action
  vehicle_step_id TEXT,
  vehicle_workflow_type TEXT,
  vehicle_priority TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.get_ready_approval_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval history
CREATE POLICY "Users can view approval history for their dealerships"
  ON public.get_ready_approval_history FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "System can insert approval history"
  ON public.get_ready_approval_history FOR INSERT
  WITH CHECK (user_has_active_dealer_membership(auth.uid(), dealer_id));

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_approval_status
  ON public.get_ready_vehicles(dealer_id, approval_status)
  WHERE requires_approval = true;

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_approved_by
  ON public.get_ready_vehicles(approved_by);

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_rejected_by
  ON public.get_ready_vehicles(rejected_by);

CREATE INDEX IF NOT EXISTS idx_get_ready_approval_history_vehicle_id
  ON public.get_ready_approval_history(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_get_ready_approval_history_dealer_id
  ON public.get_ready_approval_history(dealer_id);

CREATE INDEX IF NOT EXISTS idx_get_ready_approval_history_action_by
  ON public.get_ready_approval_history(action_by);

-- =====================================================
-- 5. CREATE APPROVE VEHICLE FUNCTION
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

-- =====================================================
-- 6. CREATE REJECT VEHICLE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.reject_vehicle(
  p_vehicle_id UUID,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
  v_dealer_id BIGINT;
  v_rejecter_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user
  v_rejecter_id := auth.uid();

  IF v_rejecter_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Validate reason is provided
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Rejection reason is required'
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
  IF NOT user_has_group_permission(v_rejecter_id, v_dealer_id, 'get_ready.approve') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions to reject vehicles'
    );
  END IF;

  -- Check if vehicle requires approval
  IF NOT v_vehicle.requires_approval THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle does not require approval'
    );
  END IF;

  -- Update vehicle approval status
  UPDATE public.get_ready_vehicles
  SET
    approval_status = 'rejected',
    rejected_by = v_rejecter_id,
    rejected_at = NOW(),
    rejection_reason = p_reason,
    approval_notes = p_notes,
    approved_by = NULL,
    approved_at = NULL,
    updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- Insert into approval history
  INSERT INTO public.get_ready_approval_history (
    vehicle_id,
    dealer_id,
    action,
    action_by,
    notes,
    reason,
    vehicle_step_id,
    vehicle_workflow_type,
    vehicle_priority
  ) VALUES (
    p_vehicle_id,
    v_dealer_id,
    'rejected',
    v_rejecter_id,
    p_notes,
    p_reason,
    v_vehicle.step_id,
    v_vehicle.workflow_type::TEXT,
    v_vehicle.priority::TEXT
  );

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'vehicle_id', p_vehicle_id,
    'rejected_by', v_rejecter_id,
    'rejected_at', NOW(),
    'reason', p_reason
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 7. CREATE REQUEST APPROVAL FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.request_approval(
  p_vehicle_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle RECORD;
  v_dealer_id BIGINT;
  v_requester_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user
  v_requester_id := auth.uid();

  IF v_requester_id IS NULL THEN
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

  -- Check if user has permission to update vehicle
  IF NOT user_has_group_permission(v_requester_id, v_dealer_id, 'get_ready.update') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions'
    );
  END IF;

  -- Update vehicle to require approval
  UPDATE public.get_ready_vehicles
  SET
    requires_approval = true,
    approval_status = 'pending',
    approval_notes = p_notes,
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
    'pending',
    v_requester_id,
    p_notes,
    v_vehicle.step_id,
    v_vehicle.workflow_type::TEXT,
    v_vehicle.priority::TEXT
  );

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'vehicle_id', p_vehicle_id,
    'approval_status', 'pending'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE public.get_ready_approval_history IS 'History of approval actions for Get Ready vehicles';
COMMENT ON COLUMN public.get_ready_vehicles.requires_approval IS 'Whether this vehicle requires management approval';
COMMENT ON COLUMN public.get_ready_vehicles.approval_status IS 'Current approval status of the vehicle';
COMMENT ON COLUMN public.get_ready_vehicles.approved_by IS 'User who approved the vehicle';
COMMENT ON COLUMN public.get_ready_vehicles.approved_at IS 'Timestamp when vehicle was approved';
COMMENT ON COLUMN public.get_ready_vehicles.approval_notes IS 'Notes added during approval/rejection';
COMMENT ON COLUMN public.get_ready_vehicles.rejected_by IS 'User who rejected the vehicle';
COMMENT ON COLUMN public.get_ready_vehicles.rejected_at IS 'Timestamp when vehicle was rejected';
COMMENT ON COLUMN public.get_ready_vehicles.rejection_reason IS 'Reason for rejection';

COMMENT ON FUNCTION public.approve_vehicle IS 'Approve a vehicle that requires approval';
COMMENT ON FUNCTION public.reject_vehicle IS 'Reject a vehicle with a reason';
COMMENT ON FUNCTION public.request_approval IS 'Request approval for a vehicle';
