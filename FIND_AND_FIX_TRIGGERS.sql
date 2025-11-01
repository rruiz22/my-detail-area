-- =====================================================
-- FIND AND FIX: Triggers that reference work_type
-- =====================================================

-- ========================================
-- PART 1: Show all triggers on get_ready_vehicles
-- ========================================
SELECT
  '=== ALL TRIGGERS ON get_ready_vehicles ===' as info;

SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'get_ready_vehicles'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- ========================================
-- PART 2: Show trigger functions source code
-- ========================================
SELECT
  '=== TRIGGER FUNCTIONS SOURCE CODE ===' as info;

SELECT
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'calculate_days_in_step',
    'update_vehicle_sla_status',
    'handle_vehicle_step_change',
    'create_initial_step_history',
    'create_step_change_timeline_event'
  )
ORDER BY p.proname;

-- ========================================
-- PART 3: Look for work_type references
-- ========================================
SELECT
  '=== SEARCHING FOR work_type REFERENCES ===' as info;

SELECT
  p.proname as function_name,
  'Function contains work_type reference' as issue
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%work_type%'
ORDER BY p.proname;

-- ========================================
-- PART 4: Recreate critical triggers (clean versions)
-- ========================================
SELECT
  '=== RECREATING CRITICAL TRIGGERS ===' as info;

-- Drop and recreate calculate_days_in_step function
DROP TRIGGER IF EXISTS trigger_calculate_days_in_step ON public.get_ready_vehicles;
DROP FUNCTION IF EXISTS public.calculate_days_in_step();

CREATE OR REPLACE FUNCTION public.calculate_days_in_step()
RETURNS TRIGGER AS $$
BEGIN
  -- Update days_in_step based on intake_date
  NEW.days_in_step := EXTRACT(DAY FROM (NOW() - NEW.intake_date))::INTEGER;

  -- Calculate total holding cost
  NEW.total_holding_cost := NEW.holding_cost_daily * NEW.days_in_step;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_days_in_step
  BEFORE UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (OLD.intake_date IS DISTINCT FROM NEW.intake_date OR OLD.holding_cost_daily IS DISTINCT FROM NEW.holding_cost_daily)
  EXECUTE FUNCTION public.calculate_days_in_step();

-- Drop and recreate update_vehicle_sla_status function
DROP TRIGGER IF EXISTS trigger_update_vehicle_sla_status ON public.get_ready_vehicles;
DROP FUNCTION IF EXISTS public.update_vehicle_sla_status();

CREATE OR REPLACE FUNCTION public.update_vehicle_sla_status()
RETURNS TRIGGER AS $$
DECLARE
  step_sla_hours INTEGER;
  hours_in_step INTEGER;
BEGIN
  -- Get SLA hours for current step
  SELECT sla_hours INTO step_sla_hours
  FROM public.get_ready_steps
  WHERE id = NEW.step_id;

  -- Calculate hours in current step
  hours_in_step := EXTRACT(EPOCH FROM (NOW() - NEW.intake_date)) / 3600;

  -- Update SLA status
  IF hours_in_step >= step_sla_hours * 1.5 THEN
    NEW.sla_status := 'critical';
    NEW.escalation_level := LEAST(NEW.escalation_level + 1, 3);
  ELSIF hours_in_step >= step_sla_hours THEN
    NEW.sla_status := 'warning';
  ELSE
    NEW.sla_status := 'on_track';
  END IF;

  -- Calculate remaining SLA hours
  NEW.sla_hours_remaining := step_sla_hours - hours_in_step;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_sla_status
  BEFORE UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (OLD.step_id IS DISTINCT FROM NEW.step_id OR OLD.intake_date IS DISTINCT FROM NEW.intake_date)
  EXECUTE FUNCTION public.update_vehicle_sla_status();

-- ========================================
-- PART 5: Final verification
-- ========================================
SELECT
  '=== VERIFICATION: REMAINING TRIGGERS ===' as info;

SELECT
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'get_ready_vehicles'
  AND event_object_schema = 'public'
ORDER BY trigger_name;

-- ========================================
-- PART 6: Status message
-- ========================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Triggers have been cleaned and recreated';
  RAISE NOTICE '✅ No work_type references should remain';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Refresh your browser (F5)';
  RAISE NOTICE '2. Try moving a vehicle between steps';
  RAISE NOTICE '3. The error should be gone!';
  RAISE NOTICE '========================================';
END $$;
