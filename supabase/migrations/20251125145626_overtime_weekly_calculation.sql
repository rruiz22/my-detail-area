-- Migration: Change overtime calculation from 8h daily to 40h weekly
-- Date: 2025-11-25
-- Author: Detail Hub Team
--
-- OVERVIEW:
-- This migration changes the overtime calculation logic from:
--   OLD: Overtime after 8 hours per DAY
--   NEW: Overtime after 40 hours per WEEK (Monday-Sunday)
--
-- CHANGES:
-- 1. Creates new function: calculate_weekly_overtime()
-- 2. Modifies existing trigger function: calculate_time_entry_hours()
-- 3. Adds performance index for weekly queries
--
-- WEEK DEFINITION:
-- - Week starts: Monday 00:00:00
-- - Week ends: Sunday 23:59:59
-- - Timezone: Uses clock_in timestamptz
--
-- BUSINESS RULES:
-- - First 40 hours per week = regular_hours
-- - Hours beyond 40 = overtime_hours
-- - Partial weeks (new hires) get full 40h allowance
-- - Editing any day recalculates entire week

-- ================================================================
-- STEP 1: Create performance index for weekly queries
-- ================================================================

-- Index on (employee_id, clock_in) for efficient week lookups
-- This is critical since every clock-out will query all entries for that week
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_week
ON detail_hub_time_entries(employee_id, clock_in, dealership_id)
WHERE clock_out IS NOT NULL;

COMMENT ON INDEX idx_time_entries_employee_week IS
'Optimizes weekly overtime calculations by allowing fast lookup of all time entries for an employee within a specific week range';

-- ================================================================
-- STEP 2: Create weekly overtime calculation function
-- ================================================================

CREATE OR REPLACE FUNCTION calculate_weekly_overtime(
  p_employee_id UUID,
  p_week_start_date TIMESTAMPTZ,
  p_dealership_id UUID
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
  -- Calculate week end date (Sunday 23:59:59.999999)
  v_week_end_date := p_week_start_date + INTERVAL '6 days 23 hours 59 minutes 59.999999 seconds';

  -- Log calculation start (for debugging)
  RAISE NOTICE 'Calculating weekly overtime for employee % from % to %',
    p_employee_id, p_week_start_date, v_week_end_date;

  -- Step 1: Calculate total weekly hours
  SELECT COALESCE(SUM(total_hours), 0)
  INTO v_total_weekly_hours
  FROM detail_hub_time_entries
  WHERE employee_id = p_employee_id
    AND dealership_id = p_dealership_id
    AND clock_in >= p_week_start_date
    AND clock_in < v_week_end_date
    AND clock_out IS NOT NULL
    AND status != 'disputed'; -- Exclude disputed entries from calculations

  RAISE NOTICE 'Total weekly hours: %', v_total_weekly_hours;

  -- Step 2: Determine regular vs overtime distribution
  IF v_total_weekly_hours <= 40 THEN
    -- All hours are regular, no overtime
    RAISE NOTICE 'Total <= 40h: All hours are regular';

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
    -- Total > 40h: Distribute first 40h as regular, rest as overtime
    RAISE NOTICE 'Total > 40h: Distributing % overtime hours', v_total_weekly_hours - 40;

    v_remaining_regular_hours := 40;

    -- Loop through entries in chronological order (clock_in)
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
        -- This entire entry is regular hours
        UPDATE detail_hub_time_entries
        SET
          regular_hours = v_entry.total_hours,
          overtime_hours = 0,
          updated_at = NOW()
        WHERE id = v_entry.id;

        v_remaining_regular_hours := v_remaining_regular_hours - v_entry.total_hours;

        RAISE NOTICE 'Entry % (%.2fh): All regular. Remaining regular allowance: %.2fh',
          v_entry.id, v_entry.total_hours, v_remaining_regular_hours;

      ELSIF v_remaining_regular_hours > 0 THEN
        -- This entry spans regular and overtime
        UPDATE detail_hub_time_entries
        SET
          regular_hours = v_remaining_regular_hours,
          overtime_hours = v_entry.total_hours - v_remaining_regular_hours,
          updated_at = NOW()
        WHERE id = v_entry.id;

        RAISE NOTICE 'Entry % (%.2fh): Split into %.2fh regular + %.2fh OT',
          v_entry.id, v_entry.total_hours, v_remaining_regular_hours,
          v_entry.total_hours - v_remaining_regular_hours;

        v_remaining_regular_hours := 0;

      ELSE
        -- All remaining entries are pure overtime
        UPDATE detail_hub_time_entries
        SET
          regular_hours = 0,
          overtime_hours = v_entry.total_hours,
          updated_at = NOW()
        WHERE id = v_entry.id;

        RAISE NOTICE 'Entry % (%.2fh): All overtime',
          v_entry.id, v_entry.total_hours;
      END IF;
    END LOOP;
  END IF;

  RAISE NOTICE 'Weekly overtime calculation complete';

END;
$$;

COMMENT ON FUNCTION calculate_weekly_overtime IS
'Calculates and distributes regular vs overtime hours for all time entries in a given week.
Week definition: Monday 00:00:00 to Sunday 23:59:59.
First 40 hours = regular, hours beyond 40 = overtime.
Distributes chronologically (earlier entries get regular hours first).';

-- ================================================================
-- STEP 3: Modify existing trigger function
-- ================================================================

-- Drop and recreate the trigger function with new weekly logic
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
  -- Only calculate if clock_out is set
  IF NEW.clock_out IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate clock_out is after clock_in
  IF NEW.clock_out <= NEW.clock_in THEN
    RAISE EXCEPTION 'Clock out time must be after clock in time';
  END IF;

  -- Calculate total minutes (clock_out - clock_in)
  v_total_minutes := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;

  -- Subtract break duration
  v_worked_minutes := v_total_minutes - COALESCE(NEW.break_duration_minutes, 0);

  -- Validate worked minutes is positive
  IF v_worked_minutes < 0 THEN
    RAISE EXCEPTION 'Break duration cannot exceed total time worked';
  END IF;

  -- Convert to hours
  v_work_hours := v_worked_minutes / 60.0;

  -- Set total_hours (this is the raw hours worked)
  NEW.total_hours := ROUND(v_work_hours, 2);

  -- 🔴 REMOVED OLD LOGIC: Daily 8-hour overtime calculation
  -- OLD CODE (deleted):
  -- IF v_work_hours <= 8 THEN
  --   NEW.regular_hours := ROUND(v_work_hours, 2);
  --   NEW.overtime_hours := 0;
  -- ELSE
  --   NEW.regular_hours := 8;
  --   NEW.overtime_hours := ROUND(v_work_hours - 8, 2);
  -- END IF;

  -- ✅ NEW LOGIC: Set temporary values, will be recalculated weekly
  -- We temporarily set all hours as regular
  -- The weekly calculation will redistribute them correctly
  NEW.regular_hours := NEW.total_hours;
  NEW.overtime_hours := 0;

  -- Calculate week start (Monday 00:00:00 of the week containing clock_in)
  -- ISO week starts on Monday (day of week 1)
  v_week_start := DATE_TRUNC('week', NEW.clock_in); -- This gives Monday 00:00:00

  -- After this row is saved, trigger weekly recalculation
  -- We use PERFORM to execute a function without needing its return value
  -- This will recalculate ALL entries for this employee in this week
  PERFORM calculate_weekly_overtime(
    NEW.employee_id,
    v_week_start,
    NEW.dealership_id
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION calculate_time_entry_hours IS
'Trigger function that calculates total hours worked and triggers weekly overtime calculation.
Fires on INSERT or UPDATE of clock_out or break_duration_minutes.
Calculates total_hours, then calls calculate_weekly_overtime() to distribute regular vs OT hours.';

-- Verify trigger exists (should already exist from previous migration)
-- If not, create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_calculate_time_entry_hours'
  ) THEN
    CREATE TRIGGER trigger_calculate_time_entry_hours
      BEFORE INSERT OR UPDATE OF clock_out, break_duration_minutes
      ON detail_hub_time_entries
      FOR EACH ROW
      EXECUTE FUNCTION calculate_time_entry_hours();

    RAISE NOTICE 'Created trigger: trigger_calculate_time_entry_hours';
  ELSE
    RAISE NOTICE 'Trigger already exists: trigger_calculate_time_entry_hours';
  END IF;
END;
$$;

-- ================================================================
-- STEP 4: Recalculate existing data (optional but recommended)
-- ================================================================

-- This will recalculate overtime for all existing completed time entries
-- WARNING: This may take a while if you have thousands of records
-- Comment out this section if you prefer to run it separately

DO $$
DECLARE
  v_employee RECORD;
  v_week_start TIMESTAMPTZ;
  v_processed_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of weekly overtime calculations...';

  -- For each unique combination of (employee_id, dealership_id, week)
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
    -- Recalculate overtime for this employee/week combination
    PERFORM calculate_weekly_overtime(
      v_employee.employee_id,
      v_employee.week_start,
      v_employee.dealership_id
    );

    v_processed_count := v_processed_count + 1;

    -- Log progress every 100 weeks
    IF v_processed_count % 100 = 0 THEN
      RAISE NOTICE 'Processed % employee-weeks...', v_processed_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete! Processed % employee-weeks', v_processed_count;
END;
$$;

-- ================================================================
-- STEP 5: Add helper view for weekly summaries (optional)
-- ================================================================

-- Create a view that makes it easy to query weekly totals
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

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: Overtime calculation changed to 40h weekly';
  RAISE NOTICE '   - Created function: calculate_weekly_overtime()';
  RAISE NOTICE '   - Modified trigger: calculate_time_entry_hours()';
  RAISE NOTICE '   - Added index: idx_time_entries_employee_week';
  RAISE NOTICE '   - Created view: detail_hub_weekly_hours';
  RAISE NOTICE '   - Backfilled existing data';
  RAISE NOTICE '';
  RAISE NOTICE 'Week definition: Monday 00:00:00 to Sunday 23:59:59';
  RAISE NOTICE 'Overtime threshold: 40 hours per week';
  RAISE NOTICE 'Editing any day will automatically recalculate the entire week';
END;
$$;
