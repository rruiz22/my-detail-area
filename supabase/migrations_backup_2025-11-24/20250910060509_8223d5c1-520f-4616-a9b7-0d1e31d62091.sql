-- FASE 1: ReconHub Database Foundation
-- Creating enums first
CREATE TYPE workflow_step_type AS ENUM (
  'created', 'bring_to_recon', 'inspection', 'mechanical', 
  'body_work', 'detailing', 'photos', 'needs_approval', 
  'wholesale', 'front_line', 'not_for_sale', 'cant_find_keys'
);

CREATE TYPE recon_step_status AS ENUM (
  'pending', 'in_progress', 'completed', 'blocked', 'skipped'
);

-- 1. Workflows customizables
CREATE TABLE public.recon_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  steps_config JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for recon_workflows
ALTER TABLE public.recon_workflows ENABLE ROW LEVEL SECURITY;

-- RLS policies for recon_workflows
CREATE POLICY "Users can view workflows for their dealer" 
ON public.recon_workflows 
FOR SELECT 
USING (user_has_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can manage workflows for their dealer" 
ON public.recon_workflows 
FOR ALL 
USING (user_has_dealer_membership(auth.uid(), dealer_id) AND user_has_group_permission(auth.uid(), dealer_id, 'recon.manage_workflows'))
WITH CHECK (user_has_dealer_membership(auth.uid(), dealer_id) AND user_has_group_permission(auth.uid(), dealer_id, 'recon.manage_workflows'));

-- 2. Steps del workflow  
CREATE TABLE public.recon_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.recon_workflows(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_type workflow_step_type NOT NULL,
  sla_hours INTEGER DEFAULT 24,
  requires_approval BOOLEAN DEFAULT false,
  can_be_parallel BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for recon_workflow_steps
ALTER TABLE public.recon_workflow_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for recon_workflow_steps
CREATE POLICY "Users can view workflow steps for accessible workflows" 
ON public.recon_workflow_steps 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.recon_workflows rw 
  WHERE rw.id = workflow_id 
  AND user_has_dealer_membership(auth.uid(), rw.dealer_id)
));

CREATE POLICY "Users can manage workflow steps for accessible workflows" 
ON public.recon_workflow_steps 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.recon_workflows rw 
  WHERE rw.id = workflow_id 
  AND user_has_dealer_membership(auth.uid(), rw.dealer_id)
  AND user_has_group_permission(auth.uid(), rw.dealer_id, 'recon.manage_workflows')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.recon_workflows rw 
  WHERE rw.id = workflow_id 
  AND user_has_dealer_membership(auth.uid(), rw.dealer_id)
  AND user_has_group_permission(auth.uid(), rw.dealer_id, 'recon.manage_workflows')
));

-- 3. Instancias de steps por vehículo
CREATE TABLE public.recon_step_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES public.recon_workflow_steps(id) ON DELETE CASCADE,
  status recon_step_status DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  assigned_group_id UUID REFERENCES public.dealer_groups(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for recon_step_instances
ALTER TABLE public.recon_step_instances ENABLE ROW LEVEL SECURITY;

-- RLS policies for recon_step_instances
CREATE POLICY "Users can view step instances for accessible orders" 
ON public.recon_step_instances 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.id = order_id 
  AND user_has_active_dealer_membership(auth.uid(), o.dealer_id)
));

CREATE POLICY "Users can manage step instances for accessible orders" 
ON public.recon_step_instances 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.id = order_id 
  AND user_has_active_dealer_membership(auth.uid(), o.dealer_id)
  AND user_has_order_permission(auth.uid(), o.dealer_id, 'orders.update')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.id = order_id 
  AND user_has_active_dealer_membership(auth.uid(), o.dealer_id)
  AND user_has_order_permission(auth.uid(), o.dealer_id, 'orders.update')
));

-- 4. Tracking de ubicación
CREATE TABLE public.recon_vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  coordinates POINT,
  qr_code TEXT UNIQUE,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scanned_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for recon_vehicle_locations
ALTER TABLE public.recon_vehicle_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for recon_vehicle_locations
CREATE POLICY "Users can view vehicle locations for accessible orders" 
ON public.recon_vehicle_locations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.id = order_id 
  AND user_has_active_dealer_membership(auth.uid(), o.dealer_id)
));

CREATE POLICY "Users can create vehicle locations for accessible orders" 
ON public.recon_vehicle_locations 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.id = order_id 
  AND user_has_active_dealer_membership(auth.uid(), o.dealer_id)
  AND user_has_order_permission(auth.uid(), o.dealer_id, 'orders.update')
));

-- 5. Gestión de proveedores
CREATE TABLE public.recon_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id),
  name TEXT NOT NULL,
  contact_info JSONB DEFAULT '{}'::jsonb,
  specialties TEXT[] DEFAULT '{}',
  performance_rating DECIMAL(3,2) DEFAULT 5.00,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for recon_vendors
ALTER TABLE public.recon_vendors ENABLE ROW LEVEL SECURITY;

-- RLS policies for recon_vendors
CREATE POLICY "Users can view vendors for their dealer" 
ON public.recon_vendors 
FOR SELECT 
USING (user_has_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can manage vendors for their dealer" 
ON public.recon_vendors 
FOR ALL 
USING (user_has_dealer_membership(auth.uid(), dealer_id) AND user_has_group_permission(auth.uid(), dealer_id, 'recon.manage_vendors'))
WITH CHECK (user_has_dealer_membership(auth.uid(), dealer_id) AND user_has_group_permission(auth.uid(), dealer_id, 'recon.manage_vendors'));

-- 6. Métricas T2L
CREATE TABLE public.recon_t2l_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  acquisition_date TIMESTAMP WITH TIME ZONE NOT NULL,
  frontline_ready_date TIMESTAMP WITH TIME ZONE,
  t2l_hours INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN frontline_ready_date IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (frontline_ready_date - acquisition_date)) / 3600
      ELSE NULL 
    END
  ) STORED,
  holding_cost_daily DECIMAL(10,2) DEFAULT 32.00,
  total_holding_cost DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN frontline_ready_date IS NOT NULL 
      THEN holding_cost_daily * EXTRACT(DAY FROM (frontline_ready_date - acquisition_date))
      ELSE holding_cost_daily * EXTRACT(DAY FROM (now() - acquisition_date))
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for recon_t2l_metrics
ALTER TABLE public.recon_t2l_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for recon_t2l_metrics
CREATE POLICY "Users can view T2L metrics for accessible orders" 
ON public.recon_t2l_metrics 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.orders o 
  WHERE o.id = order_id 
  AND user_has_active_dealer_membership(auth.uid(), o.dealer_id)
));

CREATE POLICY "System can manage T2L metrics" 
ON public.recon_t2l_metrics 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Función para calcular T2L automáticamente
CREATE OR REPLACE FUNCTION public.calculate_t2l_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear métricas T2L cuando se crea una orden de recon
  IF TG_OP = 'INSERT' AND NEW.order_type = 'recon' THEN
    INSERT INTO public.recon_t2l_metrics (order_id, acquisition_date)
    VALUES (NEW.id, NEW.created_at);
  END IF;
  
  -- Actualizar métricas T2L cuando cambia el estado
  IF TG_OP = 'UPDATE' AND NEW.order_type = 'recon' THEN
    IF NEW.status = 'ready_for_sale' AND OLD.status != 'ready_for_sale' THEN
      UPDATE public.recon_t2l_metrics 
      SET frontline_ready_date = NOW()
      WHERE order_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para T2L automático
CREATE TRIGGER trigger_calculate_t2l_metrics
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_t2l_metrics();

-- Función para obtener estadísticas T2L de un dealer
CREATE OR REPLACE FUNCTION public.get_dealer_t2l_stats(p_dealer_id BIGINT)
RETURNS TABLE(
  average_t2l_hours DECIMAL,
  best_t2l_hours INTEGER,
  worst_active_t2l_hours INTEGER,
  total_vehicles INTEGER,
  completed_vehicles INTEGER,
  average_holding_cost DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(t2l.t2l_hours), 2) as average_t2l_hours,
    MIN(t2l.t2l_hours) as best_t2l_hours,
    MAX(CASE WHEN o.status != 'completed' THEN 
      EXTRACT(EPOCH FROM (now() - t2l.acquisition_date)) / 3600 
    END)::INTEGER as worst_active_t2l_hours,
    COUNT(*)::INTEGER as total_vehicles,
    COUNT(CASE WHEN t2l.frontline_ready_date IS NOT NULL THEN 1 END)::INTEGER as completed_vehicles,
    ROUND(AVG(t2l.total_holding_cost), 2) as average_holding_cost
  FROM public.recon_t2l_metrics t2l
  JOIN public.orders o ON o.id = t2l.order_id
  WHERE o.dealer_id = p_dealer_id
  AND o.created_at >= (now() - interval '30 days');
END;
$$;

-- Crear índices para mejor performance
CREATE INDEX idx_recon_workflows_dealer_id ON public.recon_workflows(dealer_id);
CREATE INDEX idx_recon_workflow_steps_workflow_id ON public.recon_workflow_steps(workflow_id);
CREATE INDEX idx_recon_step_instances_order_id ON public.recon_step_instances(order_id);
CREATE INDEX idx_recon_step_instances_step_id ON public.recon_step_instances(step_id);
CREATE INDEX idx_recon_vehicle_locations_order_id ON public.recon_vehicle_locations(order_id);
CREATE INDEX idx_recon_vehicle_locations_qr_code ON public.recon_vehicle_locations(qr_code);
CREATE INDEX idx_recon_vendors_dealer_id ON public.recon_vendors(dealer_id);
CREATE INDEX idx_recon_t2l_metrics_order_id ON public.recon_t2l_metrics(order_id);

-- Trigger para updated_at en tablas principales
CREATE TRIGGER trigger_recon_workflows_updated_at
  BEFORE UPDATE ON public.recon_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_recon_workflow_steps_updated_at
  BEFORE UPDATE ON public.recon_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_recon_step_instances_updated_at
  BEFORE UPDATE ON public.recon_step_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_recon_vendors_updated_at
  BEFORE UPDATE ON public.recon_vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_recon_t2l_metrics_updated_at
  BEFORE UPDATE ON public.recon_t2l_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();