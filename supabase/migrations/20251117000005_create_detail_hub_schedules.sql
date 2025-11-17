-- =====================================================
-- DETAIL HUB: SCHEDULES TABLE
-- =====================================================
-- Purpose: Employee shift scheduling with kiosk assignment
-- Features: Schedule enforcement, early punch rules, break policies
-- Author: Claude Code
-- Date: 2025-11-17
-- =====================================================

-- Create custom types for schedules
CREATE TYPE detail_hub_shift_status AS ENUM (
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'missed',
  'cancelled'
);

-- =====================================================
-- TABLE: detail_hub_schedules
-- =====================================================
CREATE TABLE IF NOT EXISTS detail_hub_schedules (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Schedule details
  shift_date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,

  -- Break policy for this shift
  required_break_minutes INTEGER NOT NULL DEFAULT 30,
  break_is_paid BOOLEAN NOT NULL DEFAULT false,

  -- Kiosk assignment for this shift
  assigned_kiosk_id UUID REFERENCES detail_hub_kiosks(id) ON DELETE SET NULL,

  -- Punch window configuration
  early_punch_allowed_minutes INTEGER NOT NULL DEFAULT 5, -- Can punch in 5 min early
  late_punch_grace_minutes INTEGER NOT NULL DEFAULT 15,   -- Grace period for late punch

  -- Status tracking
  status detail_hub_shift_status NOT NULL DEFAULT 'scheduled',

  -- Actual time entry (linked when employee punches)
  time_entry_id UUID REFERENCES detail_hub_time_entries(id) ON DELETE SET NULL,

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_shift_times CHECK (shift_end_time > shift_start_time),
  CONSTRAINT valid_break_minutes CHECK (required_break_minutes >= 0),
  CONSTRAINT valid_punch_windows CHECK (
    early_punch_allowed_minutes >= 0 AND
    late_punch_grace_minutes >= 0
  ),
  -- One active schedule per employee per day
  CONSTRAINT unique_employee_schedule_per_day UNIQUE (employee_id, shift_date)
);

-- =====================================================
-- INDEXES for performance optimization
-- =====================================================
CREATE INDEX idx_schedules_employee ON detail_hub_schedules(employee_id);
CREATE INDEX idx_schedules_dealership ON detail_hub_schedules(dealership_id);
CREATE INDEX idx_schedules_date ON detail_hub_schedules(shift_date);
CREATE INDEX idx_schedules_status ON detail_hub_schedules(status) WHERE status IN ('scheduled', 'in_progress');
CREATE INDEX idx_schedules_kiosk ON detail_hub_schedules(assigned_kiosk_id) WHERE assigned_kiosk_id IS NOT NULL;

-- Composite index for schedule lookup (most common query)
CREATE INDEX idx_schedules_employee_date ON detail_hub_schedules(employee_id, shift_date DESC);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE TRIGGER trigger_update_detail_hub_schedules_updated_at
  BEFORE UPDATE ON detail_hub_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_detail_hub_employees_updated_at(); -- Reuse existing function

-- =====================================================
-- TRIGGER: Auto-update schedule status based on time entry
-- =====================================================
CREATE OR REPLACE FUNCTION update_schedule_status_from_time_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- When time entry is linked to schedule
  IF NEW.time_entry_id IS NOT NULL AND OLD.time_entry_id IS NULL THEN
    NEW.status := 'in_progress';
  END IF;

  -- When time entry is completed (clocked out)
  IF NEW.time_entry_id IS NOT NULL THEN
    -- Check if linked time entry is complete
    IF EXISTS (
      SELECT 1 FROM detail_hub_time_entries
      WHERE id = NEW.time_entry_id
        AND status = 'complete'
        AND clock_out IS NOT NULL
    ) THEN
      NEW.status := 'completed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_schedule_status
  BEFORE UPDATE OF time_entry_id ON detail_hub_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_status_from_time_entry();

-- =====================================================
-- FUNCTION: Validate if employee can punch in now
-- =====================================================
CREATE OR REPLACE FUNCTION can_punch_in_now(
  p_employee_id UUID,
  p_kiosk_id UUID,
  p_current_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  schedule_id UUID,
  shift_start_time TIME,
  shift_end_time TIME,
  minutes_until_allowed INTEGER
) AS $$
DECLARE
  v_schedule RECORD;
  v_employee RECORD;
  v_current_time_only TIME;
  v_current_date DATE;
  v_minutes_diff INTEGER;
  v_punch_window_start TIME;
  v_active_time_entry RECORD;
BEGIN
  v_current_time_only := p_current_time::TIME;
  v_current_date := p_current_time::DATE;

  -- Get employee details
  SELECT * INTO v_employee
  FROM detail_hub_employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Employee not found', NULL::UUID, NULL::TIME, NULL::TIME, NULL::INTEGER;
    RETURN;
  END IF;

  -- Check if employee has active time entry (already clocked in)
  SELECT * INTO v_active_time_entry
  FROM detail_hub_time_entries
  WHERE employee_id = p_employee_id
    AND status = 'active'
    AND clock_out IS NULL;

  IF FOUND THEN
    RETURN QUERY SELECT false, 'Employee is already clocked in', NULL::UUID, NULL::TIME, NULL::TIME, NULL::INTEGER;
    RETURN;
  END IF;

  -- Get today's schedule
  SELECT * INTO v_schedule
  FROM detail_hub_schedules
  WHERE employee_id = p_employee_id
    AND shift_date = v_current_date
    AND status IN ('scheduled', 'confirmed');

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'No schedule found for today', NULL::UUID, NULL::TIME, NULL::TIME, NULL::INTEGER;
    RETURN;
  END IF;

  -- Validate kiosk assignment (unless employee can use any kiosk)
  IF v_employee.can_punch_any_kiosk = false THEN
    IF v_schedule.assigned_kiosk_id IS NOT NULL AND v_schedule.assigned_kiosk_id != p_kiosk_id THEN
      RETURN QUERY SELECT
        false,
        'Please use your assigned kiosk: ' || (SELECT kiosk_code FROM detail_hub_kiosks WHERE id = v_schedule.assigned_kiosk_id),
        v_schedule.id,
        v_schedule.shift_start_time,
        v_schedule.shift_end_time,
        NULL::INTEGER;
      RETURN;
    END IF;
  END IF;

  -- Calculate punch window start (shift_start - early_punch_minutes)
  v_punch_window_start := v_schedule.shift_start_time - (v_schedule.early_punch_allowed_minutes || ' minutes')::INTERVAL;

  -- Check if current time is within punch window
  IF v_current_time_only < v_punch_window_start THEN
    -- Too early to punch in
    v_minutes_diff := EXTRACT(EPOCH FROM (v_punch_window_start - v_current_time_only)) / 60;
    RETURN QUERY SELECT
      false,
      'Your shift starts at ' || v_schedule.shift_start_time::TEXT || '. You can punch in at ' || v_punch_window_start::TEXT,
      v_schedule.id,
      v_schedule.shift_start_time,
      v_schedule.shift_end_time,
      v_minutes_diff::INTEGER;
    RETURN;
  END IF;

  IF v_current_time_only > v_schedule.shift_end_time THEN
    -- Shift already ended
    RETURN QUERY SELECT
      false,
      'Your shift ended at ' || v_schedule.shift_end_time::TEXT || '. Please contact your supervisor.',
      v_schedule.id,
      v_schedule.shift_start_time,
      v_schedule.shift_end_time,
      NULL::INTEGER;
    RETURN;
  END IF;

  -- All validations passed
  RETURN QUERY SELECT
    true,
    'Ready to punch in',
    v_schedule.id,
    v_schedule.shift_start_time,
    v_schedule.shift_end_time,
    0::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- FUNCTION: Validate break duration
-- =====================================================
CREATE OR REPLACE FUNCTION validate_break_duration(
  p_time_entry_id UUID,
  p_break_start TIMESTAMPTZ,
  p_break_end TIMESTAMPTZ
)
RETURNS TABLE (
  compliant BOOLEAN,
  reason TEXT,
  duration_minutes INTEGER,
  required_minutes INTEGER
) AS $$
DECLARE
  v_duration_minutes INTEGER;
  v_schedule RECORD;
  v_time_entry RECORD;
BEGIN
  -- Calculate break duration
  v_duration_minutes := EXTRACT(EPOCH FROM (p_break_end - p_break_start)) / 60;

  -- Get time entry
  SELECT * INTO v_time_entry
  FROM detail_hub_time_entries
  WHERE id = p_time_entry_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Time entry not found', 0, 0;
    RETURN;
  END IF;

  -- Get schedule for this time entry
  SELECT * INTO v_schedule
  FROM detail_hub_schedules
  WHERE id = v_time_entry.schedule_id;

  -- If no schedule, use default 30 minutes
  IF NOT FOUND THEN
    v_schedule.required_break_minutes := 30;
  END IF;

  -- Validate minimum break duration
  IF v_duration_minutes < v_schedule.required_break_minutes THEN
    RETURN QUERY SELECT
      false,
      'Break duration (' || v_duration_minutes || ' min) is less than required minimum (' || v_schedule.required_break_minutes || ' min)',
      v_duration_minutes,
      v_schedule.required_break_minutes;
    RETURN;
  END IF;

  -- Break is compliant
  RETURN QUERY SELECT
    true,
    'Break duration is compliant',
    v_duration_minutes,
    v_schedule.required_break_minutes;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE detail_hub_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view schedules from their dealerships
CREATE POLICY "Users can view schedules from their dealerships"
  ON detail_hub_schedules
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dm.dealership_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
  );

-- Policy: Managers can insert schedules
CREATE POLICY "Managers can insert schedules"
  ON detail_hub_schedules
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_schedules.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Managers can update schedules
CREATE POLICY "Managers can update schedules"
  ON detail_hub_schedules
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_schedules.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Managers can delete schedules
CREATE POLICY "Managers can delete schedules"
  ON detail_hub_schedules
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_schedules.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get employee's schedule for specific date
CREATE OR REPLACE FUNCTION get_employee_schedule(
  p_employee_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS detail_hub_schedules AS $$
  SELECT *
  FROM detail_hub_schedules
  WHERE employee_id = p_employee_id
    AND shift_date = p_date
    AND status IN ('scheduled', 'confirmed', 'in_progress')
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function: Get all schedules for week
CREATE OR REPLACE FUNCTION get_weekly_schedules(
  p_dealership_id INTEGER,
  p_week_start_date DATE
)
RETURNS SETOF detail_hub_schedules AS $$
  SELECT *
  FROM detail_hub_schedules
  WHERE dealership_id = p_dealership_id
    AND shift_date >= p_week_start_date
    AND shift_date < p_week_start_date + INTERVAL '7 days'
  ORDER BY shift_date, shift_start_time;
$$ LANGUAGE sql STABLE;

-- Function: Detect schedule conflicts
CREATE OR REPLACE FUNCTION detect_schedule_conflicts(
  p_employee_id UUID,
  p_shift_date DATE,
  p_shift_start_time TIME,
  p_shift_end_time TIME,
  p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM detail_hub_schedules
  WHERE employee_id = p_employee_id
    AND shift_date = p_shift_date
    AND id != COALESCE(p_exclude_schedule_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status NOT IN ('cancelled', 'missed')
    AND (
      -- New shift starts during existing shift
      (p_shift_start_time >= shift_start_time AND p_shift_start_time < shift_end_time)
      OR
      -- New shift ends during existing shift
      (p_shift_end_time > shift_start_time AND p_shift_end_time <= shift_end_time)
      OR
      -- New shift completely encompasses existing shift
      (p_shift_start_time <= shift_start_time AND p_shift_end_time >= shift_end_time)
    );

  RETURN v_conflict_count > 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE detail_hub_schedules IS 'Employee shift schedules with kiosk assignment and punch validation rules';
COMMENT ON COLUMN detail_hub_schedules.early_punch_allowed_minutes IS 'How many minutes before shift_start_time employee can punch in';
COMMENT ON COLUMN detail_hub_schedules.late_punch_grace_minutes IS 'Grace period for late punch in without requiring approval';
COMMENT ON COLUMN detail_hub_schedules.required_break_minutes IS 'Minimum break duration required for this shift (usually 30 minutes)';
COMMENT ON COLUMN detail_hub_schedules.assigned_kiosk_id IS 'Specific kiosk where employee must punch for this shift';
