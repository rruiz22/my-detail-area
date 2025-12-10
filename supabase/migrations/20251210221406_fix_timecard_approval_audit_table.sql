-- Migration: Fix Timecard Approval Audit Table Reference
-- Purpose: Correct the trigger to use existing detail_hub_employee_audit table
-- Issue: Original migration referenced non-existent detail_hub_audit_logs table
-- Also: Add timecard approval action types to the constraint

-- =====================================================
-- STEP 1: Update constraint to allow timecard action types
-- =====================================================

ALTER TABLE detail_hub_employee_audit
DROP CONSTRAINT IF EXISTS detail_hub_employee_audit_action_type_check;

ALTER TABLE detail_hub_employee_audit
ADD CONSTRAINT detail_hub_employee_audit_action_type_check
CHECK (action_type = ANY (ARRAY[
  'created'::text,
  'updated'::text,
  'deleted'::text,
  'status_changed'::text,
  'role_changed'::text,
  'pin_reset'::text,
  'face_enrolled'::text,
  'timecard_approved'::text,
  'timecard_rejected'::text,
  'timecard_approval_changed'::text
]));

-- =====================================================
-- STEP 2: Drop the broken trigger
-- =====================================================

DROP TRIGGER IF EXISTS timecard_approval_audit_trigger ON detail_hub_time_entries;
DROP FUNCTION IF EXISTS log_timecard_approval_audit();

-- =====================================================
-- STEP 3: Recreate trigger function with correct table reference
-- =====================================================

CREATE OR REPLACE FUNCTION log_timecard_approval_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when approval_status actually changes
  IF (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    INSERT INTO detail_hub_employee_audit (
      employee_id,
      action_type,
      field_name,
      old_value,
      new_value,
      changed_by,
      metadata
    ) VALUES (
      NEW.employee_id,
      CASE
        WHEN NEW.approval_status = 'approved' THEN 'timecard_approved'
        WHEN NEW.approval_status = 'rejected' THEN 'timecard_rejected'
        ELSE 'timecard_approval_changed'
      END,
      'approval_status',
      OLD.approval_status,
      NEW.approval_status,
      NEW.approved_by,
      jsonb_build_object(
        'time_entry_id', NEW.id,
        'approval_status', NEW.approval_status,
        'previous_status', OLD.approval_status,
        'rejection_reason', NEW.rejection_reason,
        'approved_at', NEW.approved_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Recreate trigger with fixed function
-- =====================================================

CREATE TRIGGER timecard_approval_audit_trigger
AFTER UPDATE ON detail_hub_time_entries
FOR EACH ROW
WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
EXECUTE FUNCTION log_timecard_approval_audit();

-- =====================================================
-- VERIFICATION
-- =====================================================

COMMENT ON FUNCTION log_timecard_approval_audit() IS
  'Audit trigger for timecard approval actions. Logs to detail_hub_employee_audit table with action types: timecard_approved, timecard_rejected, timecard_approval_changed';
