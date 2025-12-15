-- Comprehensive punch validation system improvements
-- This migration expands validation capabilities and adds tracking

-- 1. Add validation failure tracking table
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
        'camera_error',
        'require_face_not_met'
    )),
    reason TEXT NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_validation_failures_employee ON detail_hub_validation_failures(employee_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_failures_dealership ON detail_hub_validation_failures(dealership_id, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_failures_type ON detail_hub_validation_failures(validation_type, attempted_at DESC);

-- Enable RLS
ALTER TABLE detail_hub_validation_failures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Managers can view validation failures" ON detail_hub_validation_failures;
DROP POLICY IF EXISTS "Kiosks can insert validation failures" ON detail_hub_validation_failures;

-- Managers can view validation failures for their dealerships
CREATE POLICY "Managers can view validation failures"
    ON detail_hub_validation_failures
    FOR SELECT
    USING (
        dealership_id IN (
            SELECT dealer_id as dealership_id
            FROM dealer_memberships
            WHERE user_id = auth.uid()
            AND (role LIKE '%manager%' OR role = 'admin')
        )
    );

-- Kiosks can insert validation failures (for unauthenticated access)
CREATE POLICY "Kiosks can insert validation failures"
    ON detail_hub_validation_failures
    FOR INSERT
    WITH CHECK (true);

-- 2. Update existing schedule_templates to include require_face_validation
UPDATE detail_hub_employee_assignments
SET schedule_template = schedule_template || '{"require_face_validation": false}'::jsonb
WHERE schedule_template IS NOT NULL
  AND NOT (schedule_template ? 'require_face_validation');

-- 3. Create function to log validation failures
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

-- 4. Expand validate_punch_in_assignment to return more information
CREATE OR REPLACE FUNCTION validate_punch_in_assignment(
    p_employee_id UUID,
    p_dealership_id INTEGER,
    p_kiosk_id UUID DEFAULT NULL,
    p_punch_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    v_template JSONB;
    v_shift_start TIME;
    v_shift_end TIME;
    v_early_minutes INTEGER;
    v_late_minutes INTEGER;
    v_punch_time TIME;
    v_earliest_allowed TIME;
    v_latest_allowed TIME;
    v_minutes_until INTEGER;
    v_require_face BOOLEAN;
BEGIN
    -- Get the assignment for this employee and dealership
    SELECT * INTO v_assignment
    FROM detail_hub_employee_assignments
    WHERE employee_id = p_employee_id
      AND dealership_id = p_dealership_id
    LIMIT 1;

    -- Check if assignment exists
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

    -- Extract schedule template values
    v_template := v_assignment.schedule_template;
    v_shift_start := (v_template->>'shift_start_time')::TIME;
    v_shift_end := (v_template->>'shift_end_time')::TIME;
    v_early_minutes := (v_template->>'early_punch_allowed_minutes')::INTEGER;
    v_late_minutes := (v_template->>'late_punch_grace_minutes')::INTEGER;
    v_require_face := COALESCE((v_template->>'require_face_validation')::BOOLEAN, false);
    v_punch_time := p_punch_time::TIME;

    -- Check assignment status
    IF v_assignment.status = 'inactive' THEN
        RETURN QUERY SELECT
            false AS allowed,
            'Assignment is inactive. Contact manager to reactivate.' AS reason,
            v_assignment.id AS assignment_id,
            v_shift_start AS shift_start_time,
            v_shift_end AS shift_end_time,
            v_early_minutes AS early_punch_allowed_minutes,
            v_late_minutes AS late_punch_grace_minutes,
            NULL::INTEGER AS minutes_until_allowed,
            v_require_face AS require_face_validation;
        RETURN;
    END IF;

    IF v_assignment.status = 'suspended' THEN
        RETURN QUERY SELECT
            false AS allowed,
            'Assignment is suspended. Contact manager.' AS reason,
            v_assignment.id AS assignment_id,
            v_shift_start AS shift_start_time,
            v_shift_end AS shift_end_time,
            v_early_minutes AS early_punch_allowed_minutes,
            v_late_minutes AS late_punch_grace_minutes,
            NULL::INTEGER AS minutes_until_allowed,
            v_require_face AS require_face_validation;
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
            v_shift_start AS shift_start_time,
            v_shift_end AS shift_end_time,
            v_early_minutes AS early_punch_allowed_minutes,
            v_late_minutes AS late_punch_grace_minutes,
            NULL::INTEGER AS minutes_until_allowed,
            v_require_face AS require_face_validation;
        RETURN;
    END IF;

    -- Check schedule window if shift start is defined (flexible schedule if NULL)
    IF v_shift_start IS NOT NULL THEN
        -- Calculate allowed punch window
        -- NULL early_minutes = no early restriction (can punch from 00:00)
        IF v_early_minutes IS NULL THEN
            v_earliest_allowed := '00:00:00'::TIME;
        ELSE
            v_earliest_allowed := v_shift_start - (v_early_minutes || ' minutes')::INTERVAL;
        END IF;

        -- NULL late_minutes = no late restriction (can punch until 23:59)
        IF v_late_minutes IS NULL THEN
            v_latest_allowed := '23:59:59'::TIME;
        ELSE
            v_latest_allowed := v_shift_start + (v_late_minutes || ' minutes')::INTERVAL;
        END IF;

        -- Check if current time is before earliest allowed
        IF v_punch_time < v_earliest_allowed THEN
            -- Calculate minutes until allowed
            v_minutes_until := EXTRACT(EPOCH FROM (v_earliest_allowed - v_punch_time)) / 60;

            RETURN QUERY SELECT
                false AS allowed,
                format('Too early to clock in. Earliest allowed time: %s', v_earliest_allowed::TEXT) AS reason,
                v_assignment.id AS assignment_id,
                v_shift_start AS shift_start_time,
                v_shift_end AS shift_end_time,
                v_early_minutes AS early_punch_allowed_minutes,
                v_late_minutes AS late_punch_grace_minutes,
                v_minutes_until::INTEGER AS minutes_until_allowed,
                v_require_face AS require_face_validation;
            RETURN;
        END IF;

        -- Check if current time is after latest allowed (for initial clock in)
        IF v_punch_time > v_latest_allowed THEN
            RETURN QUERY SELECT
                false AS allowed,
                format('Too late to clock in. Latest allowed time: %s', v_latest_allowed::TEXT) AS reason,
                v_assignment.id AS assignment_id,
                v_shift_start AS shift_start_time,
                v_shift_end AS shift_end_time,
                v_early_minutes AS early_punch_allowed_minutes,
                v_late_minutes AS late_punch_grace_minutes,
                NULL::INTEGER AS minutes_until_allowed,
                v_require_face AS require_face_validation;
            RETURN;
        END IF;
    END IF;

    -- All checks passed
    RETURN QUERY SELECT
        true AS allowed,
        'Punch allowed' AS reason,
        v_assignment.id AS assignment_id,
        v_shift_start AS shift_start_time,
        v_shift_end AS shift_end_time,
        v_early_minutes AS early_punch_allowed_minutes,
        v_late_minutes AS late_punch_grace_minutes,
        NULL::INTEGER AS minutes_until_allowed,
        v_require_face AS require_face_validation;
END;
$$ LANGUAGE plpgsql;

-- Add documentation comments
COMMENT ON COLUMN detail_hub_employee_assignments.schedule_template IS
'JSONB containing schedule configuration including shift times, break settings, and validation requirements.
Fields: shift_start_time, shift_end_time, days_of_week, early_punch_allowed_minutes, late_punch_grace_minutes,
required_break_minutes, break_is_paid, auto_close_enabled, auto_close_time, require_face_validation';

COMMENT ON TABLE detail_hub_validation_failures IS
'Tracks failed validation attempts at punch kiosks for auditing and analysis';

COMMENT ON FUNCTION log_validation_failure IS
'Logs a failed validation attempt with type, reason, and optional metadata';

COMMENT ON FUNCTION validate_punch_in_assignment IS
'Validates if an employee can punch in based on their assignment schedule and status.
Returns detailed schedule information and validation requirements.';