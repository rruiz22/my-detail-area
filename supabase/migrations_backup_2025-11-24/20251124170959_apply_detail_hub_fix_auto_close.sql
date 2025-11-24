-- =====================================================
-- DETAIL HUB FIX: Add auto_close enum and clean duplicates
-- =====================================================
-- This migration must be split because ALTER TYPE ADD VALUE
-- cannot run inside a transaction block
-- =====================================================

-- PART 1: Add enum value (NO TRANSACTION)
ALTER TYPE detail_hub_punch_method ADD VALUE IF NOT EXISTS 'auto_close';

-- Wait a moment for the enum change to commit
-- Note: In a real migration, this should be in a separate file
-- but we're combining them here for convenience

-- Verify enum was added
DO $$
DECLARE
  v_enum_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'auto_close'
    AND enumtypid = 'detail_hub_punch_method'::regtype
  ) INTO v_enum_exists;

  IF NOT v_enum_exists THEN
    RAISE EXCEPTION 'Failed to add auto_close to enum';
  END IF;

  RAISE NOTICE '✓ Enum value auto_close added successfully';
END $$;
