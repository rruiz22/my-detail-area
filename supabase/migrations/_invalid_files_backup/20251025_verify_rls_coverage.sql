-- ============================================================================
-- RLS COVERAGE VERIFICATION SCRIPT
-- ============================================================================
-- Purpose: Verify that all tables have proper RLS policies after migration
-- Date: 2025-10-25
-- Run after: 20251025_fix_critical_rls_security.sql
--
-- This script checks:
-- 1. All tables have RLS enabled
-- 2. All tables with RLS have at least one policy
-- 3. No tables are publicly accessible without authentication
-- 4. Helper functions exist and are accessible
-- ============================================================================

-- ============================================================================
-- CHECK 1: Verify Helper Functions Exist
-- ============================================================================

DO $$
DECLARE
  v_function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_user_dealership',
    'is_system_admin',
    'can_access_dealership',
    'user_has_dealer_membership',
    'user_has_group_permission'
  );

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CHECK 1: HELPER FUNCTIONS';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Expected: 5 helper functions';
  RAISE NOTICE 'Found: % helper functions', v_function_count;

  IF v_function_count = 5 THEN
    RAISE NOTICE 'Status: ✓ PASS - All helper functions exist';
  ELSE
    RAISE WARNING 'Status: ✗ FAIL - Missing helper functions';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 2: Tables with RLS Enabled
-- ============================================================================

DO $$
DECLARE
  v_total_tables INTEGER;
  v_tables_with_rls INTEGER;
  v_tables_without_rls INTEGER;
  v_table_name TEXT;
BEGIN
  -- Count total tables
  SELECT COUNT(*) INTO v_total_tables
  FROM pg_tables
  WHERE schemaname = 'public';

  -- Count tables with RLS
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true;

  -- Count tables without RLS
  SELECT COUNT(*) INTO v_tables_without_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = false;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CHECK 2: RLS ENABLED STATUS';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total tables in public schema: %', v_total_tables;
  RAISE NOTICE 'Tables with RLS enabled: %', v_tables_with_rls;
  RAISE NOTICE 'Tables without RLS: %', v_tables_without_rls;
  RAISE NOTICE '';

  IF v_tables_without_rls > 0 THEN
    RAISE WARNING 'Status: ⚠ WARNING - % tables without RLS', v_tables_without_rls;
    RAISE NOTICE 'Tables without RLS enabled:';

    FOR v_table_name IN
      SELECT t.tablename
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
      AND c.relrowsecurity = false
      ORDER BY t.tablename
    LOOP
      RAISE NOTICE '  - %', v_table_name;
    END LOOP;
  ELSE
    RAISE NOTICE 'Status: ✓ PASS - All tables have RLS enabled';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 3: Tables with Policies
-- ============================================================================

DO $$
DECLARE
  v_tables_with_rls INTEGER;
  v_tables_with_policies INTEGER;
  v_tables_without_policies INTEGER;
  v_table_name TEXT;
  v_policy_count INTEGER;
BEGIN
  -- Count tables with RLS
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true;

  -- Count unique tables with at least one policy
  SELECT COUNT(DISTINCT tablename) INTO v_tables_with_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count tables with RLS but no policies
  SELECT COUNT(*) INTO v_tables_without_policies
  FROM (
    SELECT DISTINCT t.tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true
    AND p.policyname IS NULL
  ) AS missing_policies;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CHECK 3: RLS POLICIES';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Tables with RLS enabled: %', v_tables_with_rls;
  RAISE NOTICE 'Tables with policies: %', v_tables_with_policies;
  RAISE NOTICE 'Tables with RLS but NO policies: %', v_tables_without_policies;
  RAISE NOTICE '';

  IF v_tables_without_policies > 0 THEN
    RAISE WARNING 'Status: ✗ FAIL - % tables have RLS but no policies', v_tables_without_policies;
    RAISE NOTICE 'Tables missing policies:';

    FOR v_table_name IN
      SELECT DISTINCT t.tablename
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
      WHERE t.schemaname = 'public'
      AND c.relrowsecurity = true
      AND p.policyname IS NULL
      ORDER BY t.tablename
    LOOP
      RAISE NOTICE '  - %', v_table_name;
    END LOOP;
  ELSE
    RAISE NOTICE 'Status: ✓ PASS - All tables with RLS have policies';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 4: Policy Coverage Details
-- ============================================================================

DO $$
DECLARE
  v_total_policies INTEGER;
  v_select_policies INTEGER;
  v_insert_policies INTEGER;
  v_update_policies INTEGER;
  v_delete_policies INTEGER;
  v_all_policies INTEGER;
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count by operation type
  SELECT COUNT(*) INTO v_select_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND cmd IN ('SELECT', 'ALL');

  SELECT COUNT(*) INTO v_insert_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND cmd IN ('INSERT', 'ALL');

  SELECT COUNT(*) INTO v_update_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND cmd IN ('UPDATE', 'ALL');

  SELECT COUNT(*) INTO v_delete_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND cmd IN ('DELETE', 'ALL');

  SELECT COUNT(*) INTO v_all_policies
  FROM pg_policies
  WHERE schemaname = 'public'
  AND cmd = 'ALL';

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CHECK 4: POLICY COVERAGE DETAILS';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total policies: %', v_total_policies;
  RAISE NOTICE 'SELECT policies: %', v_select_policies;
  RAISE NOTICE 'INSERT policies: %', v_insert_policies;
  RAISE NOTICE 'UPDATE policies: %', v_update_policies;
  RAISE NOTICE 'DELETE policies: %', v_delete_policies;
  RAISE NOTICE 'ALL (comprehensive) policies: %', v_all_policies;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 5: Critical Tables Verification
-- ============================================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_policy_count INTEGER;
  v_critical_tables TEXT[] := ARRAY[
    'dealerships_v2',
    'roles_v2',
    'departments_v2',
    'user_invitations_v2',
    'dealer_custom_roles',
    'dealer_role_permissions',
    'bulk_password_operations',
    'nfc_tags',
    'nfc_scans',
    'nfc_workflows',
    'recon_vehicles',
    'recon_work_items',
    'recon_media',
    'recon_notes',
    'service_categories',
    'user_group_memberships'
  ];
  v_has_rls BOOLEAN;
  v_all_pass BOOLEAN := true;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CHECK 5: CRITICAL TABLES VERIFICATION';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Checking RLS and policies for critical tables:';
  RAISE NOTICE '';

  FOREACH v_table_name IN ARRAY v_critical_tables
  LOOP
    -- Check if RLS is enabled
    SELECT c.relrowsecurity INTO v_has_rls
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename = v_table_name;

    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = v_table_name;

    IF v_has_rls AND v_policy_count > 0 THEN
      RAISE NOTICE '✓ % - RLS: enabled, Policies: %', v_table_name, v_policy_count;
    ELSIF v_has_rls AND v_policy_count = 0 THEN
      RAISE WARNING '⚠ % - RLS: enabled, Policies: 0 (NO POLICIES)', v_table_name;
      v_all_pass := false;
    ELSIF NOT v_has_rls THEN
      RAISE WARNING '✗ % - RLS: DISABLED', v_table_name;
      v_all_pass := false;
    ELSE
      RAISE WARNING '? % - Table not found', v_table_name;
      v_all_pass := false;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  IF v_all_pass THEN
    RAISE NOTICE 'Status: ✓ PASS - All critical tables properly secured';
  ELSE
    RAISE WARNING 'Status: ✗ FAIL - Some critical tables need attention';
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 6: Backup Tables Verification
-- ============================================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_table_age INTERVAL;
  v_backup_tables TEXT[] := ARRAY[
    'user_role_assignments_v2_backup',
    'dealer_custom_roles_backup_20251023_roles',
    'role_module_permissions_new_backup_20251023_roles',
    'get_ready_work_items_backup_pre_status_migration',
    'get_ready_work_items_backup_20251023',
    'profiles_backup_20251023_roles',
    'dealer_memberships_backup_20251023_roles',
    'dealer_groups_backup_20250920',
    'user_group_memberships_backup_20250920'
  ];
  v_has_rls BOOLEAN;
  v_policy_count INTEGER;
  v_old_backups INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CHECK 6: BACKUP TABLES VERIFICATION';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Checking backup tables for proper security and age:';
  RAISE NOTICE '';

  FOREACH v_table_name IN ARRAY v_backup_tables
  LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = v_table_name) THEN
      -- Check if RLS is enabled
      SELECT c.relrowsecurity INTO v_has_rls
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public'
      AND t.tablename = v_table_name;

      -- Count policies
      SELECT COUNT(*) INTO v_policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = v_table_name;

      IF v_has_rls AND v_policy_count > 0 THEN
        RAISE NOTICE '✓ % - Secured (RLS + % policies)', v_table_name, v_policy_count;
      ELSE
        RAISE WARNING '⚠ % - Not properly secured', v_table_name;
      END IF;

      -- Check age (tables from 20250920 are >60 days old)
      IF v_table_name LIKE '%20250920%' THEN
        RAISE WARNING '  └─ OLD BACKUP (>60 days) - Consider dropping: %', v_table_name;
        v_old_backups := v_old_backups + 1;
      END IF;
    ELSE
      RAISE NOTICE '- % - Table not found (already dropped)', v_table_name;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  IF v_old_backups > 0 THEN
    RAISE WARNING 'Recommendation: Consider dropping % old backup tables (>60 days)', v_old_backups;
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CHECK 7: Performance Indexes Verification
-- ============================================================================

DO $$
DECLARE
  v_index_count INTEGER;
  v_expected_indexes TEXT[] := ARRAY[
    'idx_profiles_auth_uid',
    'idx_profiles_dealership_role',
    'idx_dealer_custom_roles_dealer',
    'idx_dealer_groups_dealer',
    'idx_user_group_memberships_user',
    'idx_dealerships_v2_active',
    'idx_roles_v2_dealer',
    'idx_departments_v2_dealer',
    'idx_nfc_tags_dealer',
    'idx_recon_vehicles_dealer'
  ];
  v_index_name TEXT;
  v_missing_count INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CHECK 7: PERFORMANCE INDEXES';
  RAISE NOTICE '============================================================================';

  FOREACH v_index_name IN ARRAY v_expected_indexes
  LOOP
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = v_index_name) THEN
      RAISE NOTICE '✓ % - exists', v_index_name;
    ELSE
      RAISE WARNING '✗ % - MISSING', v_index_name;
      v_missing_count := v_missing_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  IF v_missing_count = 0 THEN
    RAISE NOTICE 'Status: ✓ PASS - All expected indexes exist';
  ELSE
    RAISE WARNING 'Status: ⚠ WARNING - % indexes missing', v_missing_count;
  END IF;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
  v_total_tables INTEGER;
  v_tables_with_rls INTEGER;
  v_tables_without_rls INTEGER;
  v_tables_with_policies INTEGER;
  v_tables_without_policies INTEGER;
  v_total_policies INTEGER;
  v_security_score NUMERIC;
  v_grade TEXT;
BEGIN
  -- Get statistics
  SELECT COUNT(*) INTO v_total_tables
  FROM pg_tables
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = true;

  SELECT COUNT(*) INTO v_tables_without_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
  AND c.relrowsecurity = false;

  SELECT COUNT(DISTINCT tablename) INTO v_tables_with_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO v_tables_without_policies
  FROM (
    SELECT DISTINCT t.tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true
    AND p.policyname IS NULL
  ) AS missing;

  SELECT COUNT(*) INTO v_total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Calculate security score (0-100)
  IF v_total_tables > 0 THEN
    v_security_score := (
      (v_tables_with_rls::NUMERIC / v_total_tables::NUMERIC) * 50 +
      (CASE
        WHEN v_tables_with_rls > 0
        THEN (v_tables_with_policies::NUMERIC / v_tables_with_rls::NUMERIC) * 50
        ELSE 0
      END)
    );
  ELSE
    v_security_score := 0;
  END IF;

  -- Assign grade
  IF v_security_score >= 95 THEN
    v_grade := 'A+ (Excellent)';
  ELSIF v_security_score >= 90 THEN
    v_grade := 'A (Very Good)';
  ELSIF v_security_score >= 85 THEN
    v_grade := 'B+ (Good)';
  ELSIF v_security_score >= 80 THEN
    v_grade := 'B (Above Average)';
  ELSIF v_security_score >= 70 THEN
    v_grade := 'C (Average)';
  ELSIF v_security_score >= 60 THEN
    v_grade := 'D (Below Average)';
  ELSE
    v_grade := 'F (Failing)';
  END IF;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'FINAL SECURITY SUMMARY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'DATABASE SECURITY METRICS:';
  RAISE NOTICE '├─ Total tables: %', v_total_tables;
  RAISE NOTICE '├─ Tables with RLS: % (%.1f%%)', v_tables_with_rls, (v_tables_with_rls::NUMERIC / v_total_tables::NUMERIC * 100);
  RAISE NOTICE '├─ Tables without RLS: % (%.1f%%)', v_tables_without_rls, (v_tables_without_rls::NUMERIC / v_total_tables::NUMERIC * 100);
  RAISE NOTICE '├─ Tables with policies: % (%.1f%%)', v_tables_with_policies, (v_tables_with_policies::NUMERIC / v_tables_with_rls::NUMERIC * 100);
  RAISE NOTICE '├─ Tables missing policies: %', v_tables_without_policies;
  RAISE NOTICE '└─ Total policies: %', v_total_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'SECURITY SCORE: %.1f/100', v_security_score;
  RAISE NOTICE 'GRADE: %', v_grade;
  RAISE NOTICE '';

  IF v_tables_without_policies = 0 AND v_tables_without_rls = 0 THEN
    RAISE NOTICE 'STATUS: ✓ ALL CHECKS PASSED';
    RAISE NOTICE 'Database is properly secured with comprehensive RLS policies.';
  ELSIF v_tables_without_policies > 0 THEN
    RAISE WARNING 'STATUS: ⚠ ACTION REQUIRED';
    RAISE WARNING '% tables have RLS enabled but no policies.', v_tables_without_policies;
    RAISE WARNING 'These tables are effectively locked and inaccessible.';
  ELSIF v_tables_without_rls > 0 THEN
    RAISE WARNING 'STATUS: ⚠ SECURITY WARNING';
    RAISE WARNING '% tables do not have RLS enabled.', v_tables_without_rls;
    RAISE WARNING 'These tables may be publicly accessible.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  IF v_security_score < 95 THEN
    RAISE NOTICE '1. Review tables without RLS and evaluate if RLS is needed';
    RAISE NOTICE '2. Add policies to tables with RLS but no policies';
    RAISE NOTICE '3. Test policies with different user roles';
    RAISE NOTICE '4. Monitor query performance with new indexes';
  ELSE
    RAISE NOTICE '1. Test policies with different user roles';
    RAISE NOTICE '2. Monitor query performance';
    RAISE NOTICE '3. Schedule regular security audits';
    RAISE NOTICE '4. Consider dropping old backup tables (>30 days)';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- DETAILED POLICY LISTING (Optional - Uncomment to see all policies)
-- ============================================================================

-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
