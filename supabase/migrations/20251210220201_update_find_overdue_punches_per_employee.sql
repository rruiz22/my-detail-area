-- =====================================================
-- Update find_overdue_punches() - Per-Employee Configuration Only
-- =====================================================
-- Migration Purpose: Update RPC function to read auto-close config EXCLUSIVELY from employee schedule_template
-- NO fallback to dealership config - if employee doesn't have auto_close_enabled, they are excluded

DROP FUNCTION IF EXISTS find_overdue_punches(INTEGER, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS find_overdue_punches(INTEGER);

CREATE OR REPLACE FUNCTION find_overdue_punches(
  p_dealership_id INTEGER
)
RETURNS TABLE (
  time_entry_id UUID,
  employee_id UUID,
  employee_name TEXT,
  employee_phone TEXT,
  dealership_id INTEGER,
  clock_in TIMESTAMPTZ,
  shift_end_time TIME,
  shift_end_datetime TIMESTAMPTZ,
  minutes_overdue INTEGER,
  action TEXT,
  reminder_count INTEGER,
  last_reminder_at TIMESTAMPTZ,
  employee_first_reminder INTEGER,
  employee_second_reminder INTEGER,
  employee_auto_close_window INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH entry_details AS (
    SELECT
      te.id AS time_entry_id,
      te.employee_id,
      (emp.first_name || ' ' || emp.last_name) AS employee_name,
      emp.phone AS employee_phone,
      te.dealership_id,
      te.clock_in,
      (a.schedule_template->>'shift_end_time')::TIME AS shift_end_time,
      (DATE(te.clock_in) + (a.schedule_template->>'shift_end_time')::TIME) AS shift_end_datetime,
      EXTRACT(EPOCH FROM (
        NOW() - (DATE(te.clock_in) + (a.schedule_template->>'shift_end_time')::TIME)
      ))::INTEGER / 60 AS minutes_overdue,
      -- Extract employee-specific auto-close settings (NO DEALERSHIP FALLBACK)
      COALESCE((a.schedule_template->>'auto_close_first_reminder')::INTEGER, 30) AS first_reminder_threshold,
      COALESCE((a.schedule_template->>'auto_close_second_reminder')::INTEGER, 60) AS second_reminder_threshold,
      COALESCE((a.schedule_template->>'auto_close_window_minutes')::INTEGER, 120) AS auto_close_threshold,
      -- Check if auto-close is enabled for this employee (default: false)
      COALESCE((a.schedule_template->>'auto_close_enabled')::BOOLEAN, false) AS auto_close_enabled
    FROM detail_hub_time_entries te
    INNER JOIN detail_hub_employees emp
      ON emp.id = te.employee_id
    INNER JOIN detail_hub_employee_assignments a
      ON a.employee_id = te.employee_id
      AND a.dealership_id = te.dealership_id
      AND a.status = 'active'
    WHERE te.dealership_id = p_dealership_id
      AND te.clock_out IS NULL
      AND te.status = 'active'
      AND (a.schedule_template->>'shift_end_time') IS NOT NULL
      AND NOW() > (DATE(te.clock_in) + (a.schedule_template->>'shift_end_time')::TIME)
      -- CRITICAL: Only process employees with auto-close ENABLED
      AND COALESCE((a.schedule_template->>'auto_close_enabled')::BOOLEAN, false) = true
  ),
  reminder_stats AS (
    SELECT
      r.time_entry_id,
      COUNT(*) AS reminder_count,
      MAX(r.sent_at) AS last_reminder_at
    FROM detail_hub_punch_out_reminders r
    GROUP BY r.time_entry_id
  )
  SELECT
    ed.time_entry_id,
    ed.employee_id,
    ed.employee_name,
    ed.employee_phone,
    ed.dealership_id,
    ed.clock_in,
    ed.shift_end_time,
    ed.shift_end_datetime,
    ed.minutes_overdue,
    -- Determine action using employee-specific thresholds
    CASE
      WHEN COALESCE(rs.reminder_count, 0) = 0
           AND ed.minutes_overdue >= ed.first_reminder_threshold
      THEN 'first_reminder'
      WHEN rs.reminder_count = 1
           AND ed.minutes_overdue >= ed.second_reminder_threshold
      THEN 'second_reminder'
      WHEN ed.minutes_overdue >= ed.auto_close_threshold
      THEN 'auto_close'
      ELSE NULL
    END AS action,
    COALESCE(rs.reminder_count, 0) AS reminder_count,
    rs.last_reminder_at,
    ed.first_reminder_threshold AS employee_first_reminder,
    ed.second_reminder_threshold AS employee_second_reminder,
    ed.auto_close_threshold AS employee_auto_close_window
  FROM entry_details ed
  LEFT JOIN reminder_stats rs ON rs.time_entry_id = ed.time_entry_id
  WHERE
    -- Only return entries that require action
    CASE
      WHEN COALESCE(rs.reminder_count, 0) = 0
           AND ed.minutes_overdue >= ed.first_reminder_threshold
      THEN true
      WHEN rs.reminder_count = 1
           AND ed.minutes_overdue >= ed.second_reminder_threshold
      THEN true
      WHEN ed.minutes_overdue >= ed.auto_close_threshold
      THEN true
      ELSE false
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION find_overdue_punches(INTEGER) IS
'Finds time entries that are overdue for punch-out reminders or auto-close.
ONLY processes employees with auto_close_enabled = true in their schedule_template.
Returns employee-specific thresholds (no dealership fallback).
Default thresholds if not set: 30/60/120 minutes.';
