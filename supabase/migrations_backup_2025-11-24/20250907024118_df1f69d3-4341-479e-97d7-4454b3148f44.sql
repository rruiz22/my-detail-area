-- Create dealer groups table
CREATE TABLE public.dealer_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dealer_id, slug)
);

-- Create dealer memberships table
CREATE TABLE public.dealer_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dealer_id, user_id)
);

-- Create dealer membership groups junction table
CREATE TABLE public.dealer_membership_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  membership_id UUID NOT NULL REFERENCES public.dealer_memberships(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.dealer_groups(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(membership_id, group_id)
);

-- Create orders table for KPI data
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_vin TEXT,
  order_type TEXT NOT NULL CHECK (order_type IN ('sales', 'service', 'recon', 'carwash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  services JSONB DEFAULT '[]'::jsonb,
  total_amount DECIMAL(10,2),
  sla_deadline TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dealer_id, order_number)
);

-- Enable RLS on all tables
ALTER TABLE public.dealer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_membership_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dealer_groups
CREATE POLICY "Users can view dealer groups where they have membership" 
ON public.dealer_groups FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.dealer_memberships dm 
  WHERE dm.dealer_id = dealer_groups.dealer_id 
  AND dm.user_id = auth.uid() 
  AND dm.is_active = true
));

CREATE POLICY "Users with groups.manage can modify dealer groups" 
ON public.dealer_groups FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.dealer_memberships dm 
  JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
  JOIN public.dealer_groups dg ON dg.id = dmg.group_id
  WHERE dm.dealer_id = dealer_groups.dealer_id 
  AND dm.user_id = auth.uid() 
  AND dm.is_active = true
  AND dg.permissions ? 'groups.manage'
));

-- RLS Policies for dealer_memberships  
CREATE POLICY "Users can view memberships in their dealer" 
ON public.dealer_memberships FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.dealer_memberships dm 
  WHERE dm.dealer_id = dealer_memberships.dealer_id 
  AND dm.user_id = auth.uid() 
  AND dm.is_active = true
));

CREATE POLICY "Users with users.manage can modify memberships" 
ON public.dealer_memberships FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.dealer_memberships dm 
  JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
  JOIN public.dealer_groups dg ON dg.id = dmg.group_id
  WHERE dm.dealer_id = dealer_memberships.dealer_id 
  AND dm.user_id = auth.uid() 
  AND dm.is_active = true
  AND dg.permissions ? 'users.manage'
));

-- RLS Policies for dealer_membership_groups
CREATE POLICY "Users can view membership groups in their dealer" 
ON public.dealer_membership_groups FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.dealer_memberships dm 
  JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
  WHERE dmg.membership_id = dealer_membership_groups.membership_id
  AND dm.user_id = auth.uid() 
  AND dm.is_active = true
));

-- RLS Policies for orders
CREATE POLICY "Users can view orders in their dealer" 
ON public.orders FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.dealer_memberships dm 
  WHERE dm.dealer_id = orders.dealer_id 
  AND dm.user_id = auth.uid() 
  AND dm.is_active = true
));

-- Create view for effective permissions
CREATE OR REPLACE VIEW public.v_effective_permissions AS
SELECT 
  dm.user_id,
  dm.dealer_id,
  array_agg(DISTINCT jsonb_array_elements_text(dg.permissions)) as permissions
FROM public.dealer_memberships dm
JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
JOIN public.dealer_groups dg ON dg.id = dmg.group_id
WHERE dm.is_active = true AND dg.is_active = true
GROUP BY dm.user_id, dm.dealer_id;

-- Function to set membership groups
CREATE OR REPLACE FUNCTION public.set_membership_groups(
  p_membership_id UUID,
  p_group_ids UUID[]
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing group assignments
  DELETE FROM public.dealer_membership_groups 
  WHERE membership_id = p_membership_id;
  
  -- Insert new group assignments
  INSERT INTO public.dealer_membership_groups (membership_id, group_id)
  SELECT p_membership_id, unnest(p_group_ids);
  
  RETURN true;
END;
$$;

-- Function to get dealer KPIs
CREATE OR REPLACE FUNCTION public.get_dealer_kpis(p_dealer_id BIGINT)
RETURNS TABLE(
  total_orders INTEGER,
  orders_today INTEGER,
  pending_orders INTEGER,
  in_progress_orders INTEGER,
  completed_orders INTEGER,
  cancelled_orders INTEGER,
  avg_sla_hours DECIMAL,
  sla_compliance_rate DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_orders,
    COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END)::INTEGER as orders_today,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::INTEGER as pending_orders,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::INTEGER as in_progress_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::INTEGER as cancelled_orders,
    AVG(CASE 
      WHEN completed_at IS NOT NULL AND sla_deadline IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 
    END)::DECIMAL as avg_sla_hours,
    (COUNT(CASE 
      WHEN completed_at IS NOT NULL AND sla_deadline IS NOT NULL 
      AND completed_at <= sla_deadline THEN 1 
    END) * 100.0 / NULLIF(COUNT(CASE 
      WHEN completed_at IS NOT NULL AND sla_deadline IS NOT NULL THEN 1 
    END), 0))::DECIMAL as sla_compliance_rate
  FROM public.orders 
  WHERE dealer_id = p_dealer_id;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_dealer_groups_updated_at
  BEFORE UPDATE ON public.dealer_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dealer_memberships_updated_at
  BEFORE UPDATE ON public.dealer_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();