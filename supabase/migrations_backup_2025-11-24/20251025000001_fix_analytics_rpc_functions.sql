-- =====================================================================================
-- Migration: Fix Analytics RPC Functions - Type Mismatch and Ambiguous Column
-- Description: Corrects 2 errors in get_historical_kpis and get_dealer_step_analytics
-- Author: database-expert
-- Date: 2025-10-25
-- =====================================================================================

-- Issue #1: get_historical_kpis returns BIGINT but declares INTEGER in column 3
-- Issue #2: get_dealer_step_analytics has ambiguous column reference "step_id"
--
-- Root Causes:
-- 1. COUNT() returns BIGINT, but RETURNS TABLE declared INTEGER for daily_throughput
-- 2. CTE alias "ss.step_id" conflicts with table column references in subquery
--
-- Impact: 400 Bad Request errors in browser console for analytics
-- Risk Level: LOW - Only fixes RPC functions, no schema changes
--
-- =====================================================================================

-- =====================================================
-- FIX #1: get_historical_kpis - Change INTEGER to BIGINT
-- =====================================================

CREATE OR REPLACE FUNCTION get_historical_kpis(
  p_dealer_id BIGINT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  date DATE,
  avg_t2l NUMERIC,
  daily_throughput BIGINT,  -- FIX: Changed from INTEGER to BIGINT
  sla_compliance NUMERIC,
  active_vehicles BIGINT,   -- FIX: Changed from INTEGER to BIGINT (consistency)
  vehicles_completed BIGINT -- FIX: Changed from INTEGER to BIGINT (consistency)
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_metrics AS (
    SELECT
      DATE(vsh.entry_date) AS metric_date,
      COUNT(DISTINCT vsh.vehicle_id) AS vehicles_active,
      COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') AS completed_count
    FROM vehicle_step_history vsh
    INNER JOIN get_ready_vehicles v ON vsh.vehicle_id = v.id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date BETWEEN p_start_date AND p_end_date
      AND v.deleted_at IS NULL
    GROUP BY DATE(vsh.entry_date)
  )
  SELECT
    dm.metric_date::DATE,
    ROUND(AVG(v.actual_t2l)::NUMERIC, 2) AS avg_t2l,
    dm.completed_count AS daily_throughput,  -- Now matches BIGINT
    ROUND((COUNT(*) FILTER (WHERE v.sla_status = 'on_track')::NUMERIC /
           NULLIF(COUNT(*), 0)::NUMERIC), 3) AS sla_compliance,
    dm.vehicles_active AS active_vehicles,   -- Now matches BIGINT
    dm.completed_count AS vehicles_completed -- Now matches BIGINT
  FROM daily_metrics dm
  INNER JOIN get_ready_vehicles v ON DATE(v.created_at) = dm.metric_date
  WHERE v.dealer_id = p_dealer_id AND v.deleted_at IS NULL
  GROUP BY dm.metric_date, dm.vehicles_active, dm.completed_count
  ORDER BY dm.metric_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_historical_kpis IS
  '[FIXED v2] Get historical KPI trends for Get Ready module - Fixed BIGINT type mismatch';

-- =====================================================
-- FIX #2: get_dealer_step_analytics - Qualify ambiguous column reference
-- =====================================================

CREATE OR REPLACE FUNCTION get_dealer_step_analytics(
  p_dealer_id BIGINT,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  total_vehicles BIGINT,
  revisit_rate NUMERIC,
  avg_time_first_visit NUMERIC,
  avg_time_revisits NUMERIC,
  avg_total_time NUMERIC,
  max_revisits INTEGER,
  backtrack_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH step_stats AS (
    SELECT
      vsh.step_id AS stat_step_id,  -- FIX: Renamed to avoid ambiguity
      MAX(vsh.step_name) AS step_name,
      COUNT(DISTINCT vsh.vehicle_id) AS total_vehicles,
      COUNT(DISTINCT vsh.vehicle_id) FILTER (WHERE vsh.visit_number > 1) AS vehicles_with_revisits,
      ROUND(AVG(calculate_step_hours(vsh.entry_date, vsh.exit_date))
            FILTER (WHERE vsh.visit_number = 1), 2) AS avg_time_first_visit,
      ROUND(AVG(calculate_step_hours(vsh.entry_date, vsh.exit_date))
            FILTER (WHERE vsh.visit_number > 1), 2) AS avg_time_revisits,
      MAX(vsh.visit_number) AS max_revisits,
      COUNT(*) FILTER (WHERE vsh.is_backtrack) AS backtrack_count
    FROM vehicle_step_history vsh
    INNER JOIN get_ready_vehicles v ON vsh.vehicle_id = v.id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date >= NOW() - (p_days_back || ' days')::INTERVAL
      AND v.deleted_at IS NULL
    GROUP BY vsh.step_id
  ),
  summary_stats AS (
    SELECT
      vsts.step_id AS summary_step_id,  -- FIX: Renamed to avoid ambiguity
      ROUND(AVG(vsts.total_hours), 2) AS avg_total_time
    FROM vehicle_step_time_summary vsts
    INNER JOIN vehicle_step_history vsh ON vsts.vehicle_id = vsh.vehicle_id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY vsts.step_id
  )
  SELECT
    ss.stat_step_id AS step_id,  -- FIX: Use renamed column
    ss.step_name,
    ss.total_vehicles,
    ROUND((ss.vehicles_with_revisits::NUMERIC / NULLIF(ss.total_vehicles, 0)::NUMERIC) * 100, 1) AS revisit_rate,
    ss.avg_time_first_visit,
    ss.avg_time_revisits,
    COALESCE(sms.avg_total_time, ss.avg_time_first_visit) AS avg_total_time,
    ss.max_revisits,
    ss.backtrack_count
  FROM step_stats ss
  LEFT JOIN summary_stats sms ON ss.stat_step_id = sms.summary_step_id  -- FIX: Use renamed columns
  ORDER BY (
    SELECT order_index FROM get_ready_steps WHERE id = ss.stat_step_id LIMIT 1  -- FIX: Use renamed column
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_dealer_step_analytics IS
  '[FIXED v2] Get comprehensive step analytics - Fixed ambiguous column reference';

-- =====================================================
-- VERIFICATION QUERIES (for manual testing)
-- =====================================================

-- Test #1: Verify get_historical_kpis returns correct types
-- SELECT
--   date,
--   pg_typeof(daily_throughput) as throughput_type,  -- Should be 'bigint'
--   pg_typeof(active_vehicles) as active_type,       -- Should be 'bigint'
--   pg_typeof(vehicles_completed) as completed_type  -- Should be 'bigint'
-- FROM get_historical_kpis(
--   1::BIGINT,
--   NOW() - INTERVAL '7 days',
--   NOW()
-- );

-- Test #2: Verify get_dealer_step_analytics works without ambiguity
-- SELECT
--   step_id,
--   step_name,
--   total_vehicles
-- FROM get_dealer_step_analytics(1::BIGINT, 30);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
