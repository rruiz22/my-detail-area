-- =====================================================
-- Update get_invoice_items_with_order_info RPC to include is_paid
-- Created: 2025-11-24
-- Description: Add is_paid field to RPC response
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_invoice_items_with_order_info(p_invoice_id UUID)
RETURNS TABLE (
  id UUID,
  invoice_id UUID,
  item_type TEXT,
  description TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  discount_amount NUMERIC,
  tax_rate NUMERIC,
  total_amount NUMERIC,
  service_reference TEXT,
  sort_order INTEGER,
  is_paid BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  order_number TEXT,
  order_type TEXT,
  po TEXT,
  ro TEXT,
  tag TEXT,
  service_names TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ii.id,
    ii.invoice_id,
    ii.item_type,
    ii.description,
    ii.quantity,
    ii.unit_price,
    ii.discount_amount,
    ii.tax_rate,
    ii.total_amount,
    ii.service_reference,
    ii.sort_order,
    ii.is_paid,
    ii.metadata,
    ii.created_at,
    ii.updated_at,
    -- Extract order info from metadata
    (ii.metadata->>'order_number')::TEXT as order_number,
    (ii.metadata->>'order_type')::TEXT as order_type,
    (ii.metadata->>'po')::TEXT as po,
    (ii.metadata->>'ro')::TEXT as ro,
    (ii.metadata->>'tag')::TEXT as tag,
    (ii.metadata->>'service_names')::TEXT as service_names
  FROM public.invoice_items ii
  WHERE ii.invoice_id = p_invoice_id
  ORDER BY ii.sort_order, ii.created_at;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_invoice_items_with_order_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_items_with_order_info(UUID) TO service_role;

COMMENT ON FUNCTION public.get_invoice_items_with_order_info IS 'Get invoice items with order information extracted from metadata, including is_paid status';
