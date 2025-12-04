-- Migration: Add tags to get_invoices_with_filters RPC
-- Problem: RPC does not return invoice tags
-- Solution: Add LEFT JOIN with invoice_tag_relations and invoice_tags, use JSON aggregation to collect tags

-- Drop existing function
DROP FUNCTION IF EXISTS get_invoices_with_filters(bigint, text, text, timestamp with time zone, timestamp with time zone, text, boolean);

-- Recreate function with tags field
CREATE OR REPLACE FUNCTION get_invoices_with_filters(
  p_dealer_id bigint,
  p_status text DEFAULT NULL,
  p_order_type text DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_search_term text DEFAULT NULL,
  p_exclude_reinvoices boolean DEFAULT FALSE
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
  -- NEW: Tags field
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
    COALESCE(i.metadata->>'order_type', 'unknown') AS order_type,
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
    -- NEW: Aggregate tags into JSONB array
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
  -- NEW: Join with invoice_tag_relations and invoice_tags to get tags
  LEFT JOIN public.invoice_tag_relations itr ON itr.invoice_id = i.id
  LEFT JOIN public.invoice_tags it ON it.id = itr.tag_id
  WHERE i.dealer_id = p_dealer_id::integer
    -- Filter by status
    AND (p_status IS NULL OR i.status = p_status)
    -- Filter by order type
    AND (p_order_type IS NULL OR i.metadata->>'order_type' = p_order_type)
    -- Filter by date range
    AND (p_start_date IS NULL OR i.issue_date >= p_start_date)
    AND (p_end_date IS NULL OR i.issue_date <= p_end_date)
    -- Search term (invoice number, customer name, VIN)
    AND (
      p_search_term IS NULL OR
      i.invoice_number ILIKE '%' || p_search_term || '%' OR
      i.metadata->>'customer_name' ILIKE '%' || p_search_term || '%' OR
      i.metadata->>'vin' ILIKE '%' || p_search_term || '%'
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
    o.vehicle_vin
  ORDER BY i.created_at DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_invoices_with_filters TO authenticated;

-- Comment on function
COMMENT ON FUNCTION get_invoices_with_filters IS 'Fetches invoices with filters, includes comments count, child invoices count, and tags for each invoice';
