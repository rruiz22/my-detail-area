-- ============================================================================
-- PRE-MIGRATION SECURITY AUDIT
-- ============================================================================
-- Purpose: Audit current RLS status BEFORE applying security fix
-- Date: 2025-10-25
-- Run: BEFORE 20251025_fix_critical_rls_security.sql
--
-- This script provides a baseline security assessment to compare against
-- post-migration verification results.
-- ============================================================================

-- ============================================================================
-- CURRENT STATE: Tables WITHOUT RLS
-- ============================================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'PRE-MIGRATION SECURITY AUDIT';
  RAISE NOTICE 'Date: %', NOW();
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'CRITICAL: Tables WITHOUT RLS Enabled';
  RAISE NOTICE '-------------------------------------------';

  FOR v_table_name IN
    SELECT t.tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = false
    ORDER BY t.tablename
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE '% %', LPAD(v_count::TEXT, 3, ' '), v_table_name;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Total: % tables WITHOUT RLS (CRITICAL SECURITY RISK)', v_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CURRENT STATE: Tables WITH RLS but NO Policies
-- ============================================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '-------------------------------------------';
  RAISE NOTICE 'WARNING: Tables WITH RLS but NO Policies';
  RAISE NOTICE '-------------------------------------------';

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
    v_count := v_count + 1;
    RAISE NOTICE '% %', LPAD(v_count::TEXT, 3, ' '), v_table_name;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Total: % tables with RLS but NO policies (DATA INACCESSIBLE)', v_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CURRENT STATE: Specific Critical Tables
-- ============================================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_has_rls BOOLEAN;
  v_policy_count INTEGER;
  v_row_count BIGINT;
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
    'service_categories'
  ];
BEGIN
  RAISE NOTICE '-------------------------------------------';
  RAISE NOTICE 'CRITICAL TABLES STATUS';
  RAISE NOTICE '-------------------------------------------';
  RAISE NOTICE 'Table Name                          | RLS  | Policies | Rows';
  RAISE NOTICE '------------------------------------+------+----------+--------';

  FOREACH v_table_name IN ARRAY v_critical_tables
  LOOP
    BEGIN
      -- Check if table exists
      IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = v_table_name) THEN
        -- Get RLS status
        SELECT c.relrowsecurity INTO v_has_rls
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public'
        AND t.tablename = v_table_name;

        -- Get policy count
        SELECT COUNT(*) INTO v_policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = v_table_name;

        -- Get row count (safely)
        EXECUTE format('SELECT COUNT(*) FROM %I', v_table_name) INTO v_row_count;

        RAISE NOTICE '% | % | % | %',
          RPAD(v_table_name, 35, ' '),
          CASE WHEN v_has_rls THEN 'ON  ' ELSE 'OFF ' END,
          LPAD(v_policy_count::TEXT, 8, ' '),
          LPAD(v_row_count::TEXT, 8, ' ');
      ELSE
        RAISE NOTICE '% | N/A  | N/A      | N/A', RPAD(v_table_name, 35, ' ');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '% | ERROR | ERROR   | ERROR', RPAD(v_table_name, 35, ' ');
    END;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CURRENT STATE: Helper Functions
-- ============================================================================

DO $$
DECLARE
  v_function_name TEXT;
  v_exists BOOLEAN;
  v_helper_functions TEXT[] := ARRAY[
    'get_user_dealership',
    'is_system_admin',
    'can_access_dealership',
    'user_has_dealer_membership',
    'user_has_group_permission'
  ];
BEGIN
  RAISE NOTICE '-------------------------------------------';
  RAISE NOTICE 'HELPER FUNCTIONS STATUS';
  RAISE NOTICE '-------------------------------------------';

  FOREACH v_function_name IN ARRAY v_helper_functions
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      AND p.proname = v_function_name
    ) INTO v_exists;

    RAISE NOTICE '% %',
      CASE WHEN v_exists THEN '✓' ELSE '✗' END,
      v_function_name || '()';
  END LOOP;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- CURRENT STATE: Overall Statistics
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

  -- Calculate security score
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
    v_grade := 'A+';
  ELSIF v_security_score >= 90 THEN
    v_grade := 'A';
  ELSIF v_security_score >= 85 THEN
    v_grade := 'B+';
  ELSIF v_security_score >= 80 THEN
    v_grade := 'B';
  ELSIF v_security_score >= 70 THEN
    v_grade := 'C';
  ELSIF v_security_score >= 60 THEN
    v_grade := 'D';
  ELSE
    v_grade := 'F';
  END IF;

  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'OVERALL STATISTICS (BEFORE MIGRATION)';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total tables: %', v_total_tables;
  RAISE NOTICE '├─ With RLS enabled: % (%.1f%%)', v_tables_with_rls, (v_tables_with_rls::NUMERIC / v_total_tables::NUMERIC * 100);
  RAISE NOTICE '├─ Without RLS: % (%.1f%%) ⚠ CRITICAL', v_tables_without_rls, (v_tables_without_rls::NUMERIC / v_total_tables::NUMERIC * 100);
  RAISE NOTICE '├─ With policies: % (%.1f%%)', v_tables_with_policies, (v_tables_with_policies::NUMERIC / v_tables_with_rls::NUMERIC * 100);
  RAISE NOTICE '├─ Missing policies: % ⚠ WARNING', v_tables_without_policies;
  RAISE NOTICE '└─ Total policies: %', v_total_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'CURRENT SECURITY SCORE: %.1f/100', v_security_score;
  RAISE NOTICE 'CURRENT GRADE: %', v_grade;
  RAISE NOTICE '';

  IF v_grade IN ('D', 'F') THEN
    RAISE WARNING 'CRITICAL: Database security is POOR. Immediate action required.';
  ELSIF v_grade = 'C' THEN
    RAISE WARNING 'WARNING: Database security is BELOW AVERAGE. Action recommended.';
  ELSIF v_grade IN ('B', 'B+') THEN
    RAISE NOTICE 'NOTICE: Database security is GOOD but can be improved.';
  ELSE
    RAISE NOTICE 'SUCCESS: Database security is EXCELLENT.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'IDENTIFIED ISSUES:';
  IF v_tables_without_rls > 0 THEN
    RAISE NOTICE '⚠ % tables are PUBLIC (no RLS) - CRITICAL SECURITY RISK', v_tables_without_rls;
  END IF;
  IF v_tables_without_policies > 0 THEN
    RAISE NOTICE '⚠ % tables have RLS but no policies - DATA INACCESSIBLE', v_tables_without_policies;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'RECOMMENDATION:';
  RAISE NOTICE 'Apply migration: 20251025_fix_critical_rls_security.sql';
  RAISE NOTICE 'Expected improvement: % → A+ (95+/100)', v_grade;
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- EXPORT CURRENT STATE FOR COMPARISON
-- ============================================================================

-- Create temporary table with current state
CREATE TEMP TABLE IF NOT EXISTS pre_migration_state AS
SELECT
  t.tablename,
  c.relrowsecurity as has_rls,
  COUNT(p.policyname) as policy_count,
  ARRAY_AGG(p.policyname) FILTER (WHERE p.policyname IS NOT NULL) as policy_names
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, c.relrowsecurity
ORDER BY t.tablename;

-- Display summary
SELECT
  tablename,
  CASE WHEN has_rls THEN 'YES' ELSE 'NO' END as rls_enabled,
  policy_count,
  CASE
    WHEN NOT has_rls THEN 'CRITICAL - No RLS'
    WHEN has_rls AND policy_count = 0 THEN 'WARNING - No policies'
    WHEN has_rls AND policy_count > 0 THEN 'OK'
  END as status
FROM pre_migration_state
ORDER BY
  CASE
    WHEN NOT has_rls THEN 1
    WHEN has_rls AND policy_count = 0 THEN 2
    ELSE 3
  END,
  tablename;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Pre-migration state saved to temp table: pre_migration_state';
  RAISE NOTICE 'Use this for comparison after applying migration.';
  RAISE NOTICE '';
  RAISE NOTICE 'To compare after migration, run:';
  RAISE NOTICE '  SELECT * FROM pre_migration_state WHERE policy_count = 0;';
  RAISE NOTICE '';
END $$;
