-- =====================================================
-- FINAL FIX: Clean up columns in get_ready_vehicles
-- This script will verify and fix the column structure
-- =====================================================

-- ========================================
-- PART 1: DIAGNOSE - Show current structure
-- ========================================
SELECT
  '=== CURRENT COLUMNS IN get_ready_vehicles ===' as info;

SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'get_ready_vehicles'
ORDER BY ordinal_position;

-- ========================================
-- PART 2: FIX - Remove work_type (WITHOUT CASCADE)
-- ========================================
SELECT
  '=== REMOVING work_type COLUMN ===' as info;

-- Drop work_type WITHOUT CASCADE to preserve other columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'get_ready_vehicles'
      AND column_name = 'work_type'
  ) THEN
    -- Try to drop without CASCADE first
    BEGIN
      ALTER TABLE public.get_ready_vehicles DROP COLUMN work_type;
      RAISE NOTICE 'Removed work_type column (without CASCADE)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop work_type. Error: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Column work_type does not exist';
  END IF;
END $$;

-- ========================================
-- PART 3: VERIFY - Ensure workflow_type exists
-- ========================================
SELECT
  '=== ENSURING workflow_type EXISTS ===' as info;

-- Recreate ENUM if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'get_ready_workflow_type') THEN
    CREATE TYPE get_ready_workflow_type AS ENUM ('standard', 'express', 'priority');
    RAISE NOTICE 'Created get_ready_workflow_type ENUM';
  END IF;
END $$;

-- Add workflow_type if it doesn't exist
ALTER TABLE public.get_ready_vehicles
ADD COLUMN IF NOT EXISTS workflow_type get_ready_workflow_type DEFAULT 'standard';

-- Update NULL values
UPDATE public.get_ready_vehicles
SET workflow_type = 'standard'
WHERE workflow_type IS NULL;

-- ========================================
-- PART 4: FINAL VERIFICATION
-- ========================================
SELECT
  '=== FINAL COLUMN STRUCTURE ===' as info;

SELECT
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'get_ready_vehicles'
ORDER BY ordinal_position;

-- ========================================
-- PART 5: STATUS CHECK
-- ========================================
DO $$
DECLARE
  has_work_type BOOLEAN;
  has_workflow_type BOOLEAN;
BEGIN
  -- Check for work_type
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'get_ready_vehicles'
      AND column_name = 'work_type'
  ) INTO has_work_type;

  -- Check for workflow_type
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'get_ready_vehicles'
      AND column_name = 'workflow_type'
  ) INTO has_workflow_type;

  -- Report status
  RAISE NOTICE '========================================';
  IF has_work_type THEN
    RAISE NOTICE '❌ ERROR: work_type column STILL EXISTS (should not be there)';
  ELSE
    RAISE NOTICE '✅ GOOD: work_type column does NOT exist';
  END IF;

  IF has_workflow_type THEN
    RAISE NOTICE '✅ GOOD: workflow_type column EXISTS';
  ELSE
    RAISE NOTICE '❌ ERROR: workflow_type column MISSING (should exist)';
  END IF;
  RAISE NOTICE '========================================';

  -- Final verdict
  IF NOT has_work_type AND has_workflow_type THEN
    RAISE NOTICE '🎉 SUCCESS: Table structure is correct!';
  ELSE
    RAISE WARNING '⚠️ MANUAL INTERVENTION NEEDED - See errors above';
  END IF;
END $$;
