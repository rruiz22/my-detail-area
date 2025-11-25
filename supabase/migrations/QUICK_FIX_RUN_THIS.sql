-- 🔥 QUICK FIX: Run this in Supabase SQL Editor
-- This fixes the type casting error and completes the backfill

-- Step 1: Verify function exists (should already exist from your previous run)
SELECT
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Function exists - ready to backfill'
    ELSE '❌ Function missing - run main migration first'
  END as status
FROM pg_proc
WHERE proname = 'calculate_weekly_overtime';

-- Step 2: Run backfill with explicit type casts
DO $$
DECLARE
  v_employee RECORD;
  v_processed_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Starting backfill with type casts...';

  FOR v_employee IN (
    SELECT DISTINCT
      employee_id::UUID as employee_id,
      dealership_id::UUID as dealership_id,
      DATE_TRUNC('week', clock_in)::TIMESTAMPTZ as week_start
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

    IF v_processed_count % 50 = 0 THEN
      RAISE NOTICE '   Processed % employee-weeks...', v_processed_count;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Backfill complete! Processed % employee-weeks', v_processed_count;
END;
$$;

-- Step 3: Verify results
SELECT
  COUNT(*) as total_entries,
  ROUND(SUM(total_hours)::NUMERIC, 2) as total_hours,
  ROUND(SUM(regular_hours)::NUMERIC, 2) as regular_hours,
  ROUND(SUM(overtime_hours)::NUMERIC, 2) as overtime_hours,
  COUNT(*) FILTER (WHERE overtime_hours > 0) as entries_with_ot
FROM detail_hub_time_entries
WHERE clock_out IS NOT NULL
  AND status != 'disputed';

-- Step 4: Show sample of recalculated data
SELECT
  employee_id,
  DATE_TRUNC('week', clock_in)::DATE as week_start,
  COUNT(*) as entries,
  ROUND(SUM(total_hours)::NUMERIC, 2) as total_hours,
  ROUND(SUM(regular_hours)::NUMERIC, 2) as regular_hours,
  ROUND(SUM(overtime_hours)::NUMERIC, 2) as overtime_hours
FROM detail_hub_time_entries
WHERE clock_out IS NOT NULL
  AND status != 'disputed'
GROUP BY employee_id, DATE_TRUNC('week', clock_in)
HAVING SUM(overtime_hours) > 0
ORDER BY SUM(overtime_hours) DESC
LIMIT 10;
