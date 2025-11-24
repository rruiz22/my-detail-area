-- =====================================================
-- DETAIL HUB: LIVE DASHBOARD VIEWS & FUNCTIONS (Simplified)
-- =====================================================
-- Purpose: Real-time dashboard for "Who's Working Now"
-- Author: Claude Code
-- Date: 2025-11-22
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

  -- Dealership
  dte.dealership_id

FROM detail_hub_employees e
INNER JOIN detail_hub_time_entries dte ON dte.employee_id = e.id
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
-- COMMENTS for documentation
-- =====================================================
COMMENT ON VIEW detail_hub_currently_working IS 'Real-time view of employees currently clocked in with elapsed time calculations';
