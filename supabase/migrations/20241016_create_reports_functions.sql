-- =====================================================
-- REPORTS ANALYTICS FUNCTIONS
-- Created: 2024-10-16
-- Description: Real-time analytics from orders table
-- =====================================================

-- =====================================================
-- 0. DROP ALL EXISTING VERSIONS OF FUNCTIONS
-- This ensures clean slate regardless of previous versions
-- =====================================================

-- Drop all versions of get_orders_analytics
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT routine_name, routine_schema, pg_get_function_identity_arguments(p.oid) as args
    FROM information_schema.routines
    JOIN pg_proc p ON p.proname = routine_name
    WHERE routine_schema = 'public'
    AND routine_name = 'get_orders_analytics'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.routine_schema || '.' || r.routine_name || '(' || r.args || ') CASCADE';
  END LOOP;
END $$;

-- Drop all versions of get_revenue_analytics
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT routine_name, routine_schema, pg_get_function_identity_arguments(p.oid) as args
    FROM information_schema.routines
    JOIN pg_proc p ON p.proname = routine_name
    WHERE routine_schema = 'public'
    AND routine_name = 'get_revenue_analytics'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.routine_schema || '.' || r.routine_name || '(' || r.args || ') CASCADE';
  END LOOP;
END $$;

-- Drop all versions of get_performance_trends
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT routine_name, routine_schema, pg_get_function_identity_arguments(p.oid) as args
    FROM information_schema.routines
    JOIN pg_proc p ON p.proname = routine_name
    WHERE routine_schema = 'public'
    AND routine_name = 'get_performance_trends'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.routine_schema || '.' || r.routine_name || '(' || r.args || ') CASCADE';
  END LOOP;
END $$;

-- Drop all versions of get_invoice_analytics
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT routine_name, routine_schema, pg_get_function_identity_arguments(p.oid) as args
    FROM information_schema.routines
    JOIN pg_proc p ON p.proname = routine_name
    WHERE routine_schema = 'public'
    AND routine_name = 'get_invoice_analytics'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.routine_schema || '.' || r.routine_name || '(' || r.args || ') CASCADE';
  END LOOP;
END $$;

-- =====================================================
-- 1. GET ORDERS ANALYTICS
-- Returns comprehensive order statistics with real data
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
  WITH filtered_orders AS (
    SELECT
      o.*,
      EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 3600 AS processing_hours,
      CASE
        WHEN o.sla_deadline IS NOT NULL AND o.completed_at IS NOT NULL
        THEN o.completed_at <= o.sla_deadline
        ELSE NULL
      END AS sla_met
    FROM orders o
    WHERE o.dealer_id = p_dealer_id
      AND o.created_at BETWEEN p_start_date AND p_end_date
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
      DATE(created_at) AS date,
      COUNT(*) AS orders,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM filtered_orders
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
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
-- 2. GET REVENUE ANALYTICS
-- Returns revenue breakdown by period and services
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

  -- Calculate period data
  WITH period_aggregation AS (
    SELECT
      TO_CHAR(created_at, v_period_format) AS period,
      COUNT(*) AS orders,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND created_at BETWEEN p_start_date AND p_end_date
      AND status != 'cancelled'
    GROUP BY TO_CHAR(created_at, v_period_format)
    ORDER BY period
  ),
  service_aggregation AS (
    SELECT
      service_name,
      SUM(service_revenue) AS revenue
    FROM (
      SELECT
        o.id,
        service->>'name' AS service_name,
        (service->>'price')::NUMERIC AS service_revenue
      FROM orders o,
        LATERAL jsonb_array_elements(COALESCE(o.services, '[]'::jsonb)) AS service
      WHERE o.dealer_id = p_dealer_id
        AND o.created_at BETWEEN p_start_date AND p_end_date
        AND o.status != 'cancelled'
        AND service ? 'name'
        AND service ? 'price'
    ) services
    GROUP BY service_name
    ORDER BY revenue DESC
    LIMIT 10
  ),
  totals AS (
    SELECT
      COALESCE(SUM(revenue), 0) AS total_rev,
      COUNT(*) AS period_cnt
    FROM period_aggregation
  ),
  previous_period AS (
    SELECT COALESCE(SUM(total_amount), 0) AS prev_revenue
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND created_at BETWEEN (p_start_date - (p_end_date - p_start_date)) AND p_start_date
      AND status != 'cancelled'
  )
  SELECT
    COALESCE((SELECT jsonb_agg(jsonb_build_object('period', period, 'orders', orders, 'revenue', revenue)) FROM period_aggregation), '[]'::jsonb),
    t.total_rev,
    CASE WHEN t.period_cnt > 0 THEN t.total_rev / t.period_cnt ELSE 0 END,
    CASE
      WHEN pp.prev_revenue > 0 THEN ((t.total_rev - pp.prev_revenue) / pp.prev_revenue * 100)
      WHEN t.total_rev > 0 THEN 100
      ELSE 0
    END,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('name', service_name, 'revenue', revenue)) FROM service_aggregation), '[]'::jsonb)
  FROM totals t, previous_period pp
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
-- 3. GET PERFORMANCE TRENDS
-- Returns performance metrics by department/type
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
  WITH weekly_efficiency AS (
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-IW') AS week,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) AS avg_hours,
      -- Efficiency: inverse of processing time (higher is better)
      CASE
        WHEN AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) > 0
        THEN 100 / AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)
        ELSE 0
      END AS efficiency
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND created_at BETWEEN p_start_date AND p_end_date
      AND completed_at IS NOT NULL
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week
  ),
  weekly_sla AS (
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-IW') AS week,
      COUNT(*) FILTER (WHERE completed_at <= sla_deadline)::NUMERIC /
        NULLIF(COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL), 0) * 100 AS sla_rate
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND created_at BETWEEN p_start_date AND p_end_date
      AND completed_at IS NOT NULL
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY week
  ),
  weekly_volume AS (
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-IW') AS week,
      COUNT(*) AS volume
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('week', created_at)
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
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY order_type
  )
  SELECT
    COALESCE((SELECT jsonb_agg(jsonb_build_object('week', week, 'efficiency', ROUND(efficiency::NUMERIC, 2))) FROM weekly_efficiency), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('week', week, 'sla_rate', ROUND(COALESCE(sla_rate, 0)::NUMERIC, 2))) FROM weekly_sla), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('week', week, 'volume', volume)) FROM weekly_volume), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'department', department,
      'total_orders', total_orders,
      'completion_rate', ROUND(COALESCE(completion_rate, 0)::NUMERIC, 2),
      'avg_processing_time', ROUND(COALESCE(avg_processing_time, 0)::NUMERIC, 2)
    )) FROM dept_performance), '[]'::jsonb)
  INTO
    efficiency_trends,
    sla_trends,
    volume_trends,
    department_performance;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. GET INVOICE ANALYTICS
-- Returns invoice and payment statistics
-- =====================================================
CREATE OR REPLACE FUNCTION get_invoice_analytics(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_invoices BIGINT,
  total_amount NUMERIC,
  total_paid NUMERIC,
  total_due NUMERIC,
  pending_count BIGINT,
  overdue_count BIGINT,
  paid_count BIGINT,
  avg_days_to_payment NUMERIC,
  payment_method_distribution JSONB,
  monthly_trend JSONB
) AS $$
BEGIN
  WITH invoice_metrics AS (
    SELECT
      COUNT(*) AS total_inv,
      COALESCE(SUM(total_amount), 0) AS total_amt,
      COALESCE(SUM(amount_paid), 0) AS paid_amt,
      COALESCE(SUM(amount_due), 0) AS due_amt,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending_cnt,
      COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_cnt,
      COUNT(*) FILTER (WHERE status = 'paid') AS paid_cnt,
      AVG(EXTRACT(DAY FROM (paid_at - issue_date))) FILTER (WHERE paid_at IS NOT NULL) AS avg_days
    FROM invoices
    WHERE dealer_id = p_dealer_id
      AND issue_date BETWEEN p_start_date AND p_end_date
  ),
  payment_methods AS (
    SELECT
      p.payment_method,
      COUNT(*) AS count,
      SUM(p.amount) AS total
    FROM payments p
    INNER JOIN invoices i ON p.invoice_id = i.id
    WHERE i.dealer_id = p_dealer_id
      AND p.payment_date BETWEEN p_start_date AND p_end_date
      AND p.status = 'completed'
    GROUP BY p.payment_method
  ),
  monthly_data AS (
    SELECT
      TO_CHAR(issue_date, 'YYYY-MM') AS month,
      COUNT(*) AS invoices,
      COALESCE(SUM(total_amount), 0) AS billed,
      COALESCE(SUM(amount_paid), 0) AS collected
    FROM invoices
    WHERE dealer_id = p_dealer_id
      AND issue_date BETWEEN p_start_date AND p_end_date
    GROUP BY TO_CHAR(issue_date, 'YYYY-MM')
    ORDER BY month
  )
  SELECT
    im.total_inv,
    im.total_amt,
    im.paid_amt,
    im.due_amt,
    im.pending_cnt,
    im.overdue_cnt,
    im.paid_cnt,
    COALESCE(im.avg_days, 0),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('method', payment_method, 'count', count, 'total', total)) FROM payment_methods), '[]'::jsonb),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('month', month, 'invoices', invoices, 'billed', billed, 'collected', collected)) FROM monthly_data), '[]'::jsonb)
  FROM invoice_metrics im
  INTO
    total_invoices,
    total_amount,
    total_paid,
    total_due,
    pending_count,
    overdue_count,
    paid_count,
    avg_days_to_payment,
    payment_method_distribution,
    monthly_trend;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. GRANTS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_orders_analytics(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_analytics(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_trends(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoice_analytics(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON FUNCTION get_orders_analytics IS 'Returns comprehensive order analytics with real-time data';
COMMENT ON FUNCTION get_revenue_analytics IS 'Returns revenue breakdown by period and top services';
COMMENT ON FUNCTION get_performance_trends IS 'Returns performance metrics by department';
COMMENT ON FUNCTION get_invoice_analytics IS 'Returns invoice and payment statistics';
