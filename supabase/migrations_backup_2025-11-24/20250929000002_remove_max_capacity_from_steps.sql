-- Remove max_capacity column from get_ready_steps table
-- This field is no longer needed for the workflow

ALTER TABLE public.get_ready_steps
DROP COLUMN IF EXISTS max_capacity;

-- Add comment documenting the change
COMMENT ON TABLE public.get_ready_steps IS 'Get Ready workflow steps - Updated to remove capacity tracking as it is no longer needed for the workflow management';