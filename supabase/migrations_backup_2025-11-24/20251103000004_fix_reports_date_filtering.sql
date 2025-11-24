-- Fix Reports Date Filtering
-- Change from created_at to completed_at/due_date for more accurate reporting

-- =====================================================
-- 1. UPDATE GET_ORDERS_ANALYTICS
-- Now filters by completed_at for completed orders, due_date for pending/in_progress
-- =====================================================
CREATE OR REPLACE FUNCTION get_orders_analytics(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_order_type TEXT DEFAULT 'all',
  p_status TEXT DEFAULT 'all'
)
RETURNS TABLE (
  total_orders BIGINT,
  pending_orders BIGINT,
  in_progress_orders BIGINT,
  completed_orders BIGINT,
  cancelled_orders BIGINT,
  total_revenue NUMERIC,
  avg_order_value NUMERIC,
  completion_rate NUMERIC,
  avg_processing_time_hours NUMERIC,
  sla_compliance_rate NUMERIC,
  daily_data JSONB,
  status_distribution JSONB,
  type_distribution JSONB
) AS $$
DECLARE
  v_total_orders BIGINT;
  v_completed_orders BIGINT;
BEGIN
  -- Build base query with filters
  -- Uses completed_at for completed/cancelled orders, due_date for pending/in_progress, created_at as fallback
  WITH filtered_orders AS (
    SELECT
      o.*,
      EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 3600 AS processing_hours,
      CASE
        WHEN o.sla_deadline IS NOT NULL AND o.completed_at IS NOT NULL
        THEN o.completed_at <= o.sla_deadline
        ELSE NULL
      END AS sla_met,
      -- Determine which date to use for filtering
      CASE
        WHEN o.status IN ('completed', 'cancelled') THEN COALESCE(o.completed_at, o.created_at)
        WHEN o.status IN ('pending', 'in_progress', 'on_hold') THEN COALESCE(o.due_date, o.created_at)
        ELSE o.created_at
      END AS report_date
    FROM orders o
    WHERE o.dealer_id = p_dealer_id
      -- Filter by the appropriate date based on order status
      AND CASE
        WHEN o.status IN ('completed', 'cancelled') THEN COALESCE(o.completed_at, o.created_at)
        WHEN o.status IN ('pending', 'in_progress', 'on_hold') THEN COALESCE(o.due_date, o.created_at)
        ELSE o.created_at
      END BETWEEN p_start_date AND p_end_date
      AND (p_order_type = 'all' OR o.order_type = p_order_type)
      AND (p_status = 'all' OR o.status = p_status)
  ),
  metrics AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      COALESCE(SUM(total_amount), 0) AS revenue,
      COALESCE(AVG(total_amount), 0) AS avg_value,
      COALESCE(AVG(processing_hours) FILTER (WHERE processing_hours IS NOT NULL), 0) AS avg_proc_time,
      COUNT(*) FILTER (WHERE sla_met = TRUE)::NUMERIC / NULLIF(COUNT(*) FILTER (WHERE sla_met IS NOT NULL), 0) * 100 AS sla_rate
    FROM filtered_orders
  ),
  daily_aggregation AS (
    SELECT
      DATE(report_date) AS date,
      COUNT(*) AS orders,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM filtered_orders
    GROUP BY DATE(report_date)
    ORDER BY DATE(report_date)
  ),
  status_agg AS (
    SELECT
      status AS name,
      COUNT(*) AS value
    FROM filtered_orders
    GROUP BY status
  ),
  type_agg AS (
    SELECT
      order_type AS name,
      COUNT(*) AS value
    FROM filtered_orders
    GROUP BY order_type
  )
  SELECT
    m.total,
    m.pending,
    m.in_progress,
    m.completed,
    m.cancelled,
    m.revenue,
    m.avg_value,
    CASE
      WHEN m.total > 0 THEN (m.completed::NUMERIC / m.total * 100)
      ELSE 0
    END AS comp_rate,
    m.avg_proc_time,
    COALESCE(m.sla_rate, 0),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('date', date, 'orders', orders, 'revenue', revenue)) FROM daily_aggregation), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'value', value)) FROM status_agg), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'value', value)) FROM type_agg), '[]'::jsonb)
  FROM metrics m
  INTO
    total_orders,
    pending_orders,
    in_progress_orders,
    completed_orders,
    cancelled_orders,
    total_revenue,
    avg_order_value,
    completion_rate,
    avg_processing_time_hours,
    sla_compliance_rate,
    daily_data,
    status_distribution,
    type_distribution;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. UPDATE GET_REVENUE_ANALYTICS
-- Now uses completed_at for completed orders
-- =====================================================
CREATE OR REPLACE FUNCTION get_revenue_analytics(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_grouping TEXT DEFAULT 'monthly'
)
RETURNS TABLE (
  period_data JSONB,
  total_revenue NUMERIC,
  avg_revenue_per_period NUMERIC,
  growth_rate NUMERIC,
  top_services JSONB
) AS $$
DECLARE
  v_period_format TEXT;
  v_total_revenue NUMERIC;
  v_period_count INTEGER;
  v_previous_period_revenue NUMERIC;
BEGIN
  -- Determine date format based on grouping
  v_period_format := CASE p_grouping
    WHEN 'daily' THEN 'YYYY-MM-DD'
    WHEN 'weekly' THEN 'IYYY-IW'
    WHEN 'monthly' THEN 'YYYY-MM'
    WHEN 'quarterly' THEN 'YYYY-Q'
    ELSE 'YYYY-MM'
  END;

  -- Calculate period data using completed_at for completed orders
  WITH period_aggregation AS (
    SELECT
      TO_CHAR(COALESCE(completed_at, created_at), v_period_format) AS period,
      SUM(total_amount) AS revenue,
      COUNT(*) AS orders
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND COALESCE(completed_at, created_at) BETWEEN p_start_date AND p_end_date
      AND status != 'cancelled'
    GROUP BY TO_CHAR(COALESCE(completed_at, created_at), v_period_format)
    ORDER BY period
  ),
  service_revenue AS (
    SELECT
      service ->> 'name' AS name,
      SUM((service ->> 'price')::NUMERIC) AS revenue
    FROM orders o, jsonb_array_elements(o.services) AS service
    WHERE o.dealer_id = p_dealer_id
      AND COALESCE(o.completed_at, o.created_at) BETWEEN p_start_date AND p_end_date
      AND o.status != 'cancelled'
      AND service ? 'name'
      AND service ? 'price'
    GROUP BY service ->> 'name'
    ORDER BY revenue DESC
    LIMIT 10
  ),
  previous_period_calc AS (
    SELECT COALESCE(SUM(total_amount), 0) AS prev_revenue
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND COALESCE(completed_at, created_at) BETWEEN (p_start_date - (p_end_date - p_start_date)) AND p_start_date
      AND status != 'cancelled'
  )
  SELECT
    COALESCE((SELECT jsonb_agg(jsonb_build_object('period', period, 'revenue', revenue, 'orders', orders)) FROM period_aggregation), '[]'::jsonb),
    COALESCE((SELECT SUM(revenue) FROM period_aggregation), 0),
    COALESCE((SELECT AVG(revenue) FROM period_aggregation), 0),
    CASE
      WHEN (SELECT prev_revenue FROM previous_period_calc) > 0
      THEN ((SELECT SUM(revenue) FROM period_aggregation) - (SELECT prev_revenue FROM previous_period_calc)) / (SELECT prev_revenue FROM previous_period_calc) * 100
      ELSE 0
    END,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('name', name, 'revenue', revenue)) FROM service_revenue), '[]'::jsonb)
  INTO
    period_data,
    total_revenue,
    avg_revenue_per_period,
    growth_rate,
    top_services;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. UPDATE GET_PERFORMANCE_TRENDS
-- Now uses completed_at for completed orders
-- =====================================================
CREATE OR REPLACE FUNCTION get_performance_trends(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  efficiency_trends JSONB,
  sla_trends JSONB,
  volume_trends JSONB,
  department_performance JSONB
) AS $$
BEGIN
  WITH efficiency_data AS (
    SELECT
      TO_CHAR(DATE_TRUNC('week', COALESCE(completed_at, created_at)), 'YYYY-MM-DD') AS week,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) AS efficiency
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND COALESCE(completed_at, created_at) BETWEEN p_start_date AND p_end_date
      AND completed_at IS NOT NULL
    GROUP BY DATE_TRUNC('week', COALESCE(completed_at, created_at))
    ORDER BY week
  ),
  sla_data AS (
    SELECT
      TO_CHAR(DATE_TRUNC('week', COALESCE(completed_at, created_at)), 'YYYY-MM-DD') AS week,
      COUNT(*) FILTER (WHERE completed_at <= sla_deadline)::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS sla_rate
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND COALESCE(completed_at, created_at) BETWEEN p_start_date AND p_end_date
      AND completed_at IS NOT NULL
    GROUP BY DATE_TRUNC('week', COALESCE(completed_at, created_at))
    ORDER BY week
  ),
  volume_data AS (
    SELECT
      TO_CHAR(DATE_TRUNC('week', COALESCE(completed_at, due_date, created_at)), 'YYYY-MM-DD') AS week,
      COUNT(*) AS volume
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND COALESCE(completed_at, due_date, created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('week', COALESCE(completed_at, due_date, created_at))
    ORDER BY week
  ),
  dept_performance AS (
    SELECT
      order_type AS department,
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS completion_rate,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) FILTER (WHERE completed_at IS NOT NULL) AS avg_processing_time
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND COALESCE(completed_at, due_date, created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY order_type
  )
  SELECT
    COALESCE((SELECT jsonb_agg(jsonb_build_object('week', week, 'efficiency', efficiency)) FROM efficiency_data), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('week', week, 'sla_rate', sla_rate)) FROM sla_data), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('week', week, 'volume', volume)) FROM volume_data), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('department', department, 'total_orders', total_orders, 'completion_rate', completion_rate, 'avg_processing_time', avg_processing_time)) FROM dept_performance), '[]'::jsonb)
  INTO
    efficiency_trends,
    sla_trends,
    volume_trends,
    department_performance;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the date filtering logic
COMMENT ON FUNCTION get_orders_analytics IS 'Filters orders by completed_at for completed/cancelled orders, due_date for pending/in_progress orders, and created_at as fallback. This provides more accurate reporting based on when work was actually done or scheduled.';
COMMENT ON FUNCTION get_revenue_analytics IS 'Uses completed_at for completed orders to accurately reflect when revenue was earned.';
COMMENT ON FUNCTION get_performance_trends IS 'Uses completed_at for completed orders and due_date for pending orders to show accurate performance metrics.';
