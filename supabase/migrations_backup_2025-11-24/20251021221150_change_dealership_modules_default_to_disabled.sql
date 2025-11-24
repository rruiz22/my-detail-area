-- =====================================================
-- Migration: Change dealership modules default to DISABLED
-- Purpose: New dealerships start with all modules disabled
--          Admins must explicitly enable modules per dealership
-- Date: 2025-10-21
-- =====================================================

-- This change improves security and control:
-- - New dealerships start with NO modules enabled
-- - System admin must explicitly activate modules
-- - Prevents accidental access to premium features

-- =====================================================
-- UPDATE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.initialize_dealership_modules(p_dealer_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Core modules that should be created (but DISABLED by default)
  core_modules app_module[] := ARRAY[
    'dashboard',
    'sales_orders',
    'service_orders',
    'recon_orders',
    'car_wash',
    'stock',
    'contacts',
    'reports',
    'users',
    'settings'
  ]::app_module[];
  module_name app_module;
BEGIN
  -- Insert core modules for the dealership, ALL DISABLED by default
  -- Admin must explicitly enable modules needed for this dealership
  FOREACH module_name IN ARRAY core_modules
  LOOP
    INSERT INTO dealership_modules (dealer_id, module, is_enabled, enabled_by, disabled_at)
    VALUES (
      p_dealer_id,
      module_name,
      false,  -- ← CHANGED FROM true TO false
      NULL,   -- ← NULL because not enabled yet
      NOW()   -- ← Set disabled_at timestamp
    )
    ON CONFLICT (dealer_id, module) DO NOTHING;
  END LOOP;

  RETURN true;
END;
$function$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION initialize_dealership_modules IS 'Creates dealership module records with ALL modules DISABLED by default. Admins must explicitly enable modules.';

-- =====================================================
-- OPTIONAL: Update existing dealerships that have no modules configured
-- (Commented out for safety - uncomment if you want to apply retroactively)
-- =====================================================

/*
-- This would disable all modules for dealerships that currently have no explicit configuration
INSERT INTO dealership_modules (dealer_id, module, is_enabled, disabled_at)
SELECT
  d.id as dealer_id,
  m.module_value::app_module as module,
  false as is_enabled,
  NOW() as disabled_at
FROM dealerships d
CROSS JOIN (
  SELECT unnest(enum_range(NULL::app_module))::text as module_value
) m
WHERE d.deleted_at IS NULL
AND NOT EXISTS (
  SELECT 1 FROM dealership_modules dm
  WHERE dm.dealer_id = d.id AND dm.module::text = m.module_value
)
ON CONFLICT (dealer_id, module) DO NOTHING;
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================
