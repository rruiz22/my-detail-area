-- =====================================================
-- UPDATE GET READY KPIS FUNCTION
-- Remove max_capacity reference after column removal
-- =====================================================

-- Drop existing function first (return type changed)
DROP FUNCTION IF EXISTS public.get_ready_kpis(BIGINT);

-- Recreate the function without capacity-based metrics
CREATE FUNCTION public.get_ready_kpis(p_dealer_id BIGINT)
RETURNS TABLE (
  avg_t2l DECIMAL,
  target_t2l DECIMAL,
  daily_throughput DECIMAL,
  weekly_capacity INTEGER,
  sla_compliance DECIMAL,
  total_holding_costs DECIMAL,
  avg_holding_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(v.actual_t2l), 1) as avg_t2l,
    7.0::DECIMAL as target_t2l,
    COUNT(CASE WHEN v.completed_at >= NOW() - INTERVAL '1 day' THEN 1 END)::DECIMAL as daily_throughput,
    COUNT(CASE WHEN v.completed_at >= NOW() - INTERVAL '7 days' THEN 1 END)::INTEGER as weekly_capacity,
    ROUND(COUNT(CASE WHEN v.sla_status = 'on_track' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0), 2) as sla_compliance,
    ROUND(SUM(v.total_holding_cost), 2) as total_holding_costs,
    ROUND(AVG(v.total_holding_cost), 2) as avg_holding_cost
  FROM public.get_ready_vehicles v
  JOIN public.get_ready_steps s ON s.id = v.step_id
  WHERE v.dealer_id = p_dealer_id
  AND v.created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.get_ready_kpis IS 'Calculate Get Ready KPIs without capacity-based metrics';