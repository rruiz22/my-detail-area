-- Create get_department_revenue RPC
-- This function aggregates orders by department without LIMIT issues
-- Ensures Total by Departments matches Total Revenue from get_revenue_analytics
--
-- BUG FIX: useDepartmentRevenue hook was using client-side filtering with LIMIT 1000
-- which caused missing orders with old created_at but recent due_date/completed_at.
-- This RPC processes ALL orders server-side, eliminating the LIMIT problem.

CREATE OR REPLACE FUNCTION get_department_revenue(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_order_type TEXT DEFAULT 'all',
  p_status TEXT DEFAULT 'all',
  p_service_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  department TEXT,
  revenue NUMERIC,
  orders INTEGER,
  completed INTEGER,
  avg_order_value NUMERIC,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.order_type AS department,
    COALESCE(SUM(o.total_amount), 0) AS revenue,
    COUNT(*)::INTEGER AS orders,
    COUNT(*) FILTER (WHERE o.status = 'completed')::INTEGER AS completed,
    COALESCE(AVG(o.total_amount), 0) AS avg_order_value,
    CASE
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE o.status = 'completed')::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END AS completion_rate
  FROM orders o
  WHERE o.dealer_id = p_dealer_id
    AND o.status != 'cancelled'
    -- Department filter: restrict to 4 valid departments when 'all'
    AND (
      (p_order_type = 'all' AND o.order_type IN ('sales', 'service', 'recon', 'carwash'))
      OR o.order_type = p_order_type
    )
    -- Status filter
    AND (p_status = 'all' OR o.status = p_status)
    -- Date filter: Use appropriate date field per department
    -- Sales/Service: COALESCE(due_date, created_at)
    -- Recon/CarWash: COALESCE(completed_at, created_at)
    AND (
      (o.order_type IN ('sales', 'service') AND COALESCE(o.due_date, o.created_at) BETWEEN p_start_date AND p_end_date)
      OR (o.order_type IN ('recon', 'carwash') AND COALESCE(o.completed_at, o.created_at) BETWEEN p_start_date AND p_end_date)
    )
    -- Service filter: Match services in allowed list
    AND (
      p_service_ids IS NULL
      OR p_service_ids = '{}'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(o.services, '[]'::jsonb)) AS service
        WHERE
          -- Handle string format (legacy)
          (jsonb_typeof(service) = 'string' AND service::TEXT = ANY(p_service_ids))
          -- Handle object format with 'id' or 'type' fields
          OR (jsonb_typeof(service) = 'object' AND (
            (service->>'id')::TEXT = ANY(p_service_ids)
            OR (service->>'type')::TEXT = ANY(p_service_ids)
          ))
      )
    )
  GROUP BY o.order_type
  ORDER BY o.order_type;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION get_department_revenue IS 'Aggregate order revenue by department with server-side filtering. Eliminates client-side LIMIT issues from useDepartmentRevenue hook.';
