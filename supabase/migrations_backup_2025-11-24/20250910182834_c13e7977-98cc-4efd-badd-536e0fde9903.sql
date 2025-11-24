-- ===========================================
-- GET READY - COMPLETE TABLE CREATION
-- ===========================================

-- 1) RECON VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.recon_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL,
  stock_number TEXT NOT NULL,
  vin TEXT NOT NULL,
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_trim TEXT,
  current_step_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT DEFAULT 'normal',
  retail_value NUMERIC,
  acquisition_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  target_completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  CONSTRAINT unique_stock_per_dealer UNIQUE(dealer_id, stock_number),
  CONSTRAINT unique_vin_per_dealer UNIQUE(dealer_id, vin)
);

-- 2) RECON STEPS TABLE  
CREATE TABLE IF NOT EXISTS public.recon_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  step_type TEXT NOT NULL DEFAULT 'custom',
  sla_hours INTEGER DEFAULT 24,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'Circle',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) RECON WORK ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.recon_work_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  work_type TEXT DEFAULT 'general',
  estimated_cost NUMERIC DEFAULT 0,
  actual_cost NUMERIC,
  estimated_hours NUMERIC DEFAULT 1,
  actual_hours NUMERIC,
  assigned_vendor_id UUID,
  assigned_to UUID,
  due_date TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  approval_required BOOLEAN DEFAULT false,
  approval_status TEXT DEFAULT 'none',
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- 4) RECON MEDIA TABLE
CREATE TABLE IF NOT EXISTS public.recon_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  upload_context TEXT DEFAULT 'general',
  category TEXT DEFAULT 'photo',
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5) RECON NOTES TABLE
CREATE TABLE IF NOT EXISTS public.recon_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'general',
  is_internal BOOLEAN DEFAULT false,
  mentions JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6) RECON VEHICLE STEP HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.recon_vehicle_step_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  step_id UUID NOT NULL,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  days_in_step INTEGER DEFAULT 0,
  hours_in_step INTEGER DEFAULT 0,
  changed_by UUID,
  notes TEXT
);

-- ===========================================
-- INSERT DEFAULT STEPS
-- ===========================================

INSERT INTO public.recon_steps (dealer_id, name, description, order_index, is_default, step_type, sla_hours, color, icon)
VALUES 
  (NULL, 'All', 'All vehicles in recon process', 0, true, 'system', 0, '#6B7280', 'Layers'),
  (NULL, 'Vehicle Arrived', 'Vehicle has arrived at the facility', 1, true, 'arrival', 4, '#10B981', 'TruckIcon'),
  (NULL, 'Initial Inspection', 'Complete initial vehicle inspection', 2, true, 'inspection', 8, '#F59E0B', 'Search'),
  (NULL, 'Detail/Cleaning', 'Professional cleaning and detailing', 3, true, 'detail', 12, '#3B82F6', 'Sparkles'),
  (NULL, 'Mechanical Work', 'Mechanical repairs and maintenance', 4, true, 'mechanical', 48, '#EF4444', 'Wrench'),
  (NULL, 'Body Work', 'Body work and paint repairs', 5, true, 'bodywork', 72, '#8B5CF6', 'Palette'),
  (NULL, 'Photos', 'Professional photography', 6, true, 'photos', 4, '#06B6D4', 'Camera'),
  (NULL, 'Create RO', 'Create repair order', 7, true, 'paperwork', 2, '#F97316', 'FileText'),
  (NULL, 'QC Check', 'Quality control inspection', 8, true, 'quality', 4, '#84CC16', 'CheckCircle'),
  (NULL, 'Ready for Sale', 'Vehicle ready for front line', 9, true, 'complete', 1, '#22C55E', 'Star')
ON CONFLICT DO NOTHING;

-- ===========================================
-- ENABLE RLS ON ALL TABLES
-- ===========================================

ALTER TABLE public.recon_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_vehicle_step_history ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- CREATE RLS POLICIES
-- ===========================================

-- RLS Policies for recon_vehicles
CREATE POLICY "Users can manage vehicles for their dealer" ON public.recon_vehicles
FOR ALL USING (
  is_admin() OR user_has_dealer_membership(auth.uid(), dealer_id)
);

-- RLS Policies for recon_steps  
CREATE POLICY "Users can view steps for their dealer" ON public.recon_steps
FOR SELECT USING (
  is_default = true OR 
  dealer_id IS NULL OR 
  is_admin() OR 
  user_has_dealer_membership(auth.uid(), dealer_id)
);

-- RLS Policies for recon_work_items
CREATE POLICY "Users can manage work items for their dealer vehicles" ON public.recon_work_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recon_vehicles v 
    WHERE v.id = vehicle_id 
    AND (is_admin() OR user_has_dealer_membership(auth.uid(), v.dealer_id))
  )
);

-- RLS Policies for recon_media
CREATE POLICY "Users can manage media for their dealer vehicles" ON public.recon_media
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recon_vehicles v 
    WHERE v.id = vehicle_id 
    AND (is_admin() OR user_has_dealer_membership(auth.uid(), v.dealer_id))
  )
);

-- RLS Policies for recon_notes
CREATE POLICY "Users can manage notes for their dealer vehicles" ON public.recon_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recon_vehicles v 
    WHERE v.id = vehicle_id 
    AND (is_admin() OR user_has_dealer_membership(auth.uid(), v.dealer_id))
  )
);

-- RLS Policies for recon_vehicle_step_history
CREATE POLICY "Users can view step history for their dealer vehicles" ON public.recon_vehicle_step_history
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM recon_vehicles v 
    WHERE v.id = vehicle_id 
    AND (is_admin() OR user_has_dealer_membership(auth.uid(), v.dealer_id))
  )
);