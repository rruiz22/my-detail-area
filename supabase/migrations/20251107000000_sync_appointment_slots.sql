-- ============================================================================
-- SYNC APPOINTMENT SLOTS WITH ACTUAL ORDERS
-- ============================================================================
-- This migration recalculates booked_count based on ACTUAL orders in the database
-- to fix ghost slots (slots blocked without orders) and under-booking issues.
--
-- Problem: appointment_slots.booked_count doesn't match actual order count
-- Cause: Triggers may have failed or orders were deleted before triggers existed
-- Solution: Recalculate booked_count from orders table directly
-- ============================================================================

DO $$
DECLARE
  sync_count INTEGER := 0;
  ghost_slots_fixed INTEGER := 0;
  under_booked_fixed INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting appointment slots synchronization...';

  -- ============================================================================
  -- STEP 1: Recalculate booked_count from actual orders
  -- ============================================================================

  WITH actual_counts AS (
    SELECT
      dealer_id,
      DATE(due_date AT TIME ZONE 'America/New_York') as date_slot,
      EXTRACT(HOUR FROM due_date AT TIME ZONE 'America/New_York')::INTEGER as hour_slot,
      COUNT(*) as real_count
    FROM orders
    WHERE due_date IS NOT NULL
      AND dealer_id IS NOT NULL
    GROUP BY 1, 2, 3
  ),
  updated_slots AS (
    UPDATE appointment_slots a
    SET
      booked_count = COALESCE(ac.real_count, 0),
      updated_at = NOW()
    FROM actual_counts ac
    WHERE a.dealer_id = ac.dealer_id
      AND a.date_slot = ac.date_slot
      AND a.hour_slot = ac.hour_slot
      AND a.booked_count != ac.real_count  -- Only update if different
    RETURNING a.dealer_id, a.date_slot, a.hour_slot, a.booked_count
  )
  SELECT COUNT(*) INTO sync_count FROM updated_slots;

  RAISE NOTICE 'Updated % appointment slots with correct booked_count', sync_count;

  -- ============================================================================
  -- STEP 2: Delete slots with 0 bookings (cleanup ghost slots)
  -- ============================================================================

  DELETE FROM appointment_slots
  WHERE booked_count = 0
  RETURNING dealer_id, date_slot, hour_slot
  INTO STRICT ghost_slots_fixed;

  RAISE NOTICE 'Deleted % empty slots (ghost slots cleanup)', ghost_slots_fixed;

EXCEPTION
  WHEN NO_DATA_FOUND THEN
    -- No ghost slots to delete, that's fine
    RAISE NOTICE 'No empty slots found to delete';
  WHEN OTHERS THEN
    RAISE WARNING 'Error during sync: %', SQLERRM;
    -- Don't rollback, partial fixes are better than nothing
END $$;

-- ============================================================================
-- STEP 3: Verify synchronization results
-- ============================================================================

DO $$
DECLARE
  verification_results TEXT;
BEGIN
  RAISE NOTICE 'Verifying synchronization results...';

  WITH actual_orders AS (
    SELECT
      dealer_id,
      DATE(due_date AT TIME ZONE 'America/New_York') as date_slot,
      EXTRACT(HOUR FROM due_date AT TIME ZONE 'America/New_York')::INTEGER as hour_slot,
      COUNT(*) as actual_count
    FROM orders
    WHERE due_date IS NOT NULL
      AND dealer_id IS NOT NULL
      AND DATE(due_date AT TIME ZONE 'America/New_York') >= CURRENT_DATE
    GROUP BY 1, 2, 3
  ),
  comparison AS (
    SELECT
      a.dealer_id,
      a.date_slot,
      a.hour_slot,
      COALESCE(ao.actual_count, 0) as actual_orders,
      a.booked_count,
      (a.booked_count - COALESCE(ao.actual_count, 0)) as diff,
      CASE
        WHEN a.booked_count = COALESCE(ao.actual_count, 0) THEN '✅ OK'
        WHEN a.booked_count > COALESCE(ao.actual_count, 0) THEN '❌ OVER'
        ELSE '⚠️ UNDER'
      END as status
    FROM appointment_slots a
    LEFT JOIN actual_orders ao ON (
      a.dealer_id = ao.dealer_id
      AND a.date_slot = ao.date_slot
      AND a.hour_slot = ao.hour_slot
    )
    WHERE a.date_slot >= CURRENT_DATE
  )
  SELECT
    format(
      'OK: %s | OVER: %s | UNDER: %s | Total: %s',
      COUNT(*) FILTER (WHERE status = '✅ OK'),
      COUNT(*) FILTER (WHERE status = '❌ OVER'),
      COUNT(*) FILTER (WHERE status = '⚠️ UNDER'),
      COUNT(*)
    )
  INTO verification_results
  FROM comparison;

  RAISE NOTICE 'Sync verification: %', verification_results;
END $$;

-- ============================================================================
-- COMMENT
-- ============================================================================

COMMENT ON TABLE appointment_slots IS
'Appointment slot capacity tracking. booked_count is automatically managed by triggers.
If inconsistencies occur, run this migration again to resync with actual orders.';
