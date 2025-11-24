-- =====================================================
-- VEHICLE STEP HISTORY TABLE
-- Complete time tracking for vehicles across all steps
-- =====================================================

-- =====================================================
-- 1. CREATE VEHICLE STEP HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vehicle_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL REFERENCES public.get_ready_steps(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Time tracking per visit
  entry_date TIMESTAMPTZ NOT NULL,
  exit_date TIMESTAMPTZ,
  hours_accumulated DECIMAL(10,2) DEFAULT 0,

  -- Visit tracking
  visit_number INTEGER NOT NULL DEFAULT 1,
  is_current_visit BOOLEAN DEFAULT true,

  -- Additional metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one current visit per vehicle per step
  UNIQUE(vehicle_id, step_id, visit_number)
);

-- Add comment
COMMENT ON TABLE public.vehicle_step_history IS 'Tracks accumulated time for each vehicle in each workflow step, supporting multiple visits';
COMMENT ON COLUMN public.vehicle_step_history.visit_number IS 'Sequential visit number (1, 2, 3...) for tracking multiple visits to same step';
COMMENT ON COLUMN public.vehicle_step_history.hours_accumulated IS 'Total hours spent in this step during this visit';
COMMENT ON COLUMN public.vehicle_step_history.is_current_visit IS 'True if vehicle is currently in this step';

-- =====================================================
-- 2. ENABLE RLS
-- =====================================================

ALTER TABLE public.vehicle_step_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view step history for their dealerships"
  ON public.vehicle_step_history FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "System can manage step history"
  ON public.vehicle_step_history FOR ALL
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id))
  WITH CHECK (user_has_active_dealer_membership(auth.uid(), dealer_id));

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for finding current visits
CREATE INDEX idx_step_history_vehicle_current
  ON public.vehicle_step_history(vehicle_id, step_id, is_current_visit)
  WHERE is_current_visit = true;

-- Index for vehicle lookups
CREATE INDEX idx_step_history_vehicle_id
  ON public.vehicle_step_history(vehicle_id);

-- Index for step lookups
CREATE INDEX idx_step_history_step_id
  ON public.vehicle_step_history(step_id);

-- Index for dealer lookups
CREATE INDEX idx_step_history_dealer_id
  ON public.vehicle_step_history(dealer_id);

-- Index for time-based queries
CREATE INDEX idx_step_history_entry_date
  ON public.vehicle_step_history(entry_date DESC);

-- Composite index for aggregations
CREATE INDEX idx_step_history_vehicle_step_current
  ON public.vehicle_step_history(vehicle_id, step_id, is_current_visit, hours_accumulated);

-- =====================================================
-- 4. TRIGGER FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp
CREATE TRIGGER trigger_step_history_updated_at
  BEFORE UPDATE ON public.vehicle_step_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Function to get total accumulated hours for a vehicle in a specific step
CREATE OR REPLACE FUNCTION public.get_accumulated_hours_in_step(
  p_vehicle_id UUID,
  p_step_id TEXT
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_hours DECIMAL;
  v_current_hours DECIMAL;
BEGIN
  -- Sum all completed visits
  SELECT COALESCE(SUM(hours_accumulated), 0)
  INTO v_total_hours
  FROM public.vehicle_step_history
  WHERE vehicle_id = p_vehicle_id
    AND step_id = p_step_id
    AND exit_date IS NOT NULL;

  -- Add current visit if exists
  SELECT COALESCE(
    EXTRACT(EPOCH FROM (NOW() - entry_date)) / 3600,
    0
  )
  INTO v_current_hours
  FROM public.vehicle_step_history
  WHERE vehicle_id = p_vehicle_id
    AND step_id = p_step_id
    AND is_current_visit = true
  LIMIT 1;

  RETURN v_total_hours + v_current_hours;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get accumulated hours for all steps of a vehicle
CREATE OR REPLACE FUNCTION public.get_vehicle_step_times(p_vehicle_id UUID)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  total_hours DECIMAL,
  total_days DECIMAL,
  visit_count INTEGER,
  is_current_step BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vsh.step_id,
    s.name as step_name,
    ROUND(
      SUM(
        CASE
          WHEN vsh.is_current_visit THEN
            EXTRACT(EPOCH FROM (NOW() - vsh.entry_date)) / 3600
          ELSE
            vsh.hours_accumulated
        END
      ),
      2
    ) as total_hours,
    ROUND(
      SUM(
        CASE
          WHEN vsh.is_current_visit THEN
            EXTRACT(EPOCH FROM (NOW() - vsh.entry_date)) / 3600
          ELSE
            vsh.hours_accumulated
        END
      ) / 24.0,
      1
    ) as total_days,
    COUNT(*)::INTEGER as visit_count,
    BOOL_OR(vsh.is_current_visit) as is_current_step
  FROM public.vehicle_step_history vsh
  JOIN public.get_ready_steps s ON s.id = vsh.step_id
  WHERE vsh.vehicle_id = p_vehicle_id
  GROUP BY vsh.step_id, s.name, s.order_index
  ORDER BY s.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to automatically update hours_accumulated when exiting a step
CREATE OR REPLACE FUNCTION public.update_step_history_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if exit_date is being set and was previously NULL
  IF NEW.exit_date IS NOT NULL AND OLD.exit_date IS NULL THEN
    NEW.hours_accumulated := EXTRACT(EPOCH FROM (NEW.exit_date - NEW.entry_date)) / 3600;
    NEW.is_current_visit := false;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_step_history_hours
  BEFORE UPDATE ON public.vehicle_step_history
  FOR EACH ROW
  WHEN (NEW.exit_date IS DISTINCT FROM OLD.exit_date)
  EXECUTE FUNCTION public.update_step_history_hours();

-- =====================================================
-- 6. FUNCTION TO HANDLE STEP CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_vehicle_step_change()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_visit_number INTEGER;
  v_existing_history_id UUID;
BEGIN
  -- Only proceed if step actually changed
  IF NEW.step_id IS DISTINCT FROM OLD.step_id THEN

    -- Close out previous step (mark exit_date)
    UPDATE public.vehicle_step_history
    SET
      exit_date = NOW(),
      is_current_visit = false
    WHERE vehicle_id = NEW.id
      AND step_id = OLD.step_id
      AND is_current_visit = true;

    -- Check if vehicle has been in this step before
    SELECT visit_number, id
    INTO v_previous_visit_number, v_existing_history_id
    FROM public.vehicle_step_history
    WHERE vehicle_id = NEW.id
      AND step_id = NEW.step_id
    ORDER BY visit_number DESC
    LIMIT 1;

    -- Create new history entry for new step
    INSERT INTO public.vehicle_step_history (
      vehicle_id,
      step_id,
      dealer_id,
      entry_date,
      visit_number,
      is_current_visit
    ) VALUES (
      NEW.id,
      NEW.step_id,
      NEW.dealer_id,
      NEW.intake_date,
      COALESCE(v_previous_visit_number, 0) + 1,
      true
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically track step changes
CREATE TRIGGER trigger_vehicle_step_change_history
  AFTER UPDATE OF step_id ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (NEW.step_id IS DISTINCT FROM OLD.step_id)
  EXECUTE FUNCTION public.handle_vehicle_step_change();

-- Trigger to create initial history entry when vehicle is created
CREATE OR REPLACE FUNCTION public.create_initial_step_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.vehicle_step_history (
    vehicle_id,
    step_id,
    dealer_id,
    entry_date,
    visit_number,
    is_current_visit
  ) VALUES (
    NEW.id,
    NEW.step_id,
    NEW.dealer_id,
    NEW.intake_date,
    1,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_initial_step_history
  AFTER INSERT ON public.get_ready_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_initial_step_history();

-- =====================================================
-- 7. MIGRATE EXISTING VEHICLES TO HISTORY
-- =====================================================

-- Create initial history entries for all existing vehicles
INSERT INTO public.vehicle_step_history (
  vehicle_id,
  step_id,
  dealer_id,
  entry_date,
  visit_number,
  is_current_visit
)
SELECT
  v.id,
  v.step_id,
  v.dealer_id,
  v.intake_date,
  1,
  true
FROM public.get_ready_vehicles v
WHERE NOT EXISTS (
  SELECT 1
  FROM public.vehicle_step_history vsh
  WHERE vsh.vehicle_id = v.id
);

-- =====================================================
-- 8. ANALYTICS VIEWS
-- =====================================================

-- View for easy querying of current step times
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

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT ON public.vehicle_step_history TO authenticated;
GRANT SELECT ON public.vehicle_step_times_current TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_accumulated_hours_in_step(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vehicle_step_times(UUID) TO authenticated;
