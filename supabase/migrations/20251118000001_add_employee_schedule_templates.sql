-- =====================================================
-- DETAIL HUB: EMPLOYEE SCHEDULE TEMPLATES
-- =====================================================
-- Purpose: Auto-generate recurring schedules from employee templates
-- Features: Default shift hours, days of week, auto-generation
-- Author: Claude Code
-- Date: 2025-11-18
-- =====================================================

-- Add schedule template columns to employees
ALTER TABLE detail_hub_employees
  ADD COLUMN IF NOT EXISTS schedule_template JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_generate_schedules BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS schedule_generation_days_ahead INTEGER DEFAULT 30;

-- Add index for auto-schedule queries
CREATE INDEX IF NOT EXISTS idx_employees_auto_schedule
  ON detail_hub_employees(auto_generate_schedules)
  WHERE auto_generate_schedules = true;

-- =====================================================
-- SCHEDULE GENERATION FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION generate_employee_schedules(
  p_employee_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_days_ahead INTEGER DEFAULT 30,
  p_overwrite_existing BOOLEAN DEFAULT false
)
RETURNS TABLE (
  schedules_created INTEGER,
  schedules_skipped INTEGER,
  date_range TEXT
) AS $$
DECLARE
  v_employee RECORD;
  v_template JSONB;
  v_current_date DATE;
  v_end_date DATE;
  v_day_of_week INTEGER;
  v_schedules_created INTEGER := 0;
  v_schedules_skipped INTEGER := 0;
  v_conflict_exists BOOLEAN;
BEGIN
  SELECT * INTO v_employee FROM detail_hub_employees WHERE id = p_employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee not found: %', p_employee_id; END IF;
  IF v_employee.schedule_template IS NULL THEN RAISE EXCEPTION 'Employee % has no schedule template', p_employee_id; END IF;

  v_template := v_employee.schedule_template;
  v_end_date := p_start_date + p_days_ahead;
  v_current_date := p_start_date;

  WHILE v_current_date < v_end_date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date)::INTEGER;

    IF v_template->'days_of_week' @> to_jsonb(v_day_of_week) THEN
      SELECT EXISTS (
        SELECT 1 FROM detail_hub_schedules
        WHERE employee_id = p_employee_id AND shift_date = v_current_date AND status NOT IN ('cancelled', 'missed')
      ) INTO v_conflict_exists;

      IF v_conflict_exists AND NOT p_overwrite_existing THEN
        v_schedules_skipped := v_schedules_skipped + 1;
      ELSE
        IF p_overwrite_existing THEN
          DELETE FROM detail_hub_schedules WHERE employee_id = p_employee_id AND shift_date = v_current_date AND status = 'scheduled';
        END IF;

        INSERT INTO detail_hub_schedules (
          employee_id, dealership_id, shift_date, shift_start_time, shift_end_time,
          required_break_minutes, break_is_paid, assigned_kiosk_id,
          early_punch_allowed_minutes, late_punch_grace_minutes, status, notes
        ) VALUES (
          p_employee_id, v_employee.dealership_id, v_current_date,
          (v_template->>'shift_start_time')::TIME,
          (v_template->>'shift_end_time')::TIME,
          COALESCE((v_template->>'required_break_minutes')::INTEGER, 30),
          COALESCE((v_template->>'break_is_paid')::BOOLEAN, false),
          NULLIF(v_template->>'assigned_kiosk_id', 'null')::UUID,
          COALESCE((v_template->>'early_punch_allowed_minutes')::INTEGER, 5),
          COALESCE((v_template->>'late_punch_grace_minutes')::INTEGER, 5),
          'scheduled',
          'Auto-generated from employee template'
        )
        ON CONFLICT (employee_id, shift_date) DO NOTHING;

        v_schedules_created := v_schedules_created + 1;
      END IF;
    END IF;

    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN QUERY SELECT v_schedules_created, v_schedules_skipped, p_start_date::TEXT || ' to ' || v_end_date::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-generate on employee create/update
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_auto_generate_schedules()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auto_generate_schedules = true AND NEW.schedule_template IS NOT NULL THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.schedule_template IS DISTINCT FROM OLD.schedule_template) THEN
      PERFORM generate_employee_schedules(NEW.id, CURRENT_DATE, COALESCE(NEW.schedule_generation_days_ahead, 30), false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_employee_schedule_auto_generate ON detail_hub_employees;
CREATE TRIGGER trigger_employee_schedule_auto_generate
  AFTER INSERT OR UPDATE OF schedule_template, auto_generate_schedules ON detail_hub_employees
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_generate_schedules();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION regenerate_employee_schedules(p_employee_id UUID, p_from_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (schedules_created INTEGER, schedules_skipped INTEGER, date_range TEXT) AS $$
DECLARE v_employee RECORD;
BEGIN
  SELECT * INTO v_employee FROM detail_hub_employees WHERE id = p_employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee not found'; END IF;
  RETURN QUERY SELECT * FROM generate_employee_schedules(p_employee_id, p_from_date, COALESCE(v_employee.schedule_generation_days_ahead, 30), true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_all_employee_schedules(p_dealership_id INTEGER, p_start_date DATE DEFAULT CURRENT_DATE, p_days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (employee_id UUID, employee_name TEXT, schedules_created INTEGER, schedules_skipped INTEGER) AS $$
DECLARE
  v_employee RECORD;
  v_result RECORD;
BEGIN
  FOR v_employee IN
    SELECT id, first_name, last_name FROM detail_hub_employees
    WHERE dealership_id = p_dealership_id AND auto_generate_schedules = true AND schedule_template IS NOT NULL AND status = 'active'
  LOOP
    SELECT * INTO v_result FROM generate_employee_schedules(v_employee.id, p_start_date, p_days_ahead, false);
    RETURN QUERY SELECT v_employee.id, v_employee.first_name || ' ' || v_employee.last_name, v_result.schedules_created, v_result.schedules_skipped;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON COLUMN detail_hub_employees.schedule_template IS 'JSONB template: {shift_start_time, shift_end_time, days_of_week:[0-6], required_break_minutes, break_is_paid, early_punch_allowed_minutes, assigned_kiosk_id}';
COMMENT ON COLUMN detail_hub_employees.auto_generate_schedules IS 'If true, automatically generate schedules based on template';
COMMENT ON COLUMN detail_hub_employees.schedule_generation_days_ahead IS 'How many days ahead to generate schedules (default 30)';
