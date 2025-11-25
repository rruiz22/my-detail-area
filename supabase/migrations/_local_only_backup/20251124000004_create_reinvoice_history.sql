-- =====================================================
-- Create Invoice Re-Invoice History Table
-- Created: 2025-11-24
-- Description: Track all re-invoicing operations for audit trail
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoice_reinvoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invoice relationships
  parent_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  child_invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

  -- Re-invoice details
  reinvoice_sequence TEXT NOT NULL, -- 'A', 'B', 'C'...
  unpaid_items_count INTEGER NOT NULL,
  unpaid_amount DECIMAL(10, 2) NOT NULL,

  -- Reason and metadata
  reason TEXT DEFAULT 'unpaid_items',
  notes TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_unpaid_items_positive CHECK (unpaid_items_count > 0),
  CONSTRAINT check_unpaid_amount_positive CHECK (unpaid_amount > 0)
);

-- Add comments
COMMENT ON TABLE public.invoice_reinvoice_history IS 'Audit trail of all re-invoicing operations';
COMMENT ON COLUMN public.invoice_reinvoice_history.parent_invoice_id IS 'Original invoice being re-invoiced';
COMMENT ON COLUMN public.invoice_reinvoice_history.child_invoice_id IS 'New re-invoice created';
COMMENT ON COLUMN public.invoice_reinvoice_history.unpaid_items_count IS 'Number of unpaid items copied to child';
COMMENT ON COLUMN public.invoice_reinvoice_history.unpaid_amount IS 'Total amount of unpaid items';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reinvoice_history_parent
ON public.invoice_reinvoice_history(parent_invoice_id);

CREATE INDEX IF NOT EXISTS idx_reinvoice_history_child
ON public.invoice_reinvoice_history(child_invoice_id);

CREATE INDEX IF NOT EXISTS idx_reinvoice_history_created_at
ON public.invoice_reinvoice_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.invoice_reinvoice_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Match invoice permissions
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

CREATE POLICY "Service role has full access to reinvoice history"
ON public.invoice_reinvoice_history
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');
