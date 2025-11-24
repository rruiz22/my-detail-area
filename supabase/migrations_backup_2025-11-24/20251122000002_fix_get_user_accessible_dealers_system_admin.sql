-- ============================================================================
-- Fix get_user_accessible_dealers for system_admin users
-- ============================================================================
-- Date: 2025-11-22
-- Issue: System admins don't see all dealerships in global filter
-- Root cause: Function only returns dealerships where user has explicit membership
-- Fix: Check if user is system_admin and return ALL dealerships in that case
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_accessible_dealers(uuid);

CREATE FUNCTION get_user_accessible_dealers(user_uuid uuid)
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
STABLE -- Marks function as STABLE for query caching
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
'Optimized function to fetch dealerships accessible by a user. System admins (user_type = system_admin) see ALL active dealerships. Regular users see only dealerships where they have active membership. Uses INNER JOIN for performance and marked as STABLE for query caching.';

-- ============================================================================
-- Verification Query
-- ============================================================================
-- Test as system_admin:
-- SELECT * FROM get_user_accessible_dealers('c01ba9e6-f638-4f02-a7fb-e5e7b95cf1c2'::uuid);
-- Should return ALL active dealerships including "Audi Natick"
-- ============================================================================
