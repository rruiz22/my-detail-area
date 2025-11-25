-- =====================================================
-- FIX RE-INVOICE RPC - Use ONLY valid invoice columns
-- The invoices table does NOT have: order_type, customer_name, customer_email, customer_phone, payment_status
-- Those columns only exist in the orders table (referenced via order_id)
-- =====================================================

DROP FUNCTION IF EXISTS public.create_reinvoice_from_unpaid(UUID, UUID);

CREATE OR REPLACE FUNCTION public.create_reinvoice_from_unpaid(
  p_parent_invoice_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_invoice RECORD;
  v_unpaid_count INTEGER;
  v_unpaid_total DECIMAL(10, 2);
  v_new_invoice_id UUID;
  v_sequence_letter TEXT;
  v_sequence_number INTEGER;
  v_original_invoice_id UUID;
  v_new_invoice_number TEXT;
BEGIN
  -- Get parent invoice
  SELECT * INTO v_parent_invoice
  FROM public.invoices
  WHERE id = p_parent_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent invoice not found';
  END IF;

  -- Prevent re-invoicing a re-invoice
  IF v_parent_invoice.is_reinvoice THEN
    RAISE EXCEPTION 'Cannot create a re-invoice from another re-invoice. Use the original invoice.';
  END IF;

  -- Count unpaid items
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO v_unpaid_count, v_unpaid_total
  FROM public.invoice_items
  WHERE invoice_id = p_parent_invoice_id
  AND (is_paid IS NULL OR is_paid = FALSE);

  IF v_unpaid_count = 0 THEN
    RAISE EXCEPTION 'No unpaid items found in parent invoice';
  END IF;

  -- Determine sequence letter (A-Z)
  SELECT COUNT(*) INTO v_sequence_number
  FROM public.invoices
  WHERE parent_invoice_id = p_parent_invoice_id;

  IF v_sequence_number >= 26 THEN
    RAISE EXCEPTION 'Maximum re-invoice limit (26) reached for this invoice';
  END IF;

  v_sequence_letter := CHR(65 + v_sequence_number);

  -- Determine original invoice ID
  v_original_invoice_id := COALESCE(v_parent_invoice.original_invoice_id, p_parent_invoice_id);

  -- Generate new invoice number
  v_new_invoice_number := v_parent_invoice.invoice_number || '-' || v_sequence_letter;

  -- Create new invoice - ONLY using valid invoices table columns
  INSERT INTO public.invoices (
    dealer_id,
    invoice_number,
    order_id,
    created_by,
    issue_date,
    due_date,
    subtotal,
    tax_rate,
    tax_amount,
    discount_amount,
    total_amount,
    amount_paid,
    amount_due,
    status,
    parent_invoice_id,
    reinvoice_sequence,
    is_reinvoice,
    original_invoice_id,
    invoice_notes,
    metadata
  )
  SELECT
    dealer_id,
    v_new_invoice_number,
    order_id,
    p_user_id,
    NOW(),
    COALESCE(due_date, NOW() + INTERVAL '30 days'),
    0,
    COALESCE(tax_rate, 0),
    0,
    0,
    v_unpaid_total,
    0,
    v_unpaid_total,
    'active',
    p_parent_invoice_id,
    v_sequence_letter,
    TRUE,
    v_original_invoice_id,
    'Re-invoice from ' || invoice_number || ' (unpaid items only)',
    jsonb_build_object(
      're_invoice_info', jsonb_build_object(
        'parent_invoice_id', p_parent_invoice_id,
        'parent_invoice_number', invoice_number,
        'sequence', v_sequence_letter,
        'unpaid_items_count', v_unpaid_count,
        'unpaid_amount', v_unpaid_total,
        'created_at', NOW()
      )
    )
  FROM public.invoices
  WHERE id = p_parent_invoice_id
  RETURNING id INTO v_new_invoice_id;

  -- Copy unpaid items with MERGED metadata (preserves service_names, VIN, etc.)
  INSERT INTO public.invoice_items (
    invoice_id,
    item_type,
    description,
    quantity,
    unit_price,
    discount_amount,
    tax_rate,
    total_amount,
    service_reference,
    is_paid,
    sort_order,
    metadata
  )
  SELECT
    v_new_invoice_id,
    item_type,
    description,
    quantity,
    unit_price,
    discount_amount,
    tax_rate,
    total_amount,
    service_reference,
    FALSE,
    sort_order,
    -- MERGE existing metadata with re-invoice info
    COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'original_item_id', id,
      'copied_from_invoice', v_parent_invoice.invoice_number,
      're_invoice_sequence', v_sequence_letter,
      're_invoiced', true
    )
  FROM public.invoice_items
  WHERE invoice_id = p_parent_invoice_id
  AND (is_paid IS NULL OR is_paid = FALSE);

  -- Update parent invoice status
  UPDATE public.invoices
  SET
    status = 'partially_paid',
    updated_at = NOW()
  WHERE id = p_parent_invoice_id;

  -- Record in history
  INSERT INTO public.invoice_reinvoice_history (
    parent_invoice_id,
    child_invoice_id,
    reinvoice_sequence,
    unpaid_items_count,
    unpaid_amount,
    reason,
    notes,
    created_by,
    metadata
  )
  VALUES (
    p_parent_invoice_id,
    v_new_invoice_id,
    v_sequence_letter,
    v_unpaid_count,
    v_unpaid_total,
    'partial_payment',
    format('Created re-invoice %s with %s unpaid items totaling $%s', v_new_invoice_number, v_unpaid_count, v_unpaid_total),
    p_user_id,
    jsonb_build_object(
      'parent_invoice_number', v_parent_invoice.invoice_number,
      'new_invoice_number', v_new_invoice_number
    )
  );

  RETURN v_new_invoice_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO anon;
