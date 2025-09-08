-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Orders: Admin full access and user group access" ON orders;
DROP POLICY IF EXISTS "Orders: Admin can create all, users need group permissions" ON orders; 
DROP POLICY IF EXISTS "Orders: Admin can update all, users need group permissions" ON orders;
DROP POLICY IF EXISTS "Orders: Admin can delete all, users need group permissions" ON orders;

-- Create permanent RLS policies for orders table
CREATE POLICY "Orders: Admin full access and user group access" 
ON orders FOR SELECT 
TO authenticated 
USING (
  is_admin() OR 
  user_has_active_dealer_membership(auth.uid(), dealer_id)
);

CREATE POLICY "Orders: Admin can create all, users need group permissions" 
ON orders FOR INSERT 
TO authenticated 
WITH CHECK (
  is_admin() OR 
  (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND
    user_has_order_permission(auth.uid(), dealer_id, 'orders.create')
  )
);

CREATE POLICY "Orders: Admin can update all, users need group permissions" 
ON orders FOR UPDATE 
TO authenticated 
USING (
  is_admin() OR 
  (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND
    user_has_order_permission(auth.uid(), dealer_id, 'orders.update')
  )
)
WITH CHECK (
  is_admin() OR 
  (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND
    user_has_order_permission(auth.uid(), dealer_id, 'orders.update')
  )
);

CREATE POLICY "Orders: Admin can delete all, users need group permissions" 
ON orders FOR DELETE 
TO authenticated 
USING (
  is_admin() OR 
  (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND
    user_has_order_permission(auth.uid(), dealer_id, 'orders.delete')
  )
);