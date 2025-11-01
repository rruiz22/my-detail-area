-- Fix Critical RLS Policies for Missing Tables
-- This migration adds comprehensive RLS policies for profiles, orders, and dealer_services tables
-- using the established security pattern with user_has_dealer_membership and user_has_group_permission functions

-- ============================================================================
-- PROFILES TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their dealership" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Managers can manage profiles in their dealership" ON profiles;

-- 1. Users can always view their own profile
CREATE POLICY "secure_view_own_profile"
ON profiles
FOR SELECT
USING (id = auth.uid());

-- 2. Users can view profiles of other users in their dealership
CREATE POLICY "secure_view_dealership_profiles"
ON profiles
FOR SELECT
USING (
  id != auth.uid()
  AND dealership_id IS NOT NULL
  AND user_has_dealer_membership(auth.uid(), dealership_id)
);

-- 3. Users can update their own profile
CREATE POLICY "secure_update_own_profile"
ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 4. Users with user management permissions can insert new profiles
CREATE POLICY "secure_insert_profiles"
ON profiles
FOR INSERT
WITH CHECK (
  dealership_id IS NOT NULL
  AND user_has_group_permission(auth.uid(), dealership_id, 'users.manage')
);

-- 5. Users with user management permissions can update profiles in their dealership
CREATE POLICY "secure_manage_dealership_profiles"
ON profiles
FOR UPDATE
USING (
  id != auth.uid()
  AND dealership_id IS NOT NULL
  AND user_has_group_permission(auth.uid(), dealership_id, 'users.manage')
)
WITH CHECK (
  dealership_id IS NOT NULL
  AND user_has_group_permission(auth.uid(), dealership_id, 'users.manage')
);

-- 6. Users with user management permissions can delete profiles in their dealership
CREATE POLICY "secure_delete_dealership_profiles"
ON profiles
FOR DELETE
USING (
  id != auth.uid()
  AND dealership_id IS NOT NULL
  AND user_has_group_permission(auth.uid(), dealership_id, 'users.manage')
);

-- ============================================================================
-- ORDERS TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view orders in their dealership" ON orders;
DROP POLICY IF EXISTS "Users can manage orders based on permissions" ON orders;
DROP POLICY IF EXISTS "secure_view_orders" ON orders;
DROP POLICY IF EXISTS "secure_insert_orders" ON orders;
DROP POLICY IF EXISTS "secure_update_orders" ON orders;
DROP POLICY IF EXISTS "secure_delete_orders" ON orders;

-- 1. Users can view orders in their dealership
CREATE POLICY "secure_view_orders"
ON orders
FOR SELECT
USING (user_has_dealer_membership(auth.uid(), dealer_id));

-- 2. Users can insert orders in their dealership based on order type permissions
CREATE POLICY "secure_insert_orders"
ON orders
FOR INSERT
WITH CHECK (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    -- Sales orders - need sales_orders.write permission
    (order_type = 'sales' AND user_has_group_permission(auth.uid(), dealer_id, 'sales_orders.write'))
    OR
    -- Service orders - need service_orders.write permission
    (order_type = 'service' AND user_has_group_permission(auth.uid(), dealer_id, 'service_orders.write'))
    OR
    -- Recon orders - need recon_orders.write permission
    (order_type = 'recon' AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write'))
    OR
    -- Car wash orders - need car_wash.write permission
    (order_type = 'carwash' AND user_has_group_permission(auth.uid(), dealer_id, 'car_wash.write'))
    OR
    -- Admins and managers can create any type
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
  )
);

-- 3. Users can update orders based on permissions and order type
CREATE POLICY "secure_update_orders"
ON orders
FOR UPDATE
USING (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    -- Sales orders - need sales_orders.write permission
    (order_type = 'sales' AND user_has_group_permission(auth.uid(), dealer_id, 'sales_orders.write'))
    OR
    -- Service orders - need service_orders.write permission
    (order_type = 'service' AND user_has_group_permission(auth.uid(), dealer_id, 'service_orders.write'))
    OR
    -- Recon orders - need recon_orders.write permission
    (order_type = 'recon' AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write'))
    OR
    -- Car wash orders - need car_wash.write permission
    (order_type = 'carwash' AND user_has_group_permission(auth.uid(), dealer_id, 'car_wash.write'))
    OR
    -- Admins and managers can update any type
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
  )
)
WITH CHECK (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    -- Same permission checks for WITH CHECK
    (order_type = 'sales' AND user_has_group_permission(auth.uid(), dealer_id, 'sales_orders.write'))
    OR
    (order_type = 'service' AND user_has_group_permission(auth.uid(), dealer_id, 'service_orders.write'))
    OR
    (order_type = 'recon' AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write'))
    OR
    (order_type = 'carwash' AND user_has_group_permission(auth.uid(), dealer_id, 'car_wash.write'))
    OR
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
  )
);

-- 4. Users can delete orders based on delete permissions
CREATE POLICY "secure_delete_orders"
ON orders
FOR DELETE
USING (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    -- Sales orders - need sales_orders.delete permission
    (order_type = 'sales' AND user_has_group_permission(auth.uid(), dealer_id, 'sales_orders.delete'))
    OR
    -- Service orders - need service_orders.delete permission
    (order_type = 'service' AND user_has_group_permission(auth.uid(), dealer_id, 'service_orders.delete'))
    OR
    -- Recon orders - need recon_orders.delete permission
    (order_type = 'recon' AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.delete'))
    OR
    -- Car wash orders - need car_wash.delete permission
    (order_type = 'carwash' AND user_has_group_permission(auth.uid(), dealer_id, 'car_wash.delete'))
    OR
    -- Admins can delete any type
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
  )
);

-- ============================================================================
-- DEALER_SERVICES TABLE RLS POLICIES
-- ============================================================================

-- Enable RLS on dealer_services table
ALTER TABLE dealer_services ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view services in their dealership" ON dealer_services;
DROP POLICY IF EXISTS "Users can manage services based on permissions" ON dealer_services;
DROP POLICY IF EXISTS "secure_view_dealer_services" ON dealer_services;
DROP POLICY IF EXISTS "secure_insert_dealer_services" ON dealer_services;
DROP POLICY IF EXISTS "secure_update_dealer_services" ON dealer_services;
DROP POLICY IF EXISTS "secure_delete_dealer_services" ON dealer_services;

-- 1. All authenticated users can view services in their dealership
CREATE POLICY "secure_view_dealer_services"
ON dealer_services
FOR SELECT
USING (user_has_dealer_membership(auth.uid(), dealer_id));

-- 2. Only managers and admins can insert new services
CREATE POLICY "secure_insert_dealer_services"
ON dealer_services
FOR INSERT
WITH CHECK (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
    OR user_has_group_permission(auth.uid(), dealer_id, 'services.manage')
  )
);

-- 3. Only managers and admins can update services
CREATE POLICY "secure_update_dealer_services"
ON dealer_services
FOR UPDATE
USING (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
    OR user_has_group_permission(auth.uid(), dealer_id, 'services.manage')
  )
)
WITH CHECK (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
    OR user_has_group_permission(auth.uid(), dealer_id, 'services.manage')
  )
);

-- 4. Only managers and admins can delete services
CREATE POLICY "secure_delete_dealer_services"
ON dealer_services
FOR DELETE
USING (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
    OR user_has_group_permission(auth.uid(), dealer_id, 'services.manage')
  )
);

-- ============================================================================
-- GRANT PERMISSIONS FOR FUNCTIONS
-- ============================================================================

-- Ensure the helper functions have proper permissions
GRANT EXECUTE ON FUNCTION public.user_has_dealer_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_group_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_dealer_membership TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_group_permission TO service_role;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "secure_view_own_profile" ON profiles IS
'Users can always view their own profile regardless of dealership membership';

COMMENT ON POLICY "secure_view_dealership_profiles" ON profiles IS
'Users can view profiles of other users in their dealership';

COMMENT ON POLICY "secure_view_orders" ON orders IS
'Users can view all orders in dealerships where they have membership';

COMMENT ON POLICY "secure_insert_orders" ON orders IS
'Users can insert orders based on order type permissions (sales_orders.write, service_orders.write, etc.)';

COMMENT ON POLICY "secure_view_dealer_services" ON dealer_services IS
'All authenticated users can view services in their dealership for order creation';

COMMENT ON POLICY "secure_insert_dealer_services" ON dealer_services IS
'Only managers and admins can create new services';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Critical RLS policies implemented successfully';
  RAISE NOTICE 'Tables secured: profiles, orders, dealer_services';
  RAISE NOTICE 'Using established security pattern with user_has_dealer_membership and user_has_group_permission';
  RAISE NOTICE 'Permission-based access control implemented for all operations';
END $$;