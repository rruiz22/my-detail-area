-- Migration: Temporarily Disable Slot Availability Validation
-- Date: 2025-11-10
-- Purpose: Disable slot capacity validation in database trigger temporarily
-- ⚠️ TEMPORARY: Re-enable after fixing underlying capacity issues

-- ============================================================================
-- MODIFIED TRIGGER FUNCTION - WITHOUT CAPACITY VALIDATION
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

    -- Step 2: Reserve new slot WITHOUT validation (⚠️ TEMPORARY)
    IF NEW.due_date IS NOT NULL AND NEW.dealer_id IS NOT NULL THEN
      new_date := get_ny_timezone_date(NEW.due_date);
      new_hour := get_ny_timezone_hour(NEW.due_date);

      -- ⚠️ DISABLED: Slot availability validation
      -- Check slot availability (cast dealer_id to INTEGER)
      -- SELECT
      --   gs.is_available,
      --   gs.available_slots,
      --   gs.max_capacity
      -- INTO
      --   slot_available,
      --   available_count,
      --   max_cap
      -- FROM get_available_slots(NEW.dealer_id::INTEGER, new_date, new_hour) gs
      -- LIMIT 1;

      -- ⚠️ DISABLED: Capacity validation
      -- Validate availability (allow if no record exists - default capacity)
      -- IF COALESCE(slot_available, TRUE) = FALSE THEN
      --   RAISE EXCEPTION 'Appointment slot not available for % at %:00 (% / % slots used)',
      --     new_date, new_hour, COALESCE(max_cap - available_count, 0), COALESCE(max_cap, 3);
      -- END IF;

      -- Reserve the new slot (cast dealer_id to INTEGER)
      -- ⚠️ TEMPORARY: Still track bookings but don't validate capacity
      BEGIN
        PERFORM reserve_appointment_slot(NEW.dealer_id::INTEGER, new_date, new_hour);

        RAISE NOTICE 'Reserved new slot for order % WITHOUT validation: date=%, hour=%',
          NEW.id, new_date, new_hour;

      EXCEPTION WHEN OTHERS THEN
        -- ⚠️ TEMPORARY: Log warning but DON'T block the update
        RAISE WARNING 'Failed to reserve appointment slot (continuing anyway): %', SQLERRM;
        -- Original code would RAISE EXCEPTION here - now we just continue
      END;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_slot_on_order_update IS
'⚠️ TEMPORARY: Trigger function with capacity validation DISABLED. Manages appointment slots when order due_date is updated. Releases old slot and reserves new one WITHOUT checking availability.';


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '⚠️ TEMPORARY MIGRATION APPLIED: Slot capacity validation DISABLED';
  RAISE NOTICE '   - Orders can now be created/updated regardless of slot availability';
  RAISE NOTICE '   - Slot tracking still active (for future re-enablement)';
  RAISE NOTICE '   - TODO: Re-enable validation after fixing capacity issues';
END $$;
