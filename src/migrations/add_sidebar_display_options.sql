-- Migration: Add sidebar display options to get_ready_steps
-- These options control what displays in the sidebar for each step

-- Add show_sidebar_count column (controls the vehicle count badge)
ALTER TABLE get_ready_steps
ADD COLUMN IF NOT EXISTS show_sidebar_count BOOLEAN DEFAULT TRUE;

-- Add show_sidebar_breakdown column (controls the day range breakdown: Fresh, Normal, Critical)
ALTER TABLE get_ready_steps
ADD COLUMN IF NOT EXISTS show_sidebar_breakdown BOOLEAN DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN get_ready_steps.show_sidebar_count IS
'When TRUE, displays the vehicle count badge in the sidebar for this step. Default: TRUE';

COMMENT ON COLUMN get_ready_steps.show_sidebar_breakdown IS
'When TRUE, displays the day breakdown (Fresh/Normal/Critical) in the sidebar for this step. Default: TRUE. Useful to disable for "last steps" like Front Line where day tracking is not relevant.';
