-- =====================================================
-- RECALCULATE ZERO PRICES - Comprehensive Fix
-- =====================================================
-- Date: 2025-11-22
-- Purpose: Fix orders with total_amount = 0 after removing canViewPrices validation
-- Approach: Multi-step process with extensive safety checks and rollback capability
-- =====================================================

-- ============================================================================
-- STEP 1: CREATE BACKUP TABLE (SAFETY FIRST)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders_backup_20251122 AS
SELECT * FROM orders
WHERE total_amount = 0
  AND services IS NOT NULL
  AND jsonb_typeof(services) = 'array'
  AND jsonb_array_length(services) > 0;

COMMENT ON TABLE orders_backup_20251122 IS 'Backup of orders with $0 total before 2025-11-22 price correction. Use for rollback if needed.';

-- ============================================================================
-- STEP 2: ANALYSIS - Show what will be affected (CAUTIOUS APPROACH)
-- ============================================================================
DO $$
DECLARE
  affected_count INTEGER;
  total_revenue_to_recover NUMERIC;
  rec RECORD;
BEGIN
  -- Count affected orders
  SELECT COUNT(*), COALESCE(SUM(
    (
      SELECT COALESCE(SUM((service->>'price')::numeric), 0)
      FROM jsonb_array_elements(o.services) AS service
      WHERE (service->>'price') IS NOT NULL
        AND (service->>'price')::text != 'null'
        AND (service->>'price')::numeric > 0
    )
  ), 0)
  INTO affected_count, total_revenue_to_recover
  FROM orders o
  WHERE total_amount = 0
    AND services IS NOT NULL
    AND jsonb_typeof(services) = 'array'
    AND jsonb_array_length(services) > 0;

  RAISE NOTICE '=====================================';
  RAISE NOTICE '📊 ANALYSIS: Orders with $0 Total';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Total orders affected: %', affected_count;
  RAISE NOTICE 'Revenue to recover: $%', ROUND(total_revenue_to_recover, 2);
  RAISE NOTICE '=====================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 BREAKDOWN BY ORDER TYPE:';

  FOR rec IN
    SELECT
      order_type,
      COUNT(*) as count,
      SUM(
        (
          SELECT COALESCE(SUM((service->>'price')::numeric), 0)
          FROM jsonb_array_elements(o.services) AS service
          WHERE (service->>'price') IS NOT NULL
        )
      ) as revenue
    FROM orders o
    WHERE total_amount = 0
      AND services IS NOT NULL
      AND jsonb_array_length(services) > 0
    GROUP BY order_type
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  % → % orders ($%)', rec.order_type, rec.count, ROUND(rec.revenue, 2);
  END LOOP;

  RAISE NOTICE '=====================================';
END $$;

-- ============================================================================
-- STEP 3: RECALCULATE PRICES (WITH VALIDATION)
-- ============================================================================
-- Approach 1: Orders with services as ARRAY OF OBJECTS (most common)
-- Example: [{"id": "xxx", "name": "Service Name", "price": 40}]

DO $$
DECLARE
  updated_count INT := 0;
BEGIN
  WITH orders_to_update AS (
    SELECT
      o.id,
      o.order_number,
      (
        SELECT COALESCE(SUM((service->>'price')::numeric), 0)
        FROM jsonb_array_elements(o.services) AS service
        WHERE (service->>'price') IS NOT NULL
          AND (service->>'price')::text != 'null'
          AND (service->>'price')::numeric > 0  -- Only positive prices
      ) as calculated_total
    FROM orders o
    WHERE o.total_amount = 0
      AND o.services IS NOT NULL
      AND jsonb_typeof(o.services) = 'array'
      AND jsonb_array_length(o.services) > 0
      -- Only process orders with service objects containing price field
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(o.services) AS service
        WHERE jsonb_typeof(service) = 'object'
          AND (service->>'price') IS NOT NULL
      )
  )
  UPDATE orders o
  SET
    total_amount = otu.calculated_total,
    updated_at = NOW()
  FROM orders_to_update otu
  WHERE o.id = otu.id
    AND otu.calculated_total > 0;  -- Safety: Only update if calculated total > 0

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Step 3A: Updated % orders (service objects with prices)', updated_count;
END $$;

-- ============================================================================
-- STEP 4: HANDLE SERVICE IDs (JOIN WITH dealer_services)
-- ============================================================================
-- Approach 2: Orders with services as ARRAY OF STRINGS (service IDs)
-- Example: ["uuid-1", "uuid-2"]

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
          AND ds.price > 0  -- Only positive prices
      ) as calculated_total
    FROM orders o
    WHERE o.total_amount = 0
      AND o.services IS NOT NULL
      AND jsonb_typeof(o.services) = 'array'
      AND jsonb_array_length(o.services) > 0
      -- Only process string IDs (not objects)
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
    AND otu.calculated_total > 0;  -- Safety: Only update if calculated total > 0

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Step 4: Updated % orders (service IDs joined with dealer_services)', updated_count;
END $$;

-- ============================================================================
-- STEP 5: NORMALIZE SERVICES FORMAT (Optional Enhancement)
-- ============================================================================
-- Convert service IDs to full objects for consistency

DO $$
DECLARE
  normalized_count INT := 0;
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
      -- Only normalize string IDs
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
    AND otn.normalized_services IS NOT NULL
    AND jsonb_array_length(otn.normalized_services) > 0;

  GET DIAGNOSTICS normalized_count = ROW_COUNT;
  RAISE NOTICE '✅ Step 5: Normalized % orders to consistent format', normalized_count;
END $$;

-- ============================================================================
-- STEP 6: VERIFICATION & SUMMARY
-- ============================================================================
DO $$
DECLARE
  total_fixed INT;
  total_revenue NUMERIC;
  backup_count INT;
  still_zero INT;
  rec RECORD;
BEGIN
  -- Count fixed orders
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO total_fixed, total_revenue
  FROM orders
  WHERE id IN (SELECT id FROM orders_backup_20251122)
    AND total_amount > 0;

  -- Count backup entries
  SELECT COUNT(*) INTO backup_count
  FROM orders_backup_20251122;

  -- Count orders still at $0 (need manual review)
  SELECT COUNT(*) INTO still_zero
  FROM orders
  WHERE total_amount = 0
    AND services IS NOT NULL
    AND jsonb_array_length(services) > 0;

  RAISE NOTICE '';
  RAISE NOTICE '=====================================';
  RAISE NOTICE '✅ CORRECTION COMPLETE';
  RAISE NOTICE '=====================================';
  RAISE NOTICE 'Orders backed up: %', backup_count;
  RAISE NOTICE 'Orders successfully fixed: %', total_fixed;
  RAISE NOTICE 'Revenue recovered: $%', ROUND(total_revenue, 2);
  RAISE NOTICE 'Orders still at $0: % (may need manual review)', still_zero;
  RAISE NOTICE '=====================================';
  RAISE NOTICE '';

  IF total_fixed > 0 THEN
    RAISE NOTICE '📊 FIXED ORDERS BREAKDOWN:';
    FOR rec IN
      SELECT
        o.order_number,
        o.order_type,
        o.stock_number,
        o.customer_name,
        o.total_amount,
        jsonb_array_length(o.services) as service_count,
        TO_CHAR(o.created_at, 'YYYY-MM-DD HH24:MI') as created
      FROM orders o
      WHERE id IN (SELECT id FROM orders_backup_20251122)
        AND total_amount > 0
      ORDER BY o.created_at DESC
      LIMIT 20
    LOOP
      RAISE NOTICE '  % | % | % | $% | % services | Created: %',
        rec.order_number,
        rec.order_type,
        COALESCE(rec.stock_number, 'N/A'),
        rec.total_amount,
        rec.service_count,
        rec.created;
    END LOOP;

    IF total_fixed > 20 THEN
      RAISE NOTICE '  ... and % more orders', total_fixed - 20;
    END IF;
  END IF;

  RAISE NOTICE '=====================================';
END $$;

-- ============================================================================
-- STEP 7: ROLLBACK SCRIPT (COMMENTED - USE ONLY IF NEEDED)
-- ============================================================================
-- ⚠️ UNCOMMENT ONLY IF YOU NEED TO ROLLBACK THE CHANGES ⚠️

/*
-- ROLLBACK: Restore from backup
UPDATE orders o
SET
  total_amount = b.total_amount,
  services = b.services,
  updated_at = b.updated_at
FROM orders_backup_20251122 b
WHERE o.id = b.id;

-- Verify rollback
SELECT COUNT(*) as rollback_count
FROM orders o
JOIN orders_backup_20251122 b ON o.id = b.id
WHERE o.total_amount = b.total_amount;

-- Drop backup after successful rollback
-- DROP TABLE orders_backup_20251122;
*/

-- ============================================================================
-- STEP 8: VALIDATION QUERIES (FOR MANUAL REVIEW)
-- ============================================================================

-- Query 1: Compare before/after
-- SELECT
--   b.order_number,
--   b.order_type,
--   b.total_amount AS old_total,
--   o.total_amount AS new_total,
--   o.total_amount - b.total_amount AS recovered_amount,
--   o.services
-- FROM orders_backup_20251122 b
-- JOIN orders o ON b.id = o.id
-- WHERE o.total_amount > 0
-- ORDER BY (o.total_amount - b.total_amount) DESC;

-- Query 2: Orders still at $0 (need manual investigation)
-- SELECT
--   order_number,
--   order_type,
--   stock_number,
--   services,
--   created_at
-- FROM orders
-- WHERE total_amount = 0
--   AND services IS NOT NULL
--   AND jsonb_array_length(services) > 0
-- ORDER BY created_at DESC;

-- Query 3: Verify backup table integrity
-- SELECT COUNT(*) as backup_count FROM orders_backup_20251122;

-- ============================================================================
-- CLEANUP (Run this ONLY after verifying everything is correct)
-- ============================================================================
-- ⚠️ UNCOMMENT ONLY AFTER VERIFYING THE MIGRATION WORKED CORRECTLY ⚠️

-- DROP TABLE IF EXISTS orders_backup_20251122;
-- COMMENT: 'Backup table dropped after successful price correction verification'
