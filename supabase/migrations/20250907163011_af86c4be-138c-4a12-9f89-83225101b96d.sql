-- Update the service policies to also allow dealership managers
-- This provides a fallback for users who may not have specific group permissions set up yet

DROP POLICY "dealer_services_insert_policy" ON public.dealer_services;
DROP POLICY "dealer_services_update_policy" ON public.dealer_services;  
DROP POLICY "dealer_services_delete_policy" ON public.dealer_services;

CREATE POLICY "dealer_services_insert_policy" 
ON public.dealer_services 
FOR INSERT 
WITH CHECK (
  user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text) OR
  user_has_dealer_membership(auth.uid(), dealer_id)
);

CREATE POLICY "dealer_services_update_policy" 
ON public.dealer_services 
FOR UPDATE 
USING (
  user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text) OR
  user_has_dealer_membership(auth.uid(), dealer_id)
)
WITH CHECK (
  user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text) OR
  user_has_dealer_membership(auth.uid(), dealer_id)
);

CREATE POLICY "dealer_services_delete_policy" 
ON public.dealer_services 
FOR DELETE 
USING (
  user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text) OR
  user_has_dealer_membership(auth.uid(), dealer_id)
);