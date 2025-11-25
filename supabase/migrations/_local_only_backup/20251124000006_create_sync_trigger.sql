-- =====================================================
-- Create Trigger: Sync Paid Items to Original Invoice
-- Created: 2025-11-24
-- Description: When an item is marked as paid in a re-invoice,
--              automatically mark the corresponding item in the original invoice
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_paid_items_to_original()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_original_item_id UUID;
  v_original_invoice_id UUID;
  v_parent_invoice RECORD;
  v_all_items_paid BOOLEAN;
BEGIN
  -- Only trigger when is_paid changes from FALSE to TRUE
  IF NEW.is_paid = TRUE AND (OLD.is_paid IS NULL OR OLD.is_paid = FALSE) THEN

    -- Get the original item ID from metadata
    v_original_item_id := (NEW.metadata->>'original_item_id')::UUID;

    IF v_original_item_id IS NOT NULL THEN
      -- Mark the original item as paid
      UPDATE public.invoice_items
      SET is_paid = TRUE,
          updated_at = NOW()
      WHERE id = v_original_item_id;

      -- Get the original item's invoice to check status
      SELECT ii.invoice_id INTO v_original_invoice_id
      FROM public.invoice_items ii
      WHERE ii.id = v_original_item_id;

      IF v_original_invoice_id IS NOT NULL THEN
        -- Check if all items in the original invoice are now paid
        SELECT NOT EXISTS (
          SELECT 1
          FROM public.invoice_items
          WHERE invoice_id = v_original_invoice_id
          AND is_paid = FALSE
        ) INTO v_all_items_paid;

        -- If all items are paid, update invoice status to 'paid'
        IF v_all_items_paid THEN
          UPDATE public.invoices
          SET status = 'paid',
              paid_at = NOW(),
              amount_paid = total_amount,
              amount_due = 0,
              updated_at = NOW()
          WHERE id = v_original_invoice_id;
        ELSE
          -- Otherwise, ensure it's marked as 'partially_paid'
          UPDATE public.invoices
          SET status = 'partially_paid',
              updated_at = NOW()
          WHERE id = v_original_invoice_id
          AND status NOT IN ('paid', 'cancelled');
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on invoice_items
DROP TRIGGER IF EXISTS trigger_sync_paid_items ON public.invoice_items;

CREATE TRIGGER trigger_sync_paid_items
AFTER UPDATE OF is_paid ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_paid_items_to_original();

COMMENT ON FUNCTION public.sync_paid_items_to_original IS 'Automatically sync paid status from re-invoice items to original invoice items';
