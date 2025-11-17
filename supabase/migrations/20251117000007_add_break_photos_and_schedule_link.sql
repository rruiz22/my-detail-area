-- =====================================================
-- DETAIL HUB: BREAK PHOTOS & SCHEDULE LINK
-- =====================================================
-- Purpose: Add photo capture for breaks and link time entries to schedules
-- Author: Claude Code
-- Date: 2025-11-17
-- =====================================================

-- Add new columns to detail_hub_time_entries
ALTER TABLE detail_hub_time_entries
  -- Link to schedule
  ADD COLUMN schedule_id UUID REFERENCES detail_hub_schedules(id) ON DELETE SET NULL,

  -- Photo URLs for breaks
  ADD COLUMN break_start_photo_url TEXT,
  ADD COLUMN break_end_photo_url TEXT,

  -- Schedule compliance tracking
  ADD COLUMN schedule_variance_minutes INTEGER,
  ADD COLUMN early_punch_approved BOOLEAN DEFAULT false,
  ADD COLUMN late_punch_approved BOOLEAN DEFAULT false,

  -- Break policy compliance
  ADD COLUMN break_policy_compliant BOOLEAN DEFAULT true,
  ADD COLUMN break_violation_reason TEXT;

-- Create indexes for new columns
CREATE INDEX idx_time_entries_schedule ON detail_hub_time_entries(schedule_id)
  WHERE schedule_id IS NOT NULL;

CREATE INDEX idx_time_entries_break_compliance ON detail_hub_time_entries(break_policy_compliant)
  WHERE break_policy_compliant = false;

-- =====================================================
-- TRIGGER: Auto-calculate schedule variance
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_schedule_variance()
RETURNS TRIGGER AS $$
DECLARE
  v_schedule RECORD;
  v_scheduled_start TIMESTAMPTZ;
  v_variance_seconds INTEGER;
BEGIN
  -- Only calculate if schedule_id is set
  IF NEW.schedule_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get schedule details
  SELECT * INTO v_schedule
  FROM detail_hub_schedules
  WHERE id = NEW.schedule_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Combine shift_date + shift_start_time to get scheduled start timestamp
  v_scheduled_start := (v_schedule.shift_date || ' ' || v_schedule.shift_start_time)::TIMESTAMPTZ;

  -- Calculate variance in minutes
  v_variance_seconds := EXTRACT(EPOCH FROM (NEW.clock_in - v_scheduled_start));
  NEW.schedule_variance_minutes := v_variance_seconds / 60;

  -- Auto-link schedule to time entry
  UPDATE detail_hub_schedules
  SET time_entry_id = NEW.id,
      status = 'in_progress'
  WHERE id = NEW.schedule_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_schedule_variance
  BEFORE INSERT OR UPDATE OF clock_in, schedule_id ON detail_hub_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_schedule_variance();

-- =====================================================
-- TRIGGER: Validate break policy on clock out
-- =====================================================
CREATE OR REPLACE FUNCTION validate_break_policy_on_clock_out()
RETURNS TRIGGER AS $$
DECLARE
  v_shift_hours DECIMAL;
  v_required_break_minutes INTEGER;
  v_schedule RECORD;
BEGIN
  -- Only validate when clocking out
  IF NEW.clock_out IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate total shift hours
  v_shift_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;

  -- Get schedule (if linked)
  IF NEW.schedule_id IS NOT NULL THEN
    SELECT * INTO v_schedule
    FROM detail_hub_schedules
    WHERE id = NEW.schedule_id;

    v_required_break_minutes := v_schedule.required_break_minutes;
  ELSE
    -- Default policy: 30 min break required for shifts > 6 hours
    v_required_break_minutes := 30;
  END IF;

  -- Validate break policy (shifts > 6 hours require break)
  IF v_shift_hours > 6 THEN
    IF NEW.break_duration_minutes < v_required_break_minutes THEN
      NEW.break_policy_compliant := false;
      NEW.break_violation_reason := 'Shift duration (' || ROUND(v_shift_hours, 1) || ' hours) requires minimum ' ||
                                     v_required_break_minutes || ' minute break. Only ' ||
                                     NEW.break_duration_minutes || ' minutes taken.';
      NEW.requires_manual_verification := true;
    ELSE
      NEW.break_policy_compliant := true;
      NEW.break_violation_reason := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_break_policy
  BEFORE INSERT OR UPDATE OF clock_out, break_duration_minutes ON detail_hub_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_break_policy_on_clock_out();

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON COLUMN detail_hub_time_entries.schedule_id IS 'Links time entry to the scheduled shift';
COMMENT ON COLUMN detail_hub_time_entries.break_start_photo_url IS 'Photo captured when employee starts break';
COMMENT ON COLUMN detail_hub_time_entries.break_end_photo_url IS 'Photo captured when employee ends break';
COMMENT ON COLUMN detail_hub_time_entries.schedule_variance_minutes IS 'Difference in minutes between actual clock_in and scheduled shift_start_time (negative = early, positive = late)';
COMMENT ON COLUMN detail_hub_time_entries.break_policy_compliant IS 'Whether break duration meets minimum requirements for shift length';
COMMENT ON COLUMN detail_hub_time_entries.break_violation_reason IS 'Explanation of break policy violation if non-compliant';
