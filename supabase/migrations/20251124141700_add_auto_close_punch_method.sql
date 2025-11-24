-- =====================================================
-- ADD AUTO_CLOSE TO PUNCH METHOD ENUM
-- =====================================================
-- Purpose: Allow 'auto_close' as a valid punch_out_method for automatic
--          closure of forgotten clock outs
-- Date: 2025-11-24
-- =====================================================

-- Add 'auto_close' to the detail_hub_punch_method enum
ALTER TYPE detail_hub_punch_method ADD VALUE IF NOT EXISTS 'auto_close';

-- Verify the enum values
DO $$
DECLARE
  v_enum_values TEXT;
BEGIN
  SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
  INTO v_enum_values
  FROM pg_enum
  WHERE enumtypid = 'detail_hub_punch_method'::regtype;

  RAISE NOTICE 'detail_hub_punch_method enum values: %', v_enum_values;
END $$;
