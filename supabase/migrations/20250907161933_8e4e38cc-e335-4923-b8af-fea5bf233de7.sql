-- Create dealer_services table
CREATE TABLE public.dealer_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  category TEXT DEFAULT 'general',
  duration INTEGER, -- in minutes
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dealer_service_groups table for service-group relationships
CREATE TABLE public.dealer_service_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.dealer_services(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.dealer_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, group_id)
);

-- Enable RLS on both tables
ALTER TABLE public.dealer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_service_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for dealer_services
CREATE POLICY "Users can view dealer services" 
ON public.dealer_services 
FOR SELECT 
USING (user_has_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can manage dealer services with permission" 
ON public.dealer_services 
FOR ALL 
USING (user_has_group_permission(auth.uid(), dealer_id, 'services.manage'::text));

-- RLS policies for dealer_service_groups
CREATE POLICY "Users can view service groups" 
ON public.dealer_service_groups 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_dealer_membership(auth.uid(), ds.dealer_id)
));

CREATE POLICY "Users can manage service groups with permission" 
ON public.dealer_service_groups 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.dealer_services ds 
  WHERE ds.id = dealer_service_groups.service_id 
  AND user_has_group_permission(auth.uid(), ds.dealer_id, 'services.manage'::text)
));

-- Create trigger for updated_at on dealer_services
CREATE TRIGGER update_dealer_services_updated_at
BEFORE UPDATE ON public.dealer_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get services by dealer and user permissions
CREATE OR REPLACE FUNCTION public.get_dealer_services_for_user(p_dealer_id BIGINT)
RETURNS TABLE(
  id UUID,
  dealer_id BIGINT,
  name TEXT,
  description TEXT,
  price DECIMAL(10,2),
  category TEXT,
  duration INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  assigned_groups UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.dealer_id,
    ds.name,
    ds.description,
    ds.price,
    ds.category,
    ds.duration,
    ds.is_active,
    ds.created_at,
    ds.updated_at,
    COALESCE(
      ARRAY_AGG(dsg.group_id) FILTER (WHERE dsg.group_id IS NOT NULL),
      ARRAY[]::UUID[]
    ) as assigned_groups
  FROM dealer_services ds
  LEFT JOIN dealer_service_groups dsg ON dsg.service_id = ds.id
  WHERE ds.dealer_id = p_dealer_id
  AND user_has_dealer_membership(auth.uid(), ds.dealer_id)
  GROUP BY ds.id, ds.dealer_id, ds.name, ds.description, ds.price, ds.category, ds.duration, ds.is_active, ds.created_at, ds.updated_at
  ORDER BY ds.name;
END;
$$;