-- =====================================================
-- Migration: Backfill Dealership Modules
-- Purpose: Initialize module configuration for all dealerships without modules
-- Date: 2025-10-27
-- Author: System Migration
-- =====================================================

-- =====================================================
-- PROBLEM CONTEXT
-- =====================================================
-- Some dealerships were created before the module system was fully implemented
-- or before the initialize_dealership_modules() function existed.
-- This causes a "No modules configured" error and denies all access (fail-closed).
--
-- This migration finds all dealerships without module configuration
-- and initializes them with default module settings.

-- =====================================================
-- STEP 1: Identify Affected Dealerships
-- =====================================================

DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Count dealerships without any module configuration
  SELECT COUNT(DISTINCT d.id) INTO affected_count
  FROM dealerships d
  WHERE d.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM dealership_modules dm WHERE dm.dealer_id = d.id
  );

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'DEALERSHIP MODULES BACKFILL MIGRATION';
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Found % dealership(s) without module configuration', affected_count;
  RAISE NOTICE 'Starting initialization process...';
  RAISE NOTICE '------------------------------------------';
END $$;

-- =====================================================
-- STEP 2: Initialize Modules for All Affected Dealerships
-- =====================================================

DO $$
DECLARE
  dealer_record RECORD;
  initialized_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Loop through all dealerships without modules
  FOR dealer_record IN
    SELECT d.id, d.name
    FROM dealerships d
    WHERE d.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM dealership_modules dm WHERE dm.dealer_id = d.id
    )
    ORDER BY d.id
  LOOP
    BEGIN
      -- Call the initialization function for this dealership
      PERFORM initialize_dealership_modules(dealer_record.id);

      initialized_count := initialized_count + 1;
      RAISE NOTICE '✅ [%] Initialized modules for: %',
        dealer_record.id,
        dealer_record.name;

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING '❌ [%] Failed to initialize modules for: % - Error: %',
        dealer_record.id,
        dealer_record.name,
        SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '------------------------------------------';
  RAISE NOTICE 'Initialization complete:';
  RAISE NOTICE '  ✅ Successfully initialized: % dealership(s)', initialized_count;
  IF error_count > 0 THEN
    RAISE NOTICE '  ❌ Failed: % dealership(s)', error_count;
  END IF;
  RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- STEP 3: Enable Default Modules for Business Operations
-- =====================================================
-- Enable a standard set of modules for all newly initialized dealerships
-- This allows basic operations while letting admins customize later

DO $$
DECLARE
  dealer_record RECORD;
  enabled_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Enabling default modules for business operations...';
  RAISE NOTICE '------------------------------------------';

  -- For each dealership that was just initialized (all modules disabled)
  FOR dealer_record IN
    SELECT DISTINCT dealer_id
    FROM dealership_modules
    WHERE dealer_id IN (
      SELECT d.id FROM dealerships d WHERE d.deleted_at IS NULL
    )
    -- Find dealerships where ALL modules are disabled (newly initialized)
    AND dealer_id NOT IN (
      SELECT dealer_id
      FROM dealership_modules
      WHERE is_enabled = true
    )
  LOOP
    -- Enable core modules needed for basic operations
    UPDATE dealership_modules
    SET
      is_enabled = true,
      enabled_at = NOW(),
      disabled_at = NULL,
      enabled_by = NULL  -- System-enabled (not by specific user)
    WHERE dealer_id = dealer_record.dealer_id
    AND module IN (
      'dashboard',        -- Essential: Main view
      'sales_orders',     -- Essential: Sales operations
      'service_orders',   -- Essential: Service operations
      'recon_orders',     -- Essential: Recon workflow
      'contacts',         -- Essential: Customer management
      'users',            -- Essential: User management
      'settings'          -- Essential: Configuration
    );

    enabled_count := enabled_count + 1;
    RAISE NOTICE '✅ [%] Enabled default modules', dealer_record.dealer_id;
  END LOOP;

  RAISE NOTICE '------------------------------------------';
  RAISE NOTICE '✅ Enabled default modules for % dealership(s)', enabled_count;
  RAISE NOTICE '==========================================';
END $$;

-- =====================================================
-- STEP 4: Verification Queries
-- =====================================================

-- Verify: All dealerships should have module configuration now
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT d.id) INTO missing_count
  FROM dealerships d
  WHERE d.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM dealership_modules dm WHERE dm.dealer_id = d.id
  );

  RAISE NOTICE 'VERIFICATION: Dealerships without modules: %', missing_count;

  IF missing_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All dealerships have module configuration';
  ELSE
    RAISE WARNING '⚠️  WARNING: % dealership(s) still missing modules', missing_count;
  END IF;
END $$;

-- Verify: Summary of module configuration
SELECT
  'MIGRATION SUMMARY' as report_type,
  COUNT(DISTINCT dealer_id) as total_dealerships,
  COUNT(*) as total_module_records,
  COUNT(*) FILTER (WHERE is_enabled = true) as enabled_modules,
  COUNT(*) FILTER (WHERE is_enabled = false) as disabled_modules,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE is_enabled = true) / NULLIF(COUNT(*), 0),
    1
  ) as percent_enabled
FROM dealership_modules;

-- Verify: List all dealerships with their module counts
SELECT
  d.id as dealer_id,
  d.name as dealer_name,
  COUNT(dm.module) as total_modules,
  COUNT(dm.module) FILTER (WHERE dm.is_enabled = true) as enabled_modules,
  COUNT(dm.module) FILTER (WHERE dm.is_enabled = false) as disabled_modules,
  CASE
    WHEN COUNT(dm.module) = 0 THEN '❌ NO MODULES'
    WHEN COUNT(dm.module) FILTER (WHERE dm.is_enabled = true) = 0 THEN '⚠️ ALL DISABLED'
    ELSE '✅ CONFIGURED'
  END as status
FROM dealerships d
LEFT JOIN dealership_modules dm ON d.id = dm.dealer_id
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name
ORDER BY d.id;

-- =====================================================
-- ROLLBACK (IF NEEDED)
-- =====================================================
-- ⚠️ CAUTION: Only run if this migration causes problems

/*
-- Rollback: Delete all modules created by this migration
-- (Only deletes modules where enabled_by IS NULL, indicating system-enabled)

DELETE FROM dealership_modules
WHERE enabled_by IS NULL
AND created_at >= '2025-10-27 00:00:00'
AND created_at <= NOW();

-- Verify rollback
SELECT
  COUNT(DISTINCT dealer_id) as dealerships_affected,
  COUNT(*) as modules_remaining
FROM dealership_modules;
*/

-- =====================================================
-- POST-MIGRATION RECOMMENDATIONS
-- =====================================================

-- 1. Review each dealership's enabled modules
-- 2. Customize module access based on subscription plan
-- 3. Disable premium modules (stock, get_ready, productivity) for basic plans
-- 4. Verify triggers are in place for new dealership creation
-- 5. Update admin documentation about module management

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION initialize_dealership_modules IS
  'Initializes dealership_modules records for a dealership. Called automatically on dealership creation and by backfill migrations.';

-- =====================================================
-- END OF MIGRATION
-- =====================================================


