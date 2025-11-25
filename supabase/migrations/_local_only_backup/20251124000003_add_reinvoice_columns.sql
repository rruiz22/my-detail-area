-- =====================================================
-- Add Re-Invoice Columns to Invoices Table
-- Created: 2025-11-24
-- Description: Support for invoice parent-child relationships and re-invoicing
-- =====================================================

-- Add re-invoice columns to invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS parent_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reinvoice_sequence TEXT,
ADD COLUMN IF NOT EXISTS is_reinvoice BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN public.invoices.parent_invoice_id IS 'Direct parent invoice (for re-invoicing chain)';
COMMENT ON COLUMN public.invoices.reinvoice_sequence IS 'Sequence letter: A, B, C, etc.';
COMMENT ON COLUMN public.invoices.is_reinvoice IS 'True if this is a re-invoice (child)';
COMMENT ON COLUMN public.invoices.original_invoice_id IS 'Root/original invoice in the chain';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_invoices_parent_id
ON public.invoices(parent_invoice_id)
WHERE parent_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_original_id
ON public.invoices(original_invoice_id)
WHERE original_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_is_reinvoice
ON public.invoices(is_reinvoice)
WHERE is_reinvoice = TRUE;

-- Create check constraint for reinvoice_sequence (A-Z only)
ALTER TABLE public.invoices
ADD CONSTRAINT check_reinvoice_sequence_format
CHECK (reinvoice_sequence IS NULL OR reinvoice_sequence ~ '^[A-Z]$');

-- Update status enum to include 'partially_paid' if not exists
-- Note: This assumes the status column is TEXT, not ENUM
-- If it's an ENUM, you'll need to use ALTER TYPE instead
