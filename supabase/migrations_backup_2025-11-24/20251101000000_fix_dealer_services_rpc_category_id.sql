-- Migration: Fix get_dealer_services_for_user RPC to include category_id
-- Date: 2025-11-01
-- Issue: category_id was undefined when editing services, causing department to always reset to CarWash
-- Solution: Recreate function with BIGINT parameter type and include category_id in return

-- Drop all existing versions (handles function overloading issue)
DROP FUNCTION IF EXISTS get_dealer_services_for_user(p_dealer_id INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_dealer_services_for_user(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_dealer_services_for_user(p_dealer_id BIGINT) CASCADE;
DROP FUNCTION IF EXISTS get_dealer_services_for_user(BIGINT) CASCADE;

-- Recreate function with correct signature
CREATE OR REPLACE FUNCTION get_dealer_services_for_user(p_dealer_id BIGINT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  price DECIMAL,
  category_id TEXT,
  category_name TEXT,
  category_color TEXT,
  color TEXT,
  duration INTEGER,
  is_active BOOLEAN,
  assigned_groups TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id::TEXT,
    ds.name::TEXT,
    ds.description::TEXT,
    ds.price::DECIMAL,
    ds.category_id::TEXT,
    COALESCE(sc.name, 'General')::TEXT as category_name,
    COALESCE(sc.color, '#6B7280')::TEXT as category_color,
    ds.color::TEXT,
    ds.duration::INTEGER,
    COALESCE(ds.is_active, true)::BOOLEAN as is_active,
    COALESCE(
      ARRAY_AGG(dsg.group_id::TEXT) FILTER (WHERE dsg.group_id IS NOT NULL),
      ARRAY[]::TEXT[]
    ) as assigned_groups
  FROM dealer_services ds
  LEFT JOIN service_categories sc ON ds.category_id = sc.id
  LEFT JOIN dealer_service_groups dsg ON ds.id = dsg.service_id
  WHERE ds.dealer_id = p_dealer_id
  GROUP BY ds.id, ds.name, ds.description, ds.price, ds.category_id,
           sc.name, sc.color, ds.color, ds.duration, ds.is_active
  ORDER BY ds.name;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_dealer_services_for_user(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dealer_services_for_user(BIGINT) TO service_role;

-- Add comment
COMMENT ON FUNCTION get_dealer_services_for_user(BIGINT) IS
'Returns all services for a dealer with category information. Includes category_id field to support proper department persistence when editing services.';
