-- =====================================================
-- Migration: Create role_module_access table
-- Purpose: Control module access at the custom role level
-- Author: System
-- Date: 2025-10-21
-- =====================================================

-- This table adds a new layer of access control:
-- 1. Dealership level: dealership_modules (is dealer allowed to use this module?)
-- 2. Role level: role_module_access (is this role allowed to access the module?) ← NEW
-- 3. Permission level: role_module_permissions_new (what can the role do in the module?)

-- =====================================================
-- CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS role_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES dealer_custom_roles(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one record per role-module combination
  CONSTRAINT unique_role_module UNIQUE(role_id, module)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Index for fast lookups by role_id
CREATE INDEX IF NOT EXISTS idx_role_module_access_role_id
ON role_module_access(role_id);

-- Index for fast lookups by role_id and enabled status
CREATE INDEX IF NOT EXISTS idx_role_module_access_enabled
ON role_module_access(role_id, is_enabled)
WHERE is_enabled = true;

-- Index for module lookups
CREATE INDEX IF NOT EXISTS idx_role_module_access_module
ON role_module_access(module);

-- =====================================================
-- CREATE TRIGGER FOR updated_at
-- =====================================================

CREATE TRIGGER set_updated_at_role_module_access
  BEFORE UPDATE ON role_module_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE role_module_access ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Policy 1: System admins have full access
CREATE POLICY "role_module_access_admin_all"
ON role_module_access
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'system_admin'
  )
);

-- Policy 2: Dealer admins/managers can manage their dealership's roles
CREATE POLICY "role_module_access_dealer_admin"
ON role_module_access
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM dealer_custom_roles dcr
    JOIN profiles p ON p.dealership_id = dcr.dealer_id
    WHERE dcr.id = role_module_access.role_id
    AND p.id = auth.uid()
    AND p.role IN ('admin', 'manager')
  )
);

-- Policy 3: Users can read their own role's module access
CREATE POLICY "role_module_access_user_read"
ON role_module_access
FOR SELECT
TO public
USING (
  role_id IN (
    SELECT custom_role_id
    FROM user_custom_role_assignments
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- =====================================================
-- INITIAL DATA POPULATION
-- =====================================================
-- Populate role_module_access for ALL existing roles with ALL modules enabled
-- This ensures backwards compatibility - existing roles keep working
-- Admins can then disable specific modules per role as needed

INSERT INTO role_module_access (role_id, module, is_enabled)
SELECT
  dcr.id as role_id,
  m.module_value::app_module as module,
  true as is_enabled
FROM dealer_custom_roles dcr
CROSS JOIN (
  SELECT unnest(enum_range(NULL::app_module))::text as module_value
) m
WHERE dcr.is_active = true
ON CONFLICT (role_id, module) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE role_module_access IS 'Controls which modules each custom role can access. Acts as a toggle to enable/disable entire modules for a role, independent of granular permissions.';
COMMENT ON COLUMN role_module_access.role_id IS 'Reference to the custom role';
COMMENT ON COLUMN role_module_access.module IS 'The application module (uses app_module ENUM)';
COMMENT ON COLUMN role_module_access.is_enabled IS 'Whether this role can access this module. When false, all permissions for this module are ignored for this role.';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
