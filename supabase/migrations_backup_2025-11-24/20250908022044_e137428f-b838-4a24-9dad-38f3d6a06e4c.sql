-- Fix security issue: Replace temporary RLS policies for dealer_services with proper access controls

-- Drop all temporary policies for dealer_services
DROP POLICY IF EXISTS "dealer_services_delete_temp" ON dealer_services;
DROP POLICY IF EXISTS "dealer_services_insert_temp" ON dealer_services;  
DROP POLICY IF EXISTS "dealer_services_select_temp" ON dealer_services;
DROP POLICY IF EXISTS "dealer_services_update_temp" ON dealer_services;
DROP POLICY IF EXISTS "services_full_access_delete" ON dealer_services;
DROP POLICY IF EXISTS "services_full_access_insert" ON dealer_services;
DROP POLICY IF EXISTS "services_full_access_select" ON dealer_services;
DROP POLICY IF EXISTS "services_full_access_update" ON dealer_services;

-- Drop all temporary policies for dealer_service_groups  
DROP POLICY IF EXISTS "dealer_service_groups_delete_temp" ON dealer_service_groups;
DROP POLICY IF EXISTS "dealer_service_groups_insert_temp" ON dealer_service_groups;
DROP POLICY IF EXISTS "dealer_service_groups_select_temp" ON dealer_service_groups;
DROP POLICY IF EXISTS "dealer_service_groups_update_temp" ON dealer_service_groups;
DROP POLICY IF EXISTS "service_groups_full_access_delete" ON dealer_service_groups;
DROP POLICY IF EXISTS "service_groups_full_access_insert" ON dealer_service_groups;
DROP POLICY IF EXISTS "service_groups_full_access_select" ON dealer_service_groups;
DROP POLICY IF EXISTS "service_groups_full_access_update" ON dealer_service_groups;

-- Create secure RLS policies for dealer_services
CREATE POLICY "Secure view dealer services" 
ON dealer_services FOR SELECT 
TO authenticated 
USING (
  is_admin() OR 
  user_has_dealer_membership(auth.uid(), dealer_id)
);

CREATE POLICY "Secure create dealer services" 
ON dealer_services FOR INSERT 
TO authenticated 
WITH CHECK (
  is_admin() OR 
  (
    user_has_dealer_membership(auth.uid(), dealer_id) AND
    user_has_group_permission(auth.uid(), dealer_id, 'services.create')
  )
);

CREATE POLICY "Secure update dealer services" 
ON dealer_services FOR UPDATE 
TO authenticated 
USING (
  is_admin() OR 
  (
    user_has_dealer_membership(auth.uid(), dealer_id) AND
    user_has_group_permission(auth.uid(), dealer_id, 'services.update')
  )
)
WITH CHECK (
  is_admin() OR 
  (
    user_has_dealer_membership(auth.uid(), dealer_id) AND
    user_has_group_permission(auth.uid(), dealer_id, 'services.update')
  )
);

CREATE POLICY "Secure delete dealer services" 
ON dealer_services FOR DELETE 
TO authenticated 
USING (
  is_admin() OR 
  (
    user_has_dealer_membership(auth.uid(), dealer_id) AND
    user_has_group_permission(auth.uid(), dealer_id, 'services.delete')
  )
);

-- Create secure RLS policies for dealer_service_groups
CREATE POLICY "Secure view service groups" 
ON dealer_service_groups FOR SELECT 
TO authenticated 
USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM dealer_services ds 
    WHERE ds.id = service_id 
    AND user_has_dealer_membership(auth.uid(), ds.dealer_id)
  )
);

CREATE POLICY "Secure manage service groups" 
ON dealer_service_groups FOR ALL 
TO authenticated 
USING (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM dealer_services ds 
    WHERE ds.id = service_id 
    AND user_has_dealer_membership(auth.uid(), ds.dealer_id)
    AND user_has_group_permission(auth.uid(), ds.dealer_id, 'services.update')
  )
)
WITH CHECK (
  is_admin() OR 
  EXISTS (
    SELECT 1 FROM dealer_services ds 
    WHERE ds.id = service_id 
    AND user_has_dealer_membership(auth.uid(), ds.dealer_id)
    AND user_has_group_permission(auth.uid(), ds.dealer_id, 'services.update')
  )
);