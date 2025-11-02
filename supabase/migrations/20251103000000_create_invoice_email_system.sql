-- =====================================================
-- INVOICE EMAIL SYSTEM
-- Created: 2025-11-03
-- Description: Email contacts and history for invoice delivery
-- =====================================================

-- =====================================================
-- TABLE: invoice_email_contacts
-- Purpose: Store email contacts for each dealership
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoice_email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_title TEXT, -- "Accounting Manager", "CFO", etc.
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0),

  -- Unique constraint: one email per dealership
  CONSTRAINT unique_email_per_dealership UNIQUE(dealership_id, email)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_email_contacts_dealership ON public.invoice_email_contacts(dealership_id);
CREATE INDEX IF NOT EXISTS idx_email_contacts_active ON public.invoice_email_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_email_contacts_default ON public.invoice_email_contacts(dealership_id, is_default) WHERE is_default = true;

-- =====================================================
-- TABLE: invoice_email_history
-- Purpose: Track all sent emails for invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invoice_email_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  dealership_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  sent_to TEXT[] NOT NULL, -- Array de emails
  cc TEXT[], -- CC recipients (opcional)
  bcc TEXT[], -- BCC recipients (opcional)
  subject TEXT NOT NULL,
  message TEXT,
  attachments JSONB, -- [{filename: "invoice.pdf", size: 123456}]
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message TEXT,
  provider_response JSONB, -- Response from email service (Resend, SendGrid, etc.)
  metadata JSONB, -- Additional metadata

  CONSTRAINT sent_to_not_empty CHECK (array_length(sent_to, 1) > 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_email_history_invoice ON public.invoice_email_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_email_history_dealership ON public.invoice_email_history(dealership_id);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON public.invoice_email_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON public.invoice_email_history(sent_at DESC);

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_invoice_email_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_email_contacts_updated_at
  BEFORE UPDATE ON public.invoice_email_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_email_contacts_updated_at();

-- =====================================================
-- TRIGGER: Ensure only one default contact per dealership
-- =====================================================
CREATE OR REPLACE FUNCTION ensure_single_default_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a contact as default
  IF NEW.is_default = true THEN
    -- Unset any other default contacts for this dealership
    UPDATE public.invoice_email_contacts
    SET is_default = false
    WHERE dealership_id = NEW.dealership_id
      AND id != NEW.id
      AND is_default = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_contact
  BEFORE INSERT OR UPDATE ON public.invoice_email_contacts
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_contact();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.invoice_email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_email_history ENABLE ROW LEVEL SECURITY;

-- invoice_email_contacts policies
CREATE POLICY "Users can view contacts for their accessible dealerships"
  ON public.invoice_email_contacts
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can create contacts for their accessible dealerships"
  ON public.invoice_email_contacts
  FOR INSERT
  WITH CHECK (
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can update contacts for their accessible dealerships"
  ON public.invoice_email_contacts
  FOR UPDATE
  USING (
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can delete contacts for their accessible dealerships"
  ON public.invoice_email_contacts
  FOR DELETE
  USING (
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- invoice_email_history policies
CREATE POLICY "Users can view email history for their accessible dealerships"
  ON public.invoice_email_history
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can create email history for their accessible dealerships"
  ON public.invoice_email_history
  FOR INSERT
  WITH CHECK (
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get default contact for a dealership
CREATE OR REPLACE FUNCTION get_default_contact(p_dealership_id BIGINT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  job_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.name,
    ec.email,
    ec.job_title
  FROM public.invoice_email_contacts ec
  WHERE ec.dealership_id = p_dealership_id
    AND ec.is_default = true
    AND ec.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get all active contacts for a dealership
CREATE OR REPLACE FUNCTION get_dealership_contacts(p_dealership_id BIGINT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  job_title TEXT,
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.name,
    ec.email,
    ec.job_title,
    ec.is_default
  FROM public.invoice_email_contacts ec
  WHERE ec.dealership_id = p_dealership_id
    AND ec.is_active = true
  ORDER BY ec.is_default DESC, ec.name ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.invoice_email_contacts IS 'Email contacts for each dealership to send invoices';
COMMENT ON TABLE public.invoice_email_history IS 'History of all sent invoice emails';
COMMENT ON COLUMN public.invoice_email_contacts.is_default IS 'Automatically selected when sending emails';
COMMENT ON COLUMN public.invoice_email_contacts.is_active IS 'Soft delete - inactive contacts are hidden';
