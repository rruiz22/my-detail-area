-- Add timezone conversion to get_performance_trends for consistency
-- This ensures weekly grouping uses America/New_York timezone

DROP FUNCTION IF EXISTS get_performance_trends(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT[]);

CREATE OR REPLACE FUNCTION get_performance_trends(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_service_ids TEXT[] DEFAULT NULL
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
      TO_CHAR(
        DATE_TRUNC('week',
          -- Convert to America/New_York timezone before truncating to week
          (CASE
            WHEN order_type IN ('sales', 'service') THEN COALESCE(due_date, created_at)
            WHEN order_type IN ('recon', 'carwash') THEN COALESCE(completed_at, created_at)
            ELSE created_at
          END) AT TIME ZONE 'America/New_York'
        ),
        'YYYY-MM-DD'
      ) AS week,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) AS efficiency
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND completed_at IS NOT NULL
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
    GROUP BY week
    ORDER BY week
  ),
  sla_data AS (
    SELECT
      TO_CHAR(
        DATE_TRUNC('week',
          -- Convert to America/New_York timezone before truncating to week
          (CASE
            WHEN order_type IN ('sales', 'service') THEN COALESCE(due_date, created_at)
            WHEN order_type IN ('recon', 'carwash') THEN COALESCE(completed_at, created_at)
            ELSE created_at
          END) AT TIME ZONE 'America/New_York'
        ),
        'YYYY-MM-DD'
      ) AS week,
      COUNT(*) FILTER (WHERE completed_at <= sla_deadline)::NUMERIC / NULLIF(COUNT(*), 0) * 100 AS sla_rate
    FROM orders
    WHERE dealer_id = p_dealer_id
      AND completed_at IS NOT NULL
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
    GROUP BY week
    ORDER BY week
  ),
  volume_data AS (
    SELECT
      TO_CHAR(
        DATE_TRUNC('week',
          -- Convert to America/New_York timezone before truncating to week
          (CASE
            WHEN order_type IN ('sales', 'service') THEN COALESCE(due_date, created_at)
            WHEN order_type IN ('recon', 'carwash') THEN COALESCE(completed_at, created_at)
            ELSE created_at
          END) AT TIME ZONE 'America/New_York'
        ),
        'YYYY-MM-DD'
      ) AS week,
      COUNT(*) AS volume
    FROM orders
    WHERE dealer_id = p_dealer_id
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
    GROUP BY week
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

COMMENT ON FUNCTION get_performance_trends IS 'Performance trends with timezone-aware weekly grouping. Weekly periods are Monday-Sunday based on America/New_York timezone (EST/EDT). Uses due_date for sales/service, completed_at for recon/carwash.';
