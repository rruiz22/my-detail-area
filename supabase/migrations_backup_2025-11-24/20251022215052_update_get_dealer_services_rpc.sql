-- Update get_dealer_services_for_user RPC to include category_id
-- This fixes the issue where category_id was not being returned,
-- causing the department field to not auto-populate when editing services

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS get_dealer_services_for_user(p_dealer_id INTEGER);
DROP FUNCTION IF EXISTS get_dealer_services_for_user(INTEGER);

CREATE OR REPLACE FUNCTION get_dealer_services_for_user(p_dealer_id INTEGER)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_dealer_services_for_user(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dealer_services_for_user(INTEGER) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION get_dealer_services_for_user IS
'Returns all services for a dealer with category information and group assignments.
Now includes category_id field to fix auto-population issue when editing services.';
