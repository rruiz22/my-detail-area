-- Migration: Consolidate Schedule Configuration to Assignments Only
-- Date: 2024-12-10
-- Purpose: Remove schedule_template from detail_hub_employees and use only
--          detail_hub_employee_assignments.schedule_template as single source of truth
--
-- Context: Previously had two sources of truth for schedules which caused sync conflicts:
--   1. detail_hub_employees.schedule_template (DEPRECATED - being removed)
--   2. detail_hub_employee_assignments.schedule_template (ACTIVE - single source)

-- =====================================================
-- STEP 1: Deprecate Employee Schedule Template Column
-- =====================================================

COMMENT ON COLUMN detail_hub_employees.schedule_template IS
'DEPRECATED (2024-12-10): Schedule configuration moved to detail_hub_employee_assignments.schedule_template.
This column is no longer used. Configure schedules via Assignments tab instead.';

COMMENT ON COLUMN detail_hub_employees.auto_generate_schedules IS
'DEPRECATED (2024-12-10): No longer used. Schedules are configured per-assignment in detail_hub_employee_assignments.';

COMMENT ON COLUMN detail_hub_employees.schedule_generation_days_ahead IS
'DEPRECATED (2024-12-10): No longer used. Schedules are configured per-assignment in detail_hub_employee_assignments.';

-- =====================================================
-- STEP 2: Ensure All Employees Have At Least One Assignment
-- =====================================================

-- For employees without any assignments, create a default assignment
-- using their original dealership_id and schedule_template
INSERT INTO detail_hub_employee_assignments (
  employee_id,
  dealership_id,
  schedule_template,
  status,
  notes,
  created_at,
  updated_at
)
SELECT
  e.id AS employee_id,
  e.dealership_id,
  -- Copy schedule template from employee to assignment
  COALESCE(e.schedule_template, '{}'::jsonb) AS schedule_template,
  'active' AS status,
  'Migrated from employee default schedule (2024-12-10)' AS notes,
  NOW() AS created_at,
  NOW() AS updated_at
FROM detail_hub_employees e
WHERE
  -- Only employees that don't have any assignments yet
  e.id NOT IN (
    SELECT DISTINCT employee_id
    FROM detail_hub_employee_assignments
  )
  -- And have a dealership assigned
  AND e.dealership_id IS NOT NULL
ON CONFLICT (employee_id, dealership_id) DO NOTHING;

-- =====================================================
-- STEP 3: Update Existing Assignments With Empty/Null Schedules
-- =====================================================

-- For assignments that have empty schedule_template,
-- inherit from employee's schedule_template if it exists
UPDATE detail_hub_employee_assignments a
SET
  schedule_template = COALESCE(e.schedule_template, a.schedule_template, '{}'::jsonb),
  updated_at = NOW()
FROM detail_hub_employees e
WHERE
  a.employee_id = e.id
  -- Only update if assignment has no schedule OR has empty schedule
  AND (
    a.schedule_template IS NULL
    OR a.schedule_template = '{}'::jsonb
    OR NOT (a.schedule_template ? 'shift_start_time') -- Missing critical keys
  )
  -- And employee has a schedule to copy
  AND e.schedule_template IS NOT NULL
  AND e.schedule_template != '{}'::jsonb;

-- =====================================================
-- STEP 4: Add Helpful Comments
-- =====================================================

COMMENT ON TABLE detail_hub_employee_assignments IS
'Employee-to-dealership assignments with schedule configuration.
This table is the SINGLE SOURCE OF TRUTH for employee schedules.
Each employee can work at multiple dealerships with different schedules per location.';

COMMENT ON COLUMN detail_hub_employee_assignments.schedule_template IS
'JSONB containing complete schedule configuration for this assignment:
- shift_start_time (TIME): Shift start time (e.g., "08:00")
- shift_end_time (TIME): Shift end time (e.g., "17:00")
- days_of_week (INTEGER[]): Work days as numbers 0-6 (0=Sunday, 6=Saturday)
- early_punch_allowed_minutes (INTEGER|NULL): Minutes employee can clock in early (NULL = no restriction)
- late_punch_grace_minutes (INTEGER|NULL): Minutes grace period for late clock in (NULL = no restriction)
- required_break_minutes (INTEGER): Required break duration in minutes
- break_is_paid (BOOLEAN): Whether break is paid
- auto_close_enabled (BOOLEAN): Enable auto-close for forgotten punches
- auto_close_first_reminder (INTEGER): First reminder minutes after shift end
- auto_close_second_reminder (INTEGER): Second reminder minutes after shift end
- auto_close_window_minutes (INTEGER): Auto-close window duration

This is the authoritative source for all kiosk punch-in validations.';

-- =====================================================
-- VERIFICATION QUERIES (for manual verification after migration)
-- =====================================================

-- Check employees without assignments (should be 0 if all have dealerships)
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM detail_hub_employees e
  WHERE e.dealership_id IS NOT NULL
    AND e.id NOT IN (SELECT DISTINCT employee_id FROM detail_hub_employee_assignments);

  IF orphan_count > 0 THEN
    RAISE NOTICE 'Found % employees with dealerships but no assignments', orphan_count;
  ELSE
    RAISE NOTICE 'All employees with dealerships have at least one assignment ✓';
  END IF;
END $$;

-- Check assignments with empty schedules (should minimize after migration)
DO $$
DECLARE
  empty_schedule_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO empty_schedule_count
  FROM detail_hub_employee_assignments
  WHERE schedule_template IS NULL
     OR schedule_template = '{}'::jsonb
     OR NOT (schedule_template ? 'shift_start_time');

  IF empty_schedule_count > 0 THEN
    RAISE NOTICE 'Found % assignments with empty schedules - these may need manual configuration', empty_schedule_count;
  ELSE
    RAISE NOTICE 'All assignments have schedule configuration ✓';
  END IF;
END $$;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 20251210050000 completed successfully';
  RAISE NOTICE 'Schedule configuration consolidated to detail_hub_employee_assignments table';
  RAISE NOTICE 'Employee schedule_template column deprecated but preserved for rollback';
END $$;
