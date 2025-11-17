-- =====================================================
-- DETAIL HUB: INVOICES AND LINE ITEMS
-- =====================================================
-- Purpose: Invoice generation and billing for DetailHub services
-- Features: Invoice tracking, line items, payment status
-- Author: Claude Code
-- Date: 2025-11-17
-- =====================================================

-- Create custom types for invoices
CREATE TYPE detail_hub_invoice_status AS ENUM (
  'draft',
  'pending',
  'sent',
  'paid',
  'overdue',
  'cancelled'
);

-- =====================================================
-- TABLE: detail_hub_invoices
-- =====================================================
CREATE TABLE IF NOT EXISTS detail_hub_invoices (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL, -- e.g., INV-2024-001

  -- Client information
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,

  -- Invoice details
  description TEXT,
  notes TEXT,

  -- Financial details
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0, -- Percentage (e.g., 8.5 for 8.5%)
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Dates
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  sent_date DATE,

  -- Status
  status detail_hub_invoice_status NOT NULL DEFAULT 'draft',

  -- Payment tracking
  payment_method TEXT, -- e.g., 'check', 'credit_card', 'wire_transfer'
  payment_reference TEXT, -- Check number, transaction ID, etc.

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_invoice_number_per_dealership UNIQUE (dealership_id, invoice_number),
  CONSTRAINT valid_amounts CHECK (
    subtotal >= 0 AND
    tax_amount >= 0 AND
    total_amount >= 0
  ),
  CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT valid_dates CHECK (due_date >= issue_date),
  CONSTRAINT valid_paid_date CHECK (paid_date IS NULL OR paid_date >= issue_date)
);

-- =====================================================
-- TABLE: detail_hub_invoice_line_items
-- =====================================================
CREATE TABLE IF NOT EXISTS detail_hub_invoice_line_items (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES detail_hub_invoices(id) ON DELETE CASCADE,

  -- Line item details
  line_number INTEGER NOT NULL, -- Order of items in invoice
  service_name TEXT NOT NULL,
  description TEXT,

  -- Pricing
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,

  -- Optional link to time entries (for hourly billing)
  time_entry_id UUID REFERENCES detail_hub_time_entries(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_quantity CHECK (quantity > 0),
  CONSTRAINT valid_unit_price CHECK (unit_price >= 0),
  CONSTRAINT valid_line_total CHECK (line_total >= 0)
);

-- =====================================================
-- INDEXES for performance optimization
-- =====================================================
-- Invoices indexes
CREATE INDEX idx_detail_hub_invoices_dealership ON detail_hub_invoices(dealership_id);
CREATE INDEX idx_detail_hub_invoices_status ON detail_hub_invoices(status);
CREATE INDEX idx_detail_hub_invoices_invoice_number ON detail_hub_invoices(invoice_number);
CREATE INDEX idx_detail_hub_invoices_due_date ON detail_hub_invoices(due_date) WHERE status IN ('pending', 'sent');
CREATE INDEX idx_detail_hub_invoices_client_name ON detail_hub_invoices(client_name);

-- Line items indexes
CREATE INDEX idx_detail_hub_invoice_line_items_invoice ON detail_hub_invoice_line_items(invoice_id);
CREATE INDEX idx_detail_hub_invoice_line_items_time_entry ON detail_hub_invoice_line_items(time_entry_id) WHERE time_entry_id IS NOT NULL;

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE TRIGGER trigger_update_detail_hub_invoices_updated_at
  BEFORE UPDATE ON detail_hub_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_detail_hub_employees_updated_at(); -- Reuse existing function

-- =====================================================
-- TRIGGER: Auto-calculate line item total
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_invoice_line_total()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate line total from quantity * unit_price
  NEW.line_total := ROUND(NEW.quantity * NEW.unit_price, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_invoice_line_total
  BEFORE INSERT OR UPDATE OF quantity, unit_price ON detail_hub_invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_line_total();

-- =====================================================
-- TRIGGER: Auto-update invoice totals when line items change
-- =====================================================
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal DECIMAL(12,2);
  v_tax_rate DECIMAL(5,2);
  v_tax_amount DECIMAL(12,2);
  v_total_amount DECIMAL(12,2);
BEGIN
  -- Get invoice_id from NEW or OLD record
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate subtotal from all line items
  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM detail_hub_invoice_line_items
  WHERE invoice_id = v_invoice_id;

  -- Get tax rate from invoice
  SELECT tax_rate
  INTO v_tax_rate
  FROM detail_hub_invoices
  WHERE id = v_invoice_id;

  -- Calculate tax and total
  v_tax_amount := ROUND(v_subtotal * (v_tax_rate / 100), 2);
  v_total_amount := v_subtotal + v_tax_amount;

  -- Update invoice totals
  UPDATE detail_hub_invoices
  SET
    subtotal = v_subtotal,
    tax_amount = v_tax_amount,
    total_amount = v_total_amount
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_totals_on_line_insert
  AFTER INSERT ON detail_hub_invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER trigger_update_invoice_totals_on_line_update
  AFTER UPDATE OF quantity, unit_price, line_total ON detail_hub_invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

CREATE TRIGGER trigger_update_invoice_totals_on_line_delete
  AFTER DELETE ON detail_hub_invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- =====================================================
-- TRIGGER: Auto-update invoice status based on dates
-- =====================================================
CREATE OR REPLACE FUNCTION update_invoice_status_on_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If paid_date is set, mark as paid
  IF NEW.paid_date IS NOT NULL AND OLD.paid_date IS NULL THEN
    NEW.status := 'paid';
  END IF;

  -- If sent_date is set and status is draft, mark as sent
  IF NEW.sent_date IS NOT NULL AND OLD.sent_date IS NULL AND NEW.status = 'draft' THEN
    NEW.status := 'sent';
  END IF;

  -- Check if invoice is overdue (due_date passed and not paid)
  IF NEW.status IN ('pending', 'sent') AND NEW.due_date < CURRENT_DATE AND NEW.paid_date IS NULL THEN
    NEW.status := 'overdue';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_status_on_date
  BEFORE UPDATE OF paid_date, sent_date, due_date ON detail_hub_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status_on_date();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Invoices RLS
ALTER TABLE detail_hub_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices from their dealerships"
  ON detail_hub_invoices
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dm.dealership_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert invoices"
  ON detail_hub_invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_invoices.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

CREATE POLICY "Managers can update invoices"
  ON detail_hub_invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_invoices.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

CREATE POLICY "Admins can delete invoices"
  ON detail_hub_invoices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_invoices.dealership_id
        AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- Line Items RLS
ALTER TABLE detail_hub_invoice_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view line items from their dealership invoices"
  ON detail_hub_invoice_line_items
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM detail_hub_invoices
      WHERE dealership_id IN (
        SELECT dm.dealership_id
        FROM dealer_memberships dm
        WHERE dm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Managers can manage line items"
  ON detail_hub_invoice_line_items
  FOR ALL
  USING (
    invoice_id IN (
      SELECT inv.id FROM detail_hub_invoices inv
      WHERE EXISTS (
        SELECT 1
        FROM dealer_memberships dm
        WHERE dm.user_id = auth.uid()
          AND dm.dealership_id = inv.dealership_id
          AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
      )
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Generate next invoice number for dealership
CREATE OR REPLACE FUNCTION generate_invoice_number(p_dealership_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_max_number INTEGER;
  v_next_number TEXT;
BEGIN
  v_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Get highest invoice number for this year and dealership
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(
          invoice_number,
          'INV-' || v_year || '-',
          ''
        ) AS INTEGER
      )
    ),
    0
  )
  INTO v_max_number
  FROM detail_hub_invoices
  WHERE dealership_id = p_dealership_id
    AND invoice_number LIKE 'INV-' || v_year || '-%';

  -- Generate next invoice number
  v_next_number := 'INV-' || v_year || '-' || LPAD((v_max_number + 1)::TEXT, 3, '0');

  RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Function: Get invoice statistics for dealership
CREATE OR REPLACE FUNCTION get_invoice_statistics(p_dealership_id INTEGER)
RETURNS TABLE (
  total_invoices BIGINT,
  draft_count BIGINT,
  pending_count BIGINT,
  paid_count BIGINT,
  overdue_count BIGINT,
  total_revenue DECIMAL,
  pending_amount DECIMAL,
  overdue_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_invoices,
    COUNT(*) FILTER (WHERE status = 'draft') AS draft_count,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
    COUNT(*) FILTER (WHERE status = 'paid') AS paid_count,
    COUNT(*) FILTER (WHERE status = 'overdue') AS overdue_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0) AS total_revenue,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'pending'), 0) AS pending_amount,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'overdue'), 0) AS overdue_amount
  FROM detail_hub_invoices
  WHERE dealership_id = p_dealership_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE detail_hub_invoices IS 'Invoice management for DetailHub services with automatic total calculation';
COMMENT ON TABLE detail_hub_invoice_line_items IS 'Individual line items for invoices with automatic total calculation';
COMMENT ON COLUMN detail_hub_invoices.invoice_number IS 'Unique invoice identifier (e.g., INV-2024-001)';
COMMENT ON COLUMN detail_hub_invoices.tax_rate IS 'Tax rate as percentage (e.g., 8.5 for 8.5%)';
COMMENT ON COLUMN detail_hub_invoice_line_items.time_entry_id IS 'Optional link to time entry for hourly billing';
