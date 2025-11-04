-- Add order_type and status filters to get_revenue_analytics
-- This ensures Total Revenue matches Total by Departments when filters are applied

DROP FUNCTION IF EXISTS get_revenue_analytics(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION get_revenue_analytics(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_grouping TEXT DEFAULT 'monthly',
  p_order_type TEXT DEFAULT 'all',
  p_status TEXT DEFAULT 'all',
  p_service_ids TEXT[] DEFAULT NULL
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
BEGIN
  v_period_format := CASE p_grouping
    WHEN 'daily' THEN 'YYYY-MM-DD'
    WHEN 'weekly' THEN 'IYYY-IW'
    WHEN 'monthly' THEN 'YYYY-MM'
    WHEN 'quarterly' THEN 'YYYY-Q'
    ELSE 'YYYY-MM'
  END;

  WITH period_aggregation AS (
    SELECT
      TO_CHAR(
        CASE
          WHEN order_type IN ('sales', 'service') THEN COALESCE(due_date, created_at)
          WHEN order_type IN ('recon', 'carwash') THEN COALESCE(completed_at, created_at)
          ELSE created_at
        END,
        v_period_format
      ) AS period,
      SUM(total_amount) AS revenue,
      COUNT(*) AS orders
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND status != 'cancelled'
      AND (p_order_type = 'all' OR order_type = p_order_type)
      AND (p_status = 'all' OR status = p_status)
      AND (
        (order_type IN ('sales', 'service') AND COALESCE(due_date, created_at) BETWEEN p_start_date AND p_end_date) OR
        (order_type IN ('recon', 'carwash') AND COALESCE(completed_at, created_at) BETWEEN p_start_date AND p_end_date) OR
        (order_type NOT IN ('sales', 'service', 'recon', 'carwash') AND created_at BETWEEN p_start_date AND p_end_date)
      )
      AND (
        p_service_ids IS NULL
        OR p_service_ids = '{}'
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(services, '[]'::jsonb)) AS service
          WHERE
            -- Handle string format (Sales/Service/Recon store service IDs as strings)
            (jsonb_typeof(service) = 'string' AND service::TEXT = ANY(p_service_ids))
            -- Handle object format (Carwash stores as objects with type/id fields)
            OR (jsonb_typeof(service) = 'object' AND (
              (service->>'id')::TEXT = ANY(p_service_ids)
              OR (service->>'type')::TEXT = ANY(p_service_ids)
            ))
        )
      )
    GROUP BY period
    ORDER BY period
  ),
  service_revenue AS (
    SELECT
      COALESCE(service->>'name', service->>'type') AS name,
      SUM((service->>'price')::NUMERIC) AS revenue
    FROM orders o, jsonb_array_elements(COALESCE(o.services, '[]'::jsonb)) AS service
    WHERE o.dealer_id = p_dealer_id
      AND o.status != 'cancelled'
      AND (p_order_type = 'all' OR o.order_type = p_order_type)
      AND (p_status = 'all' OR o.status = p_status)
      AND (
        (o.order_type IN ('sales', 'service') AND COALESCE(o.due_date, o.created_at) BETWEEN p_start_date AND p_end_date) OR
        (o.order_type IN ('recon', 'carwash') AND COALESCE(o.completed_at, o.created_at) BETWEEN p_start_date AND p_end_date) OR
        (o.order_type NOT IN ('sales', 'service', 'recon', 'carwash') AND o.created_at BETWEEN p_start_date AND p_end_date)
      )
      AND (service ? 'name' OR service ? 'type')
      AND service ? 'price'
      AND (
        p_service_ids IS NULL
        OR p_service_ids = '{}'
        OR (service->>'id')::TEXT = ANY(p_service_ids)
        OR (service->>'type')::TEXT = ANY(p_service_ids)
      )
    GROUP BY COALESCE(service->>'name', service->>'type')
    ORDER BY revenue DESC
    LIMIT 10
  ),
  previous_period_calc AS (
    SELECT COALESCE(SUM(total_amount), 0) AS prev_revenue
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND status != 'cancelled'
      AND (p_order_type = 'all' OR order_type = p_order_type)
      AND (p_status = 'all' OR status = p_status)
      AND (
        (order_type IN ('sales', 'service') AND COALESCE(due_date, created_at) BETWEEN (p_start_date - (p_end_date - p_start_date)) AND p_start_date) OR
        (order_type IN ('recon', 'carwash') AND COALESCE(completed_at, created_at) BETWEEN (p_start_date - (p_end_date - p_start_date)) AND p_start_date) OR
        (order_type NOT IN ('sales', 'service', 'recon', 'carwash') AND created_at BETWEEN (p_start_date - (p_end_date - p_start_date)) AND p_start_date)
      )
      AND (
        p_service_ids IS NULL
        OR p_service_ids = '{}'
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(services, '[]'::jsonb)) AS service
          WHERE
            -- Handle string format (Sales/Service/Recon store service IDs as strings)
            (jsonb_typeof(service) = 'string' AND service::TEXT = ANY(p_service_ids))
            -- Handle object format (Carwash stores as objects with type/id fields)
            OR (jsonb_typeof(service) = 'object' AND (
              (service->>'id')::TEXT = ANY(p_service_ids)
              OR (service->>'type')::TEXT = ANY(p_service_ids)
            ))
        )
      )
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

  RETURN QUERY SELECT
    period_data,
    total_revenue,
    avg_revenue_per_period,
    growth_rate,
    top_services;
END;
$$ LANGUAGE plpgsql;
