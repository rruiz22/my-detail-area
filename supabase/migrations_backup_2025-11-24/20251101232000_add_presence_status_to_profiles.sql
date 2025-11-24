-- Migration: Add presence_status column to profiles table
-- Purpose: Enable real-time presence tracking for chat module
-- Created: 2025-11-01 23:20:00
-- Safe: Idempotent with IF NOT EXISTS checks

-- =====================================================
-- STEP 1: Add presence_status column with constraints
-- =====================================================

DO $$
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'presence_status'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN presence_status TEXT NOT NULL DEFAULT 'offline';

        RAISE NOTICE 'Column presence_status added to profiles table';
    ELSE
        RAISE NOTICE 'Column presence_status already exists, skipping';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Add CHECK constraint for valid status values
-- =====================================================

DO $$
BEGIN
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND constraint_name = 'profiles_presence_status_check'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_presence_status_check
        CHECK (presence_status IN ('online', 'offline', 'away', 'busy', 'invisible'));

        RAISE NOTICE 'CHECK constraint added for presence_status';
    ELSE
        RAISE NOTICE 'CHECK constraint already exists, skipping';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Create partial index for efficient queries
-- =====================================================

-- Drop existing index if it exists (for idempotency)
DROP INDEX IF EXISTS public.idx_profiles_presence_status;

-- Create partial index for active users (optimize for non-offline states)
CREATE INDEX idx_profiles_presence_status
ON public.profiles(presence_status)
WHERE presence_status != 'offline';

-- =====================================================
-- STEP 4: Add column comment for documentation
-- =====================================================

COMMENT ON COLUMN public.profiles.presence_status IS
'Real-time presence status for chat module. Values: online (active), offline (default), away (idle), busy (do not disturb), invisible (appear offline). Indexed for efficient active user queries.';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify column exists with correct properties
DO $$
DECLARE
    v_column_exists BOOLEAN;
    v_constraint_exists BOOLEAN;
    v_index_exists BOOLEAN;
BEGIN
    -- Check column
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'presence_status'
        AND is_nullable = 'NO'
        AND column_default = '''offline''::text'
    ) INTO v_column_exists;

    -- Check constraint
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND constraint_name = 'profiles_presence_status_check'
    ) INTO v_constraint_exists;

    -- Check index
    SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND indexname = 'idx_profiles_presence_status'
    ) INTO v_index_exists;

    -- Report results
    IF v_column_exists AND v_constraint_exists AND v_index_exists THEN
        RAISE NOTICE '✓ Migration completed successfully';
        RAISE NOTICE '  - Column presence_status: EXISTS';
        RAISE NOTICE '  - CHECK constraint: EXISTS';
        RAISE NOTICE '  - Partial index: EXISTS';
    ELSE
        RAISE WARNING '⚠ Migration incomplete:';
        RAISE WARNING '  - Column: %', CASE WHEN v_column_exists THEN 'OK' ELSE 'MISSING' END;
        RAISE WARNING '  - Constraint: %', CASE WHEN v_constraint_exists THEN 'OK' ELSE 'MISSING' END;
        RAISE WARNING '  - Index: %', CASE WHEN v_index_exists THEN 'OK' ELSE 'MISSING' END;
    END IF;
END $$;
