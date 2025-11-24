-- ============================================================================
-- Migration: User Allowed Modules System for Supermanagers
-- ============================================================================
-- Description:
--   Implements granular module permissions for supermanagers with global
--   access to all dealerships. Replaces bypass_custom_roles with explicit
--   module selection system.
--
-- Features:
--   1. user_allowed_modules table (global, no dealer_id)
--   2. RPCs for get/set allowed modules
--   3. RLS policies update for supermanager multi-dealer access
--   4. Validation constraints
--
-- Author: MyDetailArea Team
-- Date: 2025-11-04
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE: user_allowed_modules
-- ============================================================================
-- Stores global module permissions for supermanagers across ALL dealerships
-- No dealer_id column - permissions are global

CREATE TABLE IF NOT EXISTS user_allowed_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Ensure unique module per user
  CONSTRAINT user_allowed_modules_unique UNIQUE(user_id, module),

  -- Only supermanagers can have allowed modules
  CONSTRAINT user_allowed_modules_role_check CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = user_id
      AND role = 'supermanager'
    )
  )
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_allowed_modules_user_id
ON user_allowed_modules(user_id);

-- Table comment
COMMENT ON TABLE user_allowed_modules IS 'Global module permissions for supermanagers across ALL dealerships. No dealer scoping - permissions apply universally.';

COMMENT ON COLUMN user_allowed_modules.module IS 'Module identifier (e.g., sales_orders, contacts, reports)';
COMMENT ON COLUMN user_allowed_modules.created_by IS 'System admin who granted this permission';

-- ============================================================================
-- 2. RPC: get_user_allowed_modules
-- ============================================================================
-- Returns array of allowed modules for a given user
-- Used by frontend to load supermanager permissions

CREATE OR REPLACE FUNCTION get_user_allowed_modules(target_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  modules TEXT[];
BEGIN
  -- Get all allowed modules for user
  SELECT ARRAY_AGG(module ORDER BY module)
  INTO modules
  FROM user_allowed_modules
  WHERE user_id = target_user_id;

  -- Return empty array if null
  RETURN COALESCE(modules, ARRAY[]::TEXT[]);
END;
$$;

COMMENT ON FUNCTION get_user_allowed_modules IS 'Returns array of allowed modules for a supermanager user';

-- ============================================================================
-- 3. RPC: set_user_allowed_modules
-- ============================================================================
-- Sets allowed modules for a supermanager
-- Only system_admin can execute
-- Validates:
--   - Caller is system_admin
--   - Target user is supermanager
--   - At least 1 module is provided

CREATE OR REPLACE FUNCTION set_user_allowed_modules(
  target_user_id UUID,
  modules TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_role TEXT;
  target_role TEXT;
  caller_is_admin BOOLEAN;
BEGIN
  -- Get caller's role
  SELECT role, is_system_admin
  INTO caller_role, caller_is_admin
  FROM profiles
  WHERE id = auth.uid();

  -- Verify caller is system_admin
  IF NOT COALESCE(caller_is_admin, false) THEN
    RAISE EXCEPTION 'Unauthorized: Only system admins can modify allowed modules';
  END IF;

  -- Get target user's role
  SELECT role INTO target_role
  FROM profiles
  WHERE id = target_user_id;

  -- Verify target is supermanager
  IF target_role IS NULL THEN
    RAISE EXCEPTION 'User not found: %', target_user_id;
  END IF;

  IF target_role != 'supermanager' THEN
    RAISE EXCEPTION 'Only supermanagers can have allowed modules. User role: %', target_role;
  END IF;

  -- Validate modules array is not empty
  IF array_length(modules, 1) IS NULL OR array_length(modules, 1) = 0 THEN
    RAISE EXCEPTION 'Supermanagers must have at least one allowed module';
  END IF;

  -- Delete existing modules for this user
  DELETE FROM user_allowed_modules WHERE user_id = target_user_id;

  -- Insert new modules
  INSERT INTO user_allowed_modules (user_id, module, created_by)
  SELECT target_user_id, unnest(modules), auth.uid();

  -- Audit log
  RAISE NOTICE 'User % allowed modules updated to: % (by: %)',
    target_user_id,
    modules,
    auth.uid();

END;
$$;

COMMENT ON FUNCTION set_user_allowed_modules IS 'Sets allowed modules for a supermanager. Only system_admin can execute.';

-- ============================================================================
-- 4. UPDATE RLS POLICIES - Supermanager Multi-Dealer Access
-- ============================================================================
-- Update existing RLS policies to allow supermanagers to access ALL dealerships
-- Pattern: System admin OR Supermanager OR Dealer membership

-- Policy naming convention:
--   - [table]_supermanager_view_all_dealers
--   - [table]_supermanager_crud_all_dealers

-- ============================================================================
-- 4.1 Sales Orders
-- ============================================================================
DROP POLICY IF EXISTS sales_orders_supermanager_view_all ON sales_orders;
CREATE POLICY sales_orders_supermanager_view_all
ON sales_orders FOR SELECT
USING (
  -- System admins see everything
  is_system_admin(auth.uid())
  OR
  -- Supermanagers see ALL dealers
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  -- Dealer users see only their dealerships
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS sales_orders_supermanager_crud_all ON sales_orders;
CREATE POLICY sales_orders_supermanager_crud_all
ON sales_orders FOR ALL
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================================================
-- 4.2 Service Orders
-- ============================================================================
DROP POLICY IF EXISTS service_orders_supermanager_view_all ON service_orders;
CREATE POLICY service_orders_supermanager_view_all
ON service_orders FOR SELECT
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS service_orders_supermanager_crud_all ON service_orders;
CREATE POLICY service_orders_supermanager_crud_all
ON service_orders FOR ALL
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================================================
-- 4.3 Recon Orders
-- ============================================================================
DROP POLICY IF EXISTS recon_orders_supermanager_view_all ON recon_orders;
CREATE POLICY recon_orders_supermanager_view_all
ON recon_orders FOR SELECT
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS recon_orders_supermanager_crud_all ON recon_orders;
CREATE POLICY recon_orders_supermanager_crud_all
ON recon_orders FOR ALL
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================================================
-- 4.4 Car Wash Orders
-- ============================================================================
DROP POLICY IF EXISTS car_wash_orders_supermanager_view_all ON car_wash_orders;
CREATE POLICY car_wash_orders_supermanager_view_all
ON car_wash_orders FOR SELECT
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS car_wash_orders_supermanager_crud_all ON car_wash_orders;
CREATE POLICY car_wash_orders_supermanager_crud_all
ON car_wash_orders FOR ALL
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================================================
-- 4.5 Dealership Contacts
-- ============================================================================
DROP POLICY IF EXISTS dealership_contacts_supermanager_view_all ON dealership_contacts;
CREATE POLICY dealership_contacts_supermanager_view_all
ON dealership_contacts FOR SELECT
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS dealership_contacts_supermanager_crud_all ON dealership_contacts;
CREATE POLICY dealership_contacts_supermanager_crud_all
ON dealership_contacts FOR ALL
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================================================
-- 4.6 Vehicles (Stock)
-- ============================================================================
DROP POLICY IF EXISTS vehicles_supermanager_view_all ON vehicles;
CREATE POLICY vehicles_supermanager_view_all
ON vehicles FOR SELECT
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

DROP POLICY IF EXISTS vehicles_supermanager_crud_all ON vehicles;
CREATE POLICY vehicles_supermanager_crud_all
ON vehicles FOR ALL
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================================================
-- 4.7 Dealer Services
-- ============================================================================
DROP POLICY IF EXISTS dealer_services_supermanager_view_all ON dealer_services;
CREATE POLICY dealer_services_supermanager_view_all
ON dealer_services FOR SELECT
USING (
  is_system_admin(auth.uid())
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'supermanager'
  OR
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- ============================================================================
-- 5. ENABLE RLS ON NEW TABLE
-- ============================================================================
ALTER TABLE user_allowed_modules ENABLE ROW LEVEL SECURITY;

-- Only system admins can view/modify allowed modules
CREATE POLICY user_allowed_modules_system_admin_all
ON user_allowed_modules FOR ALL
USING (
  is_system_admin(auth.uid())
);

-- ============================================================================
-- 6. DEPRECATION NOTICE
-- ============================================================================
-- Mark bypass_custom_roles as deprecated (DO NOT DROP)
COMMENT ON COLUMN profiles.bypass_custom_roles IS
'DEPRECATED: Use user_allowed_modules table instead.
Kept for backward compatibility only. Do not use in new code.';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Next steps:
-- 1. Update Edge Function create-system-user to set allowed_modules
-- 2. Update useUserProfile to load allowed_modules
-- 3. Update usePermissions to check allowed_modules for supermanagers
-- 4. Update PermissionGuard to use allowed_modules
-- 5. Update CreateSystemUserModal with module selector
-- 6. Migrate existing bypass_custom_roles users to allowed_modules
-- ============================================================================
