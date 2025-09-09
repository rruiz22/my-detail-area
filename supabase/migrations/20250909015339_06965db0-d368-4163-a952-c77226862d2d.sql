-- Fix security issue: Restrict public access to service categories and category mappings
-- Drop existing public policies and create authenticated-only policies

-- Drop existing policies for service_categories
DROP POLICY IF EXISTS "Users can create custom categories for their dealership" ON public.service_categories;
DROP POLICY IF EXISTS "Users can update their dealer categories" ON public.service_categories;
DROP POLICY IF EXISTS "Users can delete their dealer categories" ON public.service_categories;
DROP POLICY IF EXISTS "Users can view system categories and their dealer categories" ON public.service_categories;

-- Drop existing policies for category_module_mappings  
DROP POLICY IF EXISTS "Users can manage mappings for their categories" ON public.category_module_mappings;
DROP POLICY IF EXISTS "Users can view mappings for accessible categories" ON public.category_module_mappings;

-- Create secure policies for service_categories (authenticated users only)
CREATE POLICY "Authenticated users can create custom categories for their dealership" 
ON public.service_categories
FOR INSERT 
TO authenticated
WITH CHECK (
  is_admin() OR 
  (dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), dealer_id))
);

CREATE POLICY "Authenticated users can update their dealer categories" 
ON public.service_categories
FOR UPDATE 
TO authenticated
USING (
  is_admin() OR 
  ((dealer_id IS NOT NULL) AND user_has_dealer_membership(auth.uid(), dealer_id))
)
WITH CHECK (
  is_admin() OR 
  ((dealer_id IS NOT NULL) AND user_has_dealer_membership(auth.uid(), dealer_id))
);

CREATE POLICY "Authenticated users can delete their dealer categories" 
ON public.service_categories
FOR DELETE 
TO authenticated
USING (
  is_admin() OR 
  ((dealer_id IS NOT NULL) AND user_has_dealer_membership(auth.uid(), dealer_id))
);

CREATE POLICY "Authenticated users can view system categories and their dealer categories" 
ON public.service_categories
FOR SELECT 
TO authenticated
USING (
  is_system_category = true OR 
  ((dealer_id IS NOT NULL) AND user_has_dealer_membership(auth.uid(), dealer_id)) OR 
  is_admin()
);

-- Create secure policies for category_module_mappings (authenticated users only)
CREATE POLICY "Authenticated users can manage mappings for their categories" 
ON public.category_module_mappings
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM service_categories sc
    WHERE sc.id = category_module_mappings.category_id 
    AND (
      (sc.dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), sc.dealer_id)) OR 
      is_admin()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM service_categories sc
    WHERE sc.id = category_module_mappings.category_id 
    AND (
      (sc.dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), sc.dealer_id)) OR 
      is_admin()
    )
  )
);

CREATE POLICY "Authenticated users can view mappings for accessible categories" 
ON public.category_module_mappings
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM service_categories sc
    WHERE sc.id = category_module_mappings.category_id 
    AND (
      sc.is_system_category = true OR 
      ((sc.dealer_id IS NOT NULL) AND user_has_dealer_membership(auth.uid(), sc.dealer_id))
    )
  ) OR is_admin()
);