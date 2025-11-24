-- =====================================================
-- DETAIL HUB: KIOSK ASSIGNMENT FOR EMPLOYEES
-- =====================================================
-- Purpose: Assign default kiosk to employees for punch enforcement
-- Author: Claude Code
-- Date: 2025-11-17
-- =====================================================

-- Add kiosk assignment columns to employees table
ALTER TABLE detail_hub_employees
  ADD COLUMN default_kiosk_id UUID REFERENCES detail_hub_kiosks(id) ON DELETE SET NULL,
  ADD COLUMN can_punch_any_kiosk BOOLEAN NOT NULL DEFAULT false;

-- Create index for kiosk assignment queries
CREATE INDEX idx_employees_default_kiosk ON detail_hub_employees(default_kiosk_id)
  WHERE default_kiosk_id IS NOT NULL;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON COLUMN detail_hub_employees.default_kiosk_id IS 'Default kiosk assigned to employee for punch in/out';
COMMENT ON COLUMN detail_hub_employees.can_punch_any_kiosk IS 'If true, employee can use any kiosk (managers/supervisors). If false, must use assigned kiosk.';
