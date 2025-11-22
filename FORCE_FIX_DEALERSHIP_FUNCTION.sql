-- ============================================================================
-- FORCE FIX: Drop all versions and recreate clean
-- ============================================================================
-- Execute this in Supabase SQL Editor if migration didn't work
-- ============================================================================

-- Drop ALL versions of the function (including overloads)
DROP FUNCTION IF EXISTS get_user_accessible_dealers(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_dealers CASCADE;

-- Recreate with correct implementation
CREATE OR REPLACE FUNCTION get_user_accessible_dealers(user_uuid uuid)
RETURNS TABLE(
  id bigint,
  name text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  country text,
  website text,
  status text,
  subscription_plan text,
  logo_url text,
  thumbnail_logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_is_system_admin boolean;
BEGIN
  -- Check if user is system_admin
  SELECT (p.user_type = 'system_admin')
  INTO v_is_system_admin
  FROM profiles p
  WHERE p.id = user_uuid
  LIMIT 1;

  -- System admins see ALL dealerships
  IF v_is_system_admin THEN
    RETURN QUERY
    SELECT
      d.id::bigint,
      d.name::text,
      d.email::text,
      d.phone::text,
      d.address::text,
      d.city::text,
      d.state::text,
      d.zip_code::text,
      d.country::text,
      d.website::text,
      d.status::text,
      d.subscription_plan::text,
      d.logo_url::text,
      d.thumbnail_logo_url::text
    FROM dealerships d
    WHERE d.status = 'active'
      AND d.deleted_at IS NULL
    ORDER BY d.name;
  ELSE
    -- Regular users see only dealerships they have active membership in
    RETURN QUERY
    SELECT DISTINCT
      d.id::bigint,
      d.name::text,
      d.email::text,
      d.phone::text,
      d.address::text,
      d.city::text,
      d.state::text,
      d.zip_code::text,
      d.country::text,
      d.website::text,
      d.status::text,
      d.subscription_plan::text,
      d.logo_url::text,
      d.thumbnail_logo_url::text
    FROM dealerships d
    INNER JOIN dealer_memberships dm
      ON dm.dealer_id = d.id
    WHERE dm.user_id = user_uuid
      AND dm.is_active = true
      AND d.status = 'active'
      AND d.deleted_at IS NULL
    ORDER BY d.name;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_accessible_dealers(uuid) TO authenticated;

COMMENT ON FUNCTION get_user_accessible_dealers(uuid) IS
'Fetches dealerships accessible by a user. System admins see ALL active dealerships. Regular users see only dealerships with active membership.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify it works:
-- SELECT * FROM get_user_accessible_dealers('122c8d5b-e5f5-4782-a179-544acbaaceb9'::uuid);
-- Should return ALL dealerships for system_admin
-- ============================================================================
