-- =====================================================
-- Migration: Fix Kiosk ID Inconsistency
-- Date: 2025-12-11
-- Description: Fix critical bug where kiosk_id in time_entries
--              contains mixed data (UUID vs kiosk_code string)
-- =====================================================

-- PART 1: Clean corrupted time_entries data
-- Replace kiosk_code strings with proper UUID references
-- =====================================================

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update time_entries where kiosk_id is a kiosk_code (string) instead of UUID
  -- This happens because PunchClockKioskModal was using kioskConfig.kiosk_code as fallback
  UPDATE detail_hub_time_entries te
  SET kiosk_id = k.id
  FROM detail_hub_kiosks k
  WHERE
    -- Match by kiosk_code
    te.kiosk_id = k.kiosk_code
    -- Only update non-UUID values (UUID has format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    AND te.kiosk_id NOT LIKE '%-%-%-%-%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % time_entries with corrupted kiosk_id', updated_count;
END $$;


-- PART 2: Recalculate punches_today counter
-- Reset and recalculate today's punch count for ALL kiosks
-- =====================================================

DO $$
DECLARE
  kiosk_record RECORD;
  today_count INTEGER;
  dealer_timezone TEXT;
BEGIN
  -- Loop through all kiosks
  FOR kiosk_record IN
    SELECT k.id, k.kiosk_code, k.dealership_id, d.timezone
    FROM detail_hub_kiosks k
    LEFT JOIN dealerships d ON k.dealership_id = d.id
    WHERE k.archived = false
  LOOP
    -- Use dealership timezone, fallback to America/New_York
    dealer_timezone := COALESCE(kiosk_record.timezone, 'America/New_York');

    -- Count punches for today in the dealership's timezone
    SELECT COUNT(*) INTO today_count
    FROM detail_hub_time_entries
    WHERE
      kiosk_id = kiosk_record.id
      AND DATE(clock_in AT TIME ZONE dealer_timezone) = CURRENT_DATE;

    -- Update kiosk counter
    UPDATE detail_hub_kiosks
    SET punches_today = today_count
    WHERE id = kiosk_record.id;

    RAISE NOTICE 'Kiosk %: % punches today', kiosk_record.kiosk_code, today_count;
  END LOOP;
END $$;


-- PART 3: Recalculate total_punches counter
-- Recalculate lifetime punch count for ALL kiosks
-- =====================================================

DO $$
DECLARE
  kiosk_record RECORD;
  total_count INTEGER;
BEGIN
  -- Loop through all kiosks
  FOR kiosk_record IN
    SELECT id, kiosk_code
    FROM detail_hub_kiosks
    WHERE archived = false
  LOOP
    -- Count all punches for this kiosk
    SELECT COUNT(*) INTO total_count
    FROM detail_hub_time_entries
    WHERE kiosk_id = kiosk_record.id;

    -- Update kiosk counter
    UPDATE detail_hub_kiosks
    SET total_punches = total_count
    WHERE id = kiosk_record.id;

    RAISE NOTICE 'Kiosk %: % total punches', kiosk_record.kiosk_code, total_count;
  END LOOP;
END $$;


-- PART 4: Validation check
-- Verify no more kiosk_code strings remain in kiosk_id column
-- =====================================================

DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Count entries with non-UUID kiosk_id values
  SELECT COUNT(*) INTO invalid_count
  FROM detail_hub_time_entries
  WHERE
    kiosk_id IS NOT NULL
    AND kiosk_id NOT LIKE '%-%-%-%-%';

  IF invalid_count > 0 THEN
    RAISE WARNING 'Still have % time_entries with invalid kiosk_id format!', invalid_count;
  ELSE
    RAISE NOTICE '✅ All kiosk_id values are valid UUIDs';
  END IF;
END $$;


-- PART 5: Set last_punch_at to most recent punch
-- Update last_punch_at for all kiosks based on actual data
-- =====================================================

DO $$
DECLARE
  kiosk_record RECORD;
  latest_punch TIMESTAMPTZ;
BEGIN
  FOR kiosk_record IN
    SELECT id, kiosk_code
    FROM detail_hub_kiosks
    WHERE archived = false
  LOOP
    -- Find most recent punch for this kiosk
    SELECT MAX(clock_in) INTO latest_punch
    FROM detail_hub_time_entries
    WHERE kiosk_id = kiosk_record.id;

    -- Update last_punch_at
    IF latest_punch IS NOT NULL THEN
      UPDATE detail_hub_kiosks
      SET last_punch_at = latest_punch
      WHERE id = kiosk_record.id;

      RAISE NOTICE 'Kiosk %: last punch at %', kiosk_record.kiosk_code, latest_punch;
    END IF;
  END LOOP;
END $$;


-- PART 6: Add comment to kiosk_id column for future reference
-- =====================================================

COMMENT ON COLUMN detail_hub_time_entries.kiosk_id IS
'UUID reference to detail_hub_kiosks.id. Must ALWAYS be UUID, never kiosk_code string. Fixed in migration 20251211000000.';
