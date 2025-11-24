-- =====================================================
-- GET READY MODULE - VEHICLE DAYS GROUPING FUNCTION
-- Groups vehicles by days in step for sidebar display
-- Date: 2025-10-16
-- =====================================================

-- =====================================================
-- 1. CREATE FUNCTION TO GET VEHICLES GROUPED BY DAYS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_vehicles_by_days_in_step(
  p_dealer_id BIGINT,
  p_step_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  total_vehicles BIGINT,
  vehicles_1_day BIGINT,
  vehicles_2_3_days BIGINT,
  vehicles_4_plus_days BIGINT,
  avg_days_in_step DECIMAL,
  sla_hours INTEGER,
  cost_per_day DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH vehicle_counts AS (
    SELECT
      v.step_id,
      COUNT(*) as total,
      COUNT(CASE WHEN v.days_in_step <= 1 THEN 1 END) as one_day,
      COUNT(CASE WHEN v.days_in_step >= 2 AND v.days_in_step <= 3 THEN 1 END) as two_three_days,
      COUNT(CASE WHEN v.days_in_step >= 4 THEN 1 END) as four_plus_days,
      ROUND(AVG(v.days_in_step), 1) as avg_days
    FROM public.get_ready_vehicles v
    WHERE v.dealer_id = p_dealer_id
      AND v.status != 'completed'
      AND (p_step_id IS NULL OR v.step_id = p_step_id)
    GROUP BY v.step_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 2. CREATE FUNCTION TO GET REAL BOTTLENECK ALERTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_bottleneck_alerts(
  p_dealer_id BIGINT
)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  severity TEXT,
  vehicle_count BIGINT,
  avg_wait_time DECIMAL,
  recommended_action TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH step_stats AS (
    SELECT
      v.step_id,
      s.name as step_name,
      COUNT(*) as vehicle_count,
      ROUND(AVG(v.days_in_step), 1) as avg_days,
      s.bottleneck_threshold,
      s.sla_hours,
      s.max_capacity
    FROM public.get_ready_vehicles v
    JOIN public.get_ready_steps s ON s.id = v.step_id
    WHERE v.dealer_id = p_dealer_id
      AND v.status != 'completed'
      AND s.is_active = true
    GROUP BY v.step_id, s.name, s.bottleneck_threshold, s.sla_hours, s.max_capacity
  )
  SELECT
    ss.step_id,
    ss.step_name,
    CASE
      WHEN ss.vehicle_count >= ss.max_capacity * 1.5 THEN 'critical'
      WHEN ss.vehicle_count >= ss.max_capacity THEN 'high'
      WHEN ss.avg_days >= ss.sla_hours / 24.0 THEN 'medium'
      ELSE 'low'
    END::TEXT as severity,
    ss.vehicle_count,
    ss.avg_days as avg_wait_time,
    CASE
      WHEN ss.vehicle_count >= ss.max_capacity * 1.5 THEN 'Critical capacity exceeded - immediate action required'
      WHEN ss.vehicle_count >= ss.max_capacity THEN 'Consider adding additional resources or outsourcing'
      WHEN ss.avg_days >= ss.sla_hours / 24.0 THEN 'Vehicles approaching SLA limits - prioritize this step'
      ELSE 'Monitor for potential delays'
    END::TEXT as recommended_action,
    NOW() as created_at
  FROM step_stats ss
  WHERE ss.vehicle_count > 0
    AND (ss.vehicle_count >= ss.max_capacity * 0.8 OR ss.avg_days >= (ss.sla_hours / 24.0) * 0.7)
  ORDER BY
    CASE
      WHEN ss.vehicle_count >= ss.max_capacity * 1.5 THEN 1
      WHEN ss.vehicle_count >= ss.max_capacity THEN 2
      WHEN ss.avg_days >= ss.sla_hours / 24.0 THEN 3
      ELSE 4
    END,
    ss.vehicle_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 3. CREATE FUNCTION TO GET REAL SLA ALERTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_sla_alerts(
  p_dealer_id BIGINT
)
RETURNS TABLE (
  vehicle_id UUID,
  stock_number TEXT,
  vehicle_info TEXT,
  hours_overdue INTEGER,
  severity TEXT,
  escalation_level INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id as vehicle_id,
    v.stock_number,
    CONCAT(
      COALESCE(v.vehicle_year::TEXT, ''), ' ',
      COALESCE(v.vehicle_make, ''), ' ',
      COALESCE(v.vehicle_model, '')
    ) as vehicle_info,
    GREATEST(0, EXTRACT(EPOCH FROM (NOW() - v.intake_date))::INTEGER / 3600 - s.sla_hours) as hours_overdue,
    CASE
      WHEN v.sla_status = 'critical' THEN 'critical'
      WHEN v.sla_status = 'warning' THEN 'warning'
      ELSE 'normal'
    END::TEXT as severity,
    v.escalation_level,
    v.intake_date as created_at
  FROM public.get_ready_vehicles v
  JOIN public.get_ready_steps s ON s.id = v.step_id
  WHERE v.dealer_id = p_dealer_id
    AND v.status != 'completed'
    AND v.sla_status IN ('warning', 'critical')
  ORDER BY
    v.escalation_level DESC,
    EXTRACT(EPOCH FROM (NOW() - v.intake_date)) DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 4. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON FUNCTION public.get_vehicles_by_days_in_step IS 'Get vehicles grouped by days in step (1d, 2-3d, 4+d) for sidebar display';
COMMENT ON FUNCTION public.get_bottleneck_alerts IS 'Get real-time bottleneck alerts based on capacity and SLA thresholds';
COMMENT ON FUNCTION public.get_sla_alerts IS 'Get real-time SLA alerts for vehicles exceeding time limits';
