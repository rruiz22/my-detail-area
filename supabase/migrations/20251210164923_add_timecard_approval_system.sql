-- Migration: Add Timecard Approval System
-- Purpose: Implement approval workflow for Detail Hub time entries
-- Permissions: Only system_admin and supermanager can approve/reject
-- Safe: Adds new columns without modifying existing data

-- =====================================================
-- STEP 1: Add approval-related columns
-- =====================================================

ALTER TABLE detail_hub_time_entries
ADD COLUMN IF NOT EXISTS approval_status TEXT
  CHECK (approval_status IN ('pending', 'approved', 'rejected'))
  DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- =====================================================
-- STEP 2: Create indexes for query performance
-- =====================================================

-- Index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_time_entries_approval_status
  ON detail_hub_time_entries(approval_status)
  WHERE approval_status IS NOT NULL;

-- Index for filtering by approver
CREATE INDEX IF NOT EXISTS idx_time_entries_approved_by
  ON detail_hub_time_entries(approved_by)
  WHERE approved_by IS NOT NULL;

-- Composite index for common queries (status + approval_status + dealership)
CREATE INDEX IF NOT EXISTS idx_time_entries_status_approval_dealer
  ON detail_hub_time_entries(status, approval_status, dealership_id)
  WHERE status = 'complete';

-- =====================================================
-- STEP 3: Add column comments for documentation
-- =====================================================

COMMENT ON COLUMN detail_hub_time_entries.approval_status IS
  'Timecard approval workflow status: pending (default for new entries), approved (approved by admin), rejected (rejected with reason)';

COMMENT ON COLUMN detail_hub_time_entries.approved_by IS
  'User ID (system_admin or supermanager role) who approved or rejected this timecard entry';

COMMENT ON COLUMN detail_hub_time_entries.approved_at IS
  'Timestamp when the timecard entry was approved or rejected';

COMMENT ON COLUMN detail_hub_time_entries.rejection_reason IS
  'Optional reason provided by admin when rejecting a timecard entry';

-- =====================================================
-- STEP 4: Update existing data (optional migration)
-- =====================================================

-- Set all existing 'complete' entries to 'pending' approval status
-- (Active entries remain pending by default, no need to update)
UPDATE detail_hub_time_entries
SET approval_status = 'pending'
WHERE approval_status IS NULL
  AND status = 'complete'
  AND deleted_at IS NULL;

-- =====================================================
-- STEP 5: Row Level Security (RLS) Policy
-- =====================================================

-- Note: RLS policy for approval updates
-- We rely on application-level validation for now
-- Database-level enforcement would require complex trigger-based validation
-- to check if approval columns are being modified

-- Comment for future enhancement:
-- COMMENT: Consider implementing trigger-based RLS if stricter database-level
-- security is required for timecard approvals

-- =====================================================
-- STEP 6: Audit trigger for approval actions
-- =====================================================

-- Create trigger function to log approval/rejection events
CREATE OR REPLACE FUNCTION log_timecard_approval_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when approval_status actually changes
  IF (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    INSERT INTO detail_hub_audit_logs (
      employee_id,
      action,
      changed_by,
      changes
    ) VALUES (
      NEW.employee_id,
      CASE
        WHEN NEW.approval_status = 'approved' THEN 'timecard_approved'
        WHEN NEW.approval_status = 'rejected' THEN 'timecard_rejected'
        ELSE 'timecard_approval_changed'
      END,
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

-- Attach trigger to table
DROP TRIGGER IF EXISTS timecard_approval_audit_trigger
  ON detail_hub_time_entries;

CREATE TRIGGER timecard_approval_audit_trigger
AFTER UPDATE ON detail_hub_time_entries
FOR EACH ROW
WHEN (OLD.approval_status IS DISTINCT FROM NEW.approval_status)
EXECUTE FUNCTION log_timecard_approval_audit();

-- =====================================================
-- VERIFICATION QUERIES (run manually to verify)
-- =====================================================

-- Verify columns were added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'detail_hub_time_entries'
--   AND column_name IN ('approval_status', 'approved_by', 'approved_at', 'rejection_reason');

-- Verify indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'detail_hub_time_entries'
--   AND indexname LIKE '%approval%';

-- Count pending approvals
-- SELECT approval_status, COUNT(*)
-- FROM detail_hub_time_entries
-- WHERE status = 'complete'
-- GROUP BY approval_status;
