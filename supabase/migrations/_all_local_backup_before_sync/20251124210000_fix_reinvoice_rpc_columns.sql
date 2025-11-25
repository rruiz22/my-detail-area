-- =====================================================
-- FIX RE-INVOICE RPC - Correct Column Names
-- Execute este SQL en Supabase SQL Editor
-- =====================================================

-- Drop and recreate the RPC function with correct column names
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

  -- Prevent re-invoicing a re-invoice (only allow from original invoices)
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

  v_sequence_letter := CHR(65 + v_sequence_number); -- A=65 in ASCII

  -- Determine original invoice ID (root of chain)
  v_original_invoice_id := COALESCE(v_parent_invoice.original_invoice_id, p_parent_invoice_id);

  -- Generate new invoice number
  v_new_invoice_number := v_parent_invoice.invoice_number || '-' || v_sequence_letter;

  -- Create new invoice (re-invoice)
  -- NOTE: Using correct column names from invoices table
  INSERT INTO public.invoices (
    dealer_id,
    invoice_number,
    order_id,
    order_type,
    customer_name,
    customer_email,
    customer_phone,
    subtotal,
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
    order_type,
    customer_name,
    customer_email,
    customer_phone,
    0, -- subtotal (will be recalculated from items)
    0, -- tax_amount
    0, -- discount_amount
    v_unpaid_total, -- total_amount
    0, -- amount_paid
    v_unpaid_total, -- amount_due
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

  -- Copy only unpaid items to new invoice
  INSERT INTO public.invoice_items (
    invoice_id,
    order_id,
    order_type,
    description,
    quantity,
    unit_price,
    discount_percent,
    tax_percent,
    total_amount,
    is_paid,
    sort_order,
    metadata
  )
  SELECT
    v_new_invoice_id,
    order_id,
    order_type,
    description,
    quantity,
    unit_price,
    discount_percent,
    tax_percent,
    total_amount,
    FALSE, -- Start as unpaid
    sort_order,
    jsonb_build_object(
      'original_item_id', id,
      'copied_from_invoice', v_parent_invoice.invoice_number,
      're_invoice_sequence', v_sequence_letter
    )
  FROM public.invoice_items
  WHERE invoice_id = p_parent_invoice_id
  AND (is_paid IS NULL OR is_paid = FALSE);

  -- Update parent invoice status to partially_paid
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

-- Grant permissions to all roles
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO anon;

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_reinvoice_from_unpaid') THEN
    RAISE NOTICE '✅ RPC function recreated successfully with correct column names';
  ELSE
    RAISE NOTICE '❌ RPC function creation failed';
  END IF;
END $$;
