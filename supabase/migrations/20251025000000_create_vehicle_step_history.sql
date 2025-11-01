-- =====================================================
-- VEHICLE STEP HISTORY - Complete Step Visit Tracking
-- Date: 2025-10-25
-- Purpose: Track every visit to each step, supporting multiple visits
--          and providing historical analytics for Get Ready module
-- =====================================================

-- =====================================================
-- PHASE 1: CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vehicle_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Step visit details
  step_id TEXT NOT NULL REFERENCES public.get_ready_steps(id),
  step_name TEXT NOT NULL,  -- Denormalized for historical accuracy
  step_color TEXT,          -- For UI display

  -- Time tracking
  entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_date TIMESTAMPTZ,  -- NULL = current visit
  hours_accumulated DECIMAL(10,2),  -- Will be calculated by function

  -- Visit metadata
  visit_number INTEGER NOT NULL DEFAULT 1,  -- 1st, 2nd, 3rd visit to this step
  is_current_visit BOOLEAN DEFAULT TRUE,
  is_backtrack BOOLEAN DEFAULT FALSE,  -- Moved to previous step?

  -- Context at entry
  priority_at_entry TEXT,
  workflow_type_at_entry TEXT,
  work_items_pending_at_entry INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PHASE 2: CREATE INDEXES
-- =====================================================

-- Core indexes for performance
CREATE INDEX idx_vehicle_step_history_vehicle_id
  ON public.vehicle_step_history(vehicle_id);

CREATE INDEX idx_vehicle_step_history_step_id
  ON public.vehicle_step_history(step_id);

CREATE INDEX idx_vehicle_step_history_dealer_id
  ON public.vehicle_step_history(dealer_id);

CREATE INDEX idx_vehicle_step_history_entry_date
  ON public.vehicle_step_history(entry_date DESC);

-- Partial index for current visits (commonly queried)
CREATE INDEX idx_vehicle_step_history_current_visit
  ON public.vehicle_step_history(vehicle_id, is_current_visit)
  WHERE is_current_visit = TRUE;

-- Partial index for active visits (no exit date)
CREATE INDEX idx_vehicle_step_history_active
  ON public.vehicle_step_history(vehicle_id, step_id)
  WHERE exit_date IS NULL;

-- Composite index for analytics queries
CREATE INDEX idx_vehicle_step_history_analytics
  ON public.vehicle_step_history(dealer_id, entry_date, step_id, visit_number);

-- =====================================================
-- PHASE 3: RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.vehicle_step_history ENABLE ROW LEVEL SECURITY;

-- Users can view step history for their dealerships
CREATE POLICY "Users can view step history for their dealerships"
  ON public.vehicle_step_history FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

-- System can manage step history
CREATE POLICY "System can manage step history"
  ON public.vehicle_step_history FOR ALL
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id))
  WITH CHECK (user_has_active_dealer_membership(auth.uid(), dealer_id));

-- =====================================================
-- PHASE 4: TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE public.vehicle_step_history IS
  'Detailed history of vehicle visits to each step, supporting multiple visits to the same step';

COMMENT ON COLUMN public.vehicle_step_history.visit_number IS
  'Sequential visit number to this specific step (1 = first visit, 2 = revisit, etc.)';

COMMENT ON COLUMN public.vehicle_step_history.is_backtrack IS
  'TRUE if vehicle moved to a previous step in the workflow order';

COMMENT ON COLUMN public.vehicle_step_history.hours_accumulated IS
  'Hours spent in this visit (calculated when exit_date is set)';

-- =====================================================
-- PHASE 5: HELPER FUNCTION FOR HOURS CALCULATION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_step_hours(
  p_entry_date TIMESTAMPTZ,
  p_exit_date TIMESTAMPTZ
)
RETURNS DECIMAL(10,2) AS $$
BEGIN
  IF p_exit_date IS NULL THEN
    -- For current visits, calculate hours up to now
    RETURN ROUND(EXTRACT(EPOCH FROM (NOW() - p_entry_date)) / 3600, 2);
  ELSE
    -- For completed visits, use actual exit date
    RETURN ROUND(EXTRACT(EPOCH FROM (p_exit_date - p_entry_date)) / 3600, 2);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- PHASE 6: TRIGGER FUNCTIONS
-- =====================================================

-- =====================================================
-- TRIGGER 1: Auto-manage step history on vehicle changes
-- =====================================================

CREATE OR REPLACE FUNCTION manage_vehicle_step_history()
RETURNS TRIGGER AS $$
DECLARE
  v_previous_step_id TEXT;
  v_step_name TEXT;
  v_step_color TEXT;
  v_visit_count INTEGER;
  v_is_backtrack BOOLEAN := FALSE;
  v_current_step_order INTEGER;
  v_new_step_order INTEGER;
  v_work_items_pending INTEGER := 0;
BEGIN
  -- On INSERT: Create first history entry
  IF TG_OP = 'INSERT' THEN
    -- Get step details
    SELECT name, color INTO v_step_name, v_step_color
    FROM get_ready_steps
    WHERE id = NEW.step_id;

    -- Count pending work items
    SELECT COUNT(*) INTO v_work_items_pending
    FROM get_ready_work_items
    WHERE vehicle_id = NEW.id AND status IN ('pending', 'awaiting_approval');

    INSERT INTO vehicle_step_history (
      vehicle_id, dealer_id, step_id, step_name, step_color,
      entry_date, visit_number, is_current_visit, is_backtrack,
      priority_at_entry, workflow_type_at_entry, work_items_pending_at_entry,
      hours_accumulated
    ) VALUES (
      NEW.id, NEW.dealer_id, NEW.step_id, v_step_name, v_step_color,
      NEW.intake_date, 1, TRUE, FALSE,
      NEW.priority, NEW.workflow_type, v_work_items_pending,
      0 -- Initial hours
    );

    RETURN NEW;
  END IF;

  -- On UPDATE: Handle step changes
  IF TG_OP = 'UPDATE' AND OLD.step_id IS DISTINCT FROM NEW.step_id THEN
    v_previous_step_id := OLD.step_id;

    -- Close previous step visit (calculate final hours)
    UPDATE vehicle_step_history
    SET
      exit_date = NOW(),
      is_current_visit = FALSE,
      hours_accumulated = calculate_step_hours(entry_date, NOW()),
      updated_at = NOW()
    WHERE
      vehicle_id = NEW.id
      AND is_current_visit = TRUE;

    -- Get new step details
    SELECT name, color INTO v_step_name, v_step_color
    FROM get_ready_steps
    WHERE id = NEW.step_id;

    -- Count previous visits to this step
    SELECT COUNT(*) INTO v_visit_count
    FROM vehicle_step_history
    WHERE vehicle_id = NEW.id AND step_id = NEW.step_id;

    -- Determine if this is a backtrack (moving to earlier step)
    SELECT
      s_old.order_index,
      s_new.order_index
    INTO
      v_current_step_order,
      v_new_step_order
    FROM
      get_ready_steps s_old,
      get_ready_steps s_new
    WHERE
      s_old.id = v_previous_step_id
      AND s_new.id = NEW.step_id
      AND s_old.dealer_id = NEW.dealer_id
      AND s_new.dealer_id = NEW.dealer_id;

    IF v_new_step_order IS NOT NULL AND v_current_step_order IS NOT NULL
       AND v_new_step_order < v_current_step_order THEN
      v_is_backtrack := TRUE;
    END IF;

    -- Count pending work items at entry
    SELECT COUNT(*) INTO v_work_items_pending
    FROM get_ready_work_items
    WHERE vehicle_id = NEW.id AND status IN ('pending', 'awaiting_approval');

    -- Create new history entry
    INSERT INTO vehicle_step_history (
      vehicle_id, dealer_id, step_id, step_name, step_color,
      entry_date, visit_number, is_current_visit, is_backtrack,
      priority_at_entry, workflow_type_at_entry, work_items_pending_at_entry,
      hours_accumulated,
      metadata
    ) VALUES (
      NEW.id, NEW.dealer_id, NEW.step_id, v_step_name, v_step_color,
      NOW(), v_visit_count + 1, TRUE, v_is_backtrack,
      NEW.priority, NEW.workflow_type, v_work_items_pending,
      0, -- Initial hours for new visit
      jsonb_build_object(
        'previous_step_id', v_previous_step_id,
        'previous_step_name', (SELECT name FROM get_ready_steps WHERE id = v_previous_step_id),
        'is_revisit', v_visit_count > 0
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_manage_vehicle_step_history ON public.get_ready_vehicles;
CREATE TRIGGER trigger_manage_vehicle_step_history
  AFTER INSERT OR UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION manage_vehicle_step_history();

-- =====================================================
-- PHASE 7: ANALYTICS VIEWS
-- =====================================================

-- =====================================================
-- VIEW 1: Current step visit details
-- =====================================================

CREATE OR REPLACE VIEW vehicle_step_times_current AS
SELECT
  vsh.vehicle_id,
  vsh.step_id,
  vsh.step_name AS current_step_name,
  vsh.entry_date AS current_step_entry,
  vsh.visit_number,

  -- Current visit time (live calculation)
  calculate_step_hours(vsh.entry_date, NULL) AS current_visit_hours,
  ROUND(calculate_step_hours(vsh.entry_date, NULL) / 24, 1) AS current_visit_days,

  -- Previous visits to THIS step
  COALESCE((
    SELECT SUM(hours_accumulated)
    FROM vehicle_step_history prev
    WHERE
      prev.vehicle_id = vsh.vehicle_id
      AND prev.step_id = vsh.step_id
      AND prev.exit_date IS NOT NULL
  ), 0) AS previous_visits_hours,

  -- Total time across all visits to this step
  COALESCE((
    SELECT SUM(calculate_step_hours(all_v.entry_date, all_v.exit_date))
    FROM vehicle_step_history all_v
    WHERE
      all_v.vehicle_id = vsh.vehicle_id
      AND all_v.step_id = vsh.step_id
  ), 0) AS total_accumulated_hours,

  -- Backtrack info
  vsh.is_backtrack,
  vsh.priority_at_entry,
  vsh.workflow_type_at_entry

FROM vehicle_step_history vsh
WHERE vsh.is_current_visit = TRUE;

COMMENT ON VIEW vehicle_step_times_current IS
  'Real-time view of current step visit with accumulated time across all visits to that step';

-- =====================================================
-- VIEW 2: Step time summary per vehicle
-- =====================================================

CREATE OR REPLACE VIEW vehicle_step_time_summary AS
SELECT
  vsh.vehicle_id,
  vsh.step_id,
  vsh.step_name,
  vsh.step_color,

  -- Visit counts
  COUNT(*) AS visit_count,
  COUNT(*) FILTER (WHERE vsh.is_backtrack) AS backtrack_count,

  -- Time aggregations
  SUM(calculate_step_hours(vsh.entry_date, vsh.exit_date)) AS total_hours,
  ROUND(AVG(calculate_step_hours(vsh.entry_date, vsh.exit_date)), 2) AS avg_hours_per_visit,
  MIN(calculate_step_hours(vsh.entry_date, vsh.exit_date)) AS min_hours,
  MAX(calculate_step_hours(vsh.entry_date, vsh.exit_date)) AS max_hours,

  -- Date ranges
  MIN(vsh.entry_date) AS first_entry,
  MAX(vsh.exit_date) AS last_exit,

  -- Current status
  MAX(vsh.is_current_visit::int)::boolean AS is_current_step

FROM vehicle_step_history vsh
GROUP BY vsh.vehicle_id, vsh.step_id, vsh.step_name, vsh.step_color;

COMMENT ON VIEW vehicle_step_time_summary IS
  'Aggregated time metrics per step per vehicle, including revisit analytics';

-- =====================================================
-- PHASE 8: RPC FUNCTIONS
-- =====================================================

-- =====================================================
-- RPC 1: Get vehicle step times (all steps)
-- =====================================================

CREATE OR REPLACE FUNCTION get_vehicle_step_times(p_vehicle_id UUID)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  total_hours NUMERIC,
  total_days NUMERIC,
  visit_count BIGINT,
  is_current_step BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vsts.step_id,
    vsts.step_name,
    ROUND(vsts.total_hours::numeric, 2) AS total_hours,
    ROUND((vsts.total_hours / 24)::numeric, 1) AS total_days,
    vsts.visit_count,
    vsts.is_current_step
  FROM vehicle_step_time_summary vsts
  WHERE vsts.vehicle_id = p_vehicle_id
  ORDER BY (
    SELECT order_index
    FROM get_ready_steps s
    WHERE s.id = vsts.step_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_vehicle_step_times IS
  'Get accumulated time for each step a vehicle has been through, ordered by workflow';

-- =====================================================
-- RPC 2: Get accumulated hours in specific step
-- =====================================================

CREATE OR REPLACE FUNCTION get_accumulated_hours_in_step(
  p_vehicle_id UUID,
  p_step_id TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_hours NUMERIC;
BEGIN
  SELECT COALESCE(SUM(
    calculate_step_hours(entry_date, exit_date)
  ), 0)
  INTO v_total_hours
  FROM vehicle_step_history
  WHERE vehicle_id = p_vehicle_id AND step_id = p_step_id;

  RETURN ROUND(v_total_hours, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_accumulated_hours_in_step IS
  'Get total accumulated hours for a vehicle in a specific step (all visits combined)';

-- =====================================================
-- RPC 3: Get step visit breakdown
-- =====================================================

CREATE OR REPLACE FUNCTION get_step_visit_breakdown(
  p_vehicle_id UUID,
  p_step_id TEXT
)
RETURNS TABLE (
  visit_number INTEGER,
  entry_date TIMESTAMPTZ,
  exit_date TIMESTAMPTZ,
  hours_spent NUMERIC,
  is_current BOOLEAN,
  is_backtrack BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vsh.visit_number,
    vsh.entry_date,
    vsh.exit_date,
    ROUND(calculate_step_hours(vsh.entry_date, vsh.exit_date), 2) AS hours_spent,
    vsh.is_current_visit,
    vsh.is_backtrack
  FROM vehicle_step_history vsh
  WHERE vsh.vehicle_id = p_vehicle_id AND vsh.step_id = p_step_id
  ORDER BY vsh.visit_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_step_visit_breakdown IS
  'Get detailed breakdown of all visits to a specific step for a vehicle';

-- =====================================================
-- RPC 4: Get dealer step analytics
-- =====================================================

CREATE OR REPLACE FUNCTION get_dealer_step_analytics(
  p_dealer_id BIGINT,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  total_vehicles BIGINT,
  revisit_rate NUMERIC,
  avg_time_first_visit NUMERIC,
  avg_time_revisits NUMERIC,
  avg_total_time NUMERIC,
  max_revisits INTEGER,
  backtrack_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH step_stats AS (
    SELECT
      vsh.step_id,
      MAX(vsh.step_name) AS step_name,
      COUNT(DISTINCT vsh.vehicle_id) AS total_vehicles,
      COUNT(DISTINCT vsh.vehicle_id) FILTER (WHERE vsh.visit_number > 1) AS vehicles_with_revisits,
      ROUND(AVG(calculate_step_hours(vsh.entry_date, vsh.exit_date))
            FILTER (WHERE vsh.visit_number = 1), 2) AS avg_time_first_visit,
      ROUND(AVG(calculate_step_hours(vsh.entry_date, vsh.exit_date))
            FILTER (WHERE vsh.visit_number > 1), 2) AS avg_time_revisits,
      MAX(vsh.visit_number) AS max_revisits,
      COUNT(*) FILTER (WHERE vsh.is_backtrack) AS backtrack_count
    FROM vehicle_step_history vsh
    INNER JOIN get_ready_vehicles v ON vsh.vehicle_id = v.id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date >= NOW() - (p_days_back || ' days')::INTERVAL
      AND v.deleted_at IS NULL
    GROUP BY vsh.step_id
  ),
  summary_stats AS (
    SELECT
      vsts.step_id,
      ROUND(AVG(vsts.total_hours), 2) AS avg_total_time
    FROM vehicle_step_time_summary vsts
    INNER JOIN vehicle_step_history vsh ON vsts.vehicle_id = vsh.vehicle_id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY vsts.step_id
  )
  SELECT
    ss.step_id,
    ss.step_name,
    ss.total_vehicles,
    ROUND((ss.vehicles_with_revisits::NUMERIC / NULLIF(ss.total_vehicles, 0)::NUMERIC) * 100, 1) AS revisit_rate,
    ss.avg_time_first_visit,
    ss.avg_time_revisits,
    COALESCE(sms.avg_total_time, ss.avg_time_first_visit) AS avg_total_time,
    ss.max_revisits,
    ss.backtrack_count
  FROM step_stats ss
  LEFT JOIN summary_stats sms ON ss.step_id = sms.step_id
  ORDER BY (
    SELECT order_index FROM get_ready_steps WHERE id = ss.step_id LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_dealer_step_analytics IS
  'Get comprehensive step analytics for a dealer including revisit rates and backtrack analysis';

-- =====================================================
-- RPC 5: Get historical KPIs
-- =====================================================

CREATE OR REPLACE FUNCTION get_historical_kpis(
  p_dealer_id BIGINT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  date DATE,
  avg_t2l NUMERIC,
  daily_throughput INTEGER,
  sla_compliance NUMERIC,
  active_vehicles INTEGER,
  vehicles_completed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_metrics AS (
    SELECT
      DATE(vsh.entry_date) AS metric_date,
      COUNT(DISTINCT vsh.vehicle_id) AS vehicles_active,
      COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') AS completed_count
    FROM vehicle_step_history vsh
    INNER JOIN get_ready_vehicles v ON vsh.vehicle_id = v.id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date BETWEEN p_start_date AND p_end_date
      AND v.deleted_at IS NULL
    GROUP BY DATE(vsh.entry_date)
  )
  SELECT
    dm.metric_date::DATE,
    ROUND(AVG(v.actual_t2l)::NUMERIC, 2) AS avg_t2l,
    dm.completed_count AS daily_throughput,
    ROUND((COUNT(*) FILTER (WHERE v.sla_status = 'on_track')::NUMERIC /
           NULLIF(COUNT(*), 0)::NUMERIC), 3) AS sla_compliance,
    dm.vehicles_active AS active_vehicles,
    dm.completed_count AS vehicles_completed
  FROM daily_metrics dm
  INNER JOIN get_ready_vehicles v ON DATE(v.created_at) = dm.metric_date
  WHERE v.dealer_id = p_dealer_id AND v.deleted_at IS NULL
  GROUP BY dm.metric_date, dm.vehicles_active, dm.completed_count
  ORDER BY dm.metric_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_historical_kpis IS
  'Get daily KPIs for a date range including T2L, throughput, and SLA compliance';

-- =====================================================
-- PHASE 9: BACKFILL SCRIPT
-- =====================================================

-- Create function to backfill history for existing vehicles
CREATE OR REPLACE FUNCTION backfill_vehicle_step_history()
RETURNS TABLE (
  vehicles_processed INTEGER,
  history_entries_created INTEGER
) AS $$
DECLARE
  v_vehicles_processed INTEGER := 0;
  v_entries_created INTEGER := 0;
  v_vehicle RECORD;
  v_step_name TEXT;
  v_step_color TEXT;
  v_work_items_pending INTEGER;
BEGIN
  -- Process all active vehicles that don't have history
  FOR v_vehicle IN
    SELECT v.*
    FROM get_ready_vehicles v
    WHERE v.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM vehicle_step_history vsh
        WHERE vsh.vehicle_id = v.id
      )
  LOOP
    -- Get step details
    SELECT name, color INTO v_step_name, v_step_color
    FROM get_ready_steps
    WHERE id = v_vehicle.step_id;

    -- Count pending work items
    SELECT COUNT(*) INTO v_work_items_pending
    FROM get_ready_work_items
    WHERE vehicle_id = v_vehicle.id
      AND status IN ('pending', 'awaiting_approval');

    -- Create history entry for current step
    INSERT INTO vehicle_step_history (
      vehicle_id, dealer_id, step_id, step_name, step_color,
      entry_date, visit_number, is_current_visit, is_backtrack,
      priority_at_entry, workflow_type_at_entry, work_items_pending_at_entry,
      hours_accumulated
    ) VALUES (
      v_vehicle.id, v_vehicle.dealer_id, v_vehicle.step_id,
      v_step_name, v_step_color,
      v_vehicle.intake_date, 1, TRUE, FALSE,
      v_vehicle.priority, v_vehicle.workflow_type, v_work_items_pending,
      calculate_step_hours(v_vehicle.intake_date, NULL)
    );

    v_vehicles_processed := v_vehicles_processed + 1;
    v_entries_created := v_entries_created + 1;
  END LOOP;

  RETURN QUERY SELECT v_vehicles_processed, v_entries_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION backfill_vehicle_step_history IS
  'Backfill step history for existing vehicles (one-time migration helper)';

-- =====================================================
-- PHASE 10: EXECUTE BACKFILL
-- =====================================================

-- Run backfill for existing vehicles
SELECT * FROM backfill_vehicle_step_history();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Vehicle step history system created successfully!';
  RAISE NOTICE 'Tables: vehicle_step_history';
  RAISE NOTICE 'Views: vehicle_step_times_current, vehicle_step_time_summary';
  RAISE NOTICE 'RPC Functions: get_vehicle_step_times, get_accumulated_hours_in_step, get_step_visit_breakdown, get_dealer_step_analytics, get_historical_kpis';
  RAISE NOTICE 'Backfill completed for existing vehicles';
END $$;
