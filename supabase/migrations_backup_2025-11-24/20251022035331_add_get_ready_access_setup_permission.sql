-- =====================================================
-- Migration: Add access_setup permission to get_ready module
-- Purpose: Allow granular control of Get Ready Setup page access
-- Date: 2025-10-22
-- =====================================================

-- Add new permission to module_permissions catalog
INSERT INTO module_permissions (
  module,
  permission_key,
  display_name,
  description,
  is_active
)
VALUES (
  'get_ready',
  'access_setup',
  'Access Setup & Configuration',
  'Can access Get Ready setup page including workflow steps, work item templates, and SLA configuration',
  true
)
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- COMMENT
-- =====================================================

COMMENT ON COLUMN module_permissions.permission_key IS
  'Updated: Added access_setup for Get Ready module to control setup page access';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
