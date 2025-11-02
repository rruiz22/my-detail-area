-- =====================================================
-- INVOICE COMMENTS SYSTEM
-- Created: 2025-11-03
-- Description: Comments system for invoices
-- =====================================================

-- =====================================================
-- TABLE: invoice_comments
-- Purpose: Store comments for invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoice_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  dealership_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true, -- true = internal note, false = customer-visible
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT comment_not_empty CHECK (LENGTH(TRIM(comment)) > 0)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_invoice_comments_invoice ON public.invoice_comments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_comments_dealership ON public.invoice_comments(dealership_id);
CREATE INDEX IF NOT EXISTS idx_invoice_comments_user ON public.invoice_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_comments_created ON public.invoice_comments(created_at DESC);

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_invoice_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_comments_updated_at
  BEFORE UPDATE ON public.invoice_comments
  FOR EACH ROW
  WHEN (OLD.comment IS DISTINCT FROM NEW.comment)
  EXECUTE FUNCTION update_invoice_comments_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.invoice_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments for their accessible dealerships
CREATE POLICY "Users can view comments for their accessible dealerships"
  ON public.invoice_comments
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Users can create comments for their accessible dealerships
CREATE POLICY "Users can create comments for their accessible dealerships"
  ON public.invoice_comments
  FOR INSERT
  WITH CHECK (
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
    AND user_id = auth.uid()
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON public.invoice_comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.invoice_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get comments for an invoice with user info
CREATE OR REPLACE FUNCTION get_invoice_comments_with_users(p_invoice_id UUID)
RETURNS TABLE (
  id UUID,
  invoice_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  comment TEXT,
  is_internal BOOLEAN,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ic.id,
    ic.invoice_id,
    ic.user_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as user_name,
    u.email as user_email,
    ic.comment,
    ic.is_internal,
    ic.is_edited,
    ic.created_at,
    ic.updated_at
  FROM public.invoice_comments ic
  LEFT JOIN public.users u ON ic.user_id = u.id
  WHERE ic.invoice_id = p_invoice_id
  ORDER BY ic.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.invoice_comments IS 'Comments and notes for invoices';
COMMENT ON COLUMN public.invoice_comments.is_internal IS 'Internal notes (not visible to customers)';
COMMENT ON COLUMN public.invoice_comments.is_edited IS 'Indicates if comment has been edited';
