-- ============================================================================
-- CONFIGURE SYSTEM ROLE PERMISSIONS
-- ============================================================================
-- This script configures permissions for the global system roles
-- - USER: Basic view permissions
-- - MANAGER: Full permissions on all modules
-- ============================================================================

DO $$
DECLARE
  user_role_id UUID;
  manager_role_id UUID;
BEGIN
  -- Get role IDs for system roles
  SELECT id INTO user_role_id FROM dealer_custom_roles
  WHERE role_name = 'user' AND dealer_id IS NULL;

  SELECT id INTO manager_role_id FROM dealer_custom_roles
  WHERE role_name = 'manager' AND dealer_id IS NULL;

  -- Validate roles were found
  IF user_role_id IS NULL THEN
    RAISE EXCEPTION 'System role "user" not found. Run CREATE_SYSTEM_ROLES.sql first.';
  END IF;

  IF manager_role_id IS NULL THEN
    RAISE EXCEPTION 'System role "manager" not found. Run CREATE_SYSTEM_ROLES.sql first.';
  END IF;

  RAISE NOTICE 'Configuring permissions for user role: %', user_role_id;
  RAISE NOTICE 'Configuring permissions for manager role: %', manager_role_id;

  -- ========================================================================
  -- USER ROLE: Basic permissions (view only for most modules)
  -- ========================================================================
  -- Using permission_id foreign key reference to module_permissions
  INSERT INTO role_module_permissions_new (role_id, permission_id)
  SELECT
    user_role_id,
    mp.id
  FROM module_permissions mp
  WHERE mp.module IN (
    'dashboard',
    'sales_orders',
    'service_orders',
    'recon_orders',
    'car_wash',
    'get_ready',
    'stock',
    'chat',
    'contacts'
  )
  AND mp.permission_key = 'view'
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE 'User role: Added view permissions for 9 modules';

  -- ========================================================================
  -- MANAGER ROLE: Full permissions on all modules
  -- ========================================================================
  INSERT INTO role_module_permissions_new (role_id, permission_id)
  SELECT manager_role_id, mp.id
  FROM module_permissions mp
  WHERE mp.module IN (
    'dashboard',
    'sales_orders',
    'service_orders',
    'recon_orders',
    'car_wash',
    'get_ready',
    'stock',
    'chat',
    'contacts',
    'productivity',
    'settings',
    'dealerships',
    'management'
  ) AND mp.permission_key IN ('view', 'create', 'edit', 'delete', 'change_status', 'manage', 'admin')
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  RAISE NOTICE 'Manager role: Added full permissions for 13 modules';

  -- Enable all modules for manager role
  INSERT INTO role_module_access (role_id, module, is_enabled)
  SELECT manager_role_id, module::app_module, true
  FROM (VALUES
    ('dashboard'),
    ('sales_orders'),
    ('service_orders'),
    ('recon_orders'),
    ('car_wash'),
    ('get_ready'),
    ('stock'),
    ('chat'),
    ('contacts'),
    ('productivity'),
    ('settings'),
    ('dealerships'),
    ('management')
  ) AS modules(module)
  ON CONFLICT (role_id, module) DO UPDATE SET is_enabled = true;

  RAISE NOTICE 'Manager role: Enabled all 13 modules';

  -- Enable basic modules for user role
  INSERT INTO role_module_access (role_id, module, is_enabled)
  SELECT user_role_id, module::app_module, true
  FROM (VALUES
    ('dashboard'),
    ('sales_orders'),
    ('service_orders'),
    ('recon_orders'),
    ('car_wash'),
    ('get_ready'),
    ('stock'),
    ('chat'),
    ('contacts')
  ) AS modules(module)
  ON CONFLICT (role_id, module) DO UPDATE SET is_enabled = true;

  RAISE NOTICE 'User role: Enabled 9 basic modules';
  RAISE NOTICE '✅ System role permissions configured successfully';

END $$;

-- Verify configuration
SELECT
  dcr.role_name,
  dcr.display_name,
  COUNT(DISTINCT mp.module) as modules_with_permissions,
  COUNT(rmpn.permission_id) as total_permissions
FROM dealer_custom_roles dcr
LEFT JOIN role_module_permissions_new rmpn ON rmpn.role_id = dcr.id
LEFT JOIN module_permissions mp ON mp.id = rmpn.permission_id
WHERE dcr.dealer_id IS NULL
GROUP BY dcr.id, dcr.role_name, dcr.display_name
ORDER BY dcr.role_name;
