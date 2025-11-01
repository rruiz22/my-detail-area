-- =====================================================
-- Migration: Fix Missing role_module_access Entries
-- =====================================================
-- Description: Auto-sync role_module_access with role_module_permissions_new
--              to fix roles that have permissions but no module access enabled
-- Issue: Custom roles (like service_manager) have permissions in
--        role_module_permissions_new but no entries in role_module_access,
--        causing fail-closed policy to deny all access
-- Solution: Create role_module_access entries for modules where role has permissions
-- Author: Claude Code
-- Date: 2025-10-28
-- =====================================================

-- =====================================================
-- PART 1: Diagnostic - Identify Problem Roles
-- =====================================================

DO $$
DECLARE
  v_problem_roles_count INT;
  v_role_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  DIAGNOSTIC: Missing role_module_access';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Count roles with permissions but missing module_access
  SELECT COUNT(DISTINCT dcr.id) INTO v_problem_roles_count
  FROM dealer_custom_roles dcr
  JOIN role_module_permissions_new rmp ON rmp.role_id = dcr.id
  JOIN module_permissions mp ON mp.id = rmp.permission_id
  LEFT JOIN role_module_access rma
    ON rma.role_id = dcr.id
    AND rma.module = mp.module
  WHERE dcr.is_active = true
    AND mp.is_active = true
    AND (rma.id IS NULL OR rma.is_enabled = false);

  RAISE NOTICE '⚠️  Found % roles with permissions but no/disabled module access', v_problem_roles_count;
  RAISE NOTICE '';

  -- Log each problematic role
  IF v_problem_roles_count > 0 THEN
    RAISE NOTICE 'Details:';
    RAISE NOTICE '--------';

    FOR v_role_record IN
      SELECT DISTINCT
        dcr.role_name,
        dcr.display_name,
        dcr.dealer_id,
        mp.module,
        COUNT(mp.permission_key) as permissions_count,
        BOOL_OR(rma.is_enabled) as has_module_access
      FROM dealer_custom_roles dcr
      JOIN role_module_permissions_new rmp ON rmp.role_id = dcr.id
      JOIN module_permissions mp ON mp.id = rmp.permission_id
      LEFT JOIN role_module_access rma
        ON rma.role_id = dcr.id
        AND rma.module = mp.module
      WHERE dcr.is_active = true
        AND mp.is_active = true
      GROUP BY dcr.role_name, dcr.display_name, dcr.dealer_id, mp.module
      HAVING BOOL_OR(rma.is_enabled) IS NULL OR BOOL_OR(rma.is_enabled) = false
      ORDER BY dcr.role_name, mp.module
    LOOP
      RAISE NOTICE '  • Role: % (%) | Module: % | Permissions: % | Access: %',
        v_role_record.display_name,
        v_role_record.role_name,
        v_role_record.module,
        v_role_record.permissions_count,
        CASE
          WHEN v_role_record.has_module_access IS NULL THEN 'MISSING'
          WHEN v_role_record.has_module_access = false THEN 'DISABLED'
          ELSE 'ENABLED'
        END;
    END LOOP;
  END IF;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- PART 2: Fix - Auto-Populate Missing Entries
-- =====================================================

DO $$
DECLARE
  v_inserted_count INT := 0;
  v_updated_count INT := 0;
  v_module_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  FIX: Creating Missing Entries';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- For each role-module combination with permissions but no/disabled access,
  -- insert or update role_module_access
  FOR v_module_record IN
    SELECT DISTINCT
      dcr.id as role_id,
      dcr.role_name,
      dcr.display_name,
      mp.module
    FROM dealer_custom_roles dcr
    JOIN role_module_permissions_new rmp ON rmp.role_id = dcr.id
    JOIN module_permissions mp ON mp.id = rmp.permission_id
    LEFT JOIN role_module_access rma
      ON rma.role_id = dcr.id
      AND rma.module = mp.module
    WHERE dcr.is_active = true
      AND mp.is_active = true
      AND (rma.id IS NULL OR rma.is_enabled = false)
  LOOP
    -- Try to insert new record
    BEGIN
      INSERT INTO role_module_access (role_id, module, is_enabled)
      VALUES (v_module_record.role_id, v_module_record.module, true)
      ON CONFLICT (role_id, module)
      DO UPDATE SET
        is_enabled = true,
        updated_at = NOW()
      WHERE role_module_access.is_enabled = false; -- Only update if currently disabled

      -- Check if insert or update happened
      IF FOUND THEN
        -- Check if it was an update or insert by looking at created_at vs updated_at
        IF (SELECT created_at = updated_at
            FROM role_module_access
            WHERE role_id = v_module_record.role_id
              AND module = v_module_record.module) THEN
          v_inserted_count := v_inserted_count + 1;
          RAISE NOTICE '  ✅ Created: % (%) → % module access',
            v_module_record.display_name,
            v_module_record.role_name,
            v_module_record.module;
        ELSE
          v_updated_count := v_updated_count + 1;
          RAISE NOTICE '  🔄 Enabled: % (%) → % module access',
            v_module_record.display_name,
            v_module_record.role_name,
            v_module_record.module;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '  ⚠️  Failed to fix % → %: %',
        v_module_record.role_name,
        v_module_record.module,
        SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '  • New entries created: %', v_inserted_count;
  RAISE NOTICE '  • Existing entries enabled: %', v_updated_count;
  RAISE NOTICE '  • Total fixed: %', v_inserted_count + v_updated_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PART 3: Verification - Ensure No Inconsistencies
-- =====================================================

DO $$
DECLARE
  v_remaining_issues INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  VERIFICATION: Post-Migration Check';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check if there are still roles with permissions but no module access
  SELECT COUNT(DISTINCT dcr.id) INTO v_remaining_issues
  FROM dealer_custom_roles dcr
  JOIN role_module_permissions_new rmp ON rmp.role_id = dcr.id
  JOIN module_permissions mp ON mp.id = rmp.permission_id
  LEFT JOIN role_module_access rma
    ON rma.role_id = dcr.id
    AND rma.module = mp.module
  WHERE dcr.is_active = true
    AND mp.is_active = true
    AND (rma.id IS NULL OR rma.is_enabled = false);

  IF v_remaining_issues = 0 THEN
    RAISE NOTICE '✅ SUCCESS: All roles with permissions now have module access enabled';
  ELSE
    RAISE WARNING '⚠️  WARNING: Still have % roles with inconsistent permissions', v_remaining_issues;
    RAISE WARNING '    This may indicate a deeper issue - please investigate manually';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- PART 4: Add Documentation Comment
-- =====================================================

COMMENT ON TABLE role_module_access IS
'Controls which modules each custom role can access. Acts as a toggle to enable/disable entire modules for a role.

IMPORTANT: This table must be in sync with role_module_permissions_new. If a role has permissions in role_module_permissions_new for a module, it MUST have a corresponding entry here with is_enabled=true, otherwise the fail-closed policy will deny all access.

Migration 20251028200000 auto-syncs this table when inconsistencies are found.';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
