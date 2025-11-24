-- ============================================================================
-- FIX APPOINTMENT SLOT CALCULATION BUG
-- ============================================================================
-- Bug: get_available_slots() uses hardcoded "4 - booked_count" instead of
--      "max_capacity - booked_count" when fetching all slots for a date.
--
-- Impact: If max_capacity is changed from default 4, available_slots
--         calculation becomes incorrect.
--
-- Location: Original migration create_appointment_slots.sql line 100
-- Fix: Use max_capacity instead of hardcoded 4
-- ============================================================================

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
            COALESCE(a.max_capacity - a.booked_count, 4) as available_slots,
            COALESCE(a.max_capacity, 4) as max_capacity,
            COALESCE(a.booked_count, 0) < COALESCE(a.max_capacity, 4) as is_available
        FROM appointment_slots a
        WHERE a.dealer_id = p_dealer_id
        AND a.date_slot = p_date_slot
        AND a.hour_slot = p_hour_slot

        UNION ALL

        -- If no record exists, return default availability
        SELECT
            p_date_slot as date_slot,
            p_hour_slot as hour_slot,
            4 as available_slots,
            4 as max_capacity,
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
            -- ✅ FIX: Use max_capacity instead of hardcoded 4
            COALESCE(a.max_capacity - a.booked_count, 4) as available_slots,
            COALESCE(a.max_capacity, 4) as max_capacity,
            COALESCE(a.booked_count, 0) < COALESCE(a.max_capacity, 4) as is_available
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
FIXED: Now correctly uses max_capacity instead of hardcoded 4 for calculation.
Business hours: Mon-Fri 8AM-6PM, Sat 8AM-5PM';
