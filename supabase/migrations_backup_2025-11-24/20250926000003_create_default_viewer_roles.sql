-- Migration: Create default viewer roles for BMW of Sudbury (dealer_id=5)
-- Purpose: Map current viewer user permissions to custom roles
-- Author: Claude Code
-- Date: 2025-09-26
-- Risk Level: LOW (only creates roles, doesn't assign yet)

-- Create dealer_viewer_full role (for ar@lima.llc who has role_permissions)
-- Permissions: dashboard(view), sales_orders(edit), reports(view), chat(view), stock(view)
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Insert or get existing role
  INSERT INTO dealer_custom_roles (
    dealer_id,
    role_name,
    display_name,
    description,
    is_active
  )
  VALUES (
    5,
    'dealer_viewer_full',
    'Viewer (Full Access)',
    'Dashboard + Sales Orders + Reports access. Migrated from legacy viewer role with permissions.',
    true
  )
  ON CONFLICT (dealer_id, role_name) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        description = EXCLUDED.description
  RETURNING id INTO v_role_id;

  -- Add permissions for this role
  INSERT INTO dealer_role_permissions (role_id, module, permission_level)
  VALUES
    (v_role_id, 'dashboard', 'view'),
    (v_role_id, 'sales_orders', 'edit'),
    (v_role_id, 'reports', 'view'),
    (v_role_id, 'chat', 'view'),
    (v_role_id, 'stock', 'view'),
    (v_role_id, 'productivity', 'view')
  ON CONFLICT (role_id, module) DO UPDATE
    SET permission_level = EXCLUDED.permission_level;

  RAISE NOTICE 'Created dealer_viewer_full role with id: %', v_role_id;
END $$;

-- Create dealer_viewer_basic role (for other 2 viewers without permissions)
-- Permissions: dashboard(view), chat(view), stock(view)
DO $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Insert or get existing role
  INSERT INTO dealer_custom_roles (
    dealer_id,
    role_name,
    display_name,
    description,
    is_active
  )
  VALUES (
    5,
    'dealer_viewer_basic',
    'Viewer (Basic)',
    'Basic dashboard and communication access only. Migrated from legacy viewer role without additional permissions.',
    true
  )
  ON CONFLICT (dealer_id, role_name) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        description = EXCLUDED.description
  RETURNING id INTO v_role_id;

  -- Add permissions for this role
  INSERT INTO dealer_role_permissions (role_id, module, permission_level)
  VALUES
    (v_role_id, 'dashboard', 'view'),
    (v_role_id, 'chat', 'view'),
    (v_role_id, 'stock', 'view'),
    (v_role_id, 'productivity', 'view')
  ON CONFLICT (role_id, module) DO UPDATE
    SET permission_level = EXCLUDED.permission_level;

  RAISE NOTICE 'Created dealer_viewer_basic role with id: %', v_role_id;
END $$;