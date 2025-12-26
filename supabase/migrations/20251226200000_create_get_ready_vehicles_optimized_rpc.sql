-- =====================================================
-- OPTIMIZED RPC: get_ready_vehicles_with_images
-- Reduces 40+ queries to 1-2 by joining vehicles with images
-- =====================================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS get_ready_vehicles_with_images(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER);

-- Create optimized RPC function
CREATE OR REPLACE FUNCTION get_ready_vehicles_with_images(
  p_dealer_id INTEGER,
  p_step_id TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'priority',
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
  step_name TEXT,
  step_color TEXT,
  step_order_index INTEGER,
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
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  key_photo_url TEXT,
  work_items JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_count BIGINT;
  v_search_pattern TEXT;
BEGIN
  -- Prepare search pattern if provided
  IF p_search_query IS NOT NULL AND p_search_query != '' THEN
    v_search_pattern := '%' || LOWER(TRIM(p_search_query)) || '%';
  END IF;

  -- Get total count first (for pagination info)
  SELECT COUNT(*)
  INTO v_total_count
  FROM get_ready_vehicles v
  WHERE v.dealer_id = p_dealer_id
    AND v.deleted_at IS NULL
    AND (p_step_id IS NULL OR p_step_id = 'all' OR v.step_id = p_step_id)
    AND (p_priority IS NULL OR p_priority = 'all' OR v.priority::TEXT = p_priority)
    AND (v_search_pattern IS NULL OR (
      LOWER(v.stock_number) LIKE v_search_pattern OR
      LOWER(v.vin) LIKE v_search_pattern OR
      LOWER(COALESCE(v.vehicle_make, '')) LIKE v_search_pattern OR
      LOWER(COALESCE(v.vehicle_model, '')) LIKE v_search_pattern OR
      LOWER(COALESCE(v.assigned_to, '')) LIKE v_search_pattern
    ));

  -- Return vehicles with images and work items
  RETURN QUERY
  WITH vehicle_work_items AS (
    -- Pre-aggregate work items per vehicle
    SELECT
      wi.vehicle_id,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'id', wi.id,
          'title', wi.title,
          'description', wi.description,
          'status', wi.status,
          'approval_required', wi.approval_required,
          'approval_status', wi.approval_status
        ) ORDER BY wi.created_at DESC
      ) AS items
    FROM get_ready_work_items wi
    WHERE wi.dealer_id = p_dealer_id
    GROUP BY wi.vehicle_id
  )
  SELECT
    v.id,
    v.stock_number,
    v.vin,
    v.vehicle_year,
    v.vehicle_make,
    v.vehicle_model,
    v.vehicle_trim,
    v.step_id,
    s.name AS step_name,
    s.color AS step_color,
    s.order_index AS step_order_index,
    v.priority::TEXT,
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
    -- Get image from dealer_vehicle_inventory via VIN match
    dvi.key_photo_url,
    -- Include pre-aggregated work items
    COALESCE(vwi.items, '[]'::JSONB),
    v_total_count
  FROM get_ready_vehicles v
  INNER JOIN get_ready_steps s ON s.id = v.step_id
  LEFT JOIN dealer_vehicle_inventory dvi ON dvi.vin = v.vin AND dvi.dealer_id = p_dealer_id
  LEFT JOIN vehicle_work_items vwi ON vwi.vehicle_id = v.id
  WHERE v.dealer_id = p_dealer_id
    AND v.deleted_at IS NULL
    AND (p_step_id IS NULL OR p_step_id = 'all' OR v.step_id = p_step_id)
    AND (p_priority IS NULL OR p_priority = 'all' OR v.priority::TEXT = p_priority)
    AND (v_search_pattern IS NULL OR (
      LOWER(v.stock_number) LIKE v_search_pattern OR
      LOWER(v.vin) LIKE v_search_pattern OR
      LOWER(COALESCE(v.vehicle_make, '')) LIKE v_search_pattern OR
      LOWER(COALESCE(v.vehicle_model, '')) LIKE v_search_pattern OR
      LOWER(COALESCE(v.assigned_to, '')) LIKE v_search_pattern
    ))
  ORDER BY
    -- Priority sorting first (urgent > high > medium > normal > low)
    CASE v.priority::TEXT
      WHEN 'urgent' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'normal' THEN 4
      WHEN 'low' THEN 5
      ELSE 6
    END,
    -- Secondary sort based on parameter
    CASE
      WHEN p_sort_by = 'stock_number' AND p_sort_order = 'asc' THEN v.stock_number
      WHEN p_sort_by = 'stock_number' AND p_sort_order = 'desc' THEN v.stock_number
      ELSE NULL
    END,
    CASE
      WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN v.created_at
      WHEN p_sort_by = 'intake_date' AND p_sort_order = 'desc' THEN v.intake_date
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN v.created_at
      WHEN p_sort_by = 'intake_date' AND p_sort_order = 'asc' THEN v.intake_date
      ELSE NULL
    END ASC NULLS LAST,
    v.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_ready_vehicles_with_images TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_ready_vehicles_with_images IS
'Optimized RPC to fetch Get Ready vehicles with images and work items in a single query.
Reduces 40+ queries to 1-2 for better performance with 200+ vehicles.
Includes LEFT JOIN to dealer_vehicle_inventory for key_photo_url.';

-- =====================================================
-- ADDITIONAL OPTIMIZATION: Pre-cache all vehicle images
-- Single query to get all image URLs for a dealer
-- =====================================================

DROP FUNCTION IF EXISTS get_all_vehicle_images_for_dealer(INTEGER);

CREATE OR REPLACE FUNCTION get_all_vehicle_images_for_dealer(
  p_dealer_id INTEGER
)
RETURNS TABLE (
  vin TEXT,
  key_photo_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (dvi.vin)
    dvi.vin,
    dvi.key_photo_url
  FROM dealer_vehicle_inventory dvi
  WHERE dvi.dealer_id = p_dealer_id
    AND dvi.key_photo_url IS NOT NULL
    AND dvi.vin IS NOT NULL
  ORDER BY dvi.vin, dvi.updated_at DESC NULLS LAST;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_vehicle_images_for_dealer TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_all_vehicle_images_for_dealer IS
'Returns all vehicle images for a dealer in a single query for client-side caching.
Used to pre-load vehicle images and avoid per-page image queries.';
