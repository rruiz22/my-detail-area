-- =====================================================
-- GET READY MODULE - TIMER PAUSE ON FRONT LINE
-- Automatically pause timer when vehicle reaches Front Line
-- Resume timer if moved back to another step
-- Date: 2025-10-16
-- =====================================================

-- =====================================================
-- 1. ADD TIMER CONTROL COLUMN
-- =====================================================
DO $$
BEGIN
  -- Add timer_paused column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'timer_paused'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN timer_paused BOOLEAN DEFAULT false;
  END IF;

  -- Add frontline_reached_at column to track when vehicle completed recon
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'get_ready_vehicles'
    AND column_name = 'frontline_reached_at'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN frontline_reached_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- 2. UPDATE calculate_days_in_step FUNCTION
-- Only calculate days if timer is not paused
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_days_in_step()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update days_in_step if timer is not paused
  IF NOT COALESCE(NEW.timer_paused, false) THEN
    -- Update days_in_step based on intake_date
    NEW.days_in_step := EXTRACT(DAY FROM (NOW() - NEW.intake_date))::INTEGER;

    -- Calculate total holding cost
    NEW.total_holding_cost := NEW.holding_cost_daily * NEW.days_in_step;
  END IF;
  -- If timer is paused, days_in_step and total_holding_cost remain frozen

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE FUNCTION TO HANDLE STEP CHANGES
-- Pause timer when reaching Front Line, resume when leaving
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_step_change()
RETURNS TRIGGER AS $$
DECLARE
  step_is_frontline BOOLEAN;
  old_step_is_frontline BOOLEAN;
  total_days_elapsed INTEGER;
BEGIN
  -- Check if new step is Front Line (ready, front_line, or similar)
  step_is_frontline := NEW.step_id IN ('ready', 'front_line', 'frontline');

  -- Check if old step was Front Line
  old_step_is_frontline := OLD.step_id IN ('ready', 'front_line', 'frontline');

  -- Case 1: Moving TO Front Line - PAUSE TIMER
  IF step_is_frontline AND NOT old_step_is_frontline THEN
    -- Pause the timer
    NEW.timer_paused := true;

    -- Mark when vehicle reached front line
    NEW.frontline_reached_at := NOW();

    -- Calculate actual T2L (total time from intake to front line)
    total_days_elapsed := EXTRACT(DAY FROM (NOW() - NEW.intake_date))::INTEGER;
    NEW.actual_t2l := total_days_elapsed;

    -- Mark as completed
    NEW.status := 'completed';
    NEW.completed_at := NOW();

    -- Reset escalation since vehicle completed the process
    NEW.escalation_level := 0;
    NEW.sla_status := 'on_track';

  -- Case 2: Moving FROM Front Line to another step - RESUME TIMER
  ELSIF old_step_is_frontline AND NOT step_is_frontline THEN
    -- Resume the timer
    NEW.timer_paused := false;

    -- Reset intake_date to NOW to start counting from zero in new step
    NEW.intake_date := NOW();
    NEW.days_in_step := 0;

    -- Mark as back in progress
    NEW.status := 'in_progress';
    NEW.completed_at := NULL;
    NEW.frontline_reached_at := NULL;

  -- Case 3: Normal step change (not involving Front Line) - RESET TIMER FOR NEW STEP
  ELSIF NOT step_is_frontline AND NOT old_step_is_frontline AND OLD.step_id IS DISTINCT FROM NEW.step_id THEN
    -- Reset intake date for new step
    NEW.intake_date := NOW();
    NEW.days_in_step := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_handle_step_change ON public.get_ready_vehicles;

-- Create trigger for step changes
CREATE TRIGGER trigger_handle_step_change
  BEFORE UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (OLD.step_id IS DISTINCT FROM NEW.step_id)
  EXECUTE FUNCTION public.handle_step_change();

-- =====================================================
-- 4. UPDATE SLA STATUS FUNCTION
-- Don't calculate SLA for paused timers
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_vehicle_sla_status()
RETURNS TRIGGER AS $$
DECLARE
  step_sla_hours INTEGER;
  hours_in_step INTEGER;
BEGIN
  -- Skip SLA calculation if timer is paused (vehicle in Front Line)
  IF COALESCE(NEW.timer_paused, false) THEN
    -- Keep status as on_track when in Front Line
    NEW.sla_status := 'on_track';
    NEW.sla_hours_remaining := 0;
    RETURN NEW;
  END IF;

  -- Get SLA hours for current step
  SELECT sla_hours INTO step_sla_hours
  FROM public.get_ready_steps
  WHERE id = NEW.step_id;

  -- Skip if step has no SLA (like Front Line with sla_hours = 0)
  IF step_sla_hours = 0 THEN
    NEW.sla_status := 'on_track';
    NEW.sla_hours_remaining := 0;
    RETURN NEW;
  END IF;

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

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN public.get_ready_vehicles.timer_paused IS 'Whether the timer is paused (true when vehicle reaches Front Line)';
COMMENT ON COLUMN public.get_ready_vehicles.frontline_reached_at IS 'Timestamp when vehicle first reached Front Line step';
COMMENT ON FUNCTION public.handle_step_change IS 'Automatically pause timer at Front Line, resume when moved back to another step';

-- =====================================================
-- 6. UPDATE EXISTING VEHICLES IN FRONT LINE
-- Apply pause to vehicles already in Front Line step
-- =====================================================
UPDATE public.get_ready_vehicles
SET
  timer_paused = true,
  status = 'completed',
  completed_at = COALESCE(completed_at, NOW()),
  frontline_reached_at = COALESCE(frontline_reached_at, NOW()),
  actual_t2l = COALESCE(actual_t2l, EXTRACT(DAY FROM (NOW() - intake_date))::INTEGER),
  sla_status = 'on_track',
  escalation_level = 0
WHERE step_id IN ('ready', 'front_line', 'frontline')
  AND timer_paused IS NOT true;
