-- =====================================================
-- HOTFIX: Aplicar migraciones criticas de Detail Hub
-- =====================================================
-- Este script crea solo las estructuras faltantes
-- La tabla detail_hub_time_entries YA EXISTE desde 20251117000002
-- Solo creamos la VISTA y la FUNCIÓN que dependen de ella
-- =====================================================

-- Verificar que la tabla existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'detail_hub_time_entries'
  ) THEN
    RAISE EXCEPTION 'La tabla detail_hub_time_entries no existe. Ejecuta primero la migración 20251117000002_create_detail_hub_time_entries.sql';
  END IF;
END $$;

-- =====================================================
-- 1. Crear vista detail_hub_currently_working
-- =====================================================
-- FIXED: Added DISTINCT ON to prevent duplicate employee records
-- This ensures only the MOST RECENT active time entry is shown per employee
CREATE OR REPLACE VIEW detail_hub_currently_working AS
SELECT DISTINCT ON (e.id)
  -- Employee details
  e.id AS employee_id,
  e.employee_number,
  e.first_name,
  e.last_name,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.department::TEXT AS department,
  e.role::TEXT AS role,
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
ORDER BY e.id, dte.clock_in DESC;

-- =====================================================
-- 2. Crear función get_live_dashboard_stats
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
-- VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_view_exists BOOLEAN;
  v_function_exists BOOLEAN;
BEGIN
  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'detail_hub_time_entries'
  ) INTO v_table_exists;

  -- Check view
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_name = 'detail_hub_currently_working'
  ) INTO v_view_exists;

  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'get_live_dashboard_stats' AND n.nspname = 'public'
  ) INTO v_function_exists;

  -- Report results
  RAISE NOTICE '================================';
  RAISE NOTICE 'DETAIL HUB HOTFIX - VERIFICATION';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Table detail_hub_time_entries: %', CASE WHEN v_table_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE 'View detail_hub_currently_working: %', CASE WHEN v_view_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE 'Function get_live_dashboard_stats: %', CASE WHEN v_function_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '================================';

  IF NOT (v_table_exists AND v_view_exists AND v_function_exists) THEN
    RAISE EXCEPTION 'Hotfix incomplete - some objects were not created';
  END IF;

  RAISE NOTICE '✅ All Detail Hub structures created successfully!';
END $$;
