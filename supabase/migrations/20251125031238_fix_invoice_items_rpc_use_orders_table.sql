-- =====================================================
-- Fix get_invoice_items_with_order_info RPC to use orders table
-- Created: 2025-11-25
-- Description: Modify RPC to LEFT JOIN with orders table and fetch order_number directly
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
    -- Get order_number from orders table (with prefixes SA-, SV-, CW-, RC-)
    COALESCE(o.order_number, (ii.metadata->>'order_number')::TEXT) as order_number,
    COALESCE(o.order_type, (ii.metadata->>'order_type')::TEXT) as order_type,
    COALESCE(o.po, (ii.metadata->>'po')::TEXT) as po,
    COALESCE(o.ro, (ii.metadata->>'ro')::TEXT) as ro,
    COALESCE(o.tag, (ii.metadata->>'tag')::TEXT) as tag,
    (ii.metadata->>'service_names')::TEXT as service_names
  FROM public.invoice_items ii
  LEFT JOIN public.orders o ON o.id::TEXT = ii.service_reference
  WHERE ii.invoice_id = p_invoice_id
  ORDER BY ii.sort_order, ii.created_at;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_invoice_items_with_order_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invoice_items_with_order_info(UUID) TO service_role;

COMMENT ON FUNCTION public.get_invoice_items_with_order_info IS 'Get invoice items with order information from orders table (with fallback to metadata), using LEFT JOIN on service_reference';
