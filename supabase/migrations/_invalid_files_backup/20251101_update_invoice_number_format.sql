-- =====================================================
-- UPDATE INVOICE NUMBER FORMAT
-- Date: 2025-11-01
-- Description: Change invoice number format from INV-YYYY-#### to INV-YY-####
-- =====================================================

-- Update function to use 2-digit year format
CREATE OR REPLACE FUNCTION generate_invoice_number(p_dealer_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_invoice_number TEXT;
BEGIN
  -- Get current year in 2-digit format (25 for 2025, 26 for 2026, etc.)
  v_year := TO_CHAR(NOW(), 'YY');

  -- Get next sequence number for this year and dealer
  -- This will search for pattern like 'INV-25-%' or 'INV-26-%'
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM public.invoices
  WHERE dealer_id = p_dealer_id
    AND invoice_number LIKE 'INV-' || v_year || '-%';

  -- Generate invoice number: INV-YY-####
  -- Examples: INV-25-0001, INV-25-0002, INV-26-0001 (next year)
  v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Update payment number function to match (for consistency)
CREATE OR REPLACE FUNCTION generate_payment_number(p_dealer_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_payment_number TEXT;
BEGIN
  -- Get current year in 2-digit format (25 for 2025, 26 for 2026, etc.)
  v_year := TO_CHAR(NOW(), 'YY');

  -- Get next sequence number for this year and dealer
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(payment_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM public.payments
  WHERE dealer_id = p_dealer_id
    AND payment_number LIKE 'PAY-' || v_year || '-%';

  -- Generate payment number: PAY-YY-####
  -- Examples: PAY-25-0001, PAY-25-0002, PAY-26-0001 (next year)
  v_payment_number := 'PAY-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');

  RETURN v_payment_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTES:
-- =====================================================
-- This migration changes the invoice/payment number format:
--
-- OLD FORMAT: INV-2025-0001, INV-2025-0002
-- NEW FORMAT: INV-25-0001, INV-25-0002
--
-- When the year changes from 2025 to 2026:
-- - The format will automatically become INV-26-0001
-- - The sequence number resets to 0001 for each new year
-- - This happens automatically based on the current date
--
-- Example timeline:
-- - Dec 31, 2025: INV-25-9999
-- - Jan 1, 2026:  INV-26-0001 (automatic reset)
-- - Jan 2, 2026:  INV-26-0002
-- =====================================================
