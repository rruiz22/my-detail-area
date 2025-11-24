-- Create comprehensive RLS policies for orders table

-- SELECT policy: Admins can see all orders, others see orders from their accessible dealers/groups
CREATE POLICY "Orders view policy" 
ON orders FOR SELECT 
TO authenticated 
USING (
  is_admin() OR 
  user_has_active_dealer_membership(auth.uid(), dealer_id) OR
  id IN (
    SELECT o.id FROM get_user_accessible_orders(auth.uid(), dealer_id) o
  )
);

-- INSERT policy: Admins can create any order, others need proper permissions  
CREATE POLICY "Orders create policy" 
ON orders FOR INSERT 
TO authenticated 
WITH CHECK (
  is_admin() OR 
  user_has_order_permission(auth.uid(), dealer_id, 'orders.create')
);

-- UPDATE policy: Admins can update any order, others need proper permissions
CREATE POLICY "Orders update policy" 
ON orders FOR UPDATE 
TO authenticated 
USING (
  is_admin() OR 
  user_has_order_permission(auth.uid(), dealer_id, 'orders.update') OR
  (
    user_has_order_permission(auth.uid(), dealer_id, 'orders.update_status') AND
    assigned_group_id IN (
      SELECT dmg.group_id 
      FROM dealer_memberships dm
      JOIN dealer_membership_groups dmg ON dmg.membership_id = dm.id
      WHERE dm.user_id = auth.uid() AND dm.dealer_id = orders.dealer_id AND dm.is_active = true
    )
  )
)
WITH CHECK (
  is_admin() OR 
  user_has_order_permission(auth.uid(), dealer_id, 'orders.update')
);

-- DELETE policy: Only admins can delete orders (strict policy)
CREATE POLICY "Orders delete policy" 
ON orders FOR DELETE 
TO authenticated 
USING (
  is_admin() OR 
  user_has_order_permission(auth.uid(), dealer_id, 'orders.delete')
);