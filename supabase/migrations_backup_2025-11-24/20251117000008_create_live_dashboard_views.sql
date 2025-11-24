-- =====================================================
-- DETAIL HUB: LIVE DASHBOARD VIEWS & FUNCTIONS
-- =====================================================
-- Purpose: Real-time dashboard for "Who's Working Now"
-- Author: Claude Code
-- Date: 2025-11-17
-- =====================================================

-- =====================================================
-- VIEW: Currently Working Employees (Real-time)
-- =====================================================
CREATE OR REPLACE VIEW detail_hub_currently_working AS
SELECT
  -- Employee details
  e.id AS employee_id,
  e.employee_number,
  e.first_name,
  e.last_name,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.department,
  e.role,
  e.fallback_photo_url AS profile_photo_url,

  -- Time entry details
  dte.id AS time_entry_id,
  dte.clock_in,
  dte.kiosk_id,

  -- Calculate elapsed time in hours
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - dte.clock_in)) / 3600,
    2
  ) AS elapsed_hours,

  -- Calculate elapsed time formatted (HH:MM)
  TO_CHAR(
    JUSTIFY_HOURS(NOW() - dte.clock_in),
    'HH24:MI'
  ) AS elapsed_time_formatted,

  -- Break status
  CASE
    WHEN dte.break_start IS NOT NULL AND dte.break_end IS NULL THEN true
    ELSE false
  END AS is_on_break,

  dte.break_start,

  -- If on break, calculate break duration
  CASE
    WHEN dte.break_start IS NOT NULL AND dte.break_end IS NULL THEN
      ROUND(
        EXTRACT(EPOCH FROM (NOW() - dte.break_start)) / 60,
        0
      )::INTEGER
    ELSE NULL
  END AS break_elapsed_minutes,

  -- Schedule compliance
  s.shift_start_time AS scheduled_start,
  s.shift_end_time AS scheduled_end,
  dte.schedule_variance_minutes,

  -- Kiosk information
  k.name AS kiosk_name,
  k.kiosk_code,

  -- Dealership
  dte.dealership_id

FROM detail_hub_employees e
INNER JOIN detail_hub_time_entries dte ON dte.employee_id = e.id
LEFT JOIN detail_hub_schedules s ON s.id = dte.schedule_id
LEFT JOIN detail_hub_kiosks k ON k.id = dte.kiosk_id
WHERE dte.status = 'active'
  AND dte.clock_out IS NULL
  AND e.status = 'active'
ORDER BY dte.clock_in ASC;

-- =====================================================
-- FUNCTION: Get dashboard statistics
-- =====================================================
CREATE OR REPLACE FUNCTION get_live_dashboard_stats(p_dealership_id INTEGER)
RETURNS TABLE (
  total_clocked_in BIGINT,
  total_on_break BIGINT,
  total_hours_today DECIMAL,
  unique_departments BIGINT,
  avg_elapsed_hours DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_clocked_in,
    COUNT(*) FILTER (WHERE is_on_break = true)::BIGINT AS total_on_break,
    COALESCE(SUM(elapsed_hours), 0) AS total_hours_today,
    COUNT(DISTINCT department)::BIGINT AS unique_departments,
    ROUND(AVG(elapsed_hours), 2) AS avg_elapsed_hours
  FROM detail_hub_currently_working
  WHERE dealership_id = p_dealership_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- FUNCTION: Get break compliance violations
-- =====================================================
CREATE OR REPLACE FUNCTION get_break_violations(
  p_dealership_id INTEGER,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  time_entry_id UUID,
  employee_id UUID,
  employee_name TEXT,
  shift_date DATE,
  shift_hours DECIMAL,
  break_minutes INTEGER,
  required_minutes INTEGER,
  shortage_minutes INTEGER,
  violation_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dte.id AS time_entry_id,
    e.id AS employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    dte.clock_in::DATE AS shift_date,
    dte.total_hours AS shift_hours,
    dte.break_duration_minutes AS break_minutes,
    s.required_break_minutes AS required_minutes,
    (s.required_break_minutes - dte.break_duration_minutes) AS shortage_minutes,
    dte.break_violation_reason AS violation_reason
  FROM detail_hub_time_entries dte
  INNER JOIN detail_hub_employees e ON e.id = dte.employee_id
  LEFT JOIN detail_hub_schedules s ON s.id = dte.schedule_id
  WHERE dte.dealership_id = p_dealership_id
    AND dte.clock_in >= p_start_date::TIMESTAMPTZ
    AND dte.clock_in < (p_end_date + INTERVAL '1 day')::TIMESTAMPTZ
    AND dte.break_policy_compliant = false
    AND dte.clock_out IS NOT NULL
  ORDER BY dte.clock_in DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- FUNCTION: Get schedule compliance report
-- =====================================================
CREATE OR REPLACE FUNCTION get_schedule_compliance_report(
  p_dealership_id INTEGER,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  total_shifts INTEGER,
  on_time_shifts INTEGER,
  early_shifts INTEGER,
  late_shifts INTEGER,
  missed_shifts INTEGER,
  compliance_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    COUNT(s.id)::INTEGER AS total_shifts,
    COUNT(*) FILTER (WHERE ABS(dte.schedule_variance_minutes) <= 5)::INTEGER AS on_time_shifts,
    COUNT(*) FILTER (WHERE dte.schedule_variance_minutes < -5)::INTEGER AS early_shifts,
    COUNT(*) FILTER (WHERE dte.schedule_variance_minutes > 5)::INTEGER AS late_shifts,
    COUNT(*) FILTER (WHERE s.time_entry_id IS NULL AND s.shift_date < CURRENT_DATE)::INTEGER AS missed_shifts,
    ROUND(
      (COUNT(*) FILTER (WHERE ABS(COALESCE(dte.schedule_variance_minutes, 999)) <= 5)::DECIMAL /
       NULLIF(COUNT(s.id), 0)) * 100,
      1
    ) AS compliance_percentage
  FROM detail_hub_employees e
  INNER JOIN detail_hub_schedules s ON s.employee_id = e.id
  LEFT JOIN detail_hub_time_entries dte ON dte.schedule_id = s.id
  WHERE e.dealership_id = p_dealership_id
    AND s.shift_date >= p_start_date
    AND s.shift_date <= p_end_date
  GROUP BY e.id, e.first_name, e.last_name
  ORDER BY compliance_percentage DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON VIEW detail_hub_currently_working IS 'Real-time view of employees currently clocked in with elapsed time calculations';
COMMENT ON COLUMN detail_hub_time_entries.schedule_id IS 'Links time entry to the scheduled shift for validation';
COMMENT ON COLUMN detail_hub_time_entries.break_start_photo_url IS 'Photo URL captured when employee starts break (required)';
COMMENT ON COLUMN detail_hub_time_entries.break_end_photo_url IS 'Photo URL captured when employee ends break (required)';
COMMENT ON COLUMN detail_hub_time_entries.schedule_variance_minutes IS 'Difference between actual clock_in and scheduled start (negative=early, positive=late)';
COMMENT ON COLUMN detail_hub_time_entries.break_policy_compliant IS 'Whether break duration meets minimum requirements based on shift length';
