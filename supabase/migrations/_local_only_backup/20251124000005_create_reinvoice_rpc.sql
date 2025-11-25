-- =====================================================
-- Create RPC: create_reinvoice_from_unpaid
-- Created: 2025-11-24
-- Description: Create a new re-invoice from unpaid items of a parent invoice
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_reinvoice_from_unpaid(
  p_parent_invoice_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parent_invoice RECORD;
  v_unpaid_items RECORD[];
  v_new_invoice_id UUID;
  v_new_invoice_number TEXT;
  v_next_sequence CHAR(1);
  v_unpaid_count INTEGER;
  v_unpaid_total DECIMAL(10, 2);
  v_new_item RECORD;
BEGIN
  -- 1. Get parent invoice details
  SELECT * INTO v_parent_invoice
  FROM public.invoices
  WHERE id = p_parent_invoice_id;

  IF v_parent_invoice IS NULL THEN
    RAISE EXCEPTION 'Parent invoice not found: %', p_parent_invoice_id;
  END IF;

  -- 2. Count unpaid items
  SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
  INTO v_unpaid_count, v_unpaid_total
  FROM public.invoice_items
  WHERE invoice_id = p_parent_invoice_id
  AND is_paid = FALSE;

  IF v_unpaid_count = 0 THEN
    RAISE EXCEPTION 'No unpaid items found in invoice %', v_parent_invoice.invoice_number;
  END IF;

  -- 3. Determine next sequence letter (A, B, C...)
  SELECT COALESCE(
    CHR(ASCII(MAX(reinvoice_sequence)) + 1),
    'A'
  ) INTO v_next_sequence
  FROM public.invoices
  WHERE parent_invoice_id = p_parent_invoice_id
  OR (
    original_invoice_id = p_parent_invoice_id
    AND is_reinvoice = TRUE
  );

  -- Check if we've exceeded Z
  IF ASCII(v_next_sequence) > ASCII('Z') THEN
    RAISE EXCEPTION 'Maximum re-invoice limit reached (Z) for invoice %', v_parent_invoice.invoice_number;
  END IF;

  -- 4. Generate new invoice number: INV-25-0013-A
  v_new_invoice_number := v_parent_invoice.invoice_number || '-' || v_next_sequence;

  -- 5. Create new re-invoice
  INSERT INTO public.invoices (
    invoice_number,
    order_id,
    dealer_id,
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
    invoice_notes,
    terms_and_conditions,
    parent_invoice_id,
    original_invoice_id,
    reinvoice_sequence,
    is_reinvoice,
    metadata
  ) VALUES (
    v_new_invoice_number,
    v_parent_invoice.order_id,
    v_parent_invoice.dealer_id,
    p_user_id,
    NOW(),
    NOW() + INTERVAL '30 days', -- Default 30 days from now
    v_unpaid_total,
    v_parent_invoice.tax_rate,
    v_unpaid_total * (v_parent_invoice.tax_rate / 100),
    0, -- No discount
    v_unpaid_total + (v_unpaid_total * (v_parent_invoice.tax_rate / 100)),
    0, -- Not paid yet
    v_unpaid_total + (v_unpaid_total * (v_parent_invoice.tax_rate / 100)),
    'pending',
    'Re-invoice for unpaid items from ' || v_parent_invoice.invoice_number,
    v_parent_invoice.terms_and_conditions,
    p_parent_invoice_id,
    COALESCE(v_parent_invoice.original_invoice_id, p_parent_invoice_id), -- Track root
    v_next_sequence,
    TRUE,
    jsonb_build_object(
      'reinvoice_reason', 'unpaid_items',
      'parent_invoice_number', v_parent_invoice.invoice_number,
      'unpaid_items_count', v_unpaid_count
    )
  )
  RETURNING id INTO v_new_invoice_id;

  -- 6. Copy unpaid items to new invoice
  FOR v_new_item IN
    SELECT *
    FROM public.invoice_items
    WHERE invoice_id = p_parent_invoice_id
    AND is_paid = FALSE
    ORDER BY sort_order
  LOOP
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
      sort_order,
      is_paid,
      metadata
    ) VALUES (
      v_new_invoice_id,
      v_new_item.item_type,
      v_new_item.description,
      v_new_item.quantity,
      v_new_item.unit_price,
      v_new_item.discount_amount,
      v_new_item.tax_rate,
      v_new_item.total_amount,
      v_new_item.service_reference, -- Same reference to track across invoices
      v_new_item.sort_order,
      FALSE, -- Start as unpaid
      jsonb_build_object(
        'original_item_id', v_new_item.id,
        'copied_from_invoice', v_parent_invoice.invoice_number
      ) || v_new_item.metadata
    );
  END LOOP;

  -- 7. Update parent invoice status to 'partially_paid' if it was 'pending'
  IF v_parent_invoice.status = 'pending' THEN
    UPDATE public.invoices
    SET status = 'partially_paid',
        updated_at = NOW()
    WHERE id = p_parent_invoice_id;
  END IF;

  -- 8. Create history record
  INSERT INTO public.invoice_reinvoice_history (
    parent_invoice_id,
    child_invoice_id,
    reinvoice_sequence,
    unpaid_items_count,
    unpaid_amount,
    created_by
  ) VALUES (
    p_parent_invoice_id,
    v_new_invoice_id,
    v_next_sequence,
    v_unpaid_count,
    v_unpaid_total,
    p_user_id
  );

  -- 9. Return new invoice ID
  RETURN v_new_invoice_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.create_reinvoice_from_unpaid IS 'Create a new re-invoice containing only unpaid items from a parent invoice';
