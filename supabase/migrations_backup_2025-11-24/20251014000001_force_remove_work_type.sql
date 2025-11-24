-- =====================================================
-- FORCE REMOVE: work_type column from get_ready_vehicles
-- This is a more aggressive approach to ensure removal
-- =====================================================

-- First, drop any views that might depend on this column
DROP VIEW IF EXISTS public.vehicle_step_times_current CASCADE;

-- Now force drop the column if it exists
ALTER TABLE public.get_ready_vehicles
DROP COLUMN IF EXISTS work_type CASCADE;

-- Verify the column is gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'get_ready_vehicles'
    AND column_name = 'work_type'
  ) THEN
    RAISE EXCEPTION 'ERROR: work_type column still exists after DROP attempt!';
  ELSE
    RAISE NOTICE 'SUCCESS: work_type column has been removed from get_ready_vehicles';
  END IF;
END $$;

-- Recreate the view (from the vehicle_step_history migration)
CREATE OR REPLACE VIEW public.vehicle_step_times_current AS
SELECT
  v.id as vehicle_id,
  v.stock_number,
  v.vin,
  s.name as current_step_name,
  vsh.entry_date as current_step_entry,
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - vsh.entry_date)) / 3600,
    2
  ) as current_visit_hours,
  ROUND(
    EXTRACT(EPOCH FROM (NOW() - vsh.entry_date)) / 86400,
    1
  ) as current_visit_days,
  vsh.visit_number,
  (
    SELECT ROUND(COALESCE(SUM(hours_accumulated), 0), 2)
    FROM public.vehicle_step_history
    WHERE vehicle_id = v.id
      AND step_id = v.step_id
      AND exit_date IS NOT NULL
  ) as previous_visits_hours
FROM public.get_ready_vehicles v
JOIN public.get_ready_steps s ON s.id = v.step_id
JOIN public.vehicle_step_history vsh ON vsh.vehicle_id = v.id
  AND vsh.step_id = v.step_id
  AND vsh.is_current_visit = true;

COMMENT ON VIEW public.vehicle_step_times_current IS 'Real-time view of current step times including previous visit accumulation';

-- Grant permissions
GRANT SELECT ON public.vehicle_step_times_current TO authenticated;
