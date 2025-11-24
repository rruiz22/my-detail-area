-- =====================================================
-- FIX: Change kiosk_id column type from UUID to TEXT
-- =====================================================
-- Issue: kiosk_id was created as UUID but should be TEXT to store kiosk_code (e.g., "KIOSK-003")
-- This migration alters the column type to match the original schema design
-- Date: 2025-11-22
-- =====================================================

-- Drop any existing foreign key constraints on kiosk_id (if any)
-- Note: There shouldn't be any since it's not defined in the original migration,
-- but we check to be safe
DO $$
BEGIN
    -- Check if there are any foreign key constraints on kiosk_id
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'detail_hub_time_entries'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.constraint_name LIKE '%kiosk_id%'
    ) THEN
        -- Drop the constraint (adjust name if needed)
        ALTER TABLE detail_hub_time_entries
        DROP CONSTRAINT IF EXISTS detail_hub_time_entries_kiosk_id_fkey;
    END IF;
END $$;

-- Alter column type from UUID to TEXT
-- Using USING clause to handle conversion (NULL UUIDs become NULL TEXT)
ALTER TABLE detail_hub_time_entries
  ALTER COLUMN kiosk_id TYPE TEXT
  USING kiosk_id::TEXT;

-- Add comment to clarify expected format
COMMENT ON COLUMN detail_hub_time_entries.kiosk_id IS
  'Kiosk code identifier (e.g., KIOSK-001, KIOSK-002). Stores detail_hub_kiosks.kiosk_code, not the UUID.';

-- Verify the change
DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  SELECT data_type INTO v_data_type
  FROM information_schema.columns
  WHERE table_name = 'detail_hub_time_entries'
    AND column_name = 'kiosk_id';

  IF v_data_type = 'text' THEN
    RAISE NOTICE '✅ SUCCESS: kiosk_id column type changed to TEXT';
  ELSE
    RAISE EXCEPTION '❌ FAILED: kiosk_id is still type: %', v_data_type;
  END IF;
END $$;
