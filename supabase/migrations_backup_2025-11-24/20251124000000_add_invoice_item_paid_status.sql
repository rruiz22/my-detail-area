-- =====================================================
-- Add is_paid column to invoice_items table
-- Created: 2025-11-24
-- Description: Track individual invoice item payment status
-- =====================================================

-- Add is_paid column to invoice_items
ALTER TABLE public.invoice_items
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;

-- Add comment to column
COMMENT ON COLUMN public.invoice_items.is_paid IS 'Indicates if this specific invoice item has been paid';

-- Create index for efficient queries filtering by paid status
CREATE INDEX IF NOT EXISTS idx_invoice_items_is_paid
ON public.invoice_items(invoice_id, is_paid);

-- Create index for querying unpaid items across invoices
CREATE INDEX IF NOT EXISTS idx_invoice_items_unpaid
ON public.invoice_items(is_paid)
WHERE is_paid = FALSE;

-- Update RLS policy if needed (inherit from existing invoice_items policies)
-- No new RLS policies needed - existing policies on invoice_items table apply
