-- =====================================================
-- Fix Fail-Closed Policy for Permissions
-- =====================================================
-- Description: Changes default behavior from fail-open to fail-closed
-- Impact: New dealerships will have explicit module configuration
-- Author: Claude AI - Permissions Audit Fix
-- Date: 2025-10-26
-- Security: CRITICAL - Prevents unauthorized access to new dealerships
-- =====================================================

-- =====================================================
-- PART 1: Auto-seed modules for new dealerships
-- =====================================================
-- This ensures new dealerships have explicit module configuration
-- instead of defaulting to "allow all" (fail-open)

CREATE OR REPLACE FUNCTION on_dealership_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-enable default modules for new dealerships
  -- This prevents the fail-open behavior where missing config = allow all
  INSERT INTO dealership_modules (dealer_id, module, is_enabled, enabled_by)
  VALUES
    -- Core modules (enabled by default)
    (NEW.id, 'dashboard', true, auth.uid()),
    (NEW.id, 'sales_orders', true, auth.uid()),
    (NEW.id, 'service_orders', true, auth.uid()),
    (NEW.id, 'recon_orders', true, auth.uid()),
    (NEW.id, 'car_wash', true, auth.uid()),
    (NEW.id, 'stock', true, auth.uid()),
    (NEW.id, 'contacts', true, auth.uid()),
    (NEW.id, 'chat', true, auth.uid()),

    -- Secondary modules (disabled by default for security)
    (NEW.id, 'get_ready', false, auth.uid()),
    (NEW.id, 'reports', false, auth.uid()),
    (NEW.id, 'settings', false, auth.uid()),
    (NEW.id, 'dealerships', false, auth.uid()),
    (NEW.id, 'users', false, auth.uid()),
    (NEW.id, 'management', false, auth.uid()),
    (NEW.id, 'productivity', false, auth.uid())
  ON CONFLICT (dealer_id, module) DO NOTHING; -- Skip if already exists

  RAISE NOTICE '✅ Auto-seeded modules for new dealership: % (ID: %)', NEW.name, NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_dealership_created ON dealerships;

-- Create trigger for new dealerships
CREATE TRIGGER trigger_dealership_created
  AFTER INSERT ON dealerships
  FOR EACH ROW
  EXECUTE FUNCTION on_dealership_created();

COMMENT ON FUNCTION on_dealership_created IS
'Auto-seeds dealership_modules for new dealerships to ensure explicit configuration.
This implements fail-closed security policy where missing config = deny access.';

-- =====================================================
-- PART 2: Backfill existing dealerships without config
-- =====================================================
-- Apply same default configuration to existing dealerships
-- that don't have any module configuration yet

DO $$
DECLARE
  v_dealer RECORD;
  v_count INT := 0;
BEGIN
  FOR v_dealer IN
    SELECT d.id, d.name
    FROM dealerships d
    LEFT JOIN dealership_modules dm ON dm.dealer_id = d.id
    WHERE dm.dealer_id IS NULL
    GROUP BY d.id, d.name
  LOOP
    -- Insert default modules for this dealership
    INSERT INTO dealership_modules (dealer_id, module, is_enabled, enabled_by)
    VALUES
      -- Core modules (enabled)
      (v_dealer.id, 'dashboard', true, NULL),
      (v_dealer.id, 'sales_orders', true, NULL),
      (v_dealer.id, 'service_orders', true, NULL),
      (v_dealer.id, 'recon_orders', true, NULL),
      (v_dealer.id, 'car_wash', true, NULL),
      (v_dealer.id, 'stock', true, NULL),
      (v_dealer.id, 'contacts', true, NULL),
      (v_dealer.id, 'chat', true, NULL),

      -- Secondary modules (disabled)
      (v_dealer.id, 'get_ready', false, NULL),
      (v_dealer.id, 'reports', false, NULL),
      (v_dealer.id, 'settings', false, NULL),
      (v_dealer.id, 'dealerships', false, NULL),
      (v_dealer.id, 'users', false, NULL),
      (v_dealer.id, 'management', false, NULL),
      (v_dealer.id, 'productivity', false, NULL)
    ON CONFLICT (dealer_id, module) DO NOTHING;

    v_count := v_count + 1;
    RAISE NOTICE '  - Backfilled modules for: % (ID: %)', v_dealer.name, v_dealer.id;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE '✅ Backfilled module configuration for % existing dealership(s)', v_count;
  ELSE
    RAISE NOTICE '✅ All existing dealerships already have module configuration';
  END IF;
END $$;

-- =====================================================
-- PART 3: Create helper function to check module status
-- =====================================================

CREATE OR REPLACE FUNCTION has_dealer_module(
  p_dealer_id INT,
  p_module TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_enabled BOOLEAN;
BEGIN
  -- Check if module is explicitly enabled
  SELECT is_enabled INTO v_is_enabled
  FROM dealership_modules
  WHERE dealer_id = p_dealer_id
    AND module = p_module;

  -- If no config found, return FALSE (fail-closed)
  RETURN COALESCE(v_is_enabled, FALSE);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION has_dealer_module IS
'Checks if a dealership has a specific module enabled.
Returns FALSE if no configuration exists (fail-closed policy).';

GRANT EXECUTE ON FUNCTION has_dealer_module(INT, TEXT) TO authenticated;

-- =====================================================
-- PART 4: Performance indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_dealership_modules_dealer_module_enabled
  ON dealership_modules(dealer_id, module, is_enabled)
  WHERE is_enabled = true;

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Fail-Closed Policy Applied Successfully';
  RAISE NOTICE '   - Created auto-seed trigger for new dealerships';
  RAISE NOTICE '   - Backfilled existing dealerships';
  RAISE NOTICE '   - Created has_dealer_module() helper function';
  RAISE NOTICE '   - Added performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Security Impact:';
  RAISE NOTICE '   - New dealerships: Explicit module configuration required';
  RAISE NOTICE '   - Missing config: Access DENIED (fail-closed)';
  RAISE NOTICE '   - Old behavior: Access ALLOWED (fail-open) ❌ FIXED';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   1. Update useDealershipModules.tsx to use fail-closed logic';
  RAISE NOTICE '   2. Test with new dealership creation';
  RAISE NOTICE '   3. Verify existing dealerships still work';
END $$;
