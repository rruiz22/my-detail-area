-- =====================================================
-- Migration: RPC Functions for role_module_access
-- Purpose: Manage role module access toggles
-- Date: 2025-10-21
-- =====================================================

-- =====================================================
-- FUNCTION: get_role_module_access
-- Purpose: Get all module access settings for a role
-- Returns: Array of module access records
-- =====================================================

CREATE OR REPLACE FUNCTION get_role_module_access(p_role_id UUID)
RETURNS TABLE (
  module app_module,
  is_enabled BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has access to this role
  -- System admins can access any role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'system_admin'
  ) THEN
    -- Dealer admins can only access roles from their dealership
    IF NOT EXISTS (
      SELECT 1
      FROM dealer_custom_roles dcr
      JOIN profiles p ON p.dealership_id = dcr.dealer_id
      WHERE dcr.id = p_role_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'manager')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to access this role';
    END IF;
  END IF;

  -- Return module access for this role
  -- If no records exist, return all modules as enabled (backwards compatible)
  RETURN QUERY
  SELECT
    m.module_value::app_module as module,
    COALESCE(rma.is_enabled, true) as is_enabled,
    COALESCE(rma.created_at, NOW()) as created_at,
    COALESCE(rma.updated_at, NOW()) as updated_at
  FROM (
    SELECT unnest(enum_range(NULL::app_module))::text as module_value
  ) m
  LEFT JOIN role_module_access rma ON rma.role_id = p_role_id AND rma.module::text = m.module_value
  ORDER BY m.module_value;
END;
$$;

-- =====================================================
-- FUNCTION: toggle_role_module_access
-- Purpose: Enable/disable a module for a specific role
-- Params:
--   p_role_id: The role to modify
--   p_module: The module to toggle
--   p_is_enabled: Whether to enable (true) or disable (false)
-- =====================================================

CREATE OR REPLACE FUNCTION toggle_role_module_access(
  p_role_id UUID,
  p_module TEXT,
  p_is_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dealer_id BIGINT;
BEGIN
  -- Get dealer_id for this role
  SELECT dealer_id INTO v_dealer_id
  FROM dealer_custom_roles
  WHERE id = p_role_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role not found or inactive';
  END IF;

  -- Verify caller has permission
  -- System admins can modify any role
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'system_admin'
  ) THEN
    -- Dealer admins can only modify roles from their dealership
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND dealership_id = v_dealer_id
      AND role IN ('admin', 'manager')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions to modify this role';
    END IF;
  END IF;

  -- Verify module exists in enum
  BEGIN
    PERFORM p_module::app_module;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid module: %', p_module;
  END;

  -- Insert or update module access
  INSERT INTO role_module_access (role_id, module, is_enabled)
  VALUES (p_role_id, p_module::app_module, p_is_enabled)
  ON CONFLICT (role_id, module)
  DO UPDATE SET
    is_enabled = p_is_enabled,
    updated_at = NOW();

  RETURN true;
END;
$$;

-- =====================================================
-- FUNCTION: bulk_set_role_module_access
-- Purpose: Set multiple module access settings at once
-- Useful for Create/Edit Role modals
-- =====================================================

CREATE OR REPLACE FUNCTION bulk_set_role_module_access(
  p_role_id UUID,
  p_modules_access JSONB -- Format: [{"module": "sales_orders", "is_enabled": true}, ...]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dealer_id BIGINT;
  v_module_record JSONB;
BEGIN
  -- Get dealer_id for this role
  SELECT dealer_id INTO v_dealer_id
  FROM dealer_custom_roles
  WHERE id = p_role_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role not found or inactive';
  END IF;

  -- Verify caller has permission
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND (role = 'system_admin' OR (dealership_id = v_dealer_id AND role IN ('admin', 'manager')))
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to modify this role';
  END IF;

  -- Process each module
  FOR v_module_record IN SELECT * FROM jsonb_array_elements(p_modules_access)
  LOOP
    INSERT INTO role_module_access (role_id, module, is_enabled)
    VALUES (
      p_role_id,
      (v_module_record->>'module')::app_module,
      (v_module_record->>'is_enabled')::BOOLEAN
    )
    ON CONFLICT (role_id, module)
    DO UPDATE SET
      is_enabled = (v_module_record->>'is_enabled')::BOOLEAN,
      updated_at = NOW();
  END LOOP;

  RETURN true;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Allow authenticated users to execute these functions
GRANT EXECUTE ON FUNCTION get_role_module_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_role_module_access(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_set_role_module_access(UUID, JSONB) TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION get_role_module_access IS 'Returns all module access settings for a role with security checks';
COMMENT ON FUNCTION toggle_role_module_access IS 'Enable or disable a single module for a role';
COMMENT ON FUNCTION bulk_set_role_module_access IS 'Set multiple module access settings at once (useful for forms)';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
