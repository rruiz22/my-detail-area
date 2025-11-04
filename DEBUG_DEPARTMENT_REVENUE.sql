-- Debug: Simulate useDepartmentRevenue logic with service filter
-- This checks if the SQL logic matches what the frontend is doing

-- Using the 18 service IDs from the console.log
WITH service_ids AS (
  SELECT UNNEST(ARRAY[
    '2a0276ea-0243-43b8-b7e5-db48896622ad',
    '2f3c26b0-3c23-4dc3-8455-802df6206c7a',
    'bf681133-8c48-4cb8-9057-1f754114b0dc',
    'b407b1d0-e834-4e6f-83aa-c9ff9f3ae4a4',
    '9c962a0c-b7f0-4d89-855d-2d884efe5912',
    'b380293c-22bb-42b2-95dd-10f8dac1a950',
    'cfe5430e-757f-4697-ab15-99bee1722034',
    'e06d8cfa-f51e-412f-9201-bc5c128d7a67',
    'a7c21022-416e-4f7a-82f8-df80351072b1',
    '2e53e298-de07-49a2-8fa9-acdb71a7bfbd',
    'd5e385df-e686-48eb-8165-4020a15cd355',
    '86fbdb32-7db6-4309-8b22-3a1335bef534',
    'bcba9790-6af6-4ae4-88da-cc6585053c6a',
    '73ff8849-653e-4b4e-b1b7-f2f95982de28',
    'd78fc9fd-9e89-41c8-bb7f-c451a396b619',
    '754e926c-38df-4b11-9661-6b8c2c234803',
    '9a386ca5-1502-44b2-9dcc-06c077d5d113',
    'ee38e1ab-d04a-41ff-a450-ac5b39a91e6f'
  ]::TEXT[]) AS service_id
)
SELECT
  'With Service Filter (18 services)' as test_name,
  o.order_type,
  COUNT(*) as order_count,
  SUM(o.total_amount) as total_revenue
FROM orders o
WHERE o.dealer_id = 5
  AND o.status != 'cancelled'
  AND o.status = 'completed'
  AND (
    (o.order_type IN ('sales', 'service') AND COALESCE(o.due_date, o.created_at) BETWEEN '2025-10-27T04:00:00Z' AND '2025-11-03T04:59:59.999Z') OR
    (o.order_type IN ('recon', 'carwash') AND COALESCE(o.completed_at, o.created_at) BETWEEN '2025-10-27T04:00:00Z' AND '2025-11-03T04:59:59.999Z')
  )
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(o.services, '[]'::jsonb)) AS service
    WHERE (service->>'id')::TEXT IN (SELECT service_id FROM service_ids)
       OR (service->>'type')::TEXT IN (SELECT service_id FROM service_ids)
  )
GROUP BY o.order_type
ORDER BY o.order_type;

-- Compare with ALL services (no filter)
SELECT
  'Without Service Filter (all services)' as test_name,
  o.order_type,
  COUNT(*) as order_count,
  SUM(o.total_amount) as total_revenue
FROM orders o
WHERE o.dealer_id = 5
  AND o.status != 'cancelled'
  AND o.status = 'completed'
  AND (
    (o.order_type IN ('sales', 'service') AND COALESCE(o.due_date, o.created_at) BETWEEN '2025-10-27T04:00:00Z' AND '2025-11-03T04:59:59.999Z') OR
    (o.order_type IN ('recon', 'carwash') AND COALESCE(o.completed_at, o.created_at) BETWEEN '2025-10-27T04:00:00Z' AND '2025-11-03T04:59:59.999Z')
  )
GROUP BY o.order_type
ORDER BY o.order_type;
