-- Create dealership_modules table to manage which modules each dealership can access
CREATE TABLE public.dealership_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_by UUID REFERENCES auth.users(id),
  enabled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  disabled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dealer_id, module)
);

-- Enable RLS
ALTER TABLE public.dealership_modules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for dealership_modules
CREATE POLICY "Admins can manage all dealership modules" 
ON public.dealership_modules 
FOR ALL 
USING (is_admin());

CREATE POLICY "Users can view modules for their dealerships" 
ON public.dealership_modules 
FOR SELECT 
USING (user_has_dealer_membership(auth.uid(), dealer_id));

-- Create function to get dealership enabled modules
CREATE OR REPLACE FUNCTION public.get_dealership_modules(p_dealer_id BIGINT)
RETURNS TABLE(module app_module, is_enabled BOOLEAN, enabled_at TIMESTAMP WITH TIME ZONE, enabled_by UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.module,
    dm.is_enabled,
    dm.enabled_at,
    dm.enabled_by
  FROM dealership_modules dm
  WHERE dm.dealer_id = p_dealer_id
  ORDER BY dm.module::text;
END;
$$;

-- Create function to check if dealership has access to a module
CREATE OR REPLACE FUNCTION public.dealership_has_module_access(p_dealer_id BIGINT, p_module app_module)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM dealership_modules dm 
    WHERE dm.dealer_id = p_dealer_id 
    AND dm.module = p_module 
    AND dm.is_enabled = true
  );
END;
$$;

-- Create function to update dealership module access
CREATE OR REPLACE FUNCTION public.update_dealership_module(
  p_dealer_id BIGINT, 
  p_module app_module, 
  p_is_enabled BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can manage dealership modules';
  END IF;
  
  -- Insert or update the module access
  INSERT INTO dealership_modules (dealer_id, module, is_enabled, enabled_by)
  VALUES (p_dealer_id, p_module, p_is_enabled, auth.uid())
  ON CONFLICT (dealer_id, module)
  DO UPDATE SET 
    is_enabled = p_is_enabled,
    enabled_by = auth.uid(),
    updated_at = now(),
    enabled_at = CASE WHEN p_is_enabled THEN now() ELSE dealership_modules.enabled_at END,
    disabled_at = CASE WHEN NOT p_is_enabled THEN now() ELSE NULL END;
    
  RETURN true;
END;
$$;

-- Create function to initialize default modules for new dealerships
CREATE OR REPLACE FUNCTION public.initialize_dealership_modules(p_dealer_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  default_modules app_module[] := ARRAY['dashboard', 'sales_orders', 'service_orders', 'recon_orders', 'car_wash']::app_module[];
  module_name app_module;
BEGIN
  -- Insert default modules for the dealership
  FOREACH module_name IN ARRAY default_modules
  LOOP
    INSERT INTO dealership_modules (dealer_id, module, is_enabled, enabled_by)
    VALUES (p_dealer_id, module_name, true, auth.uid())
    ON CONFLICT (dealer_id, module) DO NOTHING;
  END LOOP;
  
  RETURN true;
END;
$$;

-- Add trigger to initialize modules when dealership is created
CREATE OR REPLACE FUNCTION public.initialize_modules_on_dealership_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  PERFORM initialize_dealership_modules(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_initialize_dealership_modules
AFTER INSERT ON public.dealerships
FOR EACH ROW
EXECUTE FUNCTION initialize_modules_on_dealership_creation();