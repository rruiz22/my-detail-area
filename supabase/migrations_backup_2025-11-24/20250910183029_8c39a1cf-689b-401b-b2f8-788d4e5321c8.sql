-- ===========================================
-- GET READY - RPC FUNCTIONS AND UTILITIES
-- ===========================================

-- Utility functions
CREATE OR REPLACE FUNCTION public.format_dh(interval_val INTERVAL)
RETURNS TEXT 
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.short_vin(vin_text TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF vin_text IS NULL OR LENGTH(vin_text) < 8 THEN
    RETURN COALESCE(vin_text, '');
  END IF;
  
  RETURN RIGHT(vin_text, 8);
END;
$$;

-- Main RPC: Get Overview Table
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
    COALESCE(format_dh(now() - v.created_at), '0d 0h') as days_in_step,
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

-- Get Steps with Counts
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

-- Get Vehicle Detail
CREATE OR REPLACE FUNCTION public.get_vehicle_detail(p_vehicle_id UUID)
RETURNS TABLE(
  vehicle_info JSONB,
  work_items JSONB,
  media JSONB,
  notes JSONB,
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
          'due_date', wi.due_date,
          'created_at', wi.created_at
        )
      )
      FROM recon_work_items wi
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
          'created_at', n.created_at
        ) ORDER BY n.created_at DESC
      )
      FROM recon_notes n
      WHERE n.vehicle_id = v.id),
      '[]'::jsonb
    ) as notes,
    
    -- Timeline placeholder
    '[]'::jsonb as timeline
    
  FROM recon_vehicles v
  LEFT JOIN recon_steps s ON s.id = v.current_step_id
  WHERE v.id = p_vehicle_id;
END;
$$;

-- Add sample data
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

INSERT INTO public.recon_vehicles (
  dealer_id, stock_number, vin, vehicle_year, vehicle_make, vehicle_model, 
  current_step_id, priority, retail_value, created_by
)
SELECT 
  5, 'STK002', 'JH4CU2F6XKC789012', 2022, 'Toyota', 'Camry',
  s.id, 'high', 28000, '00000000-0000-0000-0000-000000000000'::UUID
FROM recon_steps s 
WHERE s.name = 'Detail/Cleaning' AND s.is_default = true
AND NOT EXISTS (SELECT 1 FROM recon_vehicles WHERE stock_number = 'STK002')
LIMIT 1;