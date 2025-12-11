-- Migration: Fix Dealership Timezone Configuration
-- Date: 2024-12-11
-- Purpose: Fix UTC timezone for dealerships created in December + set correct default
--
-- BUG IDENTIFIED:
-- - Dealerships created since Dec 5, 2025 have timezone='UTC' (incorrect)
-- - Default column value is 'UTC' instead of 'America/New_York'
-- - No UI field to configure timezone (field missing in DealershipModal)
--
-- AFFECTED DEALERSHIPS:
-- - MyDetail (ID: 13) - Created: 2025-12-05
-- - adadds (ID: 14) - Created: 2025-12-05
-- - Mercedes Benz of Hanover (ID: 15) - Created: 2025-12-05
-- - Exotics (ID: 16) - Created: 2025-12-09
-- - Bernardi Volvo (ID: 17) - Created: 2025-12-09
--
-- IMPACT:
-- Kiosk showing incorrect countdown (5h instead of 11h at 9PM Eastern)
-- Employees unable to punch in during correct time windows
--
-- ============================================================================
-- STEP 1: Fix Existing Dealerships with Incorrect Timezone
-- ============================================================================

UPDATE dealerships
SET timezone = 'America/New_York'
WHERE id IN (13, 14, 15, 16, 17)  -- MyDetail, adadds, Mercedes Benz, Exotics, Bernardi Volvo
  AND timezone = 'UTC';

-- ============================================================================
-- STEP 2: Change Column Default for Future Dealerships
-- ============================================================================

ALTER TABLE dealerships
ALTER COLUMN timezone SET DEFAULT 'America/New_York';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
  utc_count INTEGER;
  affected_count INTEGER;
BEGIN
  -- Count remaining UTC dealerships
  SELECT COUNT(*) INTO utc_count
  FROM dealerships
  WHERE timezone = 'UTC'
    AND deleted_at IS NULL;

  -- Count fixed dealerships
  SELECT COUNT(*) INTO affected_count
  FROM dealerships
  WHERE id IN (13, 14, 15, 16, 17)
    AND timezone = 'America/New_York';

  RAISE NOTICE '======================================================';
  RAISE NOTICE 'Dealership Timezone Fix Complete';
  RAISE NOTICE '======================================================';
  RAISE NOTICE 'Fixed dealerships: % / 5', affected_count;
  RAISE NOTICE 'Remaining UTC dealerships: %', utc_count;
  RAISE NOTICE 'New default timezone: America/New_York';
  RAISE NOTICE '';

  IF affected_count = 5 THEN
    RAISE NOTICE '✓ All 5 affected dealerships updated successfully';
  ELSE
    RAISE WARNING '⚠ Only % dealerships were updated (expected 5)', affected_count;
  END IF;

  IF utc_count = 0 THEN
    RAISE NOTICE '✓ No dealerships remain with UTC timezone';
  ELSE
    RAISE NOTICE '⚠ % dealerships still have UTC timezone', utc_count;
  END IF;

  RAISE NOTICE '======================================================';
END $$;

-- ============================================================================
-- ADD HELPFUL COMMENT
-- ============================================================================

COMMENT ON COLUMN dealerships.timezone IS
'Timezone for dealership operations (shift times, punch validation, reporting).
Default: America/New_York (Eastern Time)
Common values: America/New_York, America/Chicago, America/Denver, America/Los_Angeles
Used by can_punch_in_from_template() and schedule variance calculations.';
