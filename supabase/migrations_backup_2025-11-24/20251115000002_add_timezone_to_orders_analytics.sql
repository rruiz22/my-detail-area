-- Add timezone conversion to get_orders_analytics for consistency with get_revenue_analytics
-- This ensures date-based filtering and grouping uses America/New_York timezone

DROP FUNCTION IF EXISTS get_orders_analytics(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION get_orders_analytics(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_order_type TEXT DEFAULT 'all',
  p_status TEXT DEFAULT 'all',
  p_service_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  total_orders BIGINT,
  total_volume BIGINT,
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
  WITH filtered_orders AS (
    SELECT
      o.*,
      EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 3600 AS processing_hours,
      CASE
        WHEN o.sla_deadline IS NOT NULL AND o.completed_at IS NOT NULL
        THEN o.completed_at <= o.sla_deadline
        ELSE NULL
      END AS sla_met,
      -- Convert to America/New_York timezone before using as report_date
      (CASE
        WHEN o.order_type IN ('sales', 'service') THEN COALESCE(o.due_date, o.created_at)
        WHEN o.order_type IN ('recon', 'carwash') THEN COALESCE(o.completed_at, o.created_at)
        ELSE o.created_at
      END) AT TIME ZONE 'America/New_York' AS report_date
    FROM orders o
    WHERE o.dealer_id = p_dealer_id
      AND (p_order_type = 'all' OR o.order_type = p_order_type)
      AND (p_status = 'all' OR o.status = p_status)
      AND (
        (o.order_type IN ('sales', 'service') AND COALESCE(o.due_date, o.created_at) BETWEEN p_start_date AND p_end_date) OR
        (o.order_type IN ('recon', 'carwash') AND COALESCE(o.completed_at, o.created_at) BETWEEN p_start_date AND p_end_date) OR
        (o.order_type NOT IN ('sales', 'service', 'recon', 'carwash') AND o.created_at BETWEEN p_start_date AND p_end_date)
      )
      AND (
        p_service_ids IS NULL
        OR p_service_ids = '{}'
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(o.services, '[]'::jsonb)) AS service
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
  ),
  metrics AS (
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(jsonb_array_length(COALESCE(services, '[]'::jsonb))), 0) AS volume,
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
      -- report_date is already in America/New_York timezone from filtered_orders CTE
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
    m.volume,
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
    total_volume,
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

COMMENT ON FUNCTION get_orders_analytics IS 'Order analytics with timezone-aware date handling. Uses America/New_York timezone for filtering by due_date (sales/service) or completed_at (recon/carwash). Supports multiple service IDs filtering and returns total_volume (count of services).';
