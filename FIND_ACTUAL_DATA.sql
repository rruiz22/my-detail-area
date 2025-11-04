-- Script to find actual data in your database
-- Run this to discover the correct parameters

-- Step 1: Find your dealer_id
SELECT
  'Step 1: Available Dealer IDs' as step,
  dealer_id,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue
FROM orders
GROUP BY dealer_id
ORDER BY order_count DESC;

-- Step 2: Find recent orders date range
SELECT
  'Step 2: Recent Orders Date Range' as step,
  MIN(created_at) as earliest_order,
  MAX(created_at) as latest_order,
  MIN(due_date) as earliest_due_date,
  MAX(due_date) as latest_due_date,
  MIN(completed_at) as earliest_completed,
  MAX(completed_at) as latest_completed,
  COUNT(*) as total_orders
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- Step 3: Find status distribution
SELECT
  'Step 3: Status Distribution' as step,
  status,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status
ORDER BY order_count DESC;

-- Step 4: Find order type distribution
SELECT
  'Step 4: Order Type Distribution' as step,
  order_type,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue
FROM orders
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY order_type
ORDER BY order_count DESC;

-- Step 5: Sample of recent completed orders
SELECT
  'Step 5: Sample Recent Completed Orders' as step,
  id,
  order_type,
  status,
  total_amount,
  created_at,
  due_date,
  completed_at,
  CASE
    WHEN order_type IN ('sales', 'service') THEN COALESCE(due_date, created_at)
    WHEN order_type IN ('recon', 'carwash') THEN COALESCE(completed_at, created_at)
    ELSE created_at
  END as report_date
FROM orders
WHERE status = 'completed'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 10;
