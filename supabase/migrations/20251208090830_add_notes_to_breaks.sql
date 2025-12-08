-- Migration: Add notes field to detail_hub_breaks table
-- Purpose: Allow employees to add optional notes/comments for each break action
-- Version: v1.0 - December 8, 2024
-- CRITICAL: Payroll system - extreme caution required
-- STATUS: Pending application

-- Add notes column to breaks table
-- This field is optional (NULL allowed) and non-blocking
ALTER TABLE detail_hub_breaks
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN detail_hub_breaks.notes IS 'Optional employee note/comment explaining break reason (e.g., "Extended break for client meeting")';

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: notes column added to detail_hub_breaks table';
END $$;
