-- Create permissive policies with new names to avoid conflicts
-- These will allow authenticated users to manage dealer services

CREATE POLICY "services_full_access_select" 
ON public.dealer_services 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "services_full_access_insert" 
ON public.dealer_services 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "services_full_access_update" 
ON public.dealer_services 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "services_full_access_delete" 
ON public.dealer_services 
FOR DELETE 
TO authenticated
USING (true);

-- Also create policies for service groups
CREATE POLICY "service_groups_full_access_select" 
ON public.dealer_service_groups 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "service_groups_full_access_insert" 
ON public.dealer_service_groups 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "service_groups_full_access_update" 
ON public.dealer_service_groups 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "service_groups_full_access_delete" 
ON public.dealer_service_groups 
FOR DELETE 
TO authenticated
USING (true);