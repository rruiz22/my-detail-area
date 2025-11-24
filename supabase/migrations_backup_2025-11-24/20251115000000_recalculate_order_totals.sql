-- =====================================================
-- RECALCULATE ORDER TOTALS - Fix for orders with $0.00
-- Created: 2025-11-15
-- Description: Recalculate total_amount for orders that have services but show $0.00
--              This fixes orders created by users without pricing permissions
-- =====================================================

-- Step 1: Create backup table for safety
CREATE TABLE IF NOT EXISTS orders_backup_20251115 AS
SELECT * FROM orders
WHERE total_amount = 0
  AND services IS NOT NULL
  AND jsonb_array_length(services) > 0;

-- Step 2: Show affected orders before update (for verification)
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_count
  FROM orders
  WHERE total_amount = 0
    AND services IS NOT NULL
    AND jsonb_array_length(services) > 0;

  RAISE NOTICE '📊 Found % orders with $0.00 total but have services', affected_count;
END $$;

-- Step 3: Recalculate total_amount based on services JSON
UPDATE orders
SET
  total_amount = (
    SELECT COALESCE(SUM((service->>'price')::numeric), 0)
    FROM jsonb_array_elements(services) AS service
    WHERE (service->>'price') IS NOT NULL
      AND (service->>'price')::text != 'null'
  ),
  updated_at = NOW()
WHERE total_amount = 0
  AND services IS NOT NULL
  AND jsonb_array_length(services) > 0;

-- Step 4: Verification query - Show updated orders
DO $$
DECLARE
  rec RECORD;
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '✅ UPDATED ORDERS:';
  RAISE NOTICE '=====================================';

  FOR rec IN
    SELECT
      order_number,
      stock_number,
      order_type,
      total_amount,
      jsonb_array_length(services) as service_count,
      created_at
    FROM orders
    WHERE id IN (SELECT id FROM orders_backup_20251115)
    ORDER BY created_at DESC
  LOOP
    updated_count := updated_count + 1;
    RAISE NOTICE 'Order: % | Stock: % | Type: % | New Total: $% | Services: %',
      rec.order_number,
      rec.stock_number,
      rec.order_type,
      rec.total_amount,
      rec.service_count;
  END LOOP;

  RAISE NOTICE '=====================================';
  RAISE NOTICE '✅ Total orders updated: %', updated_count;
END $$;

-- Step 5: Cleanup - Drop backup table (comment this out if you want to keep the backup)
-- DROP TABLE IF EXISTS orders_backup_20251115;

-- =====================================================
-- VERIFICATION QUERIES (for manual checking)
-- =====================================================

-- Query 1: Show all orders that were updated
-- SELECT
--   order_number,
--   stock_number,
--   order_type,
--   total_amount AS new_total,
--   services,
--   created_at
-- FROM orders
-- WHERE id IN (SELECT id FROM orders_backup_20251115)
-- ORDER BY created_at DESC;

-- Query 2: Compare before/after
-- SELECT
--   b.order_number,
--   b.total_amount AS old_total,
--   o.total_amount AS new_total,
--   o.total_amount - b.total_amount AS difference
-- FROM orders_backup_20251115 b
-- JOIN orders o ON b.id = o.id
-- WHERE b.total_amount != o.total_amount;
