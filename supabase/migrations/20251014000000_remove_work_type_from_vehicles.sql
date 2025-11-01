-- =====================================================
-- FIX: Remove erroneous work_type column from get_ready_vehicles
-- This column should only exist in get_ready_work_items table
-- =====================================================

-- Check if the column exists and drop it
DO $$
BEGIN
  -- Check if work_type column exists in get_ready_vehicles
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'get_ready_vehicles'
    AND column_name = 'work_type'
  ) THEN
    -- Drop the column
    ALTER TABLE public.get_ready_vehicles DROP COLUMN work_type;

    RAISE NOTICE 'Removed erroneous work_type column from get_ready_vehicles table';
  ELSE
    RAISE NOTICE 'Column work_type does not exist in get_ready_vehicles, no action needed';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE public.get_ready_vehicles IS 'Vehicles in the Get Ready reconditioning workflow. Note: work_type belongs to get_ready_work_items, not this table.';
