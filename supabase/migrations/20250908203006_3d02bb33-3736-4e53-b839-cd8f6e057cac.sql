-- Create service categories table for system and custom categories
CREATE TABLE public.service_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_system_category BOOLEAN NOT NULL DEFAULT false,
  dealer_id BIGINT NULL, -- NULL for system categories, dealer_id for custom categories
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Ensure unique names per dealer (system categories have dealer_id = NULL)
  UNIQUE(name, dealer_id)
);

-- Create category to module mappings table
CREATE TABLE public.category_module_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  dealer_id BIGINT NULL, -- NULL for system mappings, dealer_id for custom mappings
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique mapping per category/module/dealer
  UNIQUE(category_id, module, dealer_id)
);

-- Enable RLS on both tables
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_module_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_categories
CREATE POLICY "Users can view system categories and their dealer categories"
ON public.service_categories
FOR SELECT
USING (
  is_system_category = true OR 
  (dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), dealer_id)) OR
  is_admin()
);

CREATE POLICY "Users can create custom categories for their dealership"
ON public.service_categories
FOR INSERT
WITH CHECK (
  (dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), dealer_id)) OR
  is_admin()
);

CREATE POLICY "Users can update their dealer categories"
ON public.service_categories
FOR UPDATE
USING (
  (dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), dealer_id)) OR
  is_admin()
)
WITH CHECK (
  (dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), dealer_id)) OR
  is_admin()
);

CREATE POLICY "Users can delete their dealer categories"
ON public.service_categories
FOR DELETE
USING (
  (dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), dealer_id)) OR
  is_admin()
);

-- RLS policies for category_module_mappings
CREATE POLICY "Users can view mappings for accessible categories"
ON public.category_module_mappings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_categories sc 
    WHERE sc.id = category_id 
    AND (
      sc.is_system_category = true OR 
      (sc.dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), sc.dealer_id))
    )
  ) OR is_admin()
);

CREATE POLICY "Users can manage mappings for their categories"
ON public.category_module_mappings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.service_categories sc 
    WHERE sc.id = category_id 
    AND (
      (sc.dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), sc.dealer_id)) OR
      is_admin()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_categories sc 
    WHERE sc.id = category_id 
    AND (
      (sc.dealer_id IS NOT NULL AND user_has_dealer_membership(auth.uid(), sc.dealer_id)) OR
      is_admin()
    )
  )
);

-- Insert default system categories
INSERT INTO public.service_categories (name, description, is_system_category, color, icon) VALUES
('Wash', 'Basic car wash services', true, '#3B82F6', 'droplets'),
('Detail', 'Professional detailing services', true, '#10B981', 'sparkles'),
('Protection', 'Paint and interior protection services', true, '#F59E0B', 'shield'),
('Repair', 'Minor repair and touch-up services', true, '#EF4444', 'wrench'),
('General', 'General automotive services', true, '#6B7280', 'car');

-- Get category IDs for mapping
DO $$
DECLARE
  wash_id UUID;
  detail_id UUID;
  protection_id UUID;
  repair_id UUID;
  general_id UUID;
BEGIN
  SELECT id INTO wash_id FROM public.service_categories WHERE name = 'Wash' AND is_system_category = true;
  SELECT id INTO detail_id FROM public.service_categories WHERE name = 'Detail' AND is_system_category = true;
  SELECT id INTO protection_id FROM public.service_categories WHERE name = 'Protection' AND is_system_category = true;
  SELECT id INTO repair_id FROM public.service_categories WHERE name = 'Repair' AND is_system_category = true;
  SELECT id INTO general_id FROM public.service_categories WHERE name = 'General' AND is_system_category = true;
  
  -- Create default system mappings
  INSERT INTO public.category_module_mappings (category_id, module) VALUES
  -- Car Wash module
  (wash_id, 'car_wash'),
  (general_id, 'car_wash'),
  
  -- Service Orders module
  (detail_id, 'service_orders'),
  (protection_id, 'service_orders'),
  (repair_id, 'service_orders'),
  (general_id, 'service_orders'),
  
  -- Recon Orders module
  (detail_id, 'recon_orders'),
  (protection_id, 'recon_orders'),
  (repair_id, 'recon_orders'),
  (wash_id, 'recon_orders'),
  (general_id, 'recon_orders'),
  
  -- Sales Orders module
  (detail_id, 'sales_orders'),
  (wash_id, 'sales_orders'),
  (general_id, 'sales_orders');
END $$;

-- Add triggers for updated_at
CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_category_module_mappings_updated_at
  BEFORE UPDATE ON public.category_module_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update dealer_services table to use category_id instead of category text
-- First, add the new column
ALTER TABLE public.dealer_services ADD COLUMN category_id UUID REFERENCES public.service_categories(id);

-- Migrate existing data
UPDATE public.dealer_services SET category_id = (
  SELECT id FROM public.service_categories 
  WHERE LOWER(name) = LOWER(dealer_services.category) 
  AND is_system_category = true
  LIMIT 1
);

-- Set default category for any unmapped services
UPDATE public.dealer_services SET category_id = (
  SELECT id FROM public.service_categories 
  WHERE name = 'General' AND is_system_category = true
) WHERE category_id IS NULL;

-- Make category_id required and remove old category column
ALTER TABLE public.dealer_services ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE public.dealer_services DROP COLUMN category;

-- Create function to get categories for a dealer and module
CREATE OR REPLACE FUNCTION public.get_dealer_categories_for_module(p_dealer_id BIGINT, p_module app_module)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  is_system_category BOOLEAN,
  color TEXT,
  icon TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.name,
    sc.description,
    sc.is_system_category,
    sc.color,
    sc.icon
  FROM public.service_categories sc
  WHERE sc.is_active = true
  AND (
    sc.is_system_category = true OR 
    sc.dealer_id = p_dealer_id
  )
  AND EXISTS (
    SELECT 1 FROM public.category_module_mappings cmm
    WHERE cmm.category_id = sc.id
    AND cmm.module = p_module
    AND cmm.is_active = true
    AND (cmm.dealer_id IS NULL OR cmm.dealer_id = p_dealer_id)
  )
  ORDER BY sc.is_system_category DESC, sc.name;
END;
$$;

-- Drop and recreate the get_dealer_services_for_user function with new return type
DROP FUNCTION IF EXISTS public.get_dealer_services_for_user(bigint);

CREATE OR REPLACE FUNCTION public.get_dealer_services_for_user(p_dealer_id bigint)
RETURNS TABLE(
  id uuid, 
  dealer_id bigint, 
  name text, 
  description text, 
  price numeric, 
  category_name text, 
  category_color text, 
  duration integer, 
  is_active boolean, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  assigned_groups uuid[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.dealer_id,
    ds.name,
    ds.description,
    ds.price,
    sc.name as category_name,
    sc.color as category_color,
    ds.duration,
    ds.is_active,
    ds.created_at,
    ds.updated_at,
    COALESCE(
      ARRAY_AGG(dsg.group_id) FILTER (WHERE dsg.group_id IS NOT NULL),
      ARRAY[]::UUID[]
    ) as assigned_groups
  FROM dealer_services ds
  JOIN service_categories sc ON sc.id = ds.category_id
  LEFT JOIN dealer_service_groups dsg ON dsg.service_id = ds.id
  WHERE ds.dealer_id = p_dealer_id
  AND user_has_dealer_membership(auth.uid(), ds.dealer_id)
  AND ds.is_active = true
  AND sc.is_active = true
  GROUP BY ds.id, ds.dealer_id, ds.name, ds.description, ds.price, sc.name, sc.color, ds.duration, ds.is_active, ds.created_at, ds.updated_at
  ORDER BY sc.name, ds.name;
END;
$$;