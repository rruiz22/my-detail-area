-- ===========================================
-- GET READY / RECON HUB - Safe Database Migration
-- ===========================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage vendors for their dealer" ON public.recon_vendors;
DROP POLICY IF EXISTS "Users can view steps for their dealer" ON public.recon_steps;
DROP POLICY IF EXISTS "Users can manage custom steps for their dealer" ON public.recon_steps;

-- Create only missing tables and functions, then recreate policies

-- ===========================================
-- UTILITY FUNCTIONS (Safe creation)
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
-- MAIN RPC FUNCTIONS - Overview Table
-- ===========================================

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

-- ===========================================
-- STEP TABLE RPC 
-- ===========================================

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

-- ===========================================
-- STEPS WITH COUNTS RPC
-- ===========================================

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
-- RECREATE RLS POLICIES SAFELY
-- ===========================================

-- RLS Policies for recon_vendors
CREATE POLICY "Users can manage vendors for their dealer" ON public.recon_vendors
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

-- Insert sample data if not exists
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