-- Migration: Fix NULL Punch Window Validation Logic
-- Date: 2024-12-10
-- Purpose: Correct validation to respect individual early/late punch settings when one is NULL
--
-- BUG IDENTIFIED:
-- Current logic treats schedule as "flexible" if ANY field is NULL (early OR late)
-- This incorrectly allows employees to punch at any time even when restrictions are defined
--
-- EXAMPLE BUG:
-- Employee: early_punch = 10 minutes, late_punch = NULL
-- Current behavior: "Flexible schedule" → Can punch anytime ❌ WRONG
-- Expected behavior: Can punch from 07:50 onwards (respects early_punch) ✅ CORRECT
--
-- ============================================================================
-- CORRECTED VALIDATION LOGIC
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

  -- Check assignment status
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
  v_shift_start := (v_template->>'shift_start_time')::TIME;

  -- CRITICAL FIX: Only flexible if NO shift_start_time is defined
  -- Having shift_start means there's a schedule, even if early/late are NULL
  IF v_shift_start IS NULL THEN
    RETURN QUERY SELECT
      TRUE,
      'Allowed - flexible schedule (no shift time defined)',
      v_assignment.id;
    RETURN;
  END IF;

  -- Extract time window settings (NULL = no limit in that direction)
  v_early_minutes := (v_template->>'early_punch_allowed_minutes')::INTEGER;
  v_late_minutes := (v_template->>'late_punch_grace_minutes')::INTEGER;
  v_punch_time := p_punch_time::TIME;

  -- Calculate earliest allowed time
  -- NULL early_minutes = can punch in from start of day
  IF v_early_minutes IS NULL THEN
    v_earliest_allowed := '00:00:00'::TIME;  -- No early restriction
  ELSE
    v_earliest_allowed := v_shift_start - (v_early_minutes || ' minutes')::INTERVAL;
  END IF;

  -- Calculate latest allowed time
  -- NULL late_minutes = can punch in until end of day
  IF v_late_minutes IS NULL THEN
    v_latest_allowed := '23:59:59'::TIME;  -- No late restriction
  ELSE
    v_latest_allowed := v_shift_start + (v_late_minutes || ' minutes')::INTERVAL;
  END IF;

  -- Validate punch time is within window
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
-- UPDATE FUNCTION COMMENT
-- ============================================================================

COMMENT ON FUNCTION validate_punch_in_assignment IS
'Validates if an employee can punch in at a specific dealership with proper NULL handling.
Checks: (1) Assignment exists, (2) Assignment is active, (3) No open punch at other dealership,
(4) Punch time within schedule window.

FIXED: Dec 10, 2024 (v2) - Corrected NULL handling for punch windows:
- shift_start_time = NULL → Flexible schedule (no time restrictions)
- early_punch_allowed_minutes = NULL → No early limit (can punch from 00:00)
- late_punch_grace_minutes = NULL → No late limit (can punch until 23:59)
- Both defined → Strict window validation

Examples:
1. shift_start=08:00, early=10, late=15 → Window: 07:50-08:15
2. shift_start=08:00, early=10, late=NULL → Window: 07:50-23:59 (no late limit)
3. shift_start=08:00, early=NULL, late=15 → Window: 00:00-08:15 (no early limit)
4. shift_start=NULL → Flexible schedule (can punch anytime)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'NULL Punch Window Validation FIXED (v2)';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Function: validate_punch_in_assignment() updated';
  RAISE NOTICE 'Critical Fix: Individual NULL handling for early/late punch';
  RAISE NOTICE '';
  RAISE NOTICE 'New Behavior:';
  RAISE NOTICE '  • shift_start = NULL → Flexible (no schedule defined)';
  RAISE NOTICE '  • early_punch = NULL → No early restriction (00:00)';
  RAISE NOTICE '  • late_punch = NULL → No late restriction (23:59)';
  RAISE NOTICE '  • Both defined → Strict window enforcement';
  RAISE NOTICE '';
  RAISE NOTICE 'Bug Fixed:';
  RAISE NOTICE '  Before: early=10, late=NULL → "Flexible" (WRONG)';
  RAISE NOTICE '  After: early=10, late=NULL → Window 07:50-23:59 (CORRECT)';
  RAISE NOTICE '========================================================';
END $$;
