-- =====================================================
-- FIX ZERO-AMOUNT ORDERS AND PREVENT FUTURE OCCURRENCE
-- =====================================================
-- Purpose: Correct 3 orders with $0 total and add database constraint
-- Issue: Orders SA-273, SA-296, SA-323 have total_amount = 0 despite valid services
-- Date: 2025-11-30
-- =====================================================

-- ========================================
-- STEP 1: BACKUP AFFECTED ORDERS
-- ========================================

-- Create backup table with all zero-amount orders (for audit trail)
CREATE TABLE IF NOT EXISTS orders_zero_amount_backup_20251130 (
  id UUID,
  order_number TEXT,
  customer_name TEXT,
  services JSONB,
  total_amount NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  created_by UUID,
  backup_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Backup the 3 affected orders
INSERT INTO orders_zero_amount_backup_20251130 (
  id, order_number, customer_name, services, total_amount, status, created_at, created_by
)
SELECT
  id,
  order_number,
  customer_name,
  services,
  total_amount,
  status,
  created_at,
  created_by
FROM orders
WHERE total_amount = 0
  AND services IS NOT NULL
  AND jsonb_array_length(services::jsonb) > 0;

-- ========================================
-- STEP 2: RECALCULATE TOTAL AMOUNTS
-- ========================================

-- Update orders by recalculating total_amount from services array
UPDATE orders
SET
  total_amount = (
    SELECT COALESCE(SUM((s->>'price')::numeric), 0)
    FROM jsonb_array_elements(services::jsonb) s
  ),
  updated_at = NOW()
WHERE total_amount = 0
  AND services IS NOT NULL
  AND jsonb_array_length(services::jsonb) > 0;

-- ========================================
-- STEP 3: ADD DATABASE CONSTRAINT
-- ========================================

-- Prevent future orders with $0 total when services are present
-- Note: Using DO block because ALTER TABLE doesn't support IF NOT EXISTS for constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_total_amount_positive_with_services'
      AND conrelid = 'orders'::regclass
  ) THEN
    ALTER TABLE orders
    ADD CONSTRAINT orders_total_amount_positive_with_services
    CHECK (
      (services IS NULL OR jsonb_array_length(services::jsonb) = 0)
      OR (total_amount > 0)
    );
    RAISE NOTICE '✅ Constraint added successfully';
  ELSE
    RAISE NOTICE 'ℹ️  Constraint already exists';
  END IF;
END $$;

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT orders_total_amount_positive_with_services ON orders
IS 'Prevents orders with services from having $0 total amount. Added 2025-11-30 to fix data quality issue where 3 orders were created with valid services but $0 total.';

-- ========================================
-- STEP 4: VERIFICATION QUERIES
-- ========================================

-- Verify backup was created
DO $$
DECLARE
  v_backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_backup_count
  FROM orders_zero_amount_backup_20251130;

  IF v_backup_count != 3 THEN
    RAISE WARNING 'Expected 3 orders in backup, found %', v_backup_count;
  ELSE
    RAISE NOTICE '✅ Backup created successfully (3 orders)';
  END IF;
END $$;

-- Verify zero-amount orders were fixed
DO $$
DECLARE
  v_remaining_zero INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_zero
  FROM orders
  WHERE total_amount = 0
    AND services IS NOT NULL
    AND jsonb_array_length(services::jsonb) > 0;

  IF v_remaining_zero > 0 THEN
    RAISE EXCEPTION 'Still have % orders with $0 total and services!', v_remaining_zero;
  ELSE
    RAISE NOTICE '✅ All zero-amount orders corrected (0 remaining)';
  END IF;
END $$;

-- Verify constraint was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_total_amount_positive_with_services'
  ) THEN
    RAISE EXCEPTION 'Constraint orders_total_amount_positive_with_services not found!';
  END IF;

  RAISE NOTICE '✅ Database constraint added successfully';
END $$;

-- Show corrected orders with before/after amounts
SELECT
  'CORRECTED ORDERS' as report_type,
  b.order_number,
  b.customer_name,
  b.total_amount as old_total,
  o.total_amount as new_total,
  (o.total_amount - b.total_amount) as amount_corrected,
  b.created_at
FROM orders_zero_amount_backup_20251130 b
INNER JOIN orders o ON b.id = o.id
ORDER BY b.created_at;

-- Summary statistics
SELECT
  'SUMMARY' as report_type,
  COUNT(*) as orders_corrected,
  SUM(o.total_amount - b.total_amount) as total_revenue_recovered
FROM orders_zero_amount_backup_20251130 b
INNER JOIN orders o ON b.id = o.id;
