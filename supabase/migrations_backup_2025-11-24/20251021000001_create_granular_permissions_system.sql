-- =====================================================
-- Create Granular Permissions System
-- =====================================================
-- Description: New permission system with checkboxes for fine-grained access control
-- Author: Claude Code
-- Date: 2025-10-21
-- Migration: 1/4 - Schema creation
-- =====================================================

-- =====================================================
-- PART 1: System-Level Permissions Table
-- =====================================================
-- Stores global permissions that transcend specific modules
-- Examples: manage_all_settings, invite_users, view_audit_logs

CREATE TABLE IF NOT EXISTS system_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  category text NOT NULL, -- 'administration', 'security', etc.
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_permissions_category
  ON system_permissions(category)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_system_permissions_key
  ON system_permissions(permission_key)
  WHERE is_active = true;

COMMENT ON TABLE system_permissions IS
'Defines system-wide permissions that apply globally across all modules. These are administration and security permissions that transcend module boundaries.';

-- =====================================================
-- PART 2: Module-Specific Permissions Table
-- =====================================================
-- Stores permissions specific to each module
-- Examples: sales_orders.view_orders, reports.export_data

CREATE TABLE IF NOT EXISTS module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL, -- 'sales_orders', 'service_orders', etc.
  permission_key text NOT NULL, -- 'view_orders', 'create_orders', etc.
  display_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(module, permission_key)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_module_permissions_module
  ON module_permissions(module)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_module_permissions_key
  ON module_permissions(module, permission_key)
  WHERE is_active = true;

COMMENT ON TABLE module_permissions IS
'Defines module-specific permissions for fine-grained access control within each module (sales, service, reports, etc).';

-- =====================================================
-- PART 3: Role to System Permissions Junction Table
-- =====================================================
-- Links custom roles to system-level permissions

CREATE TABLE IF NOT EXISTS role_system_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES dealer_custom_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES system_permissions(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_system_permissions_role
  ON role_system_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_role_system_permissions_permission
  ON role_system_permissions(permission_id);

COMMENT ON TABLE role_system_permissions IS
'Junction table linking custom roles to system-level permissions. Determines which global permissions each role has.';

-- =====================================================
-- PART 4: Role to Module Permissions Junction Table
-- =====================================================
-- Links custom roles to module-specific permissions

CREATE TABLE IF NOT EXISTS role_module_permissions_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES dealer_custom_roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES module_permissions(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_module_permissions_new_role
  ON role_module_permissions_new(role_id);

CREATE INDEX IF NOT EXISTS idx_role_module_permissions_new_permission
  ON role_module_permissions_new(permission_id);

COMMENT ON TABLE role_module_permissions_new IS
'Junction table linking custom roles to module-specific permissions. Determines what actions each role can perform within each module. Named _new to avoid conflict during migration.';

-- =====================================================
-- PART 5: Audit Tracking
-- =====================================================
-- Track permission changes for compliance

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES dealer_custom_roles(id) ON DELETE CASCADE,
  permission_type text NOT NULL, -- 'system' or 'module'
  permission_key text NOT NULL,
  action text NOT NULL, -- 'granted', 'revoked'
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now(),
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_role
  ON permission_audit_log(role_id);

CREATE INDEX IF NOT EXISTS idx_permission_audit_changed_at
  ON permission_audit_log(changed_at DESC);

COMMENT ON TABLE permission_audit_log IS
'Tracks all permission changes for security auditing and compliance. Records who changed what permission and when.';

-- =====================================================
-- Success Message
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Granular permissions schema created successfully';
  RAISE NOTICE '   - Created system_permissions table';
  RAISE NOTICE '   - Created module_permissions table';
  RAISE NOTICE '   - Created role_system_permissions junction table';
  RAISE NOTICE '   - Created role_module_permissions_new junction table';
  RAISE NOTICE '   - Created permission_audit_log table';
  RAISE NOTICE '   - Added indexes for performance';
END $$;
