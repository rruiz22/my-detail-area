-- Remove temporary policies
DROP POLICY IF EXISTS "Temporary: Allow authenticated users to create orders" ON orders;
DROP POLICY IF EXISTS "Temporary: Allow authenticated users to view orders" ON orders;
DROP POLICY IF EXISTS "Temporary: Allow authenticated users to update orders" ON orders;

-- Create security definer function to check admin status (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Create security definer function to check if user has dealer membership
CREATE OR REPLACE FUNCTION public.user_has_active_dealer_membership(user_id UUID DEFAULT auth.uid(), target_dealer_id BIGINT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM dealer_memberships dm
    WHERE dm.user_id = user_has_active_dealer_membership.user_id
    AND dm.is_active = true
    AND (target_dealer_id IS NULL OR dm.dealer_id = target_dealer_id)
  );
$$;

-- Create security definer function to check group permissions
CREATE OR REPLACE FUNCTION public.user_has_order_permission(user_id UUID DEFAULT auth.uid(), target_dealer_id BIGINT DEFAULT NULL, permission_name TEXT DEFAULT 'orders.create')
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM dealer_memberships dm
    JOIN dealer_membership_groups dmg ON dmg.membership_id = dm.id
    JOIN dealer_groups dg ON dg.id = dmg.group_id
    WHERE dm.user_id = user_has_order_permission.user_id
    AND dm.is_active = true
    AND dg.is_active = true
    AND (target_dealer_id IS NULL OR dm.dealer_id = target_dealer_id)
    AND (
      dg.permissions ? permission_name OR 
      dg.permissions ? 'module.sales_orders' OR
      dg.permissions ? 'orders.*'
    )
  );
$$;