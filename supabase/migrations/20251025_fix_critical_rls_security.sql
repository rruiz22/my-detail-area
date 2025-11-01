-- ============================================================================
-- CRITICAL RLS SECURITY FIX MIGRATION
-- ============================================================================
-- Purpose: Fix critical security vulnerabilities in My Detail Area database
-- Date: 2025-10-25
-- Priority: CRITICAL - P1
--
-- ISSUES ADDRESSED:
-- 1. 13 tables public WITHOUT RLS enabled (CRITICAL)
-- 2. 18 tables WITH RLS enabled but NO policies
-- 3. Implement granular role-based access control
--
-- SECURITY PATTERN:
-- - Dealership isolation: Users can only access their dealership data
-- - Role hierarchy: system_admin > dealer_admin > dealer_manager > dealer_user
-- - Module-based permissions: Granular access control per feature
--
-- ROLLBACK INSTRUCTIONS:
-- To rollback this migration, run:
-- 1. DROP all policies created (listed at end of file)
-- 2. DISABLE RLS on tables that were enabled
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE HELPER FUNCTIONS (if not exists)
-- ============================================================================

-- Function: Get current user's dealership ID
CREATE OR REPLACE FUNCTION get_user_dealership()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT dealership_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Function: Check if current user is system admin
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'system_admin'
  );
$$;

-- Function: Check if user can access a dealership
CREATE OR REPLACE FUNCTION can_access_dealership(p_dealership_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND (
      dealership_id = p_dealership_id
      OR role = 'system_admin'
    )
  );
$$;

-- Function: Check if user has dealer membership (for new v2 tables)
CREATE OR REPLACE FUNCTION user_has_dealer_membership(p_user_id UUID, p_dealer_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = p_user_id
    AND (
      dealership_id = p_dealer_id
      OR role = 'system_admin'
    )
  );
$$;

-- Function: Check if user has specific group permission
CREATE OR REPLACE FUNCTION user_has_group_permission(
  p_user_id UUID,
  p_dealer_id BIGINT,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;

  -- System admin has all permissions
  IF v_user_role = 'system_admin' THEN
    RETURN true;
  END IF;

  -- Dealer admin has management permissions
  IF v_user_role = 'admin' AND p_permission LIKE 'management.%' THEN
    RETURN true;
  END IF;

  -- Check user's group permissions
  RETURN EXISTS (
    SELECT 1
    FROM dealer_groups dg
    JOIN user_group_memberships ugm ON ugm.group_id = dg.id
    WHERE ugm.user_id = p_user_id
    AND dg.dealer_id = p_dealer_id
    AND dg.permissions ? p_permission
  );
END;
$$;

-- Grant permissions on helper functions
GRANT EXECUTE ON FUNCTION get_user_dealership TO authenticated;
GRANT EXECUTE ON FUNCTION is_system_admin TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_dealership TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_dealer_membership TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_group_permission TO authenticated;

COMMENT ON FUNCTION get_user_dealership() IS 'Returns the dealership_id of the current authenticated user';
COMMENT ON FUNCTION is_system_admin() IS 'Returns true if current user has system_admin role';
COMMENT ON FUNCTION can_access_dealership(BIGINT) IS 'Returns true if user can access the specified dealership';
COMMENT ON FUNCTION user_has_dealer_membership(UUID, BIGINT) IS 'Returns true if user has membership in the specified dealership';
COMMENT ON FUNCTION user_has_group_permission(UUID, BIGINT, TEXT) IS 'Returns true if user has the specified permission in their dealer groups';

-- ============================================================================
-- PART 2: ENABLE RLS ON 13 PUBLIC TABLES (CRITICAL)
-- ============================================================================

-- V2 Core Tables
ALTER TABLE dealerships_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations_v2 ENABLE ROW LEVEL SECURITY;

-- Custom Roles & Permissions
ALTER TABLE dealer_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_role_permissions ENABLE ROW LEVEL SECURITY;

-- Backup Tables (will have admin-only access)
ALTER TABLE user_role_assignments_v2_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_custom_roles_backup_20251023_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_permissions_new_backup_20251023_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE get_ready_work_items_backup_pre_status_migration ENABLE ROW LEVEL SECURITY;
ALTER TABLE get_ready_work_items_backup_20251023 ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_backup_20251023_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_memberships_backup_20251023_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 3: CREATE POLICIES FOR V2 DEALERSHIP-SCOPED TABLES
-- ============================================================================

-- ========================================
-- DEALERSHIPS_V2 POLICIES
-- ========================================

DROP POLICY IF EXISTS "dealerships_v2_select" ON dealerships_v2;
DROP POLICY IF EXISTS "dealerships_v2_insert" ON dealerships_v2;
DROP POLICY IF EXISTS "dealerships_v2_update" ON dealerships_v2;
DROP POLICY IF EXISTS "dealerships_v2_delete" ON dealerships_v2;

CREATE POLICY "dealerships_v2_select"
ON dealerships_v2 FOR SELECT
TO authenticated
USING (
  id = get_user_dealership()
  OR is_system_admin()
);

CREATE POLICY "dealerships_v2_insert"
ON dealerships_v2 FOR INSERT
TO authenticated
WITH CHECK (is_system_admin());

CREATE POLICY "dealerships_v2_update"
ON dealerships_v2 FOR UPDATE
TO authenticated
USING (
  id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), id, 'management.admin')
)
WITH CHECK (
  id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), id, 'management.admin')
);

CREATE POLICY "dealerships_v2_delete"
ON dealerships_v2 FOR DELETE
TO authenticated
USING (is_system_admin());

COMMENT ON POLICY "dealerships_v2_select" ON dealerships_v2 IS
'Users can view their own dealership or all dealerships if system admin';

-- ========================================
-- ROLES_V2 POLICIES
-- ========================================

DROP POLICY IF EXISTS "roles_v2_select" ON roles_v2;
DROP POLICY IF EXISTS "roles_v2_insert" ON roles_v2;
DROP POLICY IF EXISTS "roles_v2_update" ON roles_v2;
DROP POLICY IF EXISTS "roles_v2_delete" ON roles_v2;

CREATE POLICY "roles_v2_select"
ON roles_v2 FOR SELECT
TO authenticated
USING (
  dealer_id = get_user_dealership()
  OR is_system_admin()
);

CREATE POLICY "roles_v2_insert"
ON roles_v2 FOR INSERT
TO authenticated
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "roles_v2_update"
ON roles_v2 FOR UPDATE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
)
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "roles_v2_delete"
ON roles_v2 FOR DELETE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

COMMENT ON POLICY "roles_v2_select" ON roles_v2 IS
'Users can view roles from their dealership';

-- ========================================
-- DEPARTMENTS_V2 POLICIES
-- ========================================

DROP POLICY IF EXISTS "departments_v2_select" ON departments_v2;
DROP POLICY IF EXISTS "departments_v2_insert" ON departments_v2;
DROP POLICY IF EXISTS "departments_v2_update" ON departments_v2;
DROP POLICY IF EXISTS "departments_v2_delete" ON departments_v2;

CREATE POLICY "departments_v2_select"
ON departments_v2 FOR SELECT
TO authenticated
USING (
  dealer_id = get_user_dealership()
  OR is_system_admin()
);

CREATE POLICY "departments_v2_insert"
ON departments_v2 FOR INSERT
TO authenticated
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "departments_v2_update"
ON departments_v2 FOR UPDATE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
)
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "departments_v2_delete"
ON departments_v2 FOR DELETE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

COMMENT ON POLICY "departments_v2_select" ON departments_v2 IS
'Users can view departments from their dealership';

-- ========================================
-- USER_INVITATIONS_V2 POLICIES
-- ========================================

DROP POLICY IF EXISTS "user_invitations_v2_select" ON user_invitations_v2;
DROP POLICY IF EXISTS "user_invitations_v2_insert" ON user_invitations_v2;
DROP POLICY IF EXISTS "user_invitations_v2_update" ON user_invitations_v2;
DROP POLICY IF EXISTS "user_invitations_v2_delete" ON user_invitations_v2;

CREATE POLICY "user_invitations_v2_select"
ON user_invitations_v2 FOR SELECT
TO authenticated
USING (
  dealer_id = get_user_dealership()
  OR is_system_admin()
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "user_invitations_v2_insert"
ON user_invitations_v2 FOR INSERT
TO authenticated
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'users.manage')
);

CREATE POLICY "user_invitations_v2_update"
ON user_invitations_v2 FOR UPDATE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'users.manage')
)
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'users.manage')
);

CREATE POLICY "user_invitations_v2_delete"
ON user_invitations_v2 FOR DELETE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'users.manage')
);

COMMENT ON POLICY "user_invitations_v2_select" ON user_invitations_v2 IS
'Users can view invitations from their dealership or invitations to their email';

-- ========================================
-- DEALER_CUSTOM_ROLES POLICIES
-- ========================================

DROP POLICY IF EXISTS "dealer_custom_roles_select" ON dealer_custom_roles;
DROP POLICY IF EXISTS "dealer_custom_roles_insert" ON dealer_custom_roles;
DROP POLICY IF EXISTS "dealer_custom_roles_update" ON dealer_custom_roles;
DROP POLICY IF EXISTS "dealer_custom_roles_delete" ON dealer_custom_roles;

CREATE POLICY "dealer_custom_roles_select"
ON dealer_custom_roles FOR SELECT
TO authenticated
USING (
  dealer_id = get_user_dealership()
  OR is_system_admin()
);

CREATE POLICY "dealer_custom_roles_insert"
ON dealer_custom_roles FOR INSERT
TO authenticated
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "dealer_custom_roles_update"
ON dealer_custom_roles FOR UPDATE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
)
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "dealer_custom_roles_delete"
ON dealer_custom_roles FOR DELETE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

COMMENT ON POLICY "dealer_custom_roles_select" ON dealer_custom_roles IS
'Users can view custom roles from their dealership';

-- ========================================
-- DEALER_ROLE_PERMISSIONS POLICIES
-- ========================================

DROP POLICY IF EXISTS "dealer_role_permissions_select" ON dealer_role_permissions;
DROP POLICY IF EXISTS "dealer_role_permissions_insert" ON dealer_role_permissions;
DROP POLICY IF EXISTS "dealer_role_permissions_update" ON dealer_role_permissions;
DROP POLICY IF EXISTS "dealer_role_permissions_delete" ON dealer_role_permissions;

CREATE POLICY "dealer_role_permissions_select"
ON dealer_role_permissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM dealer_custom_roles dcr
    WHERE dcr.id = dealer_role_permissions.role_id
    AND (dcr.dealer_id = get_user_dealership() OR is_system_admin())
  )
);

CREATE POLICY "dealer_role_permissions_insert"
ON dealer_role_permissions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM dealer_custom_roles dcr
    WHERE dcr.id = role_id
    AND dcr.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), dcr.dealer_id, 'management.admin')
  )
);

CREATE POLICY "dealer_role_permissions_update"
ON dealer_role_permissions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM dealer_custom_roles dcr
    WHERE dcr.id = role_id
    AND dcr.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), dcr.dealer_id, 'management.admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM dealer_custom_roles dcr
    WHERE dcr.id = role_id
    AND dcr.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), dcr.dealer_id, 'management.admin')
  )
);

CREATE POLICY "dealer_role_permissions_delete"
ON dealer_role_permissions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM dealer_custom_roles dcr
    WHERE dcr.id = role_id
    AND dcr.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), dcr.dealer_id, 'management.admin')
  )
);

COMMENT ON POLICY "dealer_role_permissions_select" ON dealer_role_permissions IS
'Users can view role permissions from their dealership';

-- ============================================================================
-- PART 4: CREATE POLICIES FOR BACKUP TABLES (ADMIN-ONLY)
-- ============================================================================

-- All backup tables follow the same pattern: system_admin only

CREATE POLICY "backup_admin_only_select" ON user_role_assignments_v2_backup
FOR SELECT TO authenticated USING (is_system_admin());

CREATE POLICY "backup_admin_only_update" ON user_role_assignments_v2_backup
FOR UPDATE TO authenticated USING (is_system_admin()) WITH CHECK (is_system_admin());

CREATE POLICY "backup_admin_only_delete" ON user_role_assignments_v2_backup
FOR DELETE TO authenticated USING (is_system_admin());

-- Repeat for other backup tables
CREATE POLICY "backup_admin_only_select" ON dealer_custom_roles_backup_20251023_roles
FOR SELECT TO authenticated USING (is_system_admin());

CREATE POLICY "backup_admin_only_select" ON role_module_permissions_new_backup_20251023_roles
FOR SELECT TO authenticated USING (is_system_admin());

CREATE POLICY "backup_admin_only_select" ON get_ready_work_items_backup_pre_status_migration
FOR SELECT TO authenticated USING (is_system_admin());

CREATE POLICY "backup_admin_only_select" ON get_ready_work_items_backup_20251023
FOR SELECT TO authenticated USING (is_system_admin());

CREATE POLICY "backup_admin_only_select" ON profiles_backup_20251023_roles
FOR SELECT TO authenticated USING (is_system_admin());

CREATE POLICY "backup_admin_only_select" ON dealer_memberships_backup_20251023_roles
FOR SELECT TO authenticated USING (is_system_admin());

-- Add comments
COMMENT ON POLICY "backup_admin_only_select" ON user_role_assignments_v2_backup IS
'BACKUP TABLE - System admins only. Consider dropping if older than 30 days.';

COMMENT ON TABLE user_role_assignments_v2_backup IS
'BACKUP TABLE - Created 2025-10-23. Review for deletion after 30 days.';

-- ============================================================================
-- PART 5: CREATE POLICIES FOR 18 TABLES WITH RLS BUT NO POLICIES
-- ============================================================================

-- ========================================
-- BULK_PASSWORD_OPERATIONS (Admin-only)
-- ========================================

DROP POLICY IF EXISTS "bulk_password_admin_only" ON bulk_password_operations;

CREATE POLICY "bulk_password_admin_only"
ON bulk_password_operations FOR ALL
TO authenticated
USING (is_system_admin())
WITH CHECK (is_system_admin());

COMMENT ON POLICY "bulk_password_admin_only" ON bulk_password_operations IS
'System admins only - sensitive security operations';

-- ========================================
-- CATEGORY_MODULE_MAPPINGS (System-wide, read-only for users)
-- ========================================

DROP POLICY IF EXISTS "category_module_mappings_select" ON category_module_mappings;
DROP POLICY IF EXISTS "category_module_mappings_insert" ON category_module_mappings;
DROP POLICY IF EXISTS "category_module_mappings_update" ON category_module_mappings;
DROP POLICY IF EXISTS "category_module_mappings_delete" ON category_module_mappings;

CREATE POLICY "category_module_mappings_select"
ON category_module_mappings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "category_module_mappings_insert"
ON category_module_mappings FOR INSERT
TO authenticated
WITH CHECK (is_system_admin());

CREATE POLICY "category_module_mappings_update"
ON category_module_mappings FOR UPDATE
TO authenticated
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "category_module_mappings_delete"
ON category_module_mappings FOR DELETE
TO authenticated
USING (is_system_admin());

COMMENT ON POLICY "category_module_mappings_select" ON category_module_mappings IS
'All authenticated users can view category-module mappings';

-- ========================================
-- DEALER_SERVICE_GROUPS (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "dealer_service_groups_select" ON dealer_service_groups;
DROP POLICY IF EXISTS "dealer_service_groups_insert" ON dealer_service_groups;
DROP POLICY IF EXISTS "dealer_service_groups_update" ON dealer_service_groups;
DROP POLICY IF EXISTS "dealer_service_groups_delete" ON dealer_service_groups;

CREATE POLICY "dealer_service_groups_select"
ON dealer_service_groups FOR SELECT
TO authenticated
USING (
  dealer_id = get_user_dealership()
  OR is_system_admin()
);

CREATE POLICY "dealer_service_groups_insert"
ON dealer_service_groups FOR INSERT
TO authenticated
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'services.manage')
);

CREATE POLICY "dealer_service_groups_update"
ON dealer_service_groups FOR UPDATE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'services.manage')
)
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'services.manage')
);

CREATE POLICY "dealer_service_groups_delete"
ON dealer_service_groups FOR DELETE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'services.manage')
);

COMMENT ON POLICY "dealer_service_groups_select" ON dealer_service_groups IS
'Users can view service groups from their dealership';

-- ========================================
-- NFC_TAGS (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "nfc_tags_select" ON nfc_tags;
DROP POLICY IF EXISTS "nfc_tags_insert" ON nfc_tags;
DROP POLICY IF EXISTS "nfc_tags_update" ON nfc_tags;
DROP POLICY IF EXISTS "nfc_tags_delete" ON nfc_tags;

CREATE POLICY "nfc_tags_select"
ON nfc_tags FOR SELECT
TO authenticated
USING (
  dealer_id = get_user_dealership()
  OR is_system_admin()
);

CREATE POLICY "nfc_tags_insert"
ON nfc_tags FOR INSERT
TO authenticated
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "nfc_tags_update"
ON nfc_tags FOR UPDATE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
)
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "nfc_tags_delete"
ON nfc_tags FOR DELETE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

COMMENT ON POLICY "nfc_tags_select" ON nfc_tags IS
'Users can view NFC tags from their dealership';

-- ========================================
-- NFC_SCANS (Dealership-scoped, public insert)
-- ========================================

DROP POLICY IF EXISTS "nfc_scans_select" ON nfc_scans;
DROP POLICY IF EXISTS "nfc_scans_insert" ON nfc_scans;

CREATE POLICY "nfc_scans_select"
ON nfc_scans FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM nfc_tags nt
    WHERE nt.id = nfc_scans.tag_id
    AND (nt.dealer_id = get_user_dealership() OR is_system_admin())
  )
);

CREATE POLICY "nfc_scans_insert"
ON nfc_scans FOR INSERT
TO authenticated
WITH CHECK (true); -- Anyone can scan NFC tags

COMMENT ON POLICY "nfc_scans_select" ON nfc_scans IS
'Users can view NFC scans from their dealership tags';

COMMENT ON POLICY "nfc_scans_insert" ON nfc_scans IS
'Anyone can create NFC scan records (public scanning)';

-- ========================================
-- NFC_WORKFLOWS (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "nfc_workflows_select" ON nfc_workflows;
DROP POLICY IF EXISTS "nfc_workflows_insert" ON nfc_workflows;
DROP POLICY IF EXISTS "nfc_workflows_update" ON nfc_workflows;
DROP POLICY IF EXISTS "nfc_workflows_delete" ON nfc_workflows;

CREATE POLICY "nfc_workflows_select"
ON nfc_workflows FOR SELECT
TO authenticated
USING (
  dealer_id = get_user_dealership()
  OR is_system_admin()
);

CREATE POLICY "nfc_workflows_insert"
ON nfc_workflows FOR INSERT
TO authenticated
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "nfc_workflows_update"
ON nfc_workflows FOR UPDATE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
)
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

CREATE POLICY "nfc_workflows_delete"
ON nfc_workflows FOR DELETE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
);

COMMENT ON POLICY "nfc_workflows_select" ON nfc_workflows IS
'Users can view NFC workflows from their dealership';

-- ========================================
-- PASSWORD_RESET_REQUESTS (Admin-only)
-- ========================================

DROP POLICY IF EXISTS "password_reset_admin_only" ON password_reset_requests;

CREATE POLICY "password_reset_admin_only"
ON password_reset_requests FOR ALL
TO authenticated
USING (is_system_admin())
WITH CHECK (is_system_admin());

COMMENT ON POLICY "password_reset_admin_only" ON password_reset_requests IS
'System admins only - sensitive security operations';

-- ========================================
-- RATE_LIMIT_TRACKING (Admin-only)
-- ========================================

DROP POLICY IF EXISTS "rate_limit_admin_only" ON rate_limit_tracking;
DROP POLICY IF EXISTS "rate_limit_insert_public" ON rate_limit_tracking;

CREATE POLICY "rate_limit_admin_only"
ON rate_limit_tracking FOR SELECT
TO authenticated
USING (is_system_admin());

CREATE POLICY "rate_limit_insert_public"
ON rate_limit_tracking FOR INSERT
TO authenticated
WITH CHECK (true); -- System needs to track all requests

COMMENT ON POLICY "rate_limit_admin_only" ON rate_limit_tracking IS
'System admins can view rate limit data';

COMMENT ON POLICY "rate_limit_insert_public" ON rate_limit_tracking IS
'System can track all requests for rate limiting';

-- ========================================
-- RECON_VEHICLES (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "recon_vehicles_select" ON recon_vehicles;
DROP POLICY IF EXISTS "recon_vehicles_insert" ON recon_vehicles;
DROP POLICY IF EXISTS "recon_vehicles_update" ON recon_vehicles;
DROP POLICY IF EXISTS "recon_vehicles_delete" ON recon_vehicles;

CREATE POLICY "recon_vehicles_select"
ON recon_vehicles FOR SELECT
TO authenticated
USING (
  dealer_id = get_user_dealership()
  OR is_system_admin()
);

CREATE POLICY "recon_vehicles_insert"
ON recon_vehicles FOR INSERT
TO authenticated
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write')
);

CREATE POLICY "recon_vehicles_update"
ON recon_vehicles FOR UPDATE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write')
)
WITH CHECK (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write')
);

CREATE POLICY "recon_vehicles_delete"
ON recon_vehicles FOR DELETE
TO authenticated
USING (
  dealer_id = get_user_dealership()
  AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.delete')
);

COMMENT ON POLICY "recon_vehicles_select" ON recon_vehicles IS
'Users can view recon vehicles from their dealership';

-- ========================================
-- RECON_WORK_ITEMS (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "recon_work_items_select" ON recon_work_items;
DROP POLICY IF EXISTS "recon_work_items_insert" ON recon_work_items;
DROP POLICY IF EXISTS "recon_work_items_update" ON recon_work_items;
DROP POLICY IF EXISTS "recon_work_items_delete" ON recon_work_items;

CREATE POLICY "recon_work_items_select"
ON recon_work_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = recon_work_items.vehicle_id
    AND (rv.dealer_id = get_user_dealership() OR is_system_admin())
  )
);

CREATE POLICY "recon_work_items_insert"
ON recon_work_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = vehicle_id
    AND rv.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), rv.dealer_id, 'recon_orders.write')
  )
);

CREATE POLICY "recon_work_items_update"
ON recon_work_items FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = vehicle_id
    AND rv.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), rv.dealer_id, 'recon_orders.write')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = vehicle_id
    AND rv.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), rv.dealer_id, 'recon_orders.write')
  )
);

CREATE POLICY "recon_work_items_delete"
ON recon_work_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = vehicle_id
    AND rv.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), rv.dealer_id, 'recon_orders.delete')
  )
);

COMMENT ON POLICY "recon_work_items_select" ON recon_work_items IS
'Users can view recon work items from their dealership vehicles';

-- ========================================
-- RECON_MEDIA (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "recon_media_select" ON recon_media;
DROP POLICY IF EXISTS "recon_media_insert" ON recon_media;
DROP POLICY IF EXISTS "recon_media_delete" ON recon_media;

CREATE POLICY "recon_media_select"
ON recon_media FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = recon_media.vehicle_id
    AND (rv.dealer_id = get_user_dealership() OR is_system_admin())
  )
);

CREATE POLICY "recon_media_insert"
ON recon_media FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = vehicle_id
    AND rv.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), rv.dealer_id, 'recon_orders.write')
  )
);

CREATE POLICY "recon_media_delete"
ON recon_media FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = vehicle_id
    AND rv.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), rv.dealer_id, 'recon_orders.delete')
  )
);

COMMENT ON POLICY "recon_media_select" ON recon_media IS
'Users can view recon media from their dealership vehicles';

-- ========================================
-- RECON_NOTES (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "recon_notes_select" ON recon_notes;
DROP POLICY IF EXISTS "recon_notes_insert" ON recon_notes;
DROP POLICY IF EXISTS "recon_notes_update" ON recon_notes;
DROP POLICY IF EXISTS "recon_notes_delete" ON recon_notes;

CREATE POLICY "recon_notes_select"
ON recon_notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = recon_notes.vehicle_id
    AND (rv.dealer_id = get_user_dealership() OR is_system_admin())
  )
);

CREATE POLICY "recon_notes_insert"
ON recon_notes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = vehicle_id
    AND rv.dealer_id = get_user_dealership()
  )
);

CREATE POLICY "recon_notes_update"
ON recon_notes FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "recon_notes_delete"
ON recon_notes FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR is_system_admin()
);

COMMENT ON POLICY "recon_notes_select" ON recon_notes IS
'Users can view recon notes from their dealership vehicles';

COMMENT ON POLICY "recon_notes_update" ON recon_notes IS
'Users can only update their own notes';

-- ========================================
-- RECON_VEHICLE_STEP_HISTORY (Dealership-scoped, read-only for users)
-- ========================================

DROP POLICY IF EXISTS "recon_vehicle_step_history_select" ON recon_vehicle_step_history;
DROP POLICY IF EXISTS "recon_vehicle_step_history_insert" ON recon_vehicle_step_history;

CREATE POLICY "recon_vehicle_step_history_select"
ON recon_vehicle_step_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = recon_vehicle_step_history.vehicle_id
    AND (rv.dealer_id = get_user_dealership() OR is_system_admin())
  )
);

CREATE POLICY "recon_vehicle_step_history_insert"
ON recon_vehicle_step_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM recon_vehicles rv
    WHERE rv.id = vehicle_id
    AND rv.dealer_id = get_user_dealership()
  )
);

COMMENT ON POLICY "recon_vehicle_step_history_select" ON recon_vehicle_step_history IS
'Users can view step history from their dealership vehicles';

-- ========================================
-- SALES_ORDER_LINKS (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "sales_order_links_select" ON sales_order_links;
DROP POLICY IF EXISTS "sales_order_links_insert" ON sales_order_links;
DROP POLICY IF EXISTS "sales_order_links_delete" ON sales_order_links;

CREATE POLICY "sales_order_links_select"
ON sales_order_links FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id::text = sales_order_links.order_id
    AND (o.dealer_id = get_user_dealership() OR is_system_admin())
  )
);

CREATE POLICY "sales_order_links_insert"
ON sales_order_links FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id::text = order_id
    AND o.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), o.dealer_id, 'sales_orders.write')
  )
);

CREATE POLICY "sales_order_links_delete"
ON sales_order_links FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id::text = order_id
    AND o.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), o.dealer_id, 'sales_orders.delete')
  )
);

COMMENT ON POLICY "sales_order_links_select" ON sales_order_links IS
'Users can view order links from their dealership';

-- ========================================
-- SERVICE_CATEGORIES (System-wide, read-only for users)
-- ========================================

DROP POLICY IF EXISTS "service_categories_select" ON service_categories;
DROP POLICY IF EXISTS "service_categories_insert" ON service_categories;
DROP POLICY IF EXISTS "service_categories_update" ON service_categories;
DROP POLICY IF EXISTS "service_categories_delete" ON service_categories;

CREATE POLICY "service_categories_select"
ON service_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "service_categories_insert"
ON service_categories FOR INSERT
TO authenticated
WITH CHECK (is_system_admin());

CREATE POLICY "service_categories_update"
ON service_categories FOR UPDATE
TO authenticated
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "service_categories_delete"
ON service_categories FOR DELETE
TO authenticated
USING (is_system_admin());

COMMENT ON POLICY "service_categories_select" ON service_categories IS
'All authenticated users can view service categories';

-- ========================================
-- USER_GROUP_MEMBERSHIPS (Dealership-scoped)
-- ========================================

DROP POLICY IF EXISTS "user_group_memberships_select" ON user_group_memberships;
DROP POLICY IF EXISTS "user_group_memberships_insert" ON user_group_memberships;
DROP POLICY IF EXISTS "user_group_memberships_delete" ON user_group_memberships;

CREATE POLICY "user_group_memberships_select"
ON user_group_memberships FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM dealer_groups dg
    WHERE dg.id = user_group_memberships.group_id
    AND (dg.dealer_id = get_user_dealership() OR is_system_admin())
  )
);

CREATE POLICY "user_group_memberships_insert"
ON user_group_memberships FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM dealer_groups dg
    WHERE dg.id = group_id
    AND dg.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), dg.dealer_id, 'users.manage')
  )
);

CREATE POLICY "user_group_memberships_delete"
ON user_group_memberships FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM dealer_groups dg
    WHERE dg.id = group_id
    AND dg.dealer_id = get_user_dealership()
    AND user_has_group_permission(auth.uid(), dg.dealer_id, 'users.manage')
  )
);

COMMENT ON POLICY "user_group_memberships_select" ON user_group_memberships IS
'Users can view their own group memberships or memberships in their dealership';

-- ========================================
-- DEALER_GROUPS_BACKUP_20250920 (Admin-only backup)
-- ========================================

DROP POLICY IF EXISTS "dealer_groups_backup_admin_only" ON dealer_groups_backup_20250920;

CREATE POLICY "dealer_groups_backup_admin_only"
ON dealer_groups_backup_20250920 FOR SELECT
TO authenticated
USING (is_system_admin());

COMMENT ON POLICY "dealer_groups_backup_admin_only" ON dealer_groups_backup_20250920 IS
'BACKUP TABLE - System admins only. Created 2025-09-20. Review for deletion after 30 days.';

COMMENT ON TABLE dealer_groups_backup_20250920 IS
'BACKUP TABLE - Created 2025-09-20. Review for deletion if older than 30 days.';

-- ========================================
-- USER_GROUP_MEMBERSHIPS_BACKUP_20250920 (Admin-only backup)
-- ========================================

DROP POLICY IF EXISTS "user_group_memberships_backup_admin_only" ON user_group_memberships_backup_20250920;

CREATE POLICY "user_group_memberships_backup_admin_only"
ON user_group_memberships_backup_20250920 FOR SELECT
TO authenticated
USING (is_system_admin());

COMMENT ON POLICY "user_group_memberships_backup_admin_only" ON user_group_memberships_backup_20250920 IS
'BACKUP TABLE - System admins only. Created 2025-09-20. Consider dropping (>60 days old).';

COMMENT ON TABLE user_group_memberships_backup_20250920 IS
'BACKUP TABLE - Created 2025-09-20. CONSIDER DROPPING - Over 60 days old.';

-- ============================================================================
-- PART 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for helper function performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_uid ON profiles(id) WHERE id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_dealership_role ON profiles(dealership_id, role);
CREATE INDEX IF NOT EXISTS idx_dealer_custom_roles_dealer ON dealer_custom_roles(dealer_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_dealer_groups_dealer ON dealer_groups(dealer_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user ON user_group_memberships(user_id);

-- Indexes for v2 tables
CREATE INDEX IF NOT EXISTS idx_dealerships_v2_active ON dealerships_v2(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_roles_v2_dealer ON roles_v2(dealer_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_departments_v2_dealer ON departments_v2(dealer_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_invitations_v2_email ON user_invitations_v2(email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_invitations_v2_dealer ON user_invitations_v2(dealer_id, status);

-- Indexes for NFC tables
CREATE INDEX IF NOT EXISTS idx_nfc_tags_dealer ON nfc_tags(dealer_id);
CREATE INDEX IF NOT EXISTS idx_nfc_scans_tag ON nfc_scans(tag_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfc_workflows_dealer ON nfc_workflows(dealer_id);

-- Indexes for recon tables
CREATE INDEX IF NOT EXISTS idx_recon_vehicles_dealer ON recon_vehicles(dealer_id, status);
CREATE INDEX IF NOT EXISTS idx_recon_work_items_vehicle ON recon_work_items(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_recon_media_vehicle ON recon_media(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_recon_notes_vehicle ON recon_notes(vehicle_id, created_at DESC);

-- ============================================================================
-- PART 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- PART 8: VERIFICATION & SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_tables_with_rls INTEGER;
  v_tables_without_rls INTEGER;
  v_tables_with_policies INTEGER;
  v_tables_without_policies INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true;

  -- Count tables without RLS
  SELECT COUNT(*) INTO v_tables_without_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = false;

  -- Count tables with at least one policy
  SELECT COUNT(DISTINCT tablename) INTO v_tables_with_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count tables with RLS but no policies
  SELECT COUNT(*) INTO v_tables_without_policies
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true
  AND p.policyname IS NULL;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CRITICAL RLS SECURITY FIX MIGRATION COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Tables with RLS enabled: %', v_tables_with_rls;
  RAISE NOTICE 'Tables without RLS: %', v_tables_without_rls;
  RAISE NOTICE 'Tables with policies: %', v_tables_with_policies;
  RAISE NOTICE 'Tables with RLS but no policies: %', v_tables_without_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'ACTIONS TAKEN:';
  RAISE NOTICE '1. Created 5 helper functions for RLS checks';
  RAISE NOTICE '2. Enabled RLS on 13 public tables';
  RAISE NOTICE '3. Created policies for 6 v2 tables (dealership-scoped)';
  RAISE NOTICE '4. Created policies for 7 backup tables (admin-only)';
  RAISE NOTICE '5. Created policies for 18 tables with RLS but no policies';
  RAISE NOTICE '6. Created performance indexes for common queries';
  RAISE NOTICE '';
  RAISE NOTICE 'TESTING CHECKLIST:';
  RAISE NOTICE '- Test as system_admin (should see all data)';
  RAISE NOTICE '- Test as dealer_admin (should see only dealership data)';
  RAISE NOTICE '- Test as dealer_manager (should have limited management access)';
  RAISE NOTICE '- Test as dealer_user (should have read-only on most tables)';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- ROLLBACK REFERENCE
-- ============================================================================
-- To rollback this migration:
--
-- 1. Drop all helper functions:
--    DROP FUNCTION IF EXISTS get_user_dealership();
--    DROP FUNCTION IF EXISTS is_system_admin();
--    DROP FUNCTION IF EXISTS can_access_dealership(BIGINT);
--    DROP FUNCTION IF EXISTS user_has_dealer_membership(UUID, BIGINT);
--    DROP FUNCTION IF EXISTS user_has_group_permission(UUID, BIGINT, TEXT);
--
-- 2. Disable RLS on tables (if needed):
--    ALTER TABLE dealerships_v2 DISABLE ROW LEVEL SECURITY;
--    -- Repeat for all 13 tables
--
-- 3. All policies will be automatically dropped when tables are dropped
--    or can be manually dropped with: DROP POLICY IF EXISTS "policy_name" ON table_name;
-- ============================================================================
