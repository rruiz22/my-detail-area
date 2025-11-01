-- =====================================================
-- INVOICES & PAYMENTS SYSTEM MIGRATION
-- Created: 2024-10-16
-- Description: Complete invoicing and payment tracking system
-- =====================================================

-- =====================================================
-- 1. INVOICES TABLE
-- =====================================================
-- IMPORTANT: Invoices get ALL information from orders table
-- No duplication of customer, vehicle, or service data
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,

  -- Relations (ALL data comes from these references)
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Invoice-specific Details
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,

  -- Financial Calculations (calculated from order)
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0, -- Percentage
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  amount_due DECIMAL(10, 2) NOT NULL,

  -- Invoice Status (independent from order status)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled')
  ),

  -- Invoice-specific Notes
  invoice_notes TEXT,
  terms_and_conditions TEXT,

  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  email_sent_count INTEGER DEFAULT 0,
  last_email_recipient TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT invoice_number_format CHECK (invoice_number ~ '^INV-[0-9]{4}-[0-9]+$')
);

-- Create indexes for performance
CREATE INDEX idx_invoices_dealer_id ON public.invoices(dealer_id);
CREATE INDEX idx_invoices_order_id ON public.invoices(order_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_issue_date ON public.invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_created_by ON public.invoices(created_by);

-- =====================================================
-- 2. INVOICE ITEMS TABLE
-- =====================================================
-- IMPORTANT: Items are copied from order.services at invoice creation
-- This provides a snapshot of services at the time of invoicing
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

  -- Item Details (snapshot from order)
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product', 'labor', 'other')),
  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Reference to original service (for tracking)
  service_reference TEXT, -- Original service name/code from order

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_sort_order ON public.invoice_items(invoice_id, sort_order);

-- =====================================================
-- 3. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,

  -- Relations
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  dealer_id INTEGER REFERENCES public.dealerships(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Payment Details
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('cash', 'check', 'credit_card', 'debit_card', 'bank_transfer', 'other')
  ),

  -- Additional Information
  reference_number TEXT, -- Check number, transaction ID, etc.
  notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (
    status IN ('completed', 'pending', 'failed', 'refunded')
  ),

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  CONSTRAINT payment_number_format CHECK (payment_number ~ '^PAY-[0-9]{4}-[0-9]+$')
);

-- Create indexes
CREATE INDEX idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX idx_payments_dealer_id ON public.payments(dealer_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_recorded_by ON public.payments(recorded_by);

-- =====================================================
-- 4. SCHEDULED REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  dealer_id INTEGER REFERENCES public.dealerships(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Report Configuration
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (
    report_type IN ('operational', 'financial', 'invoices', 'performance', 'custom')
  ),

  -- Schedule Configuration
  frequency TEXT NOT NULL CHECK (
    frequency IN ('daily', 'weekly', 'monthly', 'quarterly')
  ),
  schedule_day INTEGER, -- Day of week (1-7) for weekly, day of month (1-31) for monthly
  schedule_time TIME NOT NULL DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'America/New_York',

  -- Recipients
  recipients TEXT[] NOT NULL, -- Array of email addresses

  -- Report Filters
  filters JSONB DEFAULT '{}',

  -- Export Configuration
  export_format TEXT NOT NULL DEFAULT 'pdf' CHECK (
    export_format IN ('pdf', 'excel', 'csv')
  ),
  include_sections JSONB DEFAULT '{"summary": true, "charts": true, "tables": true}',

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  next_send_at TIMESTAMPTZ,
  send_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_scheduled_reports_dealer_id ON public.scheduled_reports(dealer_id);
CREATE INDEX idx_scheduled_reports_next_send_at ON public.scheduled_reports(next_send_at) WHERE is_active = TRUE;
CREATE INDEX idx_scheduled_reports_is_active ON public.scheduled_reports(is_active);

-- =====================================================
-- 5. REPORT SEND HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.report_send_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  scheduled_report_id UUID REFERENCES public.scheduled_reports(id) ON DELETE CASCADE,
  dealer_id INTEGER REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Send Details
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipients TEXT[] NOT NULL,
  report_type TEXT NOT NULL,
  export_format TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  error_message TEXT,

  -- File Information
  file_url TEXT,
  file_size INTEGER, -- Size in bytes

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_report_send_history_scheduled_report_id ON public.report_send_history(scheduled_report_id);
CREATE INDEX idx_report_send_history_dealer_id ON public.report_send_history(dealer_id);
CREATE INDEX idx_report_send_history_sent_at ON public.report_send_history(sent_at);

-- =====================================================
-- 6. TRIGGERS FOR updated_at
-- =====================================================

-- Invoices trigger
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Invoice items trigger
CREATE OR REPLACE FUNCTION update_invoice_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_items_updated_at
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_items_updated_at();

-- Payments trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Scheduled reports trigger
CREATE OR REPLACE FUNCTION update_scheduled_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_reports_updated_at();

-- =====================================================
-- 7. FUNCTION TO UPDATE INVOICE TOTALS
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_subtotal DECIMAL(10, 2);
  v_tax_amount DECIMAL(10, 2);
  v_total_amount DECIMAL(10, 2);
  v_amount_paid DECIMAL(10, 2);
BEGIN
  -- Calculate subtotal from invoice items
  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_subtotal
  FROM public.invoice_items
  WHERE invoice_id = NEW.invoice_id;

  -- Calculate tax amount
  v_tax_amount := v_subtotal * (
    SELECT COALESCE(tax_rate, 0) / 100
    FROM public.invoices
    WHERE id = NEW.invoice_id
  );

  -- Calculate total with discount
  SELECT
    v_subtotal + v_tax_amount - COALESCE(discount_amount, 0)
  INTO v_total_amount
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  -- Get amount paid
  SELECT COALESCE(SUM(amount), 0)
  INTO v_amount_paid
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id
    AND status = 'completed';

  -- Update invoice
  UPDATE public.invoices
  SET
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total_amount = v_total_amount,
    amount_paid = v_amount_paid,
    amount_due = v_total_amount - v_amount_paid,
    status = CASE
      WHEN v_total_amount - v_amount_paid <= 0 THEN 'paid'
      WHEN v_amount_paid > 0 THEN 'partially_paid'
      WHEN NOW() > due_date AND status != 'cancelled' THEN 'overdue'
      ELSE status
    END,
    paid_at = CASE
      WHEN v_total_amount - v_amount_paid <= 0 AND paid_at IS NULL THEN NOW()
      ELSE paid_at
    END
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice items
CREATE TRIGGER trigger_calculate_invoice_totals_items
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

-- Trigger for payments
CREATE TRIGGER trigger_calculate_invoice_totals_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_totals();

-- =====================================================
-- 8. FUNCTION TO GENERATE INVOICE NUMBER
-- =====================================================
CREATE OR REPLACE FUNCTION generate_invoice_number(p_dealer_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_invoice_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this year and dealer
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM public.invoices
  WHERE dealer_id = p_dealer_id
    AND invoice_number LIKE 'INV-' || v_year || '-%';

  -- Generate invoice number: INV-YYYY-####
  v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. FUNCTION TO GENERATE PAYMENT NUMBER
-- =====================================================
CREATE OR REPLACE FUNCTION generate_payment_number(p_dealer_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_payment_number TEXT;
BEGIN
  -- Get current year
  v_year := TO_CHAR(NOW(), 'YYYY');

  -- Get next sequence number for this year and dealer
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(payment_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM public.payments
  WHERE dealer_id = p_dealer_id
    AND payment_number LIKE 'PAY-' || v_year || '-%';

  -- Generate payment number: PAY-YYYY-####
  v_payment_number := 'PAY-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_payment_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_send_history ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Users can view invoices from their dealership"
  ON public.invoices FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can create invoices for their dealership"
  ON public.invoices FOR INSERT
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can update invoices from their dealership"
  ON public.invoices FOR UPDATE
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can delete invoices from their dealership"
  ON public.invoices FOR DELETE
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Invoice items policies (inherit from invoice)
CREATE POLICY "Users can view invoice items"
  ON public.invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE dealer_id IN (
        SELECT dealer_id FROM public.dealer_memberships
        WHERE user_id = auth.uid() AND is_active = TRUE
      )
    )
  );

CREATE POLICY "Users can manage invoice items"
  ON public.invoice_items FOR ALL
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE dealer_id IN (
        SELECT dealer_id FROM public.dealer_memberships
        WHERE user_id = auth.uid() AND is_active = TRUE
      )
    )
  );

-- Payments policies
CREATE POLICY "Users can view payments from their dealership"
  ON public.payments FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can create payments for their dealership"
  ON public.payments FOR INSERT
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can update payments from their dealership"
  ON public.payments FOR UPDATE
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Scheduled reports policies
CREATE POLICY "Users can view scheduled reports from their dealership"
  ON public.scheduled_reports FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

CREATE POLICY "Users can manage scheduled reports for their dealership"
  ON public.scheduled_reports FOR ALL
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Report send history policies
CREATE POLICY "Users can view report send history from their dealership"
  ON public.report_send_history FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- 11. GRANTS
-- =====================================================
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.invoice_items TO authenticated;
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.scheduled_reports TO authenticated;
GRANT ALL ON public.report_send_history TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE public.invoices IS 'Stores invoice information for orders';
COMMENT ON TABLE public.invoice_items IS 'Line items for each invoice';
COMMENT ON TABLE public.payments IS 'Payment records for invoices';
COMMENT ON TABLE public.scheduled_reports IS 'Configuration for scheduled report emails';
COMMENT ON TABLE public.report_send_history IS 'History of sent reports';
