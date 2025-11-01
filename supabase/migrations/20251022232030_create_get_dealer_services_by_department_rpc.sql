-- Create RPC function to get dealer services filtered by department
-- This function is used by all order modals (Sales, Service, Recon, CarWash)
-- to load only relevant services for each department/order type

CREATE OR REPLACE FUNCTION get_dealer_services_by_department(
  p_dealer_id INTEGER,
  p_department_name TEXT
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  price DECIMAL,
  duration INTEGER,
  category_id TEXT,
  category_name TEXT,
  category_color TEXT,
  color TEXT
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
    ds.duration::INTEGER,
    ds.category_id::TEXT,
    sc.name::TEXT as category_name,
    COALESCE(sc.color, '#6B7280')::TEXT as category_color,
    ds.color::TEXT
  FROM dealer_services ds
  INNER JOIN service_categories sc ON ds.category_id = sc.id
  WHERE ds.dealer_id = p_dealer_id
    AND ds.is_active = true
    AND sc.name = p_department_name
    AND sc.is_active = true
  ORDER BY ds.name;
END;
$$;

-- Grant execute permissions to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_dealer_services_by_department(INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dealer_services_by_department(INTEGER, TEXT) TO service_role;

-- Add helpful comment for documentation
COMMENT ON FUNCTION get_dealer_services_by_department IS
'Filters dealer services by department name (e.g., Sales Dept, Service Dept, Recon Dept, CarWash Dept).
Used by order creation modals to show only relevant services for each order type.

Parameters:
- p_dealer_id: The dealer ID to filter services
- p_department_name: The exact name of the service category/department (e.g., "Sales Dept")

Returns: Services with full details including individual colors and category colors.

Example usage:
SELECT * FROM get_dealer_services_by_department(1, ''Sales Dept'');
';

-- Create index to optimize the query performance
CREATE INDEX IF NOT EXISTS idx_dealer_services_dealer_category
ON dealer_services(dealer_id, category_id)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_service_categories_name
ON service_categories(name)
WHERE is_active = true;
