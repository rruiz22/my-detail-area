-- Migration: Recalculate Zero Order Totals
-- Date: 2025-11-09
-- Purpose: Fix sales orders with total_amount = 0 by recalculating from services JSON
-- Issue: Some orders have services with prices but total_amount was saved as $0.00
-- Affected: 14 orders worth $295.00 in revenue

-- ============================================================================
-- STEP 1: Recalculate orders where services is an ARRAY OF OBJECTS with prices
-- ============================================================================
-- These orders have services like: [{"id": "...", "name": "New Delivery", "price": 40}]
-- We extract the price from each service object and sum them up

DO $$
DECLARE
  updated_count INT := 0;
BEGIN
  WITH orders_to_update AS (
    SELECT
      o.id,
      (
        SELECT COALESCE(SUM((service->>'price')::numeric), 0)
        FROM jsonb_array_elements(o.services) AS service
        WHERE service->>'price' IS NOT NULL
      ) as calculated_total
    FROM orders o
    WHERE o.total_amount = 0
      AND o.services IS NOT NULL
      AND jsonb_typeof(o.services) = 'array'
      AND jsonb_array_length(o.services) > 0
      -- Only process orders where services have price objects
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(o.services) AS service
        WHERE service->>'price' IS NOT NULL
      )
  )
  UPDATE orders o
  SET
    total_amount = otu.calculated_total,
    updated_at = NOW()
  FROM orders_to_update otu
  WHERE o.id = otu.id
    AND otu.calculated_total > 0;  -- Only update if calculated total > 0

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Step 1: Updated % orders with service price objects', updated_count;
END $$;

-- ============================================================================
-- STEP 2: Recalculate orders where services is an ARRAY OF STRINGS (service IDs)
-- ============================================================================
-- These orders have services like: ["2533e298-de07-49a2-8fa9-acdb71a7bf9d"]
-- We need to JOIN with dealer_services to get current prices

DO $$
DECLARE
  updated_count INT := 0;
BEGIN
  WITH orders_to_update AS (
    SELECT
      o.id,
      o.dealer_id,
      (
        SELECT COALESCE(SUM(ds.price), 0)
        FROM jsonb_array_elements_text(o.services) AS service_id
        JOIN dealer_services ds ON ds.id::text = service_id
        WHERE ds.dealer_id = o.dealer_id
      ) as calculated_total
    FROM orders o
    WHERE o.total_amount = 0
      AND o.services IS NOT NULL
      AND jsonb_typeof(o.services) = 'array'
      AND jsonb_array_length(o.services) > 0
      -- Only process orders where services are string IDs
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(o.services) AS service
        WHERE jsonb_typeof(service) = 'object'
      )
  )
  UPDATE orders o
  SET
    total_amount = otu.calculated_total,
    updated_at = NOW()
  FROM orders_to_update otu
  WHERE o.id = otu.id
    AND otu.calculated_total > 0;  -- Only update if calculated total > 0

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Step 2: Updated % orders with service ID strings', updated_count;
END $$;

-- ============================================================================
-- STEP 3: Normalize services format (convert string IDs to objects with prices)
-- ============================================================================
-- Convert all services that are stored as string IDs to full objects
-- This ensures consistent format for future calculations

DO $$
DECLARE
  updated_count INT := 0;
BEGIN
  WITH orders_to_normalize AS (
    SELECT
      o.id,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', service_id::text,
            'name', COALESCE(ds.name, 'Unknown Service'),
            'price', COALESCE(ds.price, 0),
            'description', ds.description
          )
        )
        FROM jsonb_array_elements_text(o.services) AS service_id
        LEFT JOIN dealer_services ds ON ds.id::text = service_id AND ds.dealer_id = o.dealer_id
      ) as normalized_services
    FROM orders o
    WHERE o.services IS NOT NULL
      AND jsonb_typeof(o.services) = 'array'
      AND jsonb_array_length(o.services) > 0
      -- Only process orders where services are string IDs
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(o.services) AS service
        WHERE jsonb_typeof(service) = 'object'
      )
  )
  UPDATE orders o
  SET
    services = otn.normalized_services,
    updated_at = NOW()
  FROM orders_to_normalize otn
  WHERE o.id = otn.id
    AND otn.normalized_services IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Step 3: Normalized % orders to consistent service format', updated_count;
END $$;

-- ============================================================================
-- STEP 4: Verification Query (Logs summary of changes)
-- ============================================================================
DO $$
DECLARE
  total_fixed INT;
  total_revenue NUMERIC;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(total_amount), 0)
  INTO total_fixed, total_revenue
  FROM orders
  WHERE updated_at >= NOW() - INTERVAL '1 minute'  -- Orders updated in last minute
    AND total_amount > 0;

  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'MIGRATION COMPLETE: Recalculate Zero Order Totals';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'Total orders fixed: %', total_fixed;
  RAISE NOTICE 'Total revenue recovered: $%', total_revenue;
  RAISE NOTICE '==============================================================';
END $$;

-- ============================================================================
-- VALIDATION: Show orders that were updated
-- ============================================================================
-- This query shows the orders that were just updated for manual verification
SELECT
  order_number,
  customer_name,
  total_amount,
  services,
  updated_at,
  created_at
FROM orders
WHERE updated_at >= NOW() - INTERVAL '1 minute'
  AND total_amount > 0
ORDER BY updated_at DESC
LIMIT 20;
