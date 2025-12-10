-- Migration: Fix Flexible Schedule Validation (NULL Time Restrictions)
-- Purpose: Remove COALESCE defaults that convert NULL to 15 minutes
-- Bug: NULL values should mean "no time restrictions" but were forced to 15-min buffer
-- Date: December 10, 2024
-- Phase: CRITICAL FIX - Restores flexible schedule functionality

-- ============================================================================
-- PROBLEM STATEMENT
-- ============================================================================
-- The previous implementation used:
--   COALESCE((v_template->>'early_punch_allowed_minutes')::INTEGER, 15)
--
-- This converted NULL values to 15, which means:
-- ❌ Flexible schedules were IMPOSSIBLE to create
-- ❌ All employees got 15-minute buffer (forced default)
-- ❌ No way to allow unrestricted punch-in times
--
-- EXPECTED BEHAVIOR:
-- ✅ NULL = Flexible schedule (can punch in anytime)
-- ✅ 0 = Exact time (must punch at shift start)
-- ✅ 15 = Buffered (15-minute window)

-- ============================================================================
-- PART 1: Replace validation function (remove COALESCE defaults)
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

  -- Check assignment status with specific messages
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

  -- Extract schedule parameters WITHOUT defaults
  -- FIXED: Remove COALESCE to preserve NULL values
  v_shift_start := (v_template->>'shift_start_time')::TIME;
  v_shift_end := (v_template->>'shift_end_time')::TIME;
  v_early_minutes := (v_template->>'early_punch_allowed_minutes')::INTEGER;
  v_late_minutes := (v_template->>'late_punch_grace_minutes')::INTEGER;

  -- FIXED: If shift_start is NULL OR time buffers are NULL, allow punch (flexible schedule)
  -- This is the critical fix - NULL in ANY field means flexible schedule
  IF v_shift_start IS NULL OR v_early_minutes IS NULL OR v_late_minutes IS NULL THEN
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
'Validates if an employee can punch in at a specific dealership with flexible schedule support.
Checks: (1) Assignment exists, (2) Assignment is active (not inactive/suspended),
(3) No open punch at other dealership, (4) Punch time within schedule window OR flexible.
FIXED: Dec 10, 2024 - Removed COALESCE defaults to support NULL=flexible schedules.
NULL values for early/late minutes now correctly allow unrestricted punch-in times.';

-- ============================================================================
-- PART 3: Log migration success
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Flexible Schedule Validation FIXED';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Function: validate_punch_in_assignment() updated';
  RAISE NOTICE 'Critical Fix: Removed COALESCE defaults';
  RAISE NOTICE '';
  RAISE NOTICE 'Behavior Changes:';
  RAISE NOTICE '  • NULL early_punch_allowed_minutes = No time restrictions';
  RAISE NOTICE '  • NULL late_punch_grace_minutes = No time restrictions';
  RAISE NOTICE '  • NULL shift_start_time = Flexible schedule (existing)';
  RAISE NOTICE '';
  RAISE NOTICE 'Example Schedule Types:';
  RAISE NOTICE '  1. Flexible: shift_start=NULL OR early/late=NULL → Punch anytime';
  RAISE NOTICE '  2. Exact: early=0, late=0 → Must punch at shift start';
  RAISE NOTICE '  3. Buffered: early=15, late=15 → 15-minute window';
  RAISE NOTICE '';
  RAISE NOTICE 'Status: CRITICAL FIX - Restores flexible schedule functionality';
  RAISE NOTICE '========================================================';
END $$;
