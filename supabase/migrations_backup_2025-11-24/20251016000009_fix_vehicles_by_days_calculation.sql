-- =====================================================
-- FIX: get_vehicles_by_days_in_step - Calculate from intake_date
-- Date: 2025-10-16
-- Issue: Using days_in_step field which is 0, should calculate from intake_date
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_vehicles_by_days_in_step(p_dealer_id bigint, p_step_id text DEFAULT NULL::text)
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
  WITH vehicle_counts AS (
    SELECT
      v.step_id,
      COUNT(*) as total,
      -- Calculate days from intake_date instead of using days_in_step field
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 <= 1 THEN 1 END) as one_day,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 >= 2
                  AND EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 <= 3 THEN 1 END) as two_three_days,
      COUNT(CASE WHEN EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400 >= 4 THEN 1 END) as four_plus_days,
      ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400), 1) as avg_days
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
$function$;
