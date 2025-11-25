-- Migration: Change overtime calculation from 8h daily to 40h weekly
-- Date: 2025-11-25
-- CORRECTED VERSION: Fixed dealership_id type (INTEGER not UUID)

-- ================================================================
-- STEP 1: Create performance index for weekly queries
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_time_entries_employee_week
ON detail_hub_time_entries(employee_id, clock_in, dealership_id)
WHERE clock_out IS NOT NULL;

COMMENT ON INDEX idx_time_entries_employee_week IS
'Optimizes weekly overtime calculations by allowing fast lookup of all time entries for an employee within a specific week range';

-- ================================================================
-- STEP 2: Create weekly overtime calculation function
-- ================================================================
-- 🔴 CORRECTED: dealership_id is INTEGER, not UUID

CREATE OR REPLACE FUNCTION calculate_weekly_overtime(
  p_employee_id UUID,
  p_week_start_date TIMESTAMPTZ,
  p_dealership_id INTEGER  -- 🔴 CORRECTED: INTEGER not UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_end_date TIMESTAMPTZ;
  v_total_weekly_hours NUMERIC;
  v_remaining_regular_hours NUMERIC;
  v_entry RECORD;
BEGIN
  v_week_end_date := p_week_start_date + INTERVAL '6 days 23 hours 59 minutes 59.999999 seconds';

  SELECT COALESCE(SUM(total_hours), 0)
  INTO v_total_weekly_hours
  FROM detail_hub_time_entries
  WHERE employee_id = p_employee_id
    AND dealership_id = p_dealership_id
    AND clock_in >= p_week_start_date
    AND clock_in < v_week_end_date
    AND clock_out IS NOT NULL
    AND status != 'disputed';

  IF v_total_weekly_hours <= 40 THEN
    UPDATE detail_hub_time_entries
    SET
      regular_hours = total_hours,
      overtime_hours = 0,
      updated_at = NOW()
    WHERE employee_id = p_employee_id
      AND dealership_id = p_dealership_id
      AND clock_in >= p_week_start_date
      AND clock_in < v_week_end_date
      AND clock_out IS NOT NULL
      AND status != 'disputed';
  ELSE
    v_remaining_regular_hours := 40;

    FOR v_entry IN (
      SELECT id, total_hours, clock_in
      FROM detail_hub_time_entries
      WHERE employee_id = p_employee_id
        AND dealership_id = p_dealership_id
        AND clock_in >= p_week_start_date
        AND clock_in < v_week_end_date
        AND clock_out IS NOT NULL
        AND status != 'disputed'
      ORDER BY clock_in ASC
    )
    LOOP
      IF v_remaining_regular_hours >= v_entry.total_hours THEN
        UPDATE detail_hub_time_entries
        SET
          regular_hours = v_entry.total_hours,
          overtime_hours = 0,
          updated_at = NOW()
        WHERE id = v_entry.id;

        v_remaining_regular_hours := v_remaining_regular_hours - v_entry.total_hours;
      ELSIF v_remaining_regular_hours > 0 THEN
        UPDATE detail_hub_time_entries
        SET
          regular_hours = v_remaining_regular_hours,
          overtime_hours = v_entry.total_hours - v_remaining_regular_hours,
          updated_at = NOW()
        WHERE id = v_entry.id;

        v_remaining_regular_hours := 0;
      ELSE
        UPDATE detail_hub_time_entries
        SET
          regular_hours = 0,
          overtime_hours = v_entry.total_hours,
          updated_at = NOW()
        WHERE id = v_entry.id;
      END IF;
    END LOOP;
  END IF;
END;
$$;

COMMENT ON FUNCTION calculate_weekly_overtime IS
'Calculates and distributes regular vs overtime hours for all time entries in a given week.
Week definition: Monday 00:00:00 to Sunday 23:59:59.
First 40 hours = regular, hours beyond 40 = overtime.
Distributes chronologically (earlier entries get regular hours first).
NOTE: dealership_id is INTEGER (matches detail_hub_time_entries.dealership_id type)';

-- ================================================================
-- STEP 3: Modify existing trigger function
-- ================================================================

CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_minutes INTEGER;
  v_worked_minutes INTEGER;
  v_work_hours NUMERIC;
  v_week_start TIMESTAMPTZ;
BEGIN
  IF NEW.clock_out IS NULL THEN RETURN NEW; END IF;

  IF NEW.clock_out <= NEW.clock_in THEN
    RAISE EXCEPTION 'Clock out time must be after clock in time';
  END IF;

  v_total_minutes := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;
  v_worked_minutes := v_total_minutes - COALESCE(NEW.break_duration_minutes, 0);

  IF v_worked_minutes < 0 THEN
    RAISE EXCEPTION 'Break duration cannot exceed total time worked';
  END IF;

  v_work_hours := v_worked_minutes / 60.0;
  NEW.total_hours := ROUND(v_work_hours, 2);
  NEW.regular_hours := NEW.total_hours;
  NEW.overtime_hours := 0;

  v_week_start := DATE_TRUNC('week', NEW.clock_in);

  PERFORM calculate_weekly_overtime(
    NEW.employee_id,
    v_week_start,
    NEW.dealership_id  -- INTEGER (no cast needed)
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION calculate_time_entry_hours IS
'Trigger function that calculates total hours worked and triggers weekly overtime calculation.
Fires on INSERT or UPDATE of clock_out or break_duration_minutes.
Calculates total_hours, then calls calculate_weekly_overtime() to distribute regular vs OT hours.';

-- Drop old trigger if exists (may have different name from previous migration)
DO $$
BEGIN
  -- Drop old trigger if it exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'calculate_time_entry_hours_trigger'
      AND tgrelid = 'detail_hub_time_entries'::regclass
  ) THEN
    DROP TRIGGER calculate_time_entry_hours_trigger ON detail_hub_time_entries;
    RAISE NOTICE 'Dropped old trigger: calculate_time_entry_hours_trigger';
  END IF;

  -- Create new trigger with updated logic
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_calculate_time_entry_hours'
      AND tgrelid = 'detail_hub_time_entries'::regclass
  ) THEN
    CREATE TRIGGER trigger_calculate_time_entry_hours
      BEFORE INSERT OR UPDATE OF clock_out, break_duration_minutes
      ON detail_hub_time_entries
      FOR EACH ROW
      EXECUTE FUNCTION calculate_time_entry_hours();

    RAISE NOTICE 'Created new trigger: trigger_calculate_time_entry_hours';
  ELSE
    RAISE NOTICE 'Trigger already exists: trigger_calculate_time_entry_hours';
  END IF;
END;
$$;

-- ================================================================
-- STEP 4: Recalculate existing data (backfill)
-- ================================================================

DO $$
DECLARE
  v_employee RECORD;
  v_processed_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of weekly overtime calculations...';

  -- 🔴 CORRECTED: No type casting needed, using native types
  FOR v_employee IN (
    SELECT DISTINCT
      employee_id,
      dealership_id,
      DATE_TRUNC('week', clock_in) as week_start
    FROM detail_hub_time_entries
    WHERE clock_out IS NOT NULL
      AND status != 'disputed'
    ORDER BY week_start ASC
  )
  LOOP
    PERFORM calculate_weekly_overtime(
      v_employee.employee_id,
      v_employee.week_start,
      v_employee.dealership_id
    );

    v_processed_count := v_processed_count + 1;

    IF v_processed_count % 100 = 0 THEN
      RAISE NOTICE 'Processed % employee-weeks...', v_processed_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete! Processed % employee-weeks', v_processed_count;
END;
$$;

-- ================================================================
-- STEP 5: Add helper view for weekly summaries
-- ================================================================

CREATE OR REPLACE VIEW detail_hub_weekly_hours AS
SELECT
  employee_id,
  dealership_id,
  DATE_TRUNC('week', clock_in) as week_start,
  DATE_TRUNC('week', clock_in) + INTERVAL '6 days' as week_end,
  COUNT(*) as total_entries,
  SUM(total_hours) as total_hours,
  SUM(regular_hours) as total_regular_hours,
  SUM(overtime_hours) as total_overtime_hours,
  MIN(clock_in) as first_clock_in,
  MAX(clock_out) as last_clock_out
FROM detail_hub_time_entries
WHERE clock_out IS NOT NULL
  AND status != 'disputed'
GROUP BY employee_id, dealership_id, DATE_TRUNC('week', clock_in)
ORDER BY week_start DESC, employee_id;

COMMENT ON VIEW detail_hub_weekly_hours IS
'Aggregated view of employee hours by week (Monday-Sunday).
Shows total hours, regular hours, and overtime hours per employee per week.
Useful for payroll processing and reporting.';

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: Overtime calculation changed to 40h weekly';
  RAISE NOTICE '   - Created function: calculate_weekly_overtime(UUID, TIMESTAMPTZ, INTEGER)';
  RAISE NOTICE '   - Modified trigger: calculate_time_entry_hours()';
  RAISE NOTICE '   - Added index: idx_time_entries_employee_week';
  RAISE NOTICE '   - Created view: detail_hub_weekly_hours';
  RAISE NOTICE '   - Backfilled existing data';
  RAISE NOTICE '';
  RAISE NOTICE 'Week definition: Monday 00:00:00 to Sunday 23:59:59';
  RAISE NOTICE 'Overtime threshold: 40 hours per week';
  RAISE NOTICE 'Editing any day will automatically recalculate the entire week';
  RAISE NOTICE '';
  RAISE NOTICE '🔴 CORRECTED: dealership_id type fixed (INTEGER not UUID)';
END;
$$;
