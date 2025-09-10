-- Create function to get users with specific module access for a dealership
-- This function returns users who have access to a specific module at a given dealership

CREATE OR REPLACE FUNCTION get_users_with_module_access(
  target_dealer_id bigint,
  module_name text
)
RETURNS TABLE(
  id text,
  name text,
  email text,
  first_name text,
  last_name text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id::text,
    COALESCE(
      NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
      p.email
    ) as name,
    p.email,
    p.first_name,
    p.last_name,
    p.phone
  FROM profiles p
  INNER JOIN dealer_memberships dm ON dm.user_id = p.id::uuid
  INNER JOIN dealer_membership_groups dmg ON dmg.membership_id = dm.id
  INNER JOIN dealer_groups dg ON dg.id = dmg.group_id
  WHERE dm.dealer_id = target_dealer_id
    AND dm.is_active = true
    AND dg.is_active = true
    AND (
      -- Check for specific module access
      dg.permissions ? ('module.' || module_name) OR
      -- Check for sales_orders specific permissions  
      (module_name = 'sales_orders' AND (
        dg.permissions ? 'orders.create' OR
        dg.permissions ? 'orders.update' OR
        dg.permissions ? 'orders.manage'
      ))
    )
  GROUP BY p.id, p.first_name, p.last_name, p.email, p.phone
  ORDER BY 
    COALESCE(
      NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
      p.email
    );
END;
$$;

-- Test the function
SELECT 'Testing get_users_with_module_access function:' as info;

-- Test with sales_orders module (this should return users with sales access)
SELECT 
  name,
  email,
  'sales_orders access' as module_tested
FROM get_users_with_module_access(1, 'sales_orders')
LIMIT 5;