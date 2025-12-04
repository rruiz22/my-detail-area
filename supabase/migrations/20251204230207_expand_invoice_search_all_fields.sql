-- Migration: Expand invoice search to include all available fields
-- Problem: Search only covers invoice number, customer name, and VIN
-- Solution: Add search for order numbers, stock, PO, RO, tag, vehicle info, contact info, notes, invoice tags, and service names

-- Drop existing function
DROP FUNCTION IF EXISTS get_invoices_with_filters(bigint, text, text, timestamp with time zone, timestamp with time zone, text, boolean, text[]);

-- Recreate function with expanded search fields
CREATE OR REPLACE FUNCTION get_invoices_with_filters(
  p_dealer_id bigint,
  p_status text DEFAULT NULL,
  p_order_type text DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_search_term text DEFAULT NULL,
  p_exclude_reinvoices boolean DEFAULT FALSE,
  p_tag_names text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  dealer_id integer,
  invoice_number text,
  order_id uuid,
  issue_date timestamp with time zone,
  due_date timestamp with time zone,
  subtotal numeric,
  tax_rate numeric,
  tax_amount numeric,
  discount_amount numeric,
  total_amount numeric,
  amount_paid numeric,
  amount_due numeric,
  status text,
  invoice_notes text,
  metadata jsonb,
  created_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  parent_invoice_id uuid,
  reinvoice_sequence text,
  is_reinvoice boolean,
  original_invoice_id uuid,
  order_type text,
  customer_name text,
  vin text,
  comments_count bigint,
  child_invoices_count bigint,
  paid_at timestamp with time zone,
  cancelled_at timestamp with time zone,
  email_sent_at timestamp with time zone,
  email_sent_count integer,
  last_email_recipient text,
  -- Order-related fields
  order_number text,
  custom_order_number text,
  customer_email text,
  customer_phone text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  vehicle_vin text,
  vehicle_info text,
  -- Tags field
  tags jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.dealer_id,
    i.invoice_number,
    i.order_id,
    i.issue_date,
    i.due_date,
    i.subtotal,
    i.tax_rate,
    i.tax_amount,
    i.discount_amount,
    i.total_amount,
    i.amount_paid,
    i.amount_due,
    i.status,
    i.invoice_notes,
    i.metadata,
    i.created_by,
    i.created_at,
    i.updated_at,
    i.parent_invoice_id,
    i.reinvoice_sequence,
    i.is_reinvoice,
    i.original_invoice_id,
    -- Extract order type and customer info from metadata
    COALESCE(i.metadata->>'order_type', i.metadata->>'department', 'unknown') AS order_type,
    COALESCE(i.metadata->>'customer_name', '') AS customer_name,
    COALESCE(i.metadata->>'vin', '') AS vin,
    -- Count comments for this invoice
    COUNT(DISTINCT ic.id)::bigint AS comments_count,
    -- Count child invoices (reinvoices) for this invoice
    (
      SELECT COUNT(*)::bigint
      FROM public.invoices child
      WHERE child.parent_invoice_id = i.id
         OR child.original_invoice_id = i.id
    ) AS child_invoices_count,
    i.paid_at,
    i.cancelled_at,
    i.email_sent_at,
    i.email_sent_count,
    i.last_email_recipient,
    -- Order-related fields from orders table
    o.order_number,
    o.custom_order_number,
    o.customer_email,
    o.customer_phone,
    o.vehicle_make,
    o.vehicle_model,
    o.vehicle_year::text,
    o.vehicle_vin,
    CONCAT_WS(' ', o.vehicle_year, o.vehicle_make, o.vehicle_model) AS vehicle_info,
    -- Aggregate tags into JSONB array
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', it.id,
          'tagName', it.tag_name,
          'colorIndex', it.color_index
        )
      ) FILTER (WHERE it.id IS NOT NULL),
      '[]'::jsonb
    ) AS tags
  FROM public.invoices i
  -- Join with invoice_comments to get comment count
  LEFT JOIN public.invoice_comments ic ON ic.invoice_id = i.id
  -- Join with orders table to get order details
  LEFT JOIN public.orders o ON o.id = i.order_id
  -- Join with invoice_tag_relations and invoice_tags to get tags
  LEFT JOIN public.invoice_tag_relations itr ON itr.invoice_id = i.id
  LEFT JOIN public.invoice_tags it ON it.id = itr.tag_id
  WHERE i.dealer_id = p_dealer_id::integer
    -- Filter by status
    AND (p_status IS NULL OR i.status = p_status)
    -- Filter by department (stored in metadata->>'department')
    AND (
      p_order_type IS NULL OR
      i.metadata->>'department' = p_order_type OR
      i.metadata->>'order_type' = p_order_type
    )
    -- Filter by date range
    AND (p_start_date IS NULL OR i.issue_date >= p_start_date)
    AND (p_end_date IS NULL OR i.issue_date <= p_end_date)
    -- EXPANDED SEARCH: Now searches across ALL relevant fields
    AND (
      p_search_term IS NULL OR
      -- Invoice identifiers
      i.invoice_number ILIKE '%' || p_search_term || '%' OR
      -- Customer info from metadata
      i.metadata->>'customer_name' ILIKE '%' || p_search_term || '%' OR
      i.metadata->>'vin' ILIKE '%' || p_search_term || '%' OR
      -- Order identifiers (stock, PO, RO, tag)
      o.order_number ILIKE '%' || p_search_term || '%' OR
      o.custom_order_number ILIKE '%' || p_search_term || '%' OR
      o.stock_number ILIKE '%' || p_search_term || '%' OR
      o.po ILIKE '%' || p_search_term || '%' OR
      o.ro ILIKE '%' || p_search_term || '%' OR
      o.tag ILIKE '%' || p_search_term || '%' OR
      -- Vehicle information
      o.vehicle_make ILIKE '%' || p_search_term || '%' OR
      o.vehicle_model ILIKE '%' || p_search_term || '%' OR
      o.vehicle_year::text ILIKE '%' || p_search_term || '%' OR
      o.vehicle_vin ILIKE '%' || p_search_term || '%' OR
      CONCAT_WS(' ', o.vehicle_year, o.vehicle_make, o.vehicle_model) ILIKE '%' || p_search_term || '%' OR
      -- Customer contact information
      o.customer_email ILIKE '%' || p_search_term || '%' OR
      o.customer_phone ILIKE '%' || p_search_term || '%' OR
      -- Invoice notes
      i.invoice_notes ILIKE '%' || p_search_term || '%' OR
      -- Invoice tag names
      EXISTS (
        SELECT 1 FROM public.invoice_tag_relations itr_search
        JOIN public.invoice_tags it_search ON it_search.id = itr_search.tag_id
        WHERE itr_search.invoice_id = i.id
          AND it_search.tag_name ILIKE '%' || p_search_term || '%'
      ) OR
      -- Service names (for service and carwash orders)
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(o.services) AS service
        WHERE service->>'name' ILIKE '%' || p_search_term || '%'
      )
    )
    -- Filter by invoice tags (if p_tag_names is provided and not empty)
    AND (
      p_tag_names IS NULL OR
      array_length(p_tag_names, 1) IS NULL OR
      EXISTS (
        SELECT 1
        FROM public.invoice_tag_relations itr_filter
        JOIN public.invoice_tags it_filter ON it_filter.id = itr_filter.tag_id
        WHERE itr_filter.invoice_id = i.id
          AND it_filter.tag_name = ANY(p_tag_names)
      )
    )
    -- Exclude re-invoices if requested
    AND (
      p_exclude_reinvoices = FALSE OR
      i.is_reinvoice IS NULL OR
      i.is_reinvoice = FALSE
    )
  -- Group by all invoice and order fields to enable COUNT/AGG aggregation
  GROUP BY
    i.id,
    i.dealer_id,
    i.invoice_number,
    i.order_id,
    i.issue_date,
    i.due_date,
    i.subtotal,
    i.tax_rate,
    i.tax_amount,
    i.discount_amount,
    i.total_amount,
    i.amount_paid,
    i.amount_due,
    i.status,
    i.invoice_notes,
    i.metadata,
    i.created_by,
    i.created_at,
    i.updated_at,
    i.parent_invoice_id,
    i.reinvoice_sequence,
    i.is_reinvoice,
    i.original_invoice_id,
    i.paid_at,
    i.cancelled_at,
    i.email_sent_at,
    i.email_sent_count,
    i.last_email_recipient,
    o.order_number,
    o.custom_order_number,
    o.customer_email,
    o.customer_phone,
    o.vehicle_make,
    o.vehicle_model,
    o.vehicle_year,
    o.vehicle_vin,
    o.stock_number,
    o.po,
    o.ro,
    o.tag,
    o.services
  ORDER BY i.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_invoices_with_filters TO authenticated;

-- Comment on function
COMMENT ON FUNCTION get_invoices_with_filters IS 'Fetches invoices with comprehensive search across all fields: invoice #, order #, stock, PO, RO, tag, customer info, vehicle details, notes, invoice tags, and service names';
