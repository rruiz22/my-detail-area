-- =====================================================
-- PASO 2: LIMPIAR DUPLICADOS (DESPUÉS DE AGREGAR ENUM)
-- =====================================================
-- Ejecutar SOLO después de que STEP1 haya agregado 'auto_close' al enum
-- =====================================================

BEGIN;

-- =====================================================
-- LIMPIAR DUPLICADOS EXISTENTES
-- =====================================================
DO $$
DECLARE
  v_duplicates_count INTEGER;
  v_employee_record RECORD;
  v_entries_to_close UUID[];
  v_most_recent_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'LIMPIANDO DUPLICADOS';
  RAISE NOTICE '=========================================';

  -- Count employees with multiple active entries
  SELECT COUNT(*) INTO v_duplicates_count
  FROM (
    SELECT employee_id, COUNT(*) as entry_count
    FROM detail_hub_time_entries
    WHERE status = 'active' AND clock_out IS NULL
    GROUP BY employee_id
    HAVING COUNT(*) > 1
  ) duplicates;

  RAISE NOTICE 'Found % employees with duplicate active entries', v_duplicates_count;

  IF v_duplicates_count = 0 THEN
    RAISE NOTICE '✅ No duplicates found - database is clean!';
  ELSE
    RAISE NOTICE 'Processing duplicates...';
    RAISE NOTICE '';

    -- Process each employee with duplicates
    FOR v_employee_record IN
      SELECT
        e.id AS employee_id,
        e.first_name,
        e.last_name,
        e.employee_number,
        COUNT(te.id) as active_entries
      FROM detail_hub_time_entries te
      JOIN detail_hub_employees e ON e.id = te.employee_id
      WHERE te.status = 'active' AND te.clock_out IS NULL
      GROUP BY e.id, e.first_name, e.last_name, e.employee_number
      HAVING COUNT(te.id) > 1
    LOOP
      RAISE NOTICE 'Employee: % % (%) - % active entries',
        v_employee_record.first_name,
        v_employee_record.last_name,
        v_employee_record.employee_number,
        v_employee_record.active_entries;

      -- Find the most recent entry (keep this one active)
      SELECT id INTO v_most_recent_id
      FROM detail_hub_time_entries
      WHERE employee_id = v_employee_record.employee_id
        AND status = 'active'
        AND clock_out IS NULL
      ORDER BY clock_in DESC
      LIMIT 1;

      -- Get all older entries to close
      SELECT ARRAY_AGG(id) INTO v_entries_to_close
      FROM detail_hub_time_entries
      WHERE employee_id = v_employee_record.employee_id
        AND status = 'active'
        AND clock_out IS NULL
        AND id != v_most_recent_id;

      IF v_entries_to_close IS NOT NULL THEN
        RAISE NOTICE '  → Keeping most recent entry: %', v_most_recent_id;
        RAISE NOTICE '  → Auto-closing % older entries', ARRAY_LENGTH(v_entries_to_close, 1);

        -- Close older entries
        UPDATE detail_hub_time_entries
        SET
          clock_out = clock_in + INTERVAL '8 hours',
          punch_out_method = 'auto_close',
          status = 'completed',
          notes = COALESCE(notes || E'\n', '') ||
                  '[' || NOW()::DATE || '] Auto-closed by system. Employee forgot to clock out.'
        WHERE id = ANY(v_entries_to_close);

        RAISE NOTICE '  ✅ Closed % entries', ARRAY_LENGTH(v_entries_to_close, 1);
      END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE '✅ DUPLICATE CLEANUP COMPLETE';
  END IF;
END $$;

-- =====================================================
-- ACTUALIZAR VISTA CON DISTINCT ON
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'ACTUALIZANDO VISTA';
  RAISE NOTICE '=========================================';
END $$;

DROP VIEW IF EXISTS detail_hub_currently_working CASCADE;

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

DO $$
BEGIN
  RAISE NOTICE '✅ Vista actualizada con DISTINCT ON';
END $$;

-- =====================================================
-- CREAR/ACTUALIZAR FUNCIÓN
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'CREANDO FUNCIÓN';
  RAISE NOTICE '=========================================';
END $$;

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

DO $$
BEGIN
  RAISE NOTICE '✅ Función creada/actualizada';
END $$;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
  v_view_exists BOOLEAN;
  v_function_exists BOOLEAN;
  v_remaining_duplicates INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL';
  RAISE NOTICE '=========================================';

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

  -- Check for remaining duplicates
  SELECT COUNT(*) INTO v_remaining_duplicates
  FROM (
    SELECT employee_id, COUNT(*) as entry_count
    FROM detail_hub_time_entries
    WHERE status = 'active' AND clock_out IS NULL
    GROUP BY employee_id
    HAVING COUNT(*) > 1
  ) duplicates;

  -- Report results
  RAISE NOTICE 'View detail_hub_currently_working: %', CASE WHEN v_view_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE 'Function get_live_dashboard_stats: %', CASE WHEN v_function_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE 'Remaining duplicates: %', v_remaining_duplicates;
  RAISE NOTICE '';

  IF NOT (v_view_exists AND v_function_exists) THEN
    RAISE EXCEPTION '❌ Hotfix incomplete - some objects were not created';
  END IF;

  IF v_remaining_duplicates > 0 THEN
    RAISE WARNING '⚠️  Still found % employees with duplicates', v_remaining_duplicates;
  END IF;

  RAISE NOTICE '=========================================';
  RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
  RAISE NOTICE '=========================================';
END $$;

COMMIT;
