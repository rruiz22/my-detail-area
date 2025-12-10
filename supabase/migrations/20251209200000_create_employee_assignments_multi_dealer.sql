-- Migration: Multi-Dealer Employee Assignments
-- Purpose: Allow employees to work across multiple dealerships with different schedules
-- Version: v1.0 - December 9, 2024
-- CRITICAL: Payroll system - extreme caution required
-- STATUS: ⏳ Pending review

-- ============================================================================
-- PART 1: Create detail_hub_employee_assignments table
-- ============================================================================

-- This table creates a many-to-many relationship between employees and dealerships
-- Each assignment can have its own schedule template, allowing employees to work
-- different hours at different dealerships

CREATE TABLE IF NOT EXISTS detail_hub_employee_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  employee_id UUID NOT NULL REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Schedule template specific to this dealership assignment
  -- Contains: shift times, allowed days, punch windows, break rules
  schedule_template JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Whether to auto-generate schedules for this assignment
  auto_generate_schedules BOOLEAN DEFAULT false,
  schedule_generation_days_ahead INTEGER DEFAULT 30,

  -- Assignment status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'suspended')),

  -- Assignment metadata
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  notes TEXT,

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business rules
  CONSTRAINT unique_employee_dealership UNIQUE (employee_id, dealership_id),
  CONSTRAINT valid_schedule_template CHECK (
    schedule_template IS NULL OR jsonb_typeof(schedule_template) = 'object'
  )
);

-- ============================================================================
-- PART 2: Indexes for performance
-- ============================================================================

-- Query assignments by employee
CREATE INDEX IF NOT EXISTS idx_employee_assignments_employee
  ON detail_hub_employee_assignments(employee_id);

-- Query assignments by dealership
CREATE INDEX IF NOT EXISTS idx_employee_assignments_dealership
  ON detail_hub_employee_assignments(dealership_id);

-- Filter by active status (most common query)
CREATE INDEX IF NOT EXISTS idx_employee_assignments_active
  ON detail_hub_employee_assignments(status) WHERE status = 'active';

-- Compound index for quick lookups during punch validation
CREATE INDEX IF NOT EXISTS idx_employee_assignments_lookup
  ON detail_hub_employee_assignments(employee_id, dealership_id, status);

-- ============================================================================
-- PART 3: Enable Row Level Security
-- ============================================================================

ALTER TABLE detail_hub_employee_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assignments for their dealerships
CREATE POLICY "Users can view assignments for their dealerships"
  ON detail_hub_employee_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = detail_hub_employee_assignments.dealership_id
        AND dm.user_id = auth.uid()
    )
  );

-- Policy: Managers can create assignments for their dealerships
CREATE POLICY "Managers can create assignments"
  ON detail_hub_employee_assignments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = detail_hub_employee_assignments.dealership_id
        AND dm.user_id = auth.uid()
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Managers can update assignments for their dealerships
CREATE POLICY "Managers can update assignments"
  ON detail_hub_employee_assignments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = detail_hub_employee_assignments.dealership_id
        AND dm.user_id = auth.uid()
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Managers can delete assignments for their dealerships
CREATE POLICY "Managers can delete assignments"
  ON detail_hub_employee_assignments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = detail_hub_employee_assignments.dealership_id
        AND dm.user_id = auth.uid()
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Allow kiosks to read assignments for validation (unauthenticated)
CREATE POLICY "Kiosks can read assignments for validation"
  ON detail_hub_employee_assignments
  FOR SELECT
  USING (true);

-- ============================================================================
-- PART 4: Triggers for automatic timestamp updates
-- ============================================================================

CREATE OR REPLACE FUNCTION update_employee_assignment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employee_assignment_updated_at
  BEFORE UPDATE ON detail_hub_employee_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_assignment_updated_at();

-- ============================================================================
-- PART 5: Validation function for punch-in with assignment
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
  -- VALIDATION 1: Check if employee has active assignment for this dealership
  -- ========================================================================
  SELECT * INTO v_assignment
  FROM detail_hub_employee_assignments
  WHERE employee_id = p_employee_id
    AND dealership_id = p_dealership_id
    AND status = 'active'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      'Employee not assigned to this dealership',
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
-- PART 6: Migrate existing employees to assignments table
-- ============================================================================

-- This migration preserves all existing employee-dealership relationships
-- and moves schedule templates to the new assignments table

INSERT INTO detail_hub_employee_assignments (
  employee_id,
  dealership_id,
  schedule_template,
  auto_generate_schedules,
  schedule_generation_days_ahead,
  status,
  assigned_at,
  created_at
)
SELECT
  id as employee_id,
  dealership_id,
  COALESCE(schedule_template, '{}'::jsonb) as schedule_template,
  COALESCE(auto_generate_schedules, false) as auto_generate_schedules,
  COALESCE(schedule_generation_days_ahead, 30) as schedule_generation_days_ahead,
  'active' as status,
  created_at as assigned_at,
  created_at
FROM detail_hub_employees
WHERE dealership_id IS NOT NULL
  AND NOT EXISTS (
    -- Prevent duplicate migration if script runs twice
    SELECT 1 FROM detail_hub_employee_assignments
    WHERE employee_id = detail_hub_employees.id
      AND dealership_id = detail_hub_employees.dealership_id
  );

-- ============================================================================
-- PART 7: Add helpful comments
-- ============================================================================

COMMENT ON TABLE detail_hub_employee_assignments IS
'Multi-dealer employee assignments. Allows employees to work at multiple dealerships with different schedules per location.';

COMMENT ON COLUMN detail_hub_employee_assignments.schedule_template IS
'JSONB containing shift times, work days, punch windows, and break rules specific to this dealership assignment.';

COMMENT ON COLUMN detail_hub_employee_assignments.status IS
'active: Employee can punch in | inactive: Assignment disabled | suspended: Temporarily disabled';

COMMENT ON FUNCTION validate_punch_in_assignment IS
'Validates if an employee can punch in at a specific dealership. Checks: (1) Active assignment exists, (2) No open punch at other dealership, (3) Punch time within schedule window.';

-- ============================================================================
-- PART 8: Log migration success
-- ============================================================================

DO $$
DECLARE
  v_migrated_count INTEGER;
  v_total_employees INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_migrated_count FROM detail_hub_employee_assignments;
  SELECT COUNT(*) INTO v_total_employees FROM detail_hub_employees WHERE dealership_id IS NOT NULL;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Multi-Dealer Assignment Migration Complete';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Total employees: %', v_total_employees;
  RAISE NOTICE 'Assignments created: %', v_migrated_count;
  RAISE NOTICE 'Table: detail_hub_employee_assignments';
  RAISE NOTICE 'Status: Ready for multi-dealer support';
  RAISE NOTICE '===========================================';
END $$;

-- ============================================================================
-- MIGRATION NOTES:
-- ============================================================================
-- 1. This migration is NON-BREAKING:
--    - Does NOT modify detail_hub_employees table
--    - Does NOT modify detail_hub_time_entries table
--    - Existing code continues to work unchanged
--
-- 2. Next steps (to be done in separate migrations/code updates):
--    - Update frontend to use assignments table
--    - Update punch-in logic to call validate_punch_in_assignment()
--    - Add UI for managing employee assignments
--    - Eventually deprecate dealership_id in detail_hub_employees
--
-- 3. Rollback plan:
--    - DROP TABLE detail_hub_employee_assignments CASCADE;
--    - DROP FUNCTION validate_punch_in_assignment;
--
-- 4. Testing checklist:
--    □ Verify RLS policies work correctly
--    □ Test validation function with various scenarios
--    □ Ensure migrated data matches source
--    □ Test assignment CRUD operations
--    □ Verify kiosk can read assignments (unauthenticated)
-- ============================================================================
