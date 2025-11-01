-- =====================================================
-- Migration: Auto-populate role_module_access on role creation
-- Purpose: Automatically create module access records when a new custom role is created
-- Date: 2025-10-21
-- =====================================================

-- =====================================================
-- TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_populate_role_module_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When a new custom role is created, populate role_module_access
  -- with all modules enabled by default
  INSERT INTO role_module_access (role_id, module, is_enabled)
  SELECT
    NEW.id,
    m.module_value::app_module,
    true
  FROM (
    SELECT unnest(enum_range(NULL::app_module))::text as module_value
  ) m
  ON CONFLICT (role_id, module) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =====================================================
-- CREATE TRIGGER
-- =====================================================

CREATE TRIGGER trigger_auto_populate_role_module_access
  AFTER INSERT ON dealer_custom_roles
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION auto_populate_role_module_access();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION auto_populate_role_module_access IS 'Automatically creates role_module_access records with all modules enabled when a new custom role is created';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
