-- =====================================================
-- Migrate Existing Permissions to Granular System
-- =====================================================
-- Description: Convert hierarchical permissions to granular checkboxes
-- Author: Claude Code
-- Date: 2025-10-21
-- Migration: 4/4 - Data migration
-- =====================================================

-- =====================================================
-- PART 1: Migration Mapping Logic
-- =====================================================
-- Old System: view < edit < delete < admin (hierarchical)
-- New System: Individual checkboxes (non-hierarchical)
--
-- Mapping Rules:
-- - view  → view_orders only
-- - edit  → view_orders + create_orders + edit_orders + change_status
-- - delete → all of edit + delete_orders
-- - admin → all available permissions for that module
-- =====================================================

-- =====================================================
-- PART 2: Helper Function for Migration
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_permission_level_to_granular(
  p_role_id uuid,
  p_module text,
  p_permission_level text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_permission_ids uuid[];
  v_perm_id uuid;
BEGIN
  -- Get permission IDs based on level
  CASE p_permission_level
    WHEN 'view' THEN
      -- View level: only viewing permission
      SELECT ARRAY_AGG(id) INTO v_permission_ids
      FROM module_permissions
      WHERE module = p_module
      AND permission_key IN ('view_orders', 'view_inventory', 'view_contacts',
                             'view_dashboard', 'view_reports', 'view_users',
                             'view_settings', 'view_dealerships', 'view_tasks',
                             'view_conversations');

    WHEN 'edit' THEN
      -- Edit level: view + create + edit + change status
      SELECT ARRAY_AGG(id) INTO v_permission_ids
      FROM module_permissions
      WHERE module = p_module
      AND permission_key IN ('view_orders', 'create_orders', 'edit_orders', 'change_status',
                             'view_inventory', 'add_vehicles', 'edit_vehicles',
                             'view_contacts', 'create_contacts', 'edit_contacts',
                             'view_dashboard', 'customize_widgets',
                             'view_reports', 'export_reports',
                             'view_users', 'create_users', 'edit_users',
                             'view_settings', 'edit_general_settings',
                             'view_dealerships', 'edit_dealerships',
                             'view_tasks', 'create_tasks', 'edit_tasks',
                             'view_conversations', 'send_messages');

    WHEN 'delete' THEN
      -- Delete level: everything edit has + delete permissions
      SELECT ARRAY_AGG(id) INTO v_permission_ids
      FROM module_permissions
      WHERE module = p_module
      AND permission_key NOT IN ('manage_api_keys', 'delete_users'); -- Exclude dangerous perms

    WHEN 'admin' THEN
      -- Admin level: all permissions for this module
      SELECT ARRAY_AGG(id) INTO v_permission_ids
      FROM module_permissions
      WHERE module = p_module;

    ELSE
      RAISE WARNING 'Unknown permission level: %', p_permission_level;
      RETURN;
  END CASE;

  -- Insert the permissions
  IF v_permission_ids IS NOT NULL THEN
    FOREACH v_perm_id IN ARRAY v_permission_ids
    LOOP
      INSERT INTO role_module_permissions_new (role_id, permission_id, granted_by)
      VALUES (p_role_id, v_perm_id, NULL)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- =====================================================
-- PART 3: Migrate Existing dealer_role_permissions
-- =====================================================

DO $$
DECLARE
  v_migrated_count INT := 0;
  v_role_record RECORD;
BEGIN
  RAISE NOTICE 'Starting migration of existing permissions...';

  -- Loop through all existing role permissions
  FOR v_role_record IN
    SELECT
      drp.role_id,
      drp.module,
      drp.permission_level,
      dcr.display_name as role_name
    FROM dealer_role_permissions drp
    JOIN dealer_custom_roles dcr ON dcr.id = drp.role_id
    WHERE dcr.is_active = true
  LOOP
    -- Migrate each permission using the helper function
    PERFORM migrate_permission_level_to_granular(
      v_role_record.role_id,
      v_role_record.module,
      v_role_record.permission_level
    );

    v_migrated_count := v_migrated_count + 1;

    RAISE NOTICE 'Migrated: % - % - %',
      v_role_record.role_name,
      v_role_record.module,
      v_role_record.permission_level;
  END LOOP;

  RAISE NOTICE '✅ Migrated % permission entries from hierarchical to granular system', v_migrated_count;
END $$;

-- =====================================================
-- PART 4: Grant System-Level Permissions to Admins
-- =====================================================

DO $$
DECLARE
  v_admin_role_ids uuid[];
  v_role_id uuid;
  v_system_perm_id uuid;
  v_granted_count INT := 0;
BEGIN
  RAISE NOTICE 'Granting system-level permissions to admin roles...';

  -- Find all admin roles (roles with 'admin' in the name or with admin-level permissions)
  SELECT ARRAY_AGG(DISTINCT dcr.id) INTO v_admin_role_ids
  FROM dealer_custom_roles dcr
  WHERE (
    dcr.role_name ILIKE '%admin%'
    OR dcr.role_name ILIKE '%manager%'
    OR EXISTS (
      SELECT 1 FROM dealer_role_permissions drp
      WHERE drp.role_id = dcr.id
      AND drp.permission_level = 'admin'
    )
  )
  AND dcr.is_active = true;

  -- Grant system permissions to admin roles
  IF v_admin_role_ids IS NOT NULL THEN
    FOREACH v_role_id IN ARRAY v_admin_role_ids
    LOOP
      -- Grant key system permissions
      FOR v_system_perm_id IN
        SELECT id FROM system_permissions
        WHERE permission_key IN (
          'manage_all_settings',
          'invite_users',
          'activate_deactivate_users',
          'manage_roles',
          'view_audit_logs'
        )
      LOOP
        INSERT INTO role_system_permissions (role_id, permission_id, granted_by)
        VALUES (v_role_id, v_system_perm_id, NULL)
        ON CONFLICT (role_id, permission_id) DO NOTHING;

        v_granted_count := v_granted_count + 1;
      END LOOP;
    END LOOP;
  END IF;

  RAISE NOTICE '✅ Granted % system permissions to admin roles', v_granted_count;
END $$;

-- =====================================================
-- PART 5: Create Verification View
-- =====================================================

-- View to compare old vs new permissions
CREATE OR REPLACE VIEW v_permission_migration_status AS
SELECT
  dcr.id as role_id,
  dcr.role_name,
  dcr.display_name,
  dcr.dealer_id,

  -- Old system counts
  (SELECT COUNT(*) FROM dealer_role_permissions drp WHERE drp.role_id = dcr.id) as old_permission_count,

  -- New system counts
  (SELECT COUNT(*) FROM role_module_permissions_new rmp WHERE rmp.role_id = dcr.id) as new_module_permission_count,
  (SELECT COUNT(*) FROM role_system_permissions rsp WHERE rsp.role_id = dcr.id) as new_system_permission_count,

  -- Migration status
  CASE
    WHEN EXISTS (SELECT 1 FROM role_module_permissions_new rmp WHERE rmp.role_id = dcr.id)
      OR EXISTS (SELECT 1 FROM role_system_permissions rsp WHERE rsp.role_id = dcr.id)
    THEN 'migrated'
    WHEN EXISTS (SELECT 1 FROM dealer_role_permissions drp WHERE drp.role_id = dcr.id)
    THEN 'pending'
    ELSE 'no_permissions'
  END as migration_status

FROM dealer_custom_roles dcr
WHERE dcr.is_active = true
ORDER BY dcr.dealer_id, dcr.role_name;

COMMENT ON VIEW v_permission_migration_status IS
'Shows migration status of roles from old hierarchical system to new granular system';

-- =====================================================
-- PART 6: Generate Migration Report
-- =====================================================

DO $$
DECLARE
  v_total_roles INT;
  v_migrated_roles INT;
  v_total_old_perms INT;
  v_total_new_module_perms INT;
  v_total_new_system_perms INT;
BEGIN
  SELECT COUNT(*) INTO v_total_roles FROM dealer_custom_roles WHERE is_active = true;
  SELECT COUNT(DISTINCT role_id) INTO v_migrated_roles FROM role_module_permissions_new;
  SELECT COUNT(*) INTO v_total_old_perms FROM dealer_role_permissions;
  SELECT COUNT(*) INTO v_total_new_module_perms FROM role_module_permissions_new;
  SELECT COUNT(*) INTO v_total_new_system_perms FROM role_system_permissions;

  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║         GRANULAR PERMISSIONS MIGRATION REPORT            ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Active Roles: %', v_total_roles;
  RAISE NOTICE 'Roles Migrated: %', v_migrated_roles;
  RAISE NOTICE '';
  RAISE NOTICE 'OLD SYSTEM (dealer_role_permissions):';
  RAISE NOTICE '  - Total hierarchical permissions: %', v_total_old_perms;
  RAISE NOTICE '';
  RAISE NOTICE 'NEW SYSTEM (granular permissions):';
  RAISE NOTICE '  - Module-specific permissions: %', v_total_new_module_perms;
  RAISE NOTICE '  - System-level permissions: %', v_total_new_system_perms;
  RAISE NOTICE '  - Total granular permissions: %', v_total_new_module_perms + v_total_new_system_perms;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '📊 View detailed status: SELECT * FROM v_permission_migration_status;';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PART 7: Cleanup (commented out for safety)
-- =====================================================

-- IMPORTANT: Keep old tables for rollback capability
-- Uncomment these lines ONLY after verifying migration success
-- and after 1-2 sprints of stable operation

/*
-- Drop old permission table (DANGEROUS - keep for rollback)
-- DROP TABLE IF EXISTS dealer_role_permissions CASCADE;

-- Rename new table to final name
-- ALTER TABLE role_module_permissions_new RENAME TO role_module_permissions;

-- Update indexes
-- ALTER INDEX idx_role_module_permissions_new_role RENAME TO idx_role_module_permissions_role;
-- ALTER INDEX idx_role_module_permissions_new_permission RENAME TO idx_role_module_permissions_permission;
*/

COMMENT ON TABLE dealer_role_permissions IS
'LEGACY TABLE - Keep for rollback. Use role_module_permissions_new instead.';
