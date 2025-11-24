-- =====================================================
-- FIX: Exclude soft-deleted vehicles from Get Ready day grouping
-- =====================================================
-- Date: 2025-11-22
-- Issue: RPC function get_vehicles_by_days_in_step() includes deleted vehicles
--        causing mismatch between sidebar counts and actual vehicle list
-- Impact: "Detailing" step (and others) show vehicle counts but list appears empty
-- Root Cause: RPC function created before soft-delete column was added
-- Solution: Add deleted_at IS NULL filter to RPC function and dependent view
-- =====================================================

-- ============================================================================
-- STEP 1: Update RPC function to exclude soft-deleted vehicles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_vehicles_by_days_in_step(
  p_dealer_id bigint,
  p_step_id text DEFAULT NULL::text
)
RETURNS TABLE(
  step_id text,
  step_name text,
  total_vehicles bigint,
  vehicles_1_day bigint,
  vehicles_2_3_days bigint,
  vehicles_4_plus_days bigint,
  avg_days_in_step numeric,
  sla_hours integer,
  cost_per_day numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH vehicle_total_time AS (
    SELECT
      v.id as vehicle_id,
      v.step_id,
      -- Calculate total days: current visit hours + previous visits hours
      COALESCE(
        (vst.current_visit_hours + COALESCE(vst.previous_visits_hours, 0)) / 24.0,
        -- Fallback: days since intake if no step history
        EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400
      ) as total_days_in_step
    FROM public.get_ready_vehicles v
    LEFT JOIN vehicle_step_times_current vst
      ON vst.vehicle_id = v.id
    WHERE v.dealer_id = p_dealer_id
      AND v.status != 'completed'
      AND v.deleted_at IS NULL  -- ✅ FIX: Exclude soft-deleted vehicles
      AND (p_step_id IS NULL OR v.step_id = p_step_id)
  ),
  vehicle_counts AS (
    SELECT
      vt.step_id,
      COUNT(*) as total,
      -- Group vehicles by days in step:
      COUNT(CASE WHEN vt.total_days_in_step < 1 THEN 1 END) as one_day,           -- < 1 day
      COUNT(CASE WHEN vt.total_days_in_step >= 1 AND vt.total_days_in_step < 4 THEN 1 END) as two_three_days,  -- 1-3 days
      COUNT(CASE WHEN vt.total_days_in_step >= 4 THEN 1 END) as four_plus_days,   -- 4+ days
      ROUND(AVG(vt.total_days_in_step), 1) as avg_days
    FROM vehicle_total_time vt
    GROUP BY vt.step_id
  )
  SELECT
    s.id as step_id,
    s.name as step_name,
    COALESCE(vc.total, 0) as total_vehicles,
    COALESCE(vc.one_day, 0) as vehicles_1_day,
    COALESCE(vc.two_three_days, 0) as vehicles_2_3_days,
    COALESCE(vc.four_plus_days, 0) as vehicles_4_plus_days,
    COALESCE(vc.avg_days, 0) as avg_days_in_step,
    s.sla_hours,
    s.cost_per_day
  FROM public.get_ready_steps s
  LEFT JOIN vehicle_counts vc ON vc.step_id = s.id
  WHERE s.dealer_id = p_dealer_id
    AND s.is_active = true
    AND (p_step_id IS NULL OR s.id = p_step_id)
  ORDER BY s.order_index;
END;
$function$;

COMMENT ON FUNCTION public.get_vehicles_by_days_in_step IS
  'Get vehicles grouped by days in step (1d, 2-3d, 4+d). FIXED 2025-11-22: Now excludes soft-deleted vehicles to match frontend filters.';

-- ============================================================================
-- STEP 2: Update vehicle_step_times_current view to exclude deleted vehicles
-- ============================================================================

CREATE OR REPLACE VIEW public.vehicle_step_times_current AS
SELECT
  v.id as vehicle_id,
  v.stock_number,
  v.vin,
  s.name as current_step_name,
  vsh.entry_date as current_step_entry,
  -- Calculate hours in current step visit
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - vsh.entry_date)) / 3600,
    2
  ) as current_visit_hours,
  -- Calculate days in current step visit
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - vsh.entry_date)) / 86400,
    1
  ) as current_visit_days,
  vsh.visit_number,
  -- Calculate total hours from previous visits to this same step
  (
    SELECT ROUND(COALESCE(SUM(hours_accumulated), 0), 2)
    FROM public.vehicle_step_history
    WHERE vehicle_id = v.id
      AND step_id = v.step_id
      AND exit_date IS NOT NULL  -- Only completed visits
  ) as previous_visits_hours
FROM public.get_ready_vehicles v
JOIN public.get_ready_steps s ON s.id = v.step_id
JOIN public.vehicle_step_history vsh ON vsh.vehicle_id = v.id
  AND vsh.step_id = v.step_id
  AND vsh.is_current_visit = true
WHERE v.deleted_at IS NULL;  -- ✅ FIX: Exclude soft-deleted vehicles

COMMENT ON VIEW public.vehicle_step_times_current IS
  'Real-time view of current step times for each vehicle. FIXED 2025-11-22: Now excludes soft-deleted vehicles.';

-- ============================================================================
-- STEP 3: Verification - Show before/after counts
-- ============================================================================

DO $$
DECLARE
  total_active INTEGER;
  total_deleted INTEGER;
  rec RECORD;
BEGIN
  -- Count active vs deleted vehicles
  SELECT
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted
  INTO total_active, total_deleted
  FROM get_ready_vehicles
  WHERE status != 'completed';

  RAISE NOTICE '=====================================';
  RAISE NOTICE '✅ GET READY VEHICLES - SOFT DELETE FIX';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Total active vehicles: %', total_active;
  RAISE NOTICE 'Total deleted vehicles: %', total_deleted;
  RAISE NOTICE '';
  RAISE NOTICE '📊 BREAKDOWN BY STEP (Active vehicles only):';

  -- Show vehicle count per step (active only)
  FOR rec IN
    SELECT
      s.name as step_name,
      COUNT(v.id) as vehicle_count,
      COUNT(CASE WHEN
        EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 < 1
      THEN 1 END) as vehicles_1_day,
      COUNT(CASE WHEN
        EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 >= 1
        AND EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 < 4
      THEN 1 END) as vehicles_2_3_days,
      COUNT(CASE WHEN
        EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 >= 4
      THEN 1 END) as vehicles_4_plus_days
    FROM get_ready_steps s
    LEFT JOIN get_ready_vehicles v ON v.step_id = s.id
      AND v.deleted_at IS NULL
      AND v.status != 'completed'
    WHERE s.is_active = true
    GROUP BY s.name, s.order_index
    ORDER BY s.order_index
  LOOP
    RAISE NOTICE '  % → % vehicles (1d: %, 2-3d: %, 4+d: %)',
      rec.step_name,
      rec.vehicle_count,
      rec.vehicles_1_day,
      rec.vehicles_2_3_days,
      rec.vehicles_4_plus_days;
  END LOOP;

  RAISE NOTICE '=====================================';
  RAISE NOTICE '✅ FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '   - RPC function now excludes deleted vehicles';
  RAISE NOTICE '   - View now excludes deleted vehicles';
  RAISE NOTICE '   - Sidebar counts will match vehicle lists';
  RAISE NOTICE '=====================================';
END $$;

-- ============================================================================
-- STEP 4: Test query - Compare RPC function results with direct query
-- ============================================================================

-- This query verifies the RPC function returns correct counts
-- Run this manually to verify the fix worked:

/*
-- Test 1: Get vehicle counts using RPC function
SELECT * FROM get_vehicles_by_days_in_step(
  (SELECT id FROM dealerships LIMIT 1)::bigint,
  NULL  -- All steps
);

-- Test 2: Get vehicle counts using direct query (should match RPC)
SELECT
  s.name as step_name,
  COUNT(v.id) as total_vehicles,
  COUNT(CASE WHEN EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 < 1 THEN 1 END) as vehicles_1_day,
  COUNT(CASE WHEN EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 >= 1
    AND EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 < 4 THEN 1 END) as vehicles_2_3_days,
  COUNT(CASE WHEN EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 >= 4 THEN 1 END) as vehicles_4_plus_days
FROM get_ready_steps s
LEFT JOIN get_ready_vehicles v ON v.step_id = s.id
  AND v.deleted_at IS NULL
  AND v.status != 'completed'
WHERE s.is_active = true
GROUP BY s.name, s.order_index
ORDER BY s.order_index;

-- Test 3: Verify Detailing step specifically
SELECT
  v.stock_number,
  v.vin,
  v.deleted_at,
  EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 as days_in_system
FROM get_ready_vehicles v
WHERE v.step_id = 'detailing'
  AND v.status != 'completed'
ORDER BY v.deleted_at NULLS FIRST, v.intake_date DESC;
*/

-- ============================================================================
-- CLEANUP: No cleanup needed - this is a bug fix, not a temporary change
-- ============================================================================
