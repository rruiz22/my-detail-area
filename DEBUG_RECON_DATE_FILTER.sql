-- =====================================================
-- DEBUG RECON DATE FILTERING LOGIC
-- This shows exactly how orders are being filtered
-- =====================================================

-- Step 1: Show ALL recon orders and their relevant dates
SELECT
  id,
  order_number,
  order_type,
  status,
  total_amount,
  created_at,
  completed_at,
  due_date,
  -- Show which date is being used for filtering (matches SQL function logic)
  COALESCE(completed_at, created_at) as report_date,
  -- Show if order has completed_at
  CASE WHEN completed_at IS NOT NULL THEN 'Has completed_at' ELSE 'NO completed_at (uses created_at fallback)' END as date_source
FROM orders
WHERE LOWER(order_type) = 'recon'
  AND status != 'cancelled'
ORDER BY COALESCE(completed_at, created_at) DESC;

-- Step 2: Count how many orders fall in the last 7 days using the CORRECT date logic
SELECT
  'Last 7 Days' as period,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as with_completed_at,
  COUNT(*) FILTER (WHERE completed_at IS NULL) as without_completed_at
FROM orders
WHERE LOWER(order_type) = 'recon'
  AND status != 'cancelled'
  AND COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '7 days'
  AND COALESCE(completed_at, created_at) <= CURRENT_TIMESTAMP;

-- Step 3: Show the 11 orders that are appearing in the report (based on completed_at in last 7 days)
SELECT
  order_number,
  status,
  total_amount,
  created_at,
  completed_at,
  due_date,
  COALESCE(completed_at, created_at) as report_date,
  AGE(COALESCE(completed_at, created_at), CURRENT_TIMESTAMP) as days_ago
FROM orders
WHERE LOWER(order_type) = 'recon'
  AND status != 'cancelled'
  AND COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY COALESCE(completed_at, created_at) DESC;

-- Step 4: Show breakdown by status
SELECT
  status,
  COUNT(*) as count,
  SUM(total_amount) as revenue,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as has_completed_at,
  COUNT(*) FILTER (WHERE completed_at IS NULL) as missing_completed_at
FROM orders
WHERE LOWER(order_type) = 'recon'
  AND status != 'cancelled'
  AND COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status
ORDER BY count DESC;

-- Step 5: Compare with what get_revenue_analytics would return
-- This simulates the SQL function for last 7 days
WITH period_aggregation AS (
  SELECT
    TO_CHAR(COALESCE(completed_at, created_at), 'YYYY-MM-DD') AS period,
    SUM(total_amount) AS revenue,
    COUNT(*) AS orders
  FROM orders
  WHERE dealer_id = (SELECT dealer_id FROM orders WHERE order_type = 'recon' LIMIT 1)
    AND status != 'cancelled'
    AND order_type = 'recon'
    AND COALESCE(completed_at, created_at) BETWEEN (CURRENT_DATE - INTERVAL '7 days') AND CURRENT_TIMESTAMP
  GROUP BY period
  ORDER BY period DESC
)
SELECT
  'get_revenue_analytics simulation' as source,
  SUM(revenue) as total_revenue,
  SUM(orders) as total_orders
FROM period_aggregation;

-- Step 6: Show all 60 recon orders grouped by date range
WITH date_ranges AS (
  SELECT
    CASE
      WHEN COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last 7 days'
      WHEN COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 'Last 30 days'
      WHEN COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '90 days' THEN 'Last 90 days'
      ELSE 'Older than 90 days'
    END as date_range,
    CASE
      WHEN COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1
      WHEN COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '30 days' THEN 2
      WHEN COALESCE(completed_at, created_at) >= CURRENT_DATE - INTERVAL '90 days' THEN 3
      ELSE 4
    END as sort_order,
    total_amount,
    completed_at,
    created_at
  FROM orders
  WHERE LOWER(order_type) = 'recon'
    AND status != 'cancelled'
)
SELECT
  date_range,
  COUNT(*) as orders,
  SUM(total_amount) as revenue,
  MIN(COALESCE(completed_at, created_at)) as earliest_date,
  MAX(COALESCE(completed_at, created_at)) as latest_date
FROM date_ranges
GROUP BY date_range, sort_order
ORDER BY sort_order;
