-- Create permanent RLS policies for orders table

-- Policy for SELECT: Admins see all, users see orders they have access to
CREATE POLICY "Orders: Admin full access and user group access" 
ON orders FOR SELECT 
TO authenticated 
USING (
  is_admin() OR 
  user_has_active_dealer_membership(auth.uid(), dealer_id)
);

-- Policy for INSERT: Admins can create any order, users need group permissions
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

-- Policy for UPDATE: Admins can update any order, users need group permissions
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

-- Policy for DELETE: Admins can delete any order, users need group permissions  
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