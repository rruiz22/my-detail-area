-- ===========================================
-- GET READY / RECON HUB - Complete Database Structure
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

-- 5) RECON VENDORS TABLE  
CREATE TABLE IF NOT EXISTS public.recon_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  specialty TEXT,
  rating NUMERIC DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6) RECON NOTES TABLE
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

-- 7) RECON VEHICLE STEP HISTORY TABLE
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
-- DEFAULT STEPS DATA
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
-- UTILITY FUNCTIONS
-- ===========================================

-- Format interval as "Xd Yh"
CREATE OR REPLACE FUNCTION public.format_dh(interval_val INTERVAL)
RETURNS TEXT AS $$
DECLARE
  days INTEGER;
  hours INTEGER;
BEGIN
  IF interval_val IS NULL THEN
    RETURN '0d 0h';
  END IF;
  
  days := EXTRACT(DAY FROM interval_val)::INTEGER;
  hours := EXTRACT(HOUR FROM interval_val)::INTEGER;
  
  RETURN days || 'd ' || hours || 'h';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get short VIN (last 8 characters)
CREATE OR REPLACE FUNCTION public.short_vin(vin_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF vin_text IS NULL OR LENGTH(vin_text) < 8 THEN
    RETURN COALESCE(vin_text, '');
  END IF;
  
  RETURN RIGHT(vin_text, 8);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ===========================================
-- MAIN RPC FUNCTIONS
-- ===========================================

-- 1) GET OVERVIEW TABLE
CREATE OR REPLACE FUNCTION public.get_overview_table(p_dealer_id BIGINT)
RETURNS TABLE(
  id UUID,
  stock_number TEXT,
  vin TEXT,
  short_vin TEXT,
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_trim TEXT,
  current_step_name TEXT,
  current_step_color TEXT,
  current_step_order INTEGER,
  status TEXT,
  priority TEXT,
  days_in_step TEXT,
  media_count BIGINT,
  work_item_counts JSONB,
  notes_preview TEXT,
  retail_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.stock_number,
    v.vin,
    short_vin(v.vin) as short_vin,
    v.vehicle_year,
    v.vehicle_make,
    v.vehicle_model,
    v.vehicle_trim,
    COALESCE(s.name, 'No Step') as current_step_name,
    COALESCE(s.color, '#6B7280') as current_step_color,
    COALESCE(s.order_index, 0) as current_step_order,
    v.status,
    v.priority,
    COALESCE(
      format_dh(now() - vh.entered_at), 
      '0d 0h'
    ) as days_in_step,
    COALESCE(media_stats.media_count, 0) as media_count,
    COALESCE(work_stats.work_item_counts, '{"pending":0,"in_progress":0,"completed":0,"declined":0}'::jsonb) as work_item_counts,
    COALESCE(
      (SELECT LEFT(content, 100) || CASE WHEN LENGTH(content) > 100 THEN '...' ELSE '' END 
       FROM recon_notes rn 
       WHERE rn.vehicle_id = v.id 
       ORDER BY rn.created_at DESC 
       LIMIT 1),
      ''
    ) as notes_preview,
    v.retail_value,
    v.created_at
  FROM recon_vehicles v
  LEFT JOIN recon_steps s ON s.id = v.current_step_id
  LEFT JOIN LATERAL (
    SELECT entered_at 
    FROM recon_vehicle_step_history 
    WHERE vehicle_id = v.id AND step_id = v.current_step_id 
    ORDER BY entered_at DESC 
    LIMIT 1
  ) vh ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as media_count
    FROM recon_media rm 
    WHERE rm.vehicle_id = v.id
  ) media_stats ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_build_object(
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'declined', COUNT(*) FILTER (WHERE status = 'declined')
    ) as work_item_counts
    FROM recon_work_items rwi 
    WHERE rwi.vehicle_id = v.id
  ) work_stats ON true
  WHERE v.dealer_id = p_dealer_id
  ORDER BY s.order_index NULLS LAST, v.created_at DESC;
END;
$$;

-- 2) GET STEP TABLE  
CREATE OR REPLACE FUNCTION public.get_step_table(p_dealer_id BIGINT, p_step_id UUID)
RETURNS TABLE(
  id UUID,
  stock_number TEXT,
  short_vin TEXT,
  vehicle_info TEXT,
  media_count BIGINT,  
  work_item_counts JSONB,
  days_in_step TEXT,
  priority TEXT,
  status TEXT
)
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.stock_number,
    short_vin(v.vin) as short_vin,
    CONCAT(v.vehicle_year, ' ', v.vehicle_make, ' ', v.vehicle_model, 
           CASE WHEN v.vehicle_trim IS NOT NULL THEN ' ' || v.vehicle_trim ELSE '' END) as vehicle_info,
    COALESCE(media_stats.media_count, 0) as media_count,
    COALESCE(work_stats.work_item_counts, '{"pending":0,"in_progress":0,"completed":0,"declined":0}'::jsonb) as work_item_counts,
    COALESCE(
      format_dh(now() - vh.entered_at), 
      '0d 0h'
    ) as days_in_step,
    v.priority,
    v.status
  FROM recon_vehicles v
  LEFT JOIN LATERAL (
    SELECT entered_at 
    FROM recon_vehicle_step_history 
    WHERE vehicle_id = v.id AND step_id = v.current_step_id 
    ORDER BY entered_at DESC 
    LIMIT 1
  ) vh ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as media_count
    FROM recon_media rm 
    WHERE rm.vehicle_id = v.id
  ) media_stats ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_build_object(
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'), 
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'declined', COUNT(*) FILTER (WHERE status = 'declined')
    ) as work_item_counts
    FROM recon_work_items rwi 
    WHERE rwi.vehicle_id = v.id
  ) work_stats ON true
  WHERE v.dealer_id = p_dealer_id 
  AND (p_step_id IS NULL OR v.current_step_id = p_step_id)
  ORDER BY v.created_at DESC;
END;
$$;

-- 3) GET VEHICLE DETAIL
CREATE OR REPLACE FUNCTION public.get_vehicle_detail(p_vehicle_id UUID)
RETURNS TABLE(
  vehicle_info JSONB,
  work_items JSONB,
  media JSONB,
  notes JSONB,
  vendors JSONB,
  timeline JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Vehicle info
    jsonb_build_object(
      'id', v.id,
      'stock_number', v.stock_number,
      'vin', v.vin,
      'vehicle_year', v.vehicle_year,
      'vehicle_make', v.vehicle_make,
      'vehicle_model', v.vehicle_model,
      'vehicle_trim', v.vehicle_trim,
      'status', v.status,
      'priority', v.priority,
      'retail_value', v.retail_value,
      'current_step', jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'color', s.color,
        'order_index', s.order_index
      )
    ) as vehicle_info,
    
    -- Work items
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', wi.id,
          'title', wi.title,
          'description', wi.description,
          'status', wi.status,
          'priority', wi.priority,
          'work_type', wi.work_type,
          'estimated_cost', wi.estimated_cost,
          'actual_cost', wi.actual_cost,
          'assigned_vendor', CASE WHEN vendor.id IS NOT NULL THEN
            jsonb_build_object('id', vendor.id, 'name', vendor.name)
          ELSE NULL END,
          'due_date', wi.due_date,
          'created_at', wi.created_at
        )
      )
      FROM recon_work_items wi
      LEFT JOIN recon_vendors vendor ON vendor.id = wi.assigned_vendor_id
      WHERE wi.vehicle_id = v.id),
      '[]'::jsonb
    ) as work_items,
    
    -- Media
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'file_name', m.file_name,
          'file_url', m.file_url,
          'file_type', m.file_type,
          'category', m.category,
          'is_primary', m.is_primary,
          'upload_context', m.upload_context,
          'created_at', m.created_at
        ) ORDER BY m.sort_order, m.created_at
      )
      FROM recon_media m
      WHERE m.vehicle_id = v.id),
      '[]'::jsonb
    ) as media,
    
    -- Notes
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'content', n.content,
          'note_type', n.note_type,
          'is_internal', n.is_internal,
          'mentions', n.mentions,
          'created_at', n.created_at
        ) ORDER BY n.created_at DESC
      )
      FROM recon_notes n
      WHERE n.vehicle_id = v.id),
      '[]'::jsonb
    ) as notes,
    
    -- Available vendors
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', vendor.id,
          'name', vendor.name,
          'specialty', vendor.specialty,
          'rating', vendor.rating
        )
      )
      FROM recon_vendors vendor
      WHERE vendor.dealer_id = v.dealer_id AND vendor.is_active = true),
      '[]'::jsonb
    ) as vendors,
    
    -- Timeline
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'step_name', step.name,
          'step_color', step.color,
          'entered_at', vh.entered_at,
          'exited_at', vh.exited_at,
          'days_in_step', CASE 
            WHEN vh.exited_at IS NOT NULL THEN format_dh(vh.exited_at - vh.entered_at)
            ELSE format_dh(now() - vh.entered_at)
          END
        ) ORDER BY vh.entered_at
      )
      FROM recon_vehicle_step_history vh
      JOIN recon_steps step ON step.id = vh.step_id
      WHERE vh.vehicle_id = v.id),
      '[]'::jsonb
    ) as timeline
    
  FROM recon_vehicles v
  LEFT JOIN recon_steps s ON s.id = v.current_step_id
  WHERE v.id = p_vehicle_id;
END;
$$;

-- 4) GET WORK ITEM COUNTERS
CREATE OR REPLACE FUNCTION public.get_work_item_counters(p_vehicle_id UUID)
RETURNS TABLE(
  need_attention BIGINT,
  in_progress BIGINT,
  declined BIGINT,
  completed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending' OR approval_required = true) as need_attention,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
    COUNT(*) FILTER (WHERE status = 'declined') as declined,
    COUNT(*) FILTER (WHERE status = 'completed') as completed
  FROM recon_work_items
  WHERE vehicle_id = p_vehicle_id;
END;
$$;

-- 5) GET STEPS WITH COUNTS
CREATE OR REPLACE FUNCTION public.get_steps_with_counts(p_dealer_id BIGINT)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  order_index INTEGER,
  color TEXT,
  icon TEXT,
  vehicle_count BIGINT,
  is_default BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.description,
    s.order_index,
    s.color,
    s.icon,
    COALESCE(vehicle_counts.count, 0) as vehicle_count,
    s.is_default
  FROM recon_steps s
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM recon_vehicles v
    WHERE v.dealer_id = p_dealer_id 
    AND (s.name = 'All' OR v.current_step_id = s.id)
  ) vehicle_counts ON true
  WHERE s.is_active = true
  AND (s.dealer_id IS NULL OR s.dealer_id = p_dealer_id)
  ORDER BY s.order_index;
END;
$$;

-- ===========================================
-- MUTATION FUNCTIONS
-- ===========================================

-- ADD WORK ITEM
CREATE OR REPLACE FUNCTION public.add_work_item(
  p_vehicle_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_work_type TEXT DEFAULT 'general',
  p_priority TEXT DEFAULT 'normal',
  p_estimated_cost NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  work_item_id UUID;
BEGIN
  INSERT INTO recon_work_items (
    vehicle_id, title, description, work_type, priority, estimated_cost, created_by
  ) VALUES (
    p_vehicle_id, p_title, p_description, p_work_type, p_priority, p_estimated_cost, auth.uid()
  ) RETURNING id INTO work_item_id;
  
  RETURN work_item_id;
END;
$$;

-- CHANGE WORK ITEM STATUS
CREATE OR REPLACE FUNCTION public.change_work_item_status(
  p_work_item_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE recon_work_items 
  SET status = p_status,
      updated_at = now(),
      completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END
  WHERE id = p_work_item_id;
  
  RETURN FOUND;
END;
$$;

-- ASSIGN VENDOR
CREATE OR REPLACE FUNCTION public.assign_vendor(
  p_work_item_id UUID,
  p_vendor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE recon_work_items 
  SET assigned_vendor_id = p_vendor_id,
      updated_at = now()
  WHERE id = p_work_item_id;
  
  RETURN FOUND;
END;
$$;

-- ADD NOTE
CREATE OR REPLACE FUNCTION public.add_note(
  p_vehicle_id UUID,
  p_content TEXT,
  p_note_type TEXT DEFAULT 'general',
  p_is_internal BOOLEAN DEFAULT false,
  p_mentions JSONB DEFAULT '[]'
)
RETURNS UUID  
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  note_id UUID;
BEGIN
  INSERT INTO recon_notes (
    vehicle_id, content, note_type, is_internal, mentions, created_by
  ) VALUES (
    p_vehicle_id, p_content, p_note_type, p_is_internal, p_mentions, auth.uid()
  ) RETURNING id INTO note_id;
  
  RETURN note_id;
END;
$$;

-- ===========================================
-- TRIGGERS
-- ===========================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_recon_vehicles_updated_at BEFORE UPDATE ON recon_vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recon_steps_updated_at BEFORE UPDATE ON recon_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recon_work_items_updated_at BEFORE UPDATE ON recon_work_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recon_vendors_updated_at BEFORE UPDATE ON recon_vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recon_notes_updated_at BEFORE UPDATE ON recon_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.recon_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recon_vehicle_step_history ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can manage custom steps for their dealer" ON public.recon_steps
FOR ALL USING (
  is_default = false AND 
  (is_admin() OR user_has_dealer_membership(auth.uid(), dealer_id))
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

-- RLS Policies for recon_vendors
CREATE POLICY "Users can manage vendors for their dealer" ON public.recon_vendors
FOR ALL USING (
  is_admin() OR user_has_dealer_membership(auth.uid(), dealer_id)
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

-- ===========================================
-- SAMPLE DATA (Optional - for testing)
-- ===========================================

-- Insert sample vehicle (only if none exist)
INSERT INTO public.recon_vehicles (
  dealer_id, stock_number, vin, vehicle_year, vehicle_make, vehicle_model, 
  current_step_id, priority, retail_value, created_by
)
SELECT 
  5, 'STK001', 'JH4CU2F6XKC123456', 2023, 'Honda', 'Civic',
  s.id, 'normal', 25000, '00000000-0000-0000-0000-000000000000'::UUID
FROM recon_steps s 
WHERE s.name = 'Vehicle Arrived' AND s.is_default = true
AND NOT EXISTS (SELECT 1 FROM recon_vehicles WHERE stock_number = 'STK001')
LIMIT 1;

-- Insert sample work items for testing
INSERT INTO public.recon_work_items (
  vehicle_id, title, description, status, priority, work_type, estimated_cost, created_by
)
SELECT 
  v.id, 'Oil Change', 'Replace engine oil and filter', 'pending', 'normal', 'mechanical', 75.00, '00000000-0000-0000-0000-000000000000'::UUID
FROM recon_vehicles v 
WHERE v.stock_number = 'STK001'
AND NOT EXISTS (SELECT 1 FROM recon_work_items WHERE title = 'Oil Change' AND vehicle_id = v.id)
LIMIT 1;

INSERT INTO public.recon_work_items (
  vehicle_id, title, description, status, priority, work_type, estimated_cost, created_by
)
SELECT 
  v.id, 'Interior Detail', 'Deep clean interior and seats', 'in_progress', 'high', 'detail', 150.00, '00000000-0000-0000-0000-000000000000'::UUID
FROM recon_vehicles v 
WHERE v.stock_number = 'STK001'
AND NOT EXISTS (SELECT 1 FROM recon_work_items WHERE title = 'Interior Detail' AND vehicle_id = v.id)
LIMIT 1;