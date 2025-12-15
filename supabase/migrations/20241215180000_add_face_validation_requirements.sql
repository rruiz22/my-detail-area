-- Add face validation requirements to employee assignments
-- This migration adds the ability to require face recognition validation per assignment

-- Update existing schedule_template JSONB to include require_face_validation field
UPDATE detail_hub_employee_assignments
SET schedule_template = schedule_template || '{"require_face_validation": false}'::jsonb
WHERE schedule_template IS NOT NULL
  AND NOT (schedule_template ? 'require_face_validation');

-- Add validation failure tracking table
CREATE TABLE IF NOT EXISTS detail_hub_validation_failures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
    dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
    kiosk_id UUID REFERENCES detail_hub_kiosks(id) ON DELETE SET NULL,
    validation_type TEXT NOT NULL CHECK (validation_type IN (
        'face_recognition_failed',
        'no_face_enrolled',
        'manual_entry_disabled',
        'schedule_window_violation',
        'assignment_inactive',
        'assignment_suspended',
        'multi_dealership_punch',
        'pin_incorrect',
        'camera_error'
    )),
    reason TEXT NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX idx_validation_failures_employee ON detail_hub_validation_failures(employee_id, attempted_at DESC);
CREATE INDEX idx_validation_failures_dealership ON detail_hub_validation_failures(dealership_id, attempted_at DESC);
CREATE INDEX idx_validation_failures_type ON detail_hub_validation_failures(validation_type, attempted_at DESC);

-- Add RLS policies for validation failures
ALTER TABLE detail_hub_validation_failures ENABLE ROW LEVEL SECURITY;

-- Managers can view validation failures for their dealerships
CREATE POLICY "Managers can view validation failures"
    ON detail_hub_validation_failures
    FOR SELECT
    USING (
        dealership_id IN (
            SELECT dealership_id
            FROM dealer_memberships
            WHERE user_id = auth.uid()
            AND (is_admin = true OR is_manager = true)
        )
    );

-- Kiosks can insert validation failures (for unauthenticated access)
CREATE POLICY "Kiosks can insert validation failures"
    ON detail_hub_validation_failures
    FOR INSERT
    WITH CHECK (true);

-- Update validate_punch_in_assignment function to check face validation requirement
CREATE OR REPLACE FUNCTION validate_punch_in_assignment(
    p_employee_id UUID,
    p_dealership_id INTEGER,
    p_kiosk_id UUID DEFAULT NULL,
    p_current_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    allowed BOOLEAN,
    reason TEXT,
    assignment_id UUID,
    shift_start_time TIME,
    shift_end_time TIME,
    early_punch_allowed_minutes INTEGER,
    late_punch_grace_minutes INTEGER,
    minutes_until_allowed INTEGER,
    require_face_validation BOOLEAN
) AS $$
DECLARE
    v_assignment RECORD;
    v_open_punch RECORD;
    v_current_time TIME;
    v_shift_start TIME;
    v_shift_end TIME;
    v_early_minutes INTEGER;
    v_late_minutes INTEGER;
    v_minutes_until INTEGER;
    v_require_face BOOLEAN;
BEGIN
    -- Get the current time component
    v_current_time := p_current_time::TIME;

    -- Check if employee has an assignment for this dealership
    SELECT
        a.*,
        (a.schedule_template->>'shift_start_time')::TIME AS shift_start,
        (a.schedule_template->>'shift_end_time')::TIME AS shift_end,
        COALESCE((a.schedule_template->>'early_punch_allowed_minutes')::INTEGER, 15) AS early_minutes,
        COALESCE((a.schedule_template->>'late_punch_grace_minutes')::INTEGER, 15) AS late_minutes,
        COALESCE((a.schedule_template->>'require_face_validation')::BOOLEAN, false) AS require_face
    INTO v_assignment
    FROM detail_hub_employee_assignments a
    WHERE a.employee_id = p_employee_id
      AND a.dealership_id = p_dealership_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            false AS allowed,
            'Employee not assigned to this dealership' AS reason,
            NULL::UUID AS assignment_id,
            NULL::TIME AS shift_start_time,
            NULL::TIME AS shift_end_time,
            NULL::INTEGER AS early_punch_allowed_minutes,
            NULL::INTEGER AS late_punch_grace_minutes,
            NULL::INTEGER AS minutes_until_allowed,
            false AS require_face_validation;
        RETURN;
    END IF;

    -- Check assignment status
    IF v_assignment.status = 'inactive' THEN
        RETURN QUERY SELECT
            false AS allowed,
            'Assignment is inactive. Contact manager to reactivate.' AS reason,
            v_assignment.id AS assignment_id,
            v_assignment.shift_start AS shift_start_time,
            v_assignment.shift_end AS shift_end_time,
            v_assignment.early_minutes AS early_punch_allowed_minutes,
            v_assignment.late_minutes AS late_punch_grace_minutes,
            NULL::INTEGER AS minutes_until_allowed,
            v_assignment.require_face AS require_face_validation;
        RETURN;
    END IF;

    IF v_assignment.status = 'suspended' THEN
        RETURN QUERY SELECT
            false AS allowed,
            'Assignment is suspended. Contact manager.' AS reason,
            v_assignment.id AS assignment_id,
            v_assignment.shift_start AS shift_start_time,
            v_assignment.shift_end AS shift_end_time,
            v_assignment.early_minutes AS early_punch_allowed_minutes,
            v_assignment.late_minutes AS late_punch_grace_minutes,
            NULL::INTEGER AS minutes_until_allowed,
            v_assignment.require_face AS require_face_validation;
        RETURN;
    END IF;

    -- Check for open punches at other dealerships
    SELECT * INTO v_open_punch
    FROM detail_hub_punches
    WHERE employee_id = p_employee_id
      AND dealership_id != p_dealership_id
      AND clock_out_time IS NULL
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT
            false AS allowed,
            'Employee has open punch at another dealership. Must clock out first.' AS reason,
            v_assignment.id AS assignment_id,
            v_assignment.shift_start AS shift_start_time,
            v_assignment.shift_end AS shift_end_time,
            v_assignment.early_minutes AS early_punch_allowed_minutes,
            v_assignment.late_minutes AS late_punch_grace_minutes,
            NULL::INTEGER AS minutes_until_allowed,
            v_assignment.require_face AS require_face_validation;
        RETURN;
    END IF;

    -- Check schedule window if shift times are defined
    IF v_assignment.shift_start IS NOT NULL THEN
        v_shift_start := v_assignment.shift_start;
        v_shift_end := v_assignment.shift_end;
        v_early_minutes := v_assignment.early_minutes;
        v_late_minutes := v_assignment.late_minutes;

        -- Calculate earliest allowed punch time
        DECLARE
            v_earliest_time TIME;
            v_latest_time TIME;
        BEGIN
            v_earliest_time := v_shift_start - (v_early_minutes || ' minutes')::INTERVAL;
            v_latest_time := v_shift_end + (v_late_minutes || ' minutes')::INTERVAL;

            -- Check if current time is before earliest allowed
            IF v_current_time < v_earliest_time THEN
                -- Calculate minutes until allowed
                v_minutes_until := EXTRACT(EPOCH FROM (v_earliest_time - v_current_time)) / 60;

                RETURN QUERY SELECT
                    false AS allowed,
                    format('Too early to clock in. Earliest allowed time: %s', v_earliest_time::TEXT) AS reason,
                    v_assignment.id AS assignment_id,
                    v_shift_start AS shift_start_time,
                    v_shift_end AS shift_end_time,
                    v_early_minutes AS early_punch_allowed_minutes,
                    v_late_minutes AS late_punch_grace_minutes,
                    v_minutes_until::INTEGER AS minutes_until_allowed,
                    v_assignment.require_face AS require_face_validation;
                RETURN;
            END IF;

            -- Check if current time is after latest allowed (for initial clock in)
            IF v_current_time > v_latest_time THEN
                RETURN QUERY SELECT
                    false AS allowed,
                    format('Too late to clock in. Latest allowed time: %s', v_latest_time::TEXT) AS reason,
                    v_assignment.id AS assignment_id,
                    v_shift_start AS shift_start_time,
                    v_shift_end AS shift_end_time,
                    v_early_minutes AS early_punch_allowed_minutes,
                    v_late_minutes AS late_punch_grace_minutes,
                    NULL::INTEGER AS minutes_until_allowed,
                    v_assignment.require_face AS require_face_validation;
                RETURN;
            END IF;
        END;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT
        true AS allowed,
        'Punch allowed' AS reason,
        v_assignment.id AS assignment_id,
        v_assignment.shift_start AS shift_start_time,
        v_assignment.shift_end AS shift_end_time,
        v_assignment.early_minutes AS early_punch_allowed_minutes,
        v_assignment.late_minutes AS late_punch_grace_minutes,
        NULL::INTEGER AS minutes_until_allowed,
        v_assignment.require_face AS require_face_validation;
END;
$$ LANGUAGE plpgsql;

-- Create function to log validation failures
CREATE OR REPLACE FUNCTION log_validation_failure(
    p_employee_id UUID,
    p_dealership_id INTEGER,
    p_kiosk_id UUID,
    p_validation_type TEXT,
    p_reason TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_failure_id UUID;
BEGIN
    INSERT INTO detail_hub_validation_failures (
        employee_id,
        dealership_id,
        kiosk_id,
        validation_type,
        reason,
        metadata,
        attempted_at
    ) VALUES (
        p_employee_id,
        p_dealership_id,
        p_kiosk_id,
        p_validation_type,
        p_reason,
        p_metadata,
        NOW()
    ) RETURNING id INTO v_failure_id;

    RETURN v_failure_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_validation_failure TO anon;
GRANT EXECUTE ON FUNCTION log_validation_failure TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN detail_hub_employee_assignments.schedule_template IS 'JSONB containing schedule configuration including shift times, break settings, and validation requirements. Fields: shift_start_time, shift_end_time, days_of_week, early_punch_allowed_minutes, late_punch_grace_minutes, required_break_minutes, break_is_paid, auto_close_enabled, auto_close_time, require_face_validation';