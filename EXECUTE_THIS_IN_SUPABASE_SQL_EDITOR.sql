-- =====================================================
-- PASO 1: Abrir Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
-- =====================================================

-- PASO 2: Copiar y pegar este SQL completo y ejecutar
-- =====================================================

-- Step 1: Add columns to invoices (if not exists)
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reinvoice_sequence TEXT,
ADD COLUMN IF NOT EXISTS is_reinvoice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_parent_id ON public.invoices(parent_invoice_id) WHERE parent_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_original_id ON public.invoices(original_invoice_id) WHERE original_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_is_reinvoice ON public.invoices(is_reinvoice) WHERE is_reinvoice = TRUE;

-- Step 2: Create history table (if not exists)
CREATE TABLE IF NOT EXISTS public.invoice_reinvoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  child_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reinvoice_sequence TEXT NOT NULL,
  unpaid_items_count INTEGER NOT NULL,
  unpaid_amount DECIMAL(10, 2) NOT NULL,
  reason TEXT DEFAULT 'unpaid_items',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_unpaid_items_positive CHECK (unpaid_items_count > 0),
  CONSTRAINT check_unpaid_amount_positive CHECK (unpaid_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_reinvoice_history_parent ON public.invoice_reinvoice_history(parent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_reinvoice_history_child ON public.invoice_reinvoice_history(child_invoice_id);

ALTER TABLE public.invoice_reinvoice_history ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RPC function (complete)
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
  v_new_invoice_id UUID;
  v_new_invoice_number TEXT;
  v_next_sequence TEXT;
  v_unpaid_count INTEGER;
  v_unpaid_total DECIMAL(10, 2);
  v_new_item RECORD;
BEGIN
  SELECT * INTO v_parent_invoice FROM public.invoices WHERE id = p_parent_invoice_id;
  IF v_parent_invoice IS NULL THEN
    RAISE EXCEPTION 'Parent invoice not found';
  END IF;

  SELECT COUNT(*), COALESCE(SUM(total_amount), 0) INTO v_unpaid_count, v_unpaid_total
  FROM public.invoice_items WHERE invoice_id = p_parent_invoice_id AND is_paid = FALSE;

  IF v_unpaid_count = 0 THEN
    RAISE EXCEPTION 'No unpaid items found';
  END IF;

  SELECT COALESCE(CHR(ASCII(MAX(reinvoice_sequence)) + 1), 'A') INTO v_next_sequence
  FROM public.invoices WHERE parent_invoice_id = p_parent_invoice_id OR (original_invoice_id = p_parent_invoice_id AND is_reinvoice = TRUE);

  v_new_invoice_number := v_parent_invoice.invoice_number || '-' || v_next_sequence;

  INSERT INTO public.invoices (
    invoice_number, order_id, dealer_id, created_by, issue_date, due_date,
    subtotal, tax_rate, tax_amount, discount_amount, total_amount, amount_paid, amount_due,
    status, parent_invoice_id, original_invoice_id, reinvoice_sequence, is_reinvoice
  ) VALUES (
    v_new_invoice_number, v_parent_invoice.order_id, v_parent_invoice.dealer_id, p_user_id,
    NOW(), NOW() + INTERVAL '30 days', v_unpaid_total, v_parent_invoice.tax_rate,
    v_unpaid_total * (v_parent_invoice.tax_rate / 100), 0,
    v_unpaid_total + (v_unpaid_total * (v_parent_invoice.tax_rate / 100)),
    0, v_unpaid_total + (v_unpaid_total * (v_parent_invoice.tax_rate / 100)),
    'pending', p_parent_invoice_id, COALESCE(v_parent_invoice.original_invoice_id, p_parent_invoice_id),
    v_next_sequence, TRUE
  ) RETURNING id INTO v_new_invoice_id;

  FOR v_new_item IN SELECT * FROM public.invoice_items WHERE invoice_id = p_parent_invoice_id AND is_paid = FALSE LOOP
    INSERT INTO public.invoice_items (
      invoice_id, item_type, description, quantity, unit_price, discount_amount,
      tax_rate, total_amount, service_reference, sort_order, is_paid, metadata
    ) VALUES (
      v_new_invoice_id, v_new_item.item_type, v_new_item.description,
      v_new_item.quantity, v_new_item.unit_price, v_new_item.discount_amount,
      v_new_item.tax_rate, v_new_item.total_amount, v_new_item.service_reference,
      v_new_item.sort_order, FALSE,
      jsonb_build_object('original_item_id', v_new_item.id) || COALESCE(v_new_item.metadata, '{}'::jsonb)
    );
  END LOOP;

  UPDATE public.invoices SET status = 'partially_paid' WHERE id = p_parent_invoice_id AND status = 'pending';

  INSERT INTO public.invoice_reinvoice_history (
    parent_invoice_id, child_invoice_id, reinvoice_sequence, unpaid_items_count, unpaid_amount, created_by
  ) VALUES (p_parent_invoice_id, v_new_invoice_id, v_next_sequence, v_unpaid_count, v_unpaid_total, p_user_id);

  RETURN v_new_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO service_role;

-- Step 4: Create sync trigger
CREATE OR REPLACE FUNCTION public.sync_paid_items_to_original()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_original_item_id UUID;
  v_original_invoice_id UUID;
  v_all_paid BOOLEAN;
BEGIN
  IF NEW.is_paid = TRUE AND (OLD.is_paid IS NULL OR OLD.is_paid = FALSE) THEN
    v_original_item_id := (NEW.metadata->>'original_item_id')::UUID;
    IF v_original_item_id IS NOT NULL THEN
      UPDATE public.invoice_items SET is_paid = TRUE WHERE id = v_original_item_id;
      SELECT invoice_id INTO v_original_invoice_id FROM public.invoice_items WHERE id = v_original_item_id;
      IF v_original_invoice_id IS NOT NULL THEN
        SELECT NOT EXISTS(SELECT 1 FROM public.invoice_items WHERE invoice_id = v_original_invoice_id AND is_paid = FALSE) INTO v_all_paid;
        IF v_all_paid THEN
          UPDATE public.invoices SET status = 'paid', paid_at = NOW() WHERE id = v_original_invoice_id;
        ELSE
          UPDATE public.invoices SET status = 'partially_paid' WHERE id = v_original_invoice_id AND status NOT IN ('paid', 'cancelled');
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_paid_items ON public.invoice_items;
CREATE TRIGGER trigger_sync_paid_items AFTER UPDATE OF is_paid ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.sync_paid_items_to_original();

-- =====================================================
-- PASO 3: Verificar que todo se ejecutó correctamente
-- =====================================================

-- Verificar columnas nuevas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'invoices'
AND column_name IN ('parent_invoice_id', 'reinvoice_sequence', 'is_reinvoice', 'original_invoice_id');

-- Verificar tabla de historial
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'invoice_reinvoice_history'
) AS history_table_exists;

-- Verificar RPC function
SELECT EXISTS (
  SELECT FROM pg_proc
  WHERE proname = 'create_reinvoice_from_unpaid'
) AS rpc_function_exists;

-- Verificar trigger
SELECT EXISTS (
  SELECT FROM pg_trigger
  WHERE tgname = 'trigger_sync_paid_items'
) AS trigger_exists;
