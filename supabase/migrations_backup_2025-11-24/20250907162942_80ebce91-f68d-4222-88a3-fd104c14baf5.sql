-- Drop all existing policies on dealer_services table
DROP POLICY IF EXISTS "Users can view dealer services" ON public.dealer_services;
DROP POLICY IF EXISTS "Users can manage dealer services with permission" ON public.dealer_services;
DROP POLICY IF EXISTS "Users can insert dealer services with permission" ON public.dealer_services;
DROP POLICY IF EXISTS "Users can update dealer services with permission" ON public.dealer_services;
DROP POLICY IF EXISTS "Users can delete dealer services with permission" ON public.dealer_services;

-- Drop all existing policies on dealer_service_groups table  
DROP POLICY IF EXISTS "Users can view service groups" ON public.dealer_service_groups;
DROP POLICY IF EXISTS "Users can manage service groups with permission" ON public.dealer_service_groups;
DROP POLICY IF EXISTS "Users can insert service groups with permission" ON public.dealer_service_groups;
DROP POLICY IF EXISTS "Users can update service groups with permission" ON public.dealer_service_groups;
DROP POLICY IF EXISTS "Users can delete service groups with permission" ON public.dealer_service_groups;

-- Create proper policies for dealer_services table
CREATE POLICY "dealer_services_select_policy" 
ON public.dealer_services 
FOR SELECT 
USING (user_has_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "dealer_services_insert_policy" 
ON public.dealer_services 
FOR INSERT 
WITH CHECK (user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text));

CREATE POLICY "dealer_services_update_policy" 
ON public.dealer_services 
FOR UPDATE 
USING (user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text))
WITH CHECK (user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text));

CREATE POLICY "dealer_services_delete_policy" 
ON public.dealer_services 
FOR DELETE 
USING (user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'::text));

-- Create policies for dealer_service_groups table
CREATE POLICY "dealer_service_groups_select_policy" 
ON public.dealer_service_groups 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_dealer_membership(auth.uid(), ds.dealer_id)
));

CREATE POLICY "dealer_service_groups_insert_policy" 
ON public.dealer_service_groups 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_group_permission(auth.uid(), ds.dealer_id, 'groups.manage'::text)
));

CREATE POLICY "dealer_service_groups_update_policy" 
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

CREATE POLICY "dealer_service_groups_delete_policy" 
ON public.dealer_service_groups 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_group_permission(auth.uid(), ds.dealer_id, 'groups.manage'::text)
));