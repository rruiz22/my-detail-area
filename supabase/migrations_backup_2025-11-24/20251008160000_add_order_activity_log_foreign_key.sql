-- Migration: Add foreign key constraint to order_activity_log
-- Date: 2025-10-08
-- Purpose: Fix Supabase relationship error between order_activity_log and orders
-- This enables proper joins in PostgREST queries using orders!inner syntax

-- Step 1: Check for orphaned records (records with invalid order_id)
-- This query will help identify any data integrity issues before adding the constraint
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM order_activity_log oal
  WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.id = oal.order_id
  );

  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % orphaned records in order_activity_log', orphaned_count;
    RAISE NOTICE 'These records will be deleted to maintain referential integrity';
  ELSE
    RAISE NOTICE 'No orphaned records found - proceeding with FK creation';
  END IF;
END $$;

-- Step 2: Delete orphaned records (if any)
-- This ensures the foreign key constraint can be added successfully
DELETE FROM order_activity_log
WHERE order_id NOT IN (SELECT id FROM orders);

-- Step 3: Add the foreign key constraint
-- ON DELETE CASCADE ensures that when an order is deleted, its activity logs are also deleted
ALTER TABLE public.order_activity_log
ADD CONSTRAINT order_activity_log_order_id_fkey
FOREIGN KEY (order_id)
REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Step 4: Create index for better query performance
-- This index will speed up joins and lookups by order_id
CREATE INDEX IF NOT EXISTS idx_order_activity_log_order_id
ON public.order_activity_log(order_id);

-- Step 5: Verify the constraint was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'order_activity_log_order_id_fkey'
    AND table_name = 'order_activity_log'
  ) THEN
    RAISE NOTICE 'Foreign key constraint successfully created!';
  ELSE
    RAISE EXCEPTION 'Failed to create foreign key constraint';
  END IF;
END $$;

-- Migration complete
-- After running this migration, Supabase will be able to use the orders!inner syntax
-- in queries from the order_activity_log table.
