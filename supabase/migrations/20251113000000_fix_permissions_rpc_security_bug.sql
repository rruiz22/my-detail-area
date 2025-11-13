-- =====================================================
-- CRITICAL SECURITY FIX: Permission System Fail-Open Bug
-- =====================================================
-- Bug: RPC function grants ALL module permissions when module is enabled
--      instead of only permissions explicitly assigned to the role
--
-- Impact: Users could delete orders even without delete_orders permission
--         Any enabled module granted ALL its permissions (fail-open)
--
-- Root Cause: INNER JOIN module_permissions ON module = rma.module
--             This returns ALL permissions for the module, not just assigned ones
--
-- Fix: Join through role_module_permissions_new to verify assignment
--
-- Version: 1.3.17
-- Date: 2025-11-13
-- =====================================================

-- =====================================================
-- FIX: get_user_permissions_batch RPC Function
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_permissions_batch(p_user_id uuid)
RETURNS TABLE(
  roles jsonb,
  system_permissions jsonb,
  module_access jsonb,
  module_permissions jsonb,
  allowed_modules jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- 1. Roles with role_id field (frontend expects role_id not just id)
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', dcr.id::text,
        'role_id', dcr.id::text,  -- Add role_id for compatibility
        'role_name', dcr.role_name,
        'display_name', dcr.display_name,
        'dealer_id', dm.dealer_id,
        'permissions', dcr.permissions,
        'role_type', CASE
          WHEN dcr.dealer_id IS NULL THEN 'system_role'::text
          ELSE 'dealer_custom_role'::text
        END
      ))
      FROM dealer_memberships dm
      INNER JOIN dealer_custom_roles dcr ON dcr.id = dm.custom_role_id
      WHERE dm.user_id = p_user_id
        AND dm.is_active = true
        AND dcr.is_active = true),
      '[]'::jsonb
    ) AS roles,

    -- 2. System Permissions with role_id field
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'role_id', rsp.role_id::text,
        'permission_key', sp.permission_key,
        'display_name', sp.display_name,
        'category', sp.category
      ))
      FROM dealer_memberships dm
      INNER JOIN role_system_permissions rsp ON rsp.role_id = dm.custom_role_id
      INNER JOIN system_permissions sp ON sp.id = rsp.permission_id
      WHERE dm.user_id = p_user_id
        AND dm.is_active = true
        AND sp.is_active = true),
      '[]'::jsonb
    ) AS system_permissions,

    -- 3. Module Access with role_id field
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'role_id', rma.role_id::text,
        'module', rma.module::text,
        'is_enabled', rma.is_enabled
      ))
      FROM dealer_memberships dm
      INNER JOIN role_module_access rma ON rma.role_id = dm.custom_role_id
      WHERE dm.user_id = p_user_id
        AND dm.is_active = true),
      '[]'::jsonb
    ) AS module_access,

    -- 4. 🔒 SECURITY FIX: Module Permissions with proper JOIN verification
    -- ✅ NOW: Only returns permissions explicitly assigned in role_module_permissions_new
    -- ❌ BEFORE: Returned ALL permissions for enabled modules (security bug)
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'role_id', rmp.role_id::text,
        'module', mp.module,
        'permission_key', mp.permission_key,
        'display_name', mp.display_name
      ))
      FROM dealer_memberships dm
      INNER JOIN role_module_access rma ON rma.role_id = dm.custom_role_id
      -- 🔒 CRITICAL FIX: Join through role_module_permissions_new first
      INNER JOIN role_module_permissions_new rmp ON rmp.role_id = rma.role_id
      -- Then join to module_permissions using permission_id (not module name)
      INNER JOIN module_permissions mp ON mp.id = rmp.permission_id
      WHERE dm.user_id = p_user_id
        AND dm.is_active = true
        AND rma.is_enabled = true
        AND mp.is_active = true
        AND mp.module = rma.module::text  -- Ensure same module
      ),
      '[]'::jsonb
    ) AS module_permissions,

    -- 5. ✅ Load allowed modules for supermanagers from user_allowed_modules table
    COALESCE(
      (SELECT jsonb_agg(uam.module)
       FROM user_allowed_modules uam
       WHERE uam.user_id = p_user_id),
      '[]'::jsonb
    ) AS allowed_modules;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_permissions_batch(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_permissions_batch(uuid) IS
'🔒 SECURITY FIX v1.3.17: Returns only explicitly assigned permissions.
Fixes fail-open bug where users could access features without permission checkboxes being checked.
Now verifies permissions through role_module_permissions_new table.';

-- =====================================================
-- VERIFICATION QUERY (run manually after migration)
-- =====================================================

-- Test query to verify permissions are now correctly filtered
-- Replace 'USER_ID_HERE' with actual user ID
/*
SELECT
  p.user_id,
  p.role_id,
  p.module,
  p.permission_key
FROM (
  SELECT
    dm.user_id,
    rmp.role_id::text,
    mp.module,
    mp.permission_key
  FROM dealer_memberships dm
  INNER JOIN role_module_access rma ON rma.role_id = dm.custom_role_id
  INNER JOIN role_module_permissions_new rmp ON rmp.role_id = rma.role_id
  INNER JOIN module_permissions mp ON mp.id = rmp.permission_id
  WHERE dm.is_active = true
    AND rma.is_enabled = true
    AND mp.is_active = true
    AND mp.module = rma.module::text
) p
WHERE p.user_id = 'USER_ID_HERE'::uuid
ORDER BY p.module, p.permission_key;
*/

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ CRITICAL SECURITY FIX APPLIED: v1.3.17';
  RAISE NOTICE '   ';
  RAISE NOTICE '🔒 Bug Fixed:';
  RAISE NOTICE '   - Users can no longer access features without explicit permission';
  RAISE NOTICE '   - System now uses fail-closed security model';
  RAISE NOTICE '   - Permission checkboxes in UI are now properly enforced';
  RAISE NOTICE '   ';
  RAISE NOTICE '📋 Changes:';
  RAISE NOTICE '   - Fixed JOIN in get_user_permissions_batch()';
  RAISE NOTICE '   - Now verifies permissions via role_module_permissions_new';
  RAISE NOTICE '   - Only returns explicitly assigned permissions';
  RAISE NOTICE '   ';
  RAISE NOTICE '⚠️ IMPORTANT: Clear browser cache after deployment';
  RAISE NOTICE '   - localStorage.clear()';
  RAISE NOTICE '   - sessionStorage.clear()';
  RAISE NOTICE '   - Hard refresh (Ctrl+Shift+R)';
END $$;
