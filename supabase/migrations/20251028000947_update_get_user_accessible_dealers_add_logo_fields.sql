-- =====================================================
-- Update get_user_accessible_dealers RPC to include logo fields
-- =====================================================
-- This migration adds logo_url and thumbnail_logo_url to the
-- get_user_accessible_dealers RPC function so that dealership
-- logos can be displayed in the sidebar and other UI components.
--
-- Created: 2025-10-28
-- Author: Claude Code
-- =====================================================

-- Drop existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_user_accessible_dealers(uuid);

-- Recreate function with logo fields
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.email,
    d.phone,
    d.address,
    d.city,
    d.state,
    d.zip_code,
    d.country,
    d.website,
    d.status::text,
    d.subscription_plan::text,
    d.logo_url,
    d.thumbnail_logo_url
  FROM dealerships d
  WHERE EXISTS (
    SELECT 1 FROM dealer_memberships dm
    WHERE dm.user_id = user_uuid
    AND dm.dealer_id = d.id
    AND dm.is_active = true
  )
  AND d.status = 'active'
  AND d.deleted_at IS NULL
  ORDER BY d.name;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_accessible_dealers(uuid) IS
  'Returns all active dealerships that the given user has access to via dealer_memberships, including logo URLs for UI display';
