-- Create RPC function to fetch operational orders list with server-side filtering
-- Replaces client-side filtering in OperationalReports.tsx for better performance

-- Drop existing function (needed when changing return type from INTEGER to UUID)
DROP FUNCTION IF EXISTS get_operational_orders_list(integer,timestamp with time zone,timestamp with time zone,text,text,text[]);

CREATE OR REPLACE FUNCTION get_operational_orders_list(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_order_type TEXT DEFAULT 'all',
  p_status TEXT DEFAULT 'all',
  p_service_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,  -- ✅ FIXED: Changed from INTEGER to UUID
  order_number TEXT,
  custom_order_number TEXT,
  order_type TEXT,
  customer_name TEXT,
  stock_number TEXT,
  po TEXT,
  ro TEXT,
  tag TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_vin TEXT,
  total_amount NUMERIC,
  services JSONB,
  status TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  assigned_group_id UUID,
  assigned_to_name TEXT,
  invoice_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_orders AS (
    SELECT
      o.id,
      o.order_number,
      o.custom_order_number,
      o.order_type,
      o.customer_name,
      o.stock_number,
      o.po,
      o.ro,
      o.tag,
      o.vehicle_make,
      o.vehicle_model,
      o.vehicle_year,
      o.vehicle_vin,
      o.total_amount,
      o.services,
      o.status,
      o.created_at,
      o.completed_at,
      o.due_date,
      o.assigned_group_id,
      -- Calculate report_date with timezone conversion
      (CASE
        WHEN o.order_type IN ('sales', 'service') THEN COALESCE(o.due_date, o.created_at)
        WHEN o.order_type IN ('recon', 'carwash') THEN COALESCE(o.completed_at, o.created_at)
        ELSE o.created_at
      END) AT TIME ZONE 'America/New_York' AS report_date
    FROM orders o
    WHERE o.dealer_id = p_dealer_id
      AND (p_order_type = 'all' OR o.order_type = p_order_type)
      AND (p_status = 'all' OR o.status = p_status)
      -- Date filter based on order type (same as get_orders_analytics)
      AND (
        (o.order_type IN ('sales', 'service') AND COALESCE(o.due_date, o.created_at) BETWEEN p_start_date AND p_end_date) OR
        (o.order_type IN ('recon', 'carwash') AND COALESCE(o.completed_at, o.created_at) BETWEEN p_start_date AND p_end_date) OR
        (o.order_type NOT IN ('sales', 'service', 'recon', 'carwash') AND o.created_at BETWEEN p_start_date AND p_end_date)
      )
      -- Service filter (supports both string and object formats)
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
  user_profiles AS (
    SELECT
      p.id,
      COALESCE(
        NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''),
        p.email
      ) AS user_name
    FROM profiles p
  ),
  invoice_numbers AS (
    SELECT DISTINCT ON (ii.service_reference)
      ii.service_reference AS order_id,
      i.invoice_number
    FROM invoice_items ii
    INNER JOIN invoices i ON ii.invoice_id = i.id
    WHERE ii.service_reference IN (SELECT fo.id::TEXT FROM filtered_orders fo)  -- ✅ FIXED: Cast UUID to TEXT
    ORDER BY ii.service_reference, i.created_at DESC
  )
  SELECT
    fo.id,
    fo.order_number,
    fo.custom_order_number,
    fo.order_type,
    fo.customer_name,
    fo.stock_number,
    fo.po,
    fo.ro,
    fo.tag,
    fo.vehicle_make,
    fo.vehicle_model,
    fo.vehicle_year,
    fo.vehicle_vin,
    fo.total_amount,
    fo.services,
    fo.status,
    fo.created_at,
    fo.completed_at,
    fo.due_date,
    fo.assigned_group_id,
    up.user_name AS assigned_to_name,
    inv.invoice_number
  FROM filtered_orders fo
  LEFT JOIN user_profiles up ON fo.assigned_group_id = up.id
  LEFT JOIN invoice_numbers inv ON fo.id::TEXT = inv.order_id  -- ✅ FIXED: Cast UUID to TEXT for join
  ORDER BY fo.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_operational_orders_list IS 'Fetches operational orders list with server-side filtering using America/New_York timezone. Includes assigned user names and invoice numbers. Replaces client-side filtering for better performance.';
