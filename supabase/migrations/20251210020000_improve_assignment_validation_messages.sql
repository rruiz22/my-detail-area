-- Migration: Improve Assignment Validation Messages
-- Purpose: Provide specific error messages for inactive/suspended assignments
-- Date: December 10, 2024
-- Phase: FASE 3.1 - Enhancement (non-breaking)

-- ============================================================================
-- PART 1: Replace validation function with improved messages
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_punch_in_assignment(
  p_employee_id UUID,
  p_dealership_id INTEGER,
  p_kiosk_id UUID,
  p_punch_time TIMESTAMPTZ
) RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  assignment_id UUID
) AS $$
DECLARE
  v_assignment RECORD;
  v_template JSONB;
  v_open_punch RECORD;
  v_shift_start TIME;
  v_shift_end TIME;
  v_early_minutes INTEGER;
  v_late_minutes INTEGER;
  v_punch_time TIME;
  v_earliest_allowed TIME;
  v_latest_allowed TIME;
BEGIN
  -- ========================================================================
  -- VALIDATION 1: Check if employee has assignment for this dealership
  -- ========================================================================
  -- IMPROVED: Now checks for ANY status first, then validates status separately
  SELECT * INTO v_assignment
  FROM detail_hub_employee_assignments
  WHERE employee_id = p_employee_id
    AND dealership_id = p_dealership_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      'Employee not assigned to this dealership',
      NULL::UUID;
    RETURN;
  END IF;

  -- IMPROVED: Check assignment status with specific messages
  IF v_assignment.status = 'inactive' THEN
    RETURN QUERY SELECT
      FALSE,
      'Assignment is inactive. Contact manager to reactivate.',
      NULL::UUID;
    RETURN;
  ELSIF v_assignment.status = 'suspended' THEN
    RETURN QUERY SELECT
      FALSE,
      'Assignment is suspended. Contact manager.',
      NULL::UUID;
    RETURN;
  ELSIF v_assignment.status != 'active' THEN
    RETURN QUERY SELECT
      FALSE,
      format('Assignment status is %s. Contact manager.', v_assignment.status),
      NULL::UUID;
    RETURN;
  END IF;

  -- ========================================================================
  -- VALIDATION 2: Check for open punch at DIFFERENT dealership
  -- ========================================================================
  -- Business rule: Employee cannot be clocked in at two dealerships simultaneously
  SELECT * INTO v_open_punch
  FROM detail_hub_time_entries
  WHERE employee_id = p_employee_id
    AND clock_out IS NULL
    AND status = 'active'
    AND dealership_id != p_dealership_id;

  IF FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      'Employee has open punch at another dealership. Must clock out first.',
      NULL::UUID;
    RETURN;
  END IF;

  -- ========================================================================
  -- VALIDATION 3: Validate punch time against schedule template
  -- ========================================================================
  v_template := v_assignment.schedule_template;

  -- Extract schedule parameters from template
  v_shift_start := (v_template->>'shift_start_time')::TIME;
  v_shift_end := (v_template->>'shift_end_time')::TIME;
  v_early_minutes := COALESCE((v_template->>'early_punch_allowed_minutes')::INTEGER, 15);
  v_late_minutes := COALESCE((v_template->>'late_punch_grace_minutes')::INTEGER, 15);

  -- If no schedule template defined, allow punch (flexible schedule)
  IF v_shift_start IS NULL THEN
    RETURN QUERY SELECT
      TRUE,
      'Allowed - flexible schedule',
      v_assignment.id;
    RETURN;
  END IF;

  -- Calculate punch time windows
  v_punch_time := p_punch_time::TIME;
  v_earliest_allowed := v_shift_start - (v_early_minutes || ' minutes')::INTERVAL;
  v_latest_allowed := v_shift_start + (v_late_minutes || ' minutes')::INTERVAL;

  -- Check if punch is within allowed window
  IF v_punch_time < v_earliest_allowed THEN
    RETURN QUERY SELECT
      FALSE,
      format('Too early. Earliest allowed: %s (shift starts at %s)',
             v_earliest_allowed, v_shift_start),
      NULL::UUID;
    RETURN;
  END IF;

  IF v_punch_time > v_latest_allowed THEN
    RETURN QUERY SELECT
      FALSE,
      format('Too late. Latest allowed: %s (shift starts at %s)',
             v_latest_allowed, v_shift_start),
      NULL::UUID;
    RETURN;
  END IF;

  -- ========================================================================
  -- ALL VALIDATIONS PASSED
  -- ========================================================================
  RETURN QUERY SELECT
    TRUE,
    'Allowed',
    v_assignment.id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 2: Update function comment
-- ============================================================================

COMMENT ON FUNCTION validate_punch_in_assignment IS
'Validates if an employee can punch in at a specific dealership with improved status messages.
Checks: (1) Assignment exists, (2) Assignment is active (not inactive/suspended),
(3) No open punch at other dealership, (4) Punch time within schedule window.
Updated: Dec 10, 2024 - Added specific messages for inactive/suspended status.';

-- ============================================================================
-- PART 3: Log migration success
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Assignment Validation Messages Improved';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Function: validate_punch_in_assignment() updated';
  RAISE NOTICE 'Improvement: Specific error messages for status types';
  RAISE NOTICE 'New messages:';
  RAISE NOTICE '  - "Assignment is inactive. Contact manager to reactivate."';
  RAISE NOTICE '  - "Assignment is suspended. Contact manager."';
  RAISE NOTICE 'Status: Non-breaking change (backward compatible)';
  RAISE NOTICE '========================================================';
END $$;
