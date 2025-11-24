-- Migration: Improve Appointment Slots System
-- Date: 2025-01-06
-- Purpose: Add automatic slot cleanup on order delete/update and timezone-aware functions

-- ============================================================================
-- TIMEZONE HELPER FUNCTIONS
-- ============================================================================

-- Function to get date in New York timezone from TIMESTAMPTZ
CREATE OR REPLACE FUNCTION get_ny_timezone_date(timestamp_val TIMESTAMPTZ)
RETURNS DATE AS $$
BEGIN
  -- Convert timestamp to America/New_York timezone and extract date
  RETURN (timestamp_val AT TIME ZONE 'America/New_York')::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_ny_timezone_date IS
'Extracts DATE from TIMESTAMPTZ in America/New_York timezone. Essential for appointment slot operations.';


-- Function to get hour in New York timezone from TIMESTAMPTZ
CREATE OR REPLACE FUNCTION get_ny_timezone_hour(timestamp_val TIMESTAMPTZ)
RETURNS INTEGER AS $$
BEGIN
  -- Convert timestamp to America/New_York timezone and extract hour (0-23)
  RETURN EXTRACT(HOUR FROM (timestamp_val AT TIME ZONE 'America/New_York'))::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_ny_timezone_hour IS
'Extracts hour (0-23) from TIMESTAMPTZ in America/New_York timezone. Used for slot hour_slot field.';


-- ============================================================================
-- AUTOMATIC SLOT RELEASE ON ORDER DELETE
-- ============================================================================

CREATE OR REPLACE FUNCTION release_slot_on_order_delete()
RETURNS TRIGGER AS $$
DECLARE
  order_date DATE;
  order_hour INTEGER;
  release_success BOOLEAN;
BEGIN
  -- Only process if the deleted order has a due_date
  IF OLD.due_date IS NOT NULL AND OLD.dealer_id IS NOT NULL THEN

    -- Extract date and hour in NY timezone
    order_date := get_ny_timezone_date(OLD.due_date);
    order_hour := get_ny_timezone_hour(OLD.due_date);

    -- Release the appointment slot (cast dealer_id to INTEGER)
    BEGIN
      SELECT release_appointment_slot(
        OLD.dealer_id::INTEGER,
        order_date,
        order_hour
      ) INTO release_success;

      -- Log the release for debugging
      RAISE NOTICE 'Released appointment slot for deleted order %: dealer_id=%, date=%, hour=%',
        OLD.id, OLD.dealer_id, order_date, order_hour;

    EXCEPTION WHEN OTHERS THEN
      -- Don't fail the DELETE if slot release fails
      RAISE WARNING 'Failed to release slot for order %: %', OLD.id, SQLERRM;
    END;

  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION release_slot_on_order_delete IS
'Trigger function: Automatically releases appointment slot when order is deleted. Uses NY timezone for consistency.';


-- Create trigger for DELETE operations
DROP TRIGGER IF EXISTS trigger_release_slot_on_delete ON orders;
CREATE TRIGGER trigger_release_slot_on_delete
  AFTER DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION release_slot_on_order_delete();

COMMENT ON TRIGGER trigger_release_slot_on_delete ON orders IS
'Releases appointment slot when order is deleted, preventing phantom reservations.';


-- ============================================================================
-- AUTOMATIC SLOT UPDATE ON ORDER DUE_DATE CHANGE
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_slot_on_order_update()
RETURNS TRIGGER AS $$
DECLARE
  old_date DATE;
  old_hour INTEGER;
  new_date DATE;
  new_hour INTEGER;
  slot_available BOOLEAN;
  available_count INTEGER;
  max_cap INTEGER;
BEGIN
  -- Only process if due_date actually changed
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN

    -- Step 1: Release old slot if it existed
    IF OLD.due_date IS NOT NULL AND OLD.dealer_id IS NOT NULL THEN
      old_date := get_ny_timezone_date(OLD.due_date);
      old_hour := get_ny_timezone_hour(OLD.due_date);

      BEGIN
        PERFORM release_appointment_slot(OLD.dealer_id::INTEGER, old_date, old_hour);

        RAISE NOTICE 'Released old slot for order %: date=%, hour=%',
          OLD.id, old_date, old_hour;

      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to release old slot for order %: %', OLD.id, SQLERRM;
      END;
    END IF;

    -- Step 2: Validate and reserve new slot if new due_date exists
    IF NEW.due_date IS NOT NULL AND NEW.dealer_id IS NOT NULL THEN
      new_date := get_ny_timezone_date(NEW.due_date);
      new_hour := get_ny_timezone_hour(NEW.due_date);

      -- Check slot availability (cast dealer_id to INTEGER)
      SELECT
        gs.is_available,
        gs.available_slots,
        gs.max_capacity
      INTO
        slot_available,
        available_count,
        max_cap
      FROM get_available_slots(NEW.dealer_id::INTEGER, new_date, new_hour) gs
      LIMIT 1;

      -- Validate availability (allow if no record exists - default capacity)
      IF COALESCE(slot_available, TRUE) = FALSE THEN
        RAISE EXCEPTION 'Appointment slot not available for % at %:00 (% / % slots used)',
          new_date, new_hour, COALESCE(max_cap - available_count, 0), COALESCE(max_cap, 3);
      END IF;

      -- Reserve the new slot (cast dealer_id to INTEGER)
      BEGIN
        PERFORM reserve_appointment_slot(NEW.dealer_id::INTEGER, new_date, new_hour);

        RAISE NOTICE 'Reserved new slot for order %: date=%, hour=%',
          NEW.id, new_date, new_hour;

      EXCEPTION WHEN OTHERS THEN
        -- This is critical - rollback the entire update if we can't reserve
        RAISE EXCEPTION 'Failed to reserve new appointment slot: %', SQLERRM;
      END;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_slot_on_order_update IS
'Trigger function: Manages appointment slots when order due_date is updated. Releases old slot and reserves new one atomically.';


-- Create trigger for UPDATE operations
DROP TRIGGER IF EXISTS trigger_handle_slot_on_update ON orders;
CREATE TRIGGER trigger_handle_slot_on_update
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_slot_on_order_update();

COMMENT ON TRIGGER trigger_handle_slot_on_update ON orders IS
'Handles slot management when order due_date changes. Validates new slot availability before allowing update.';


-- ============================================================================
-- CLEANUP EXPIRED SLOTS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_slots()
RETURNS TABLE(
  deleted_count INTEGER,
  oldest_date_removed DATE,
  execution_time_ms INTEGER
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  rows_deleted INTEGER;
  oldest_date DATE;
BEGIN
  start_time := clock_timestamp();

  -- Find oldest date before deletion (for reporting)
  SELECT MIN(date_slot) INTO oldest_date
  FROM appointment_slots
  WHERE date_slot < CURRENT_DATE - INTERVAL '1 day';

  -- Delete slots older than 1 day (keep today's slots)
  DELETE FROM appointment_slots
  WHERE date_slot < CURRENT_DATE - INTERVAL '1 day';

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  end_time := clock_timestamp();

  -- Return statistics
  RETURN QUERY SELECT
    rows_deleted,
    oldest_date,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_slots IS
'Deletes appointment slots older than 1 day. Returns statistics about deleted records. Should be run daily via scheduled job.';


-- ============================================================================
-- ENHANCED DIAGNOSTICS VIEW
-- ============================================================================

-- Create view for monitoring slot health
CREATE OR REPLACE VIEW appointment_slots_health AS
SELECT
  d.id AS dealer_id,
  d.name AS dealer_name,
  COUNT(DISTINCT aps.date_slot) AS dates_with_slots,
  COUNT(*) AS total_slot_records,
  SUM(aps.booked_count) AS total_booked,
  SUM(aps.max_capacity) AS total_capacity,
  SUM(aps.max_capacity - aps.booked_count) AS total_available,
  MIN(aps.date_slot) AS earliest_slot_date,
  MAX(aps.date_slot) AS latest_slot_date,
  ROUND(
    AVG(CAST(aps.booked_count AS DECIMAL) / NULLIF(aps.max_capacity, 0) * 100),
    2
  ) AS avg_utilization_pct
FROM dealerships d
LEFT JOIN appointment_slots aps ON aps.dealer_id = d.id
GROUP BY d.id, d.name
ORDER BY dealer_name;

COMMENT ON VIEW appointment_slots_health IS
'Health monitoring view for appointment slots system. Shows utilization and capacity per dealership.';


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execute permissions on new functions to authenticated users
GRANT EXECUTE ON FUNCTION get_ny_timezone_date TO authenticated;
GRANT EXECUTE ON FUNCTION get_ny_timezone_hour TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_slots TO service_role;

-- Grant view access
GRANT SELECT ON appointment_slots_health TO authenticated;


-- ============================================================================
-- MIGRATION VALIDATION
-- ============================================================================

-- Verify triggers were created
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('trigger_release_slot_on_delete', 'trigger_handle_slot_on_update')
    AND tgrelid = 'orders'::regclass;

  IF trigger_count != 2 THEN
    RAISE EXCEPTION 'Trigger creation validation failed. Expected 2 triggers, found %', trigger_count;
  END IF;

  RAISE NOTICE '✅ Migration successful: 2 triggers created, 5 functions deployed, 1 view created';
END $$;
