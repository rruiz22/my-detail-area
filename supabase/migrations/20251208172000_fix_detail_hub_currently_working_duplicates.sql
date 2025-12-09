-- Fix duplicate employees in detail_hub_currently_working view
-- Problem: Multiple active time_entries per employee cause duplicate rows in the view
-- Solution: Use DISTINCT ON (e.id) to ensure one row per employee, taking the most recent clock_in

-- Drop existing view
DROP VIEW IF EXISTS detail_hub_currently_working;

-- Recreate view with DISTINCT ON to prevent duplicates
CREATE VIEW detail_hub_currently_working AS
SELECT DISTINCT ON (e.id)
    e.id AS employee_id,
    e.employee_number,
    e.first_name,
    e.last_name,
    (e.first_name || ' '::text) || e.last_name AS employee_name,
    e.department,
    e.role,
    e.fallback_photo_url AS profile_photo_url,
    dte.id AS time_entry_id,
    dte.clock_in,
    dte.photo_in_url,
    dte.kiosk_id,
    k.name AS kiosk_name,
    k.kiosk_code,
    round(EXTRACT(epoch FROM now() - dte.clock_in) / 3600::numeric, 2) AS elapsed_hours,
    to_char(justify_hours(now() - dte.clock_in), 'HH24:MI'::text) AS elapsed_time_formatted,
    CASE
        WHEN active_break.id IS NOT NULL THEN true
        ELSE false
    END AS is_on_break,
    active_break.break_start,
    CASE
        WHEN active_break.break_start IS NOT NULL THEN round(EXTRACT(epoch FROM now() - active_break.break_start) / 60::numeric, 0)::integer
        ELSE NULL::integer
    END AS break_elapsed_minutes,
    dte.dealership_id,
    dte.schedule_variance_minutes
FROM detail_hub_employees e
    JOIN detail_hub_time_entries dte ON dte.employee_id = e.id
    LEFT JOIN detail_hub_kiosks k ON k.kiosk_code = dte.kiosk_id
    LEFT JOIN LATERAL (
        SELECT
            detail_hub_breaks.id,
            detail_hub_breaks.break_start,
            detail_hub_breaks.break_number
        FROM detail_hub_breaks
        WHERE detail_hub_breaks.time_entry_id = dte.id
            AND detail_hub_breaks.break_end IS NULL
        LIMIT 1
    ) active_break ON true
WHERE dte.status = 'active'::text
    AND dte.clock_out IS NULL
    AND e.status = 'active'::text
-- CRITICAL: Order by e.id first (for DISTINCT ON), then by most recent clock_in
-- This ensures we get the latest time entry if an employee has multiple active entries
ORDER BY e.id, dte.clock_in DESC;

-- Add comment explaining the fix
COMMENT ON VIEW detail_hub_currently_working IS
'Returns currently working employees with their active time entries.
Uses DISTINCT ON (employee_id) to prevent duplicates if an employee has multiple active time entries.
Always returns the most recent time entry per employee (ORDER BY clock_in DESC).';
