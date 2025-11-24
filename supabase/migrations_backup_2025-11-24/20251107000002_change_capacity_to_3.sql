-- ============================================================================
-- CHANGE APPOINTMENT SLOT CAPACITY FROM 4 TO 3
-- ============================================================================
-- Changes the default max_capacity from 4 slots/hour to 3 slots/hour
-- Updates all existing records and the get_available_slots function
-- ============================================================================

-- Step 1: Update existing slots with max_capacity = 4 to 3
UPDATE appointment_slots
SET max_capacity = 3, updated_at = NOW()
WHERE max_capacity = 4;

-- Step 2: Alter table default for new records
ALTER TABLE appointment_slots
  ALTER COLUMN max_capacity SET DEFAULT 3;

-- Step 3: Update get_available_slots function to use 3 as default
CREATE OR REPLACE FUNCTION get_available_slots(
    p_dealer_id INTEGER,
    p_date_slot DATE,
    p_hour_slot INTEGER DEFAULT NULL
)
RETURNS TABLE (
    date_slot DATE,
    hour_slot INTEGER,
    available_slots INTEGER,
    max_capacity INTEGER,
    is_available BOOLEAN
) AS $$
BEGIN
    IF p_hour_slot IS NOT NULL THEN
        -- Get specific hour slot
        RETURN QUERY
        SELECT
            COALESCE(a.date_slot, p_date_slot) as date_slot,
            COALESCE(a.hour_slot, p_hour_slot) as hour_slot,
            COALESCE(a.max_capacity - a.booked_count, 3) as available_slots,
            COALESCE(a.max_capacity, 3) as max_capacity,
            COALESCE(a.booked_count, 0) < COALESCE(a.max_capacity, 3) as is_available
        FROM appointment_slots a
        WHERE a.dealer_id = p_dealer_id
        AND a.date_slot = p_date_slot
        AND a.hour_slot = p_hour_slot

        UNION ALL

        -- If no record exists, return default availability (3 slots)
        SELECT
            p_date_slot as date_slot,
            p_hour_slot as hour_slot,
            3 as available_slots,
            3 as max_capacity,
            true as is_available
        WHERE NOT EXISTS (
            SELECT 1 FROM appointment_slots a
            WHERE a.dealer_id = p_dealer_id
            AND a.date_slot = p_date_slot
            AND a.hour_slot = p_hour_slot
        )
        LIMIT 1;
    ELSE
        -- Get all hour slots for the date
        RETURN QUERY
        WITH business_hours AS (
            SELECT generate_series(8,
                CASE
                    WHEN EXTRACT(DOW FROM p_date_slot) = 6 THEN 17  -- Saturday until 5 PM
                    ELSE 18  -- Monday-Friday until 6 PM
                END
            ) as hour
        )
        SELECT
            p_date_slot as date_slot,
            bh.hour as hour_slot,
            COALESCE(a.max_capacity - a.booked_count, 3) as available_slots,
            COALESCE(a.max_capacity, 3) as max_capacity,
            COALESCE(a.booked_count, 0) < COALESCE(a.max_capacity, 3) as is_available
        FROM business_hours bh
        LEFT JOIN appointment_slots a ON (
            a.dealer_id = p_dealer_id
            AND a.date_slot = p_date_slot
            AND a.hour_slot = bh.hour
        )
        ORDER BY bh.hour;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_available_slots IS
'Returns available appointment slots for a dealer and date.
Updated: Default capacity changed to 3 slots per hour.
Business hours: Mon-Fri 8AM-6PM, Sat 8AM-5PM';

-- Step 4: Verify changes
DO $$
DECLARE
  updated_count INTEGER;
  default_capacity TEXT;
BEGIN
  -- Count updated records
  SELECT COUNT(*) INTO updated_count
  FROM appointment_slots
  WHERE max_capacity = 3;

  -- Get new default
  SELECT column_default INTO default_capacity
  FROM information_schema.columns
  WHERE table_name = 'appointment_slots'
    AND column_name = 'max_capacity';

  RAISE NOTICE 'Capacity change completed:';
  RAISE NOTICE '- Slots with capacity 3: %', updated_count;
  RAISE NOTICE '- New default capacity: %', default_capacity;
END $$;
