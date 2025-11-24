-- =====================================================
-- COMPLETE RE-INVOICE SYSTEM MIGRATION
-- Execute este SQL completo en Supabase SQL Editor
-- =====================================================

-- STEP 1: Add re-invoice columns to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reinvoice_sequence TEXT,
ADD COLUMN IF NOT EXISTS is_reinvoice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_parent_invoice_id ON public.invoices(parent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_original_invoice_id ON public.invoices(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_is_reinvoice ON public.invoices(is_reinvoice);

-- STEP 2: Create re-invoice history table
CREATE TABLE IF NOT EXISTS public.invoice_reinvoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  child_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reinvoice_sequence TEXT NOT NULL,
  unpaid_items_count INTEGER NOT NULL CHECK (unpaid_items_count > 0),
  unpaid_amount DECIMAL(10, 2) NOT NULL CHECK (unpaid_amount > 0),
  reason TEXT DEFAULT 'partial_payment',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_child_invoice UNIQUE (child_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_reinvoice_history_parent ON public.invoice_reinvoice_history(parent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_reinvoice_history_child ON public.invoice_reinvoice_history(child_invoice_id);
CREATE INDEX IF NOT EXISTS idx_reinvoice_history_created_at ON public.invoice_reinvoice_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.invoice_reinvoice_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_reinvoice_history
DROP POLICY IF EXISTS "Users can view reinvoice history for their dealerships" ON public.invoice_reinvoice_history;
CREATE POLICY "Users can view reinvoice history for their dealerships"
ON public.invoice_reinvoice_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    INNER JOIN public.dealer_memberships dm ON i.dealer_id = dm.dealer_id
    WHERE i.id = invoice_reinvoice_history.parent_invoice_id
    AND dm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create reinvoice history for their dealerships" ON public.invoice_reinvoice_history;
CREATE POLICY "Users can create reinvoice history for their dealerships"
ON public.invoice_reinvoice_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i
    INNER JOIN public.dealer_memberships dm ON i.dealer_id = dm.dealer_id
    WHERE i.id = invoice_reinvoice_history.parent_invoice_id
    AND dm.user_id = auth.uid()
  )
);

-- STEP 3: Create trigger for automatic synchronization
CREATE OR REPLACE FUNCTION public.sync_paid_items_to_original()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_item_id UUID;
  v_original_invoice_id UUID;
  v_all_paid BOOLEAN;
BEGIN
  -- Only proceed if item was just marked as paid
  IF NEW.is_paid = TRUE AND (OLD.is_paid IS NULL OR OLD.is_paid = FALSE) THEN

    -- Get original item ID from metadata
    v_original_item_id := (NEW.metadata->>'original_item_id')::UUID;

    IF v_original_item_id IS NOT NULL THEN
      -- Mark the original item as paid
      UPDATE public.invoice_items
      SET
        is_paid = TRUE,
        updated_at = NOW()
      WHERE id = v_original_item_id;

      -- Get the original invoice ID
      SELECT invoice_id INTO v_original_invoice_id
      FROM public.invoice_items
      WHERE id = v_original_item_id;

      -- Check if all items in original invoice are now paid
      SELECT NOT EXISTS (
        SELECT 1 FROM public.invoice_items
        WHERE invoice_id = v_original_invoice_id
        AND (is_paid IS NULL OR is_paid = FALSE)
      ) INTO v_all_paid;

      -- Update original invoice payment status
      IF v_all_paid THEN
        UPDATE public.invoices
        SET
          payment_status = 'paid',
          updated_at = NOW()
        WHERE id = v_original_invoice_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_paid_items ON public.invoice_items;
CREATE TRIGGER trigger_sync_paid_items
AFTER UPDATE OF is_paid ON public.invoice_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_paid_items_to_original();

-- VERIFICATION
DO $$
DECLARE
  v_columns_exist BOOLEAN;
  v_table_exists BOOLEAN;
  v_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  -- Check columns
  SELECT COUNT(*) = 4 INTO v_columns_exist
  FROM information_schema.columns
  WHERE table_name = 'invoices'
  AND column_name IN ('parent_invoice_id', 'reinvoice_sequence', 'is_reinvoice', 'original_invoice_id');

  -- Check table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'invoice_reinvoice_history'
  ) INTO v_table_exists;

  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_reinvoice_from_unpaid'
  ) INTO v_function_exists;

  -- Check trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_sync_paid_items'
  ) INTO v_trigger_exists;

  -- Report
  RAISE NOTICE '=== MIGRATION VERIFICATION ===';
  RAISE NOTICE 'Invoice columns: %', CASE WHEN v_columns_exist THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE 'History table: %', CASE WHEN v_table_exists THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE 'RPC function: %', CASE WHEN v_function_exists THEN '✅ OK' ELSE '❌ MISSING' END;
  RAISE NOTICE 'Sync trigger: %', CASE WHEN v_trigger_exists THEN '✅ OK' ELSE '❌ MISSING' END;

  IF v_columns_exist AND v_table_exists AND v_function_exists AND v_trigger_exists THEN
    RAISE NOTICE '=== ✅ MIGRATION COMPLETE ===';
  ELSE
    RAISE NOTICE '=== ❌ MIGRATION INCOMPLETE ===';
  END IF;
END $$;
