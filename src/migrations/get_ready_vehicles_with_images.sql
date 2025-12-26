-- =====================================================
-- RPC: get_ready_vehicles_with_images
-- Optimized function to fetch vehicles with images in a single query
-- Reduces 40+ queries to 1 by doing LEFT JOIN with dealer_vehicle_inventory
-- =====================================================

CREATE OR REPLACE FUNCTION get_ready_vehicles_with_images(
  p_dealer_id INTEGER,
  p_step_id TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  stock_number TEXT,
  vin TEXT,
  vehicle_year INTEGER,
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_trim TEXT,
  step_id TEXT,
  priority TEXT,
  status TEXT,
  assigned_to TEXT,
  notes TEXT,
  intake_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  media_count INTEGER,
  notes_count INTEGER,
  requires_approval BOOLEAN,
  approval_status TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  rejected_by UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Step info
  step_name TEXT,
  step_color TEXT,
  step_order_index INTEGER,
  -- Image from Stock inventory
  key_photo_url TEXT,
  -- Work items as JSON array
  work_items JSONB,
  -- Total count for pagination
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count BIGINT;
  v_sort_column TEXT;
  v_sort_direction TEXT;
BEGIN
  -- Validate sort parameters
  v_sort_column := CASE p_sort_by
    WHEN 'stock_number' THEN 'v.stock_number'
    WHEN 'intake_date' THEN 'v.intake_date'
    WHEN 'days_in_step' THEN 'v.intake_date'
    WHEN 'priority' THEN 'v.priority'
    WHEN 'updated_at' THEN 'v.updated_at'
    ELSE 'v.created_at'
  END;

  v_sort_direction := CASE WHEN p_sort_order = 'asc' THEN 'ASC' ELSE 'DESC' END;

  -- Get total count first
  SELECT COUNT(*) INTO v_total_count
  FROM get_ready_vehicles v
  WHERE v.dealer_id = p_dealer_id
    AND v.deleted_at IS NULL
    AND (p_step_id IS NULL OR p_step_id = 'all' OR v.step_id = p_step_id)
    AND (p_priority IS NULL OR p_priority = 'all' OR v.priority = p_priority)
    AND (
      p_search_query IS NULL
      OR p_search_query = ''
      OR v.stock_number ILIKE '%' || p_search_query || '%'
      OR v.vin ILIKE '%' || p_search_query || '%'
      OR v.vehicle_make ILIKE '%' || p_search_query || '%'
      OR v.vehicle_model ILIKE '%' || p_search_query || '%'
      OR v.assigned_to ILIKE '%' || p_search_query || '%'
    );

  -- Return vehicles with images and work items
  RETURN QUERY
  SELECT
    v.id,
    v.stock_number,
    v.vin,
    v.vehicle_year,
    v.vehicle_make,
    v.vehicle_model,
    v.vehicle_trim,
    v.step_id,
    v.priority,
    v.status,
    v.assigned_to,
    v.notes,
    v.intake_date,
    v.created_at,
    v.updated_at,
    COALESCE(v.media_count, 0)::INTEGER,
    COALESCE(v.notes_count, 0)::INTEGER,
    COALESCE(v.requires_approval, false),
    v.approval_status,
    v.approved_by,
    v.approved_at,
    v.approval_notes,
    v.rejected_by,
    v.rejected_at,
    v.rejection_reason,
    -- Step info from join
    s.name AS step_name,
    s.color AS step_color,
    s.order_index AS step_order_index,
    -- Image from Stock inventory (LEFT JOIN)
    dvi.key_photo_url,
    -- Work items as JSON array
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', wi.id,
            'title', wi.title,
            'description', wi.description,
            'status', wi.status,
            'approval_required', wi.approval_required,
            'approval_status', wi.approval_status
          )
        )
        FROM get_ready_work_items wi
        WHERE wi.vehicle_id = v.id
      ),
      '[]'::jsonb
    ) AS work_items,
    -- Total count for pagination
    v_total_count
  FROM get_ready_vehicles v
  INNER JOIN get_ready_steps s ON v.step_id = s.id
  LEFT JOIN dealer_vehicle_inventory dvi ON v.vin = dvi.vin AND dvi.dealer_id = p_dealer_id
  WHERE v.dealer_id = p_dealer_id
    AND v.deleted_at IS NULL
    AND (p_step_id IS NULL OR p_step_id = 'all' OR v.step_id = p_step_id)
    AND (p_priority IS NULL OR p_priority = 'all' OR v.priority = p_priority)
    AND (
      p_search_query IS NULL
      OR p_search_query = ''
      OR v.stock_number ILIKE '%' || p_search_query || '%'
      OR v.vin ILIKE '%' || p_search_query || '%'
      OR v.vehicle_make ILIKE '%' || p_search_query || '%'
      OR v.vehicle_model ILIKE '%' || p_search_query || '%'
      OR v.assigned_to ILIKE '%' || p_search_query || '%'
    )
  ORDER BY
    -- Priority first (urgent > high > medium > normal > low)
    CASE v.priority
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'normal' THEN 4
      WHEN 'low' THEN 5
      ELSE 6
    END ASC,
    -- Then by requested sort
    CASE WHEN p_sort_by = 'stock_number' AND p_sort_order = 'asc' THEN v.stock_number END ASC,
    CASE WHEN p_sort_by = 'stock_number' AND p_sort_order = 'desc' THEN v.stock_number END DESC,
    CASE WHEN p_sort_by = 'intake_date' AND p_sort_order = 'asc' THEN v.intake_date END ASC,
    CASE WHEN p_sort_by = 'intake_date' AND p_sort_order = 'desc' THEN v.intake_date END DESC,
    CASE WHEN p_sort_by = 'days_in_step' AND p_sort_order = 'asc' THEN v.intake_date END DESC,
    CASE WHEN p_sort_by = 'days_in_step' AND p_sort_order = 'desc' THEN v.intake_date END ASC,
    CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'asc' THEN v.updated_at END ASC,
    CASE WHEN p_sort_by = 'updated_at' AND p_sort_order = 'desc' THEN v.updated_at END DESC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN v.created_at END ASC,
    CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN v.created_at END DESC,
    v.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_ready_vehicles_with_images TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_ready_vehicles_with_images IS
'Optimized RPC to fetch Get Ready vehicles with images in a single query.
Replaces multiple queries (vehicles + images per page) with one efficient JOIN.
Includes work items as JSONB array and total count for pagination.';
