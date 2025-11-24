-- =====================================================
-- Create function to get users with access to a specific module
-- =====================================================
-- Description: Returns all active users from a dealership that have access to a specific module
-- Author: Claude Code
-- Date: 2025-10-28
-- Purpose: Filter assignable users by module permissions
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_with_module_access(
  p_dealer_id integer,
  p_module text
)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  role_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id as user_id,
    p.first_name,
    p.last_name,
    p.email,
    dcr.role_name
  FROM profiles p
  INNER JOIN dealer_memberships dm ON p.id = dm.user_id
  LEFT JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
  LEFT JOIN role_module_permissions_new rmp ON dcr.id = rmp.role_id
  LEFT JOIN module_permissions mp ON rmp.permission_id = mp.id
  WHERE
    dm.dealer_id = p_dealer_id
    AND dm.is_active = true
    AND p.is_active = true
    AND (
      -- System admins have access to everything
      p.is_system_admin = true
      OR
      -- Users with module permissions (read, write, delete, admin, none)
      (mp.module = p_module AND mp.is_active = true)
    )
  ORDER BY p.first_name, p.last_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_users_with_module_access(integer, text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_users_with_module_access IS
'Returns all active users from a dealership that have access to a specific module based on their custom role permissions. System admins always have access to all modules.';
