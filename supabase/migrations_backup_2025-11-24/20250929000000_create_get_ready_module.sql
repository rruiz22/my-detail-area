-- =====================================================
-- GET READY MODULE - Database Schema
-- Complete vehicle reconditioning workflow management
-- =====================================================

-- Drop existing types if they exist (for clean rebuild)
DROP TYPE IF EXISTS get_ready_workflow_type CASCADE;
DROP TYPE IF EXISTS get_ready_priority CASCADE;
DROP TYPE IF EXISTS get_ready_sla_status CASCADE;

-- Create enums for Get Ready module
CREATE TYPE get_ready_workflow_type AS ENUM ('standard', 'express', 'priority');
CREATE TYPE get_ready_priority AS ENUM ('low', 'normal', 'medium', 'high', 'urgent');
CREATE TYPE get_ready_sla_status AS ENUM ('on_track', 'warning', 'critical');

-- =====================================================
-- 1. GET READY STEPS TABLE
-- Defines the workflow steps for vehicle reconditioning
-- =====================================================
CREATE TABLE IF NOT EXISTS public.get_ready_steps (
  id TEXT PRIMARY KEY,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  icon TEXT DEFAULT 'circle',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Get Ready specific fields
  sla_hours INTEGER DEFAULT 24,
  target_throughput INTEGER DEFAULT 5,
  bottleneck_threshold INTEGER DEFAULT 48,
  parallel_capable BOOLEAN DEFAULT false,
  express_lane_eligible BOOLEAN DEFAULT false,
  cost_per_day DECIMAL(10,2) DEFAULT 35.00,
  max_capacity INTEGER DEFAULT 10,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dealer_id, order_index)
);

-- Enable RLS
ALTER TABLE public.get_ready_steps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for get_ready_steps
CREATE POLICY "Users can view steps for their dealerships"
  ON public.get_ready_steps FOR SELECT
  USING (user_has_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can manage steps for their dealerships"
  ON public.get_ready_steps FOR ALL
  USING (
    user_has_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.manage_steps')
  )
  WITH CHECK (
    user_has_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.manage_steps')
  );

-- =====================================================
-- 2. GET READY VEHICLES TABLE
-- Core table for vehicle reconditioning tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.get_ready_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Vehicle identification
  stock_number TEXT NOT NULL,
  vin TEXT NOT NULL,
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_trim TEXT,

  -- Workflow tracking
  step_id TEXT NOT NULL REFERENCES public.get_ready_steps(id),
  workflow_type get_ready_workflow_type DEFAULT 'standard',
  priority get_ready_priority DEFAULT 'normal',
  status TEXT DEFAULT 'in_progress',

  -- Assignment
  assigned_to TEXT,
  assigned_group_id UUID REFERENCES public.dealer_groups(id),

  -- Time tracking
  intake_date TIMESTAMPTZ DEFAULT NOW(),
  target_frontline_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  days_in_step INTEGER DEFAULT 0,

  -- SLA & Metrics
  sla_status get_ready_sla_status DEFAULT 'on_track',
  sla_hours_remaining INTEGER,
  t2l_estimate DECIMAL(10,2),
  actual_t2l DECIMAL(10,2),

  -- Costs
  holding_cost_daily DECIMAL(10,2) DEFAULT 35.00,
  total_holding_cost DECIMAL(10,2) DEFAULT 0,

  -- Additional tracking
  priority_score INTEGER DEFAULT 50,
  is_bottlenecked BOOLEAN DEFAULT false,
  escalation_level INTEGER DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 3),

  -- Media & Work
  media_count INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  -- Notes
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dealer_id, stock_number),
  UNIQUE(dealer_id, vin)
);

-- Enable RLS
ALTER TABLE public.get_ready_vehicles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for get_ready_vehicles
CREATE POLICY "Users can view vehicles for their dealerships"
  ON public.get_ready_vehicles FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can create vehicles for their dealerships"
  ON public.get_ready_vehicles FOR INSERT
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.create')
  );

CREATE POLICY "Users can update vehicles for their dealerships"
  ON public.get_ready_vehicles FOR UPDATE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.update')
  )
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.update')
  );

CREATE POLICY "Users can delete vehicles for their dealerships"
  ON public.get_ready_vehicles FOR DELETE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.delete')
  );

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_get_ready_steps_dealer_id
  ON public.get_ready_steps(dealer_id);

CREATE INDEX IF NOT EXISTS idx_get_ready_steps_order_index
  ON public.get_ready_steps(dealer_id, order_index);

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_dealer_id
  ON public.get_ready_vehicles(dealer_id);

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_step_id
  ON public.get_ready_vehicles(step_id);

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_stock_number
  ON public.get_ready_vehicles(dealer_id, stock_number);

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_vin
  ON public.get_ready_vehicles(dealer_id, vin);

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_status
  ON public.get_ready_vehicles(dealer_id, status);

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_workflow_type
  ON public.get_ready_vehicles(dealer_id, workflow_type);

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_priority
  ON public.get_ready_vehicles(dealer_id, priority);

-- =====================================================
-- 4. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp
CREATE TRIGGER trigger_get_ready_steps_updated_at
  BEFORE UPDATE ON public.get_ready_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_get_ready_vehicles_updated_at
  BEFORE UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to calculate days in step
CREATE OR REPLACE FUNCTION public.calculate_days_in_step()
RETURNS TRIGGER AS $$
BEGIN
  -- Update days_in_step based on intake_date
  NEW.days_in_step := EXTRACT(DAY FROM (NOW() - NEW.intake_date))::INTEGER;

  -- Calculate total holding cost
  NEW.total_holding_cost := NEW.holding_cost_daily * NEW.days_in_step;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_days_in_step
  BEFORE UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (OLD.intake_date IS DISTINCT FROM NEW.intake_date OR OLD.holding_cost_daily IS DISTINCT FROM NEW.holding_cost_daily)
  EXECUTE FUNCTION public.calculate_days_in_step();

-- Function to update SLA status
CREATE OR REPLACE FUNCTION public.update_vehicle_sla_status()
RETURNS TRIGGER AS $$
DECLARE
  step_sla_hours INTEGER;
  hours_in_step INTEGER;
BEGIN
  -- Get SLA hours for current step
  SELECT sla_hours INTO step_sla_hours
  FROM public.get_ready_steps
  WHERE id = NEW.step_id;

  -- Calculate hours in current step
  hours_in_step := EXTRACT(EPOCH FROM (NOW() - NEW.intake_date)) / 3600;

  -- Update SLA status
  IF hours_in_step >= step_sla_hours * 1.5 THEN
    NEW.sla_status := 'critical';
    NEW.escalation_level := LEAST(NEW.escalation_level + 1, 3);
  ELSIF hours_in_step >= step_sla_hours THEN
    NEW.sla_status := 'warning';
  ELSE
    NEW.sla_status := 'on_track';
  END IF;

  -- Calculate remaining SLA hours
  NEW.sla_hours_remaining := step_sla_hours - hours_in_step;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_sla_status
  BEFORE UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (OLD.step_id IS DISTINCT FROM NEW.step_id OR OLD.intake_date IS DISTINCT FROM NEW.intake_date)
  EXECUTE FUNCTION public.update_vehicle_sla_status();

-- =====================================================
-- 6. ANALYTICS FUNCTIONS
-- =====================================================

-- Function to get vehicle counts per step
CREATE OR REPLACE FUNCTION public.get_step_vehicle_counts(p_dealer_id BIGINT)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  vehicle_count BIGINT,
  avg_days_in_step DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as step_id,
    s.name as step_name,
    COUNT(v.id) as vehicle_count,
    ROUND(AVG(v.days_in_step), 1) as avg_days_in_step
  FROM public.get_ready_steps s
  LEFT JOIN public.get_ready_vehicles v ON v.step_id = s.id AND v.dealer_id = p_dealer_id
  WHERE s.dealer_id = p_dealer_id AND s.is_active = true
  GROUP BY s.id, s.name, s.order_index
  ORDER BY s.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get Get Ready KPIs
CREATE OR REPLACE FUNCTION public.get_ready_kpis(p_dealer_id BIGINT)
RETURNS TABLE (
  avg_t2l DECIMAL,
  target_t2l DECIMAL,
  daily_throughput DECIMAL,
  weekly_capacity INTEGER,
  utilization_rate DECIMAL,
  sla_compliance DECIMAL,
  total_holding_costs DECIMAL,
  avg_holding_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(v.actual_t2l), 1) as avg_t2l,
    7.0::DECIMAL as target_t2l,
    COUNT(CASE WHEN v.completed_at >= NOW() - INTERVAL '1 day' THEN 1 END)::DECIMAL as daily_throughput,
    COUNT(CASE WHEN v.completed_at >= NOW() - INTERVAL '7 days' THEN 1 END)::INTEGER as weekly_capacity,
    ROUND((COUNT(*)::DECIMAL / NULLIF(SUM(s.max_capacity), 0)), 2) as utilization_rate,
    ROUND(COUNT(CASE WHEN v.sla_status = 'on_track' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0), 2) as sla_compliance,
    ROUND(SUM(v.total_holding_cost), 2) as total_holding_costs,
    ROUND(AVG(v.total_holding_cost), 2) as avg_holding_cost
  FROM public.get_ready_vehicles v
  JOIN public.get_ready_steps s ON s.id = v.step_id
  WHERE v.dealer_id = p_dealer_id
  AND v.created_at >= NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 7. DEFAULT STEPS FOR NEW DEALERSHIPS
-- =====================================================

-- Function to create default steps for a dealership
CREATE OR REPLACE FUNCTION public.create_default_get_ready_steps(p_dealer_id BIGINT)
RETURNS void AS $$
BEGIN
  INSERT INTO public.get_ready_steps (id, dealer_id, name, description, order_index, color, icon, sla_hours, max_capacity, is_default)
  VALUES
    ('inspection', p_dealer_id, 'Inspection', 'Initial vehicle inspection and assessment', 1, '#3B82F6', 'search', 48, 5, true),
    ('mechanical', p_dealer_id, 'Mechanical', 'Mechanical repairs and maintenance', 2, '#10B981', 'wrench', 120, 4, true),
    ('body_work', p_dealer_id, 'Body Work', 'Body and paint repairs', 3, '#F59E0B', 'hammer', 96, 2, true),
    ('detailing', p_dealer_id, 'Detailing', 'Final cleaning and detailing', 4, '#8B5CF6', 'sparkles', 24, 4, true),
    ('ready', p_dealer_id, 'Ready', 'Ready for front line', 5, '#059669', 'check', 0, 20, true)
  ON CONFLICT (dealer_id, order_index) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.get_ready_steps IS 'Workflow steps for vehicle reconditioning process';
COMMENT ON TABLE public.get_ready_vehicles IS 'Vehicles in the Get Ready reconditioning workflow';
COMMENT ON COLUMN public.get_ready_vehicles.t2l_estimate IS 'Estimated Time to Line in days';
COMMENT ON COLUMN public.get_ready_vehicles.actual_t2l IS 'Actual Time to Line in days after completion';
COMMENT ON COLUMN public.get_ready_vehicles.priority_score IS 'Calculated priority score (0-100)';
COMMENT ON COLUMN public.get_ready_vehicles.escalation_level IS 'SLA escalation level (0=none, 3=critical)';