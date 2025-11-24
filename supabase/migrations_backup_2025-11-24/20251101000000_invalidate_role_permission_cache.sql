-- MyDetailArea Custom Roles Permission Cache Invalidation
--
-- This migration creates an RPC function to identify all users affected
-- by custom role permission changes, enabling immediate cache invalidation
-- without requiring users to logout/login.

-- ============================================================================
-- Function: invalidate_role_permission_cache
-- Purpose: Returns all users who have a specific custom role assigned
--          Used by frontend to invalidate React Query cache after role
--          permission edits
-- ============================================================================

CREATE OR REPLACE FUNCTION invalidate_role_permission_cache(
  p_role_id uuid
)
RETURNS TABLE(affected_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Return all users who have this role assigned through either:
  -- 1. user_custom_role_assignments (dealer-specific role assignments)
  -- 2. dealer_memberships (system role assignments via custom_role_id)

  RETURN QUERY
  SELECT DISTINCT user_id
  FROM (
    -- From user_custom_role_assignments (primary source for custom roles)
    SELECT user_id
    FROM user_custom_role_assignments
    WHERE custom_role_id = p_role_id
      AND is_active = true

    UNION

    -- From dealer_memberships (backward compatibility with system roles)
    SELECT user_id
    FROM dealer_memberships
    WHERE custom_role_id = p_role_id
      AND is_active = true
  ) AS users;
END;
$$;

-- Grant execute permission to authenticated users (admins who can edit roles)
GRANT EXECUTE ON FUNCTION invalidate_role_permission_cache(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION invalidate_role_permission_cache(uuid) IS
  'Returns all user IDs who have the specified custom role assigned. '
  'Used by frontend to invalidate permission cache when role permissions are edited. '
  'Deduplicates users across user_custom_role_assignments and dealer_memberships tables.';
