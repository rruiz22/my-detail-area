-- =====================================================
-- ADD STOCK AND GET_READY MODULE PERMISSIONS
-- =====================================================
-- This migration adds granular permissions for the Stock and Get Ready modules
-- Date: 2025-10-21
-- Author: AI Assistant
-- =====================================================

-- =====================================================
-- STOCK MODULE PERMISSIONS
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description)
VALUES
  -- View & Access
  ('stock', 'view_inventory', 'View Inventory', 'View stock inventory and vehicle listings'),

  -- Edit & Manage
  ('stock', 'edit_vehicles', 'Edit Vehicles', 'Edit vehicle information in stock'),
  ('stock', 'delete_vehicles', 'Delete Vehicles', 'Delete vehicles from stock inventory'),

  -- Import & Sync
  ('stock', 'upload_inventory', 'Upload Inventory', 'Upload inventory via CSV or other formats'),
  ('stock', 'sync_dms', 'Sync with DMS', 'Synchronize inventory with Dealer Management System'),

  -- Export & Reports
  ('stock', 'export_data', 'Export Data', 'Export stock inventory data and reports'),
  ('stock', 'view_analytics', 'View Analytics', 'View stock analytics and metrics'),

  -- Configuration
  ('stock', 'configure_settings', 'Configure Settings', 'Configure stock module settings and DMS connection')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- GET_READY MODULE PERMISSIONS
-- =====================================================

INSERT INTO module_permissions (module, permission_key, display_name, description)
VALUES
  -- View & Access
  ('get_ready', 'view_vehicles', 'View Vehicles', 'View vehicles in Get Ready workflow'),
  ('get_ready', 'view_dashboard', 'View Dashboard', 'View Get Ready dashboard and metrics'),

  -- Create & Edit Vehicles
  ('get_ready', 'create_vehicles', 'Create Vehicles', 'Add new vehicles to Get Ready'),
  ('get_ready', 'edit_vehicles', 'Edit Vehicles', 'Edit vehicle information'),
  ('get_ready', 'delete_vehicles', 'Delete Vehicles', 'Delete vehicles from Get Ready'),

  -- Work Items & Tasks
  ('get_ready', 'view_work_items', 'View Work Items', 'View work items and tasks'),
  ('get_ready', 'create_work_items', 'Create Work Items', 'Create new work items and tasks'),
  ('get_ready', 'edit_work_items', 'Edit Work Items', 'Edit work items and tasks'),
  ('get_ready', 'delete_work_items', 'Delete Work Items', 'Delete work items and tasks'),
  ('get_ready', 'manage_templates', 'Manage Templates', 'Manage work item templates'),

  -- Approval & Workflow
  ('get_ready', 'approve_steps', 'Approve Steps', 'Approve workflow steps and transitions'),
  ('get_ready', 'change_status', 'Change Status', 'Change vehicle status in workflow'),

  -- Notes & Communication
  ('get_ready', 'view_notes', 'View Notes', 'View notes and comments'),
  ('get_ready', 'create_notes', 'Create Notes', 'Create notes and comments'),
  ('get_ready', 'edit_notes', 'Edit Notes', 'Edit notes and comments'),
  ('get_ready', 'delete_notes', 'Delete Notes', 'Delete notes and comments'),

  -- Media & Photos
  ('get_ready', 'view_media', 'View Media', 'View photos and media files'),
  ('get_ready', 'upload_media', 'Upload Media', 'Upload photos and media files'),
  ('get_ready', 'delete_media', 'Delete Media', 'Delete photos and media files'),

  -- Vendors
  ('get_ready', 'view_vendors', 'View Vendors', 'View vendor information'),
  ('get_ready', 'manage_vendors', 'Manage Vendors', 'Create, edit, and manage vendors'),

  -- Configuration & Settings
  ('get_ready', 'configure_sla', 'Configure SLA', 'Configure SLA settings and thresholds'),
  ('get_ready', 'configure_workflow', 'Configure Workflow', 'Configure workflow steps and settings'),

  -- Export & Reports
  ('get_ready', 'export_data', 'Export Data', 'Export Get Ready data and reports')
ON CONFLICT (module, permission_key) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show all Stock permissions
SELECT
  module,
  permission_key,
  display_name,
  description
FROM module_permissions
WHERE module = 'stock'
ORDER BY permission_key;

-- Show all Get Ready permissions
SELECT
  module,
  permission_key,
  display_name,
  description
FROM module_permissions
WHERE module = 'get_ready'
ORDER BY permission_key;

-- Count permissions by module
SELECT
  module,
  COUNT(*) as permission_count
FROM module_permissions
WHERE module IN ('stock', 'get_ready')
GROUP BY module;

-- Show summary
SELECT
  '✅ Stock Module' as status,
  COUNT(*) as total_permissions
FROM module_permissions
WHERE module = 'stock'
UNION ALL
SELECT
  '✅ Get Ready Module' as status,
  COUNT(*) as total_permissions
FROM module_permissions
WHERE module = 'get_ready';
