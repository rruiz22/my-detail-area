-- =====================================================
-- Deprecate Dealership Auto-Close Configuration
-- =====================================================
-- Migration Purpose: Mark detail_hub_auto_close_config as deprecated
-- Auto-close configuration is now EXCLUSIVELY per-employee via schedule_template JSONB
-- This table is kept for rollback safety but no longer used in application logic

-- Mark table as deprecated (do not drop - keep for rollback safety)
COMMENT ON TABLE detail_hub_auto_close_config IS
'DEPRECATED (2024-12-10): Auto-close configuration is now managed per-employee in detail_hub_employee_assignments.schedule_template JSONB. This table is preserved for rollback purposes only. New auto-close config should NOT use this table.';

-- Add helpful comment to schedule_template column
COMMENT ON COLUMN detail_hub_employee_assignments.schedule_template IS
'JSONB containing shift configuration:
- shift_start_time, shift_end_time: TIME (e.g., "08:00", "17:00")
- days_of_week: INTEGER[] (0=Sunday, 6=Saturday)
- early_punch_allowed_minutes: INTEGER (0-60)
- late_punch_grace_minutes: INTEGER (0-120)
- required_break_minutes: INTEGER
- break_is_paid: BOOLEAN
- assigned_kiosk_id: UUID
- auto_close_enabled: BOOLEAN (default: false)
- auto_close_first_reminder: INTEGER (minutes, default: 30)
- auto_close_second_reminder: INTEGER (minutes, default: 60)
- auto_close_window_minutes: INTEGER (minutes, default: 120)';

-- No data migration needed - employees will configure auto-close individually
-- Default behavior: auto_close_enabled = false (disabled until explicitly enabled by admin)
