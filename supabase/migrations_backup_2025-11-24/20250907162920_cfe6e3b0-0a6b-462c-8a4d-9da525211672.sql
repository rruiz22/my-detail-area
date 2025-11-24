-- Fix RLS policies for dealer_services table
-- Drop the existing policy and recreate with proper INSERT support
DROP POLICY "Users can manage dealer services with permission" ON public.dealer_services;

-- Create separate policies for different operations
CREATE POLICY "Users can view dealer services" 
ON public.dealer_services 
FOR SELECT 
USING (user_has_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can insert dealer services with permission" 
ON public.dealer_services 
FOR INSERT 
WITH CHECK (user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text));

CREATE POLICY "Users can update dealer services with permission" 
ON public.dealer_services 
FOR UPDATE 
USING (user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text))
WITH CHECK (user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text));

CREATE POLICY "Users can delete dealer services with permission" 
ON public.dealer_services 
FOR DELETE 
USING (user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text));

-- Also fix the dealer_service_groups policies
DROP POLICY "Users can manage service groups with permission" ON public.dealer_service_groups;

CREATE POLICY "Users can insert service groups with permission" 
ON public.dealer_service_groups 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_group_permission(auth.uid(), ds.dealer_id, 'groups.manage'::text)
));

CREATE POLICY "Users can update service groups with permission" 
ON public.dealer_service_groups 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_group_permission(auth.uid(), ds.dealer_id, 'groups.manage'::text)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_group_permission(auth.uid(), ds.dealer_id, 'groups.manage'::text)
));

CREATE POLICY "Users can delete service groups with permission" 
ON public.dealer_service_groups 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_group_permission(auth.uid(), ds.dealer_id, 'groups.manage'::text)
));