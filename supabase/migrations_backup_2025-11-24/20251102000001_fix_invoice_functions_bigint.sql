-- =====================================================
-- FIX INVOICE FUNCTIONS - Change INTEGER to BIGINT
-- Date: 2025-11-02
-- Description: Fix parameter type mismatch - dealer_id should be BIGINT not INTEGER
-- =====================================================

-- Drop the old functions explicitly to avoid ambiguity
DROP FUNCTION IF EXISTS generate_invoice_number(p_dealer_id INTEGER) CASCADE;
DROP FUNCTION IF EXISTS generate_payment_number(p_dealer_id INTEGER) CASCADE;

-- Recreate with correct BIGINT type
CREATE OR REPLACE FUNCTION generate_invoice_number(p_dealer_id BIGINT)
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
CREATE OR REPLACE FUNCTION generate_payment_number(p_dealer_id BIGINT)
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
-- This migration fixes the type mismatch error:
-- "Could not choose the best candidate function"
--
-- The issue was that dealer_id in the dealerships table is BIGINT,
-- but the functions were expecting INTEGER, causing PostgreSQL
-- to not know which function to call.
--
-- This is similar to the fix applied in:
-- 20251101000000_fix_dealer_services_rpc_category_id.sql
-- =====================================================
