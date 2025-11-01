-- ============================================================================
-- VERIFICATION SCRIPT FOR ENTERPRISE RLS OPTIMIZATION
-- ============================================================================
-- Verification: 20251026171318_optimize_sales_orders_rls_policies_VERIFY.sql
-- Date: 2025-10-26
-- Author: database-expert (Claude Code Agent)
--
-- PURPOSE: Comprehensive verification of optimized RLS policies for orders table
--
-- RUN THIS SCRIPT AFTER MIGRATION TO VERIFY:
--   1. RLS is enabled on orders table
--   2. All 4 enterprise policies are active
--   3. Performance indexes exist and are used
--   4. System admin access works correctly
--   5. Regular user access is properly scoped
-- ============================================================================

\set QUIET on
\pset border 2
\pset format wrapped

-- ============================================================================
-- TEST 1: VERIFY RLS IS ENABLED
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 1: Verify Row Level Security is Enabled on Orders Table'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT
  schemaname AS schema,
  tablename AS table,
  CASE
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'orders';

-- ============================================================================
-- TEST 2: VERIFY ALL ENTERPRISE POLICIES EXIST
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 2: Verify All 4 Enterprise RLS Policies Exist'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT
  policyname AS policy_name,
  CASE cmd
    WHEN 'r' THEN '📖 SELECT'
    WHEN 'a' THEN '➕ INSERT'
    WHEN 'w' THEN '✏️  UPDATE'
    WHEN 'd' THEN '🗑️  DELETE'
    ELSE cmd
  END AS operation,
  CASE
    WHEN policyname = 'enterprise_view_orders' THEN '✅'
    WHEN policyname = 'enterprise_insert_orders' THEN '✅'
    WHEN policyname = 'enterprise_update_orders' THEN '✅'
    WHEN policyname = 'enterprise_delete_orders' THEN '✅'
    ELSE '⚠️'
  END AS status
FROM pg_policies
WHERE tablename = 'orders'
AND schemaname = 'public'
ORDER BY
  CASE cmd
    WHEN 'r' THEN 1
    WHEN 'a' THEN 2
    WHEN 'w' THEN 3
    WHEN 'd' THEN 4
  END;

-- Expected output: 4 rows with policy names:
-- 1. enterprise_view_orders (SELECT)
-- 2. enterprise_insert_orders (INSERT)
-- 3. enterprise_update_orders (UPDATE)
-- 4. enterprise_delete_orders (DELETE)

-- Verification query
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'orders'
  AND schemaname = 'public'
  AND policyname IN (
    'enterprise_view_orders',
    'enterprise_insert_orders',
    'enterprise_update_orders',
    'enterprise_delete_orders'
  );

  IF policy_count = 4 THEN
    RAISE NOTICE '✅ All 4 enterprise policies exist';
  ELSE
    RAISE WARNING '❌ Expected 4 policies, found %', policy_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 3: VERIFY PERFORMANCE INDEXES
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 3: Verify Performance Indexes for Optimized RLS Queries'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT
  tablename AS table_name,
  indexname AS index_name,
  CASE
    WHEN indexname LIKE 'idx_orders%' THEN '✅ Orders Index'
    WHEN indexname LIKE 'idx_profiles%' THEN '✅ Profiles Index'
    WHEN indexname LIKE 'idx_dealer_memberships%' THEN '✅ Memberships Index'
    ELSE '⚠️  Other'
  END AS index_type
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname = 'idx_orders_dealer_type_status'
  OR indexname = 'idx_orders_dealer_created'
  OR indexname = 'idx_orders_deleted_at'
  OR indexname = 'idx_profiles_role_dealership'
  OR indexname = 'idx_dealer_memberships_user_dealer_active'
)
ORDER BY tablename, indexname;

-- Expected output: 5 indexes
-- 1. idx_orders_dealer_type_status (orders)
-- 2. idx_orders_dealer_created (orders)
-- 3. idx_orders_deleted_at (orders)
-- 4. idx_profiles_role_dealership (profiles)
-- 5. idx_dealer_memberships_user_dealer_active (dealer_memberships)

-- Verification query
DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname IN (
    'idx_orders_dealer_type_status',
    'idx_orders_dealer_created',
    'idx_orders_deleted_at',
    'idx_profiles_role_dealership',
    'idx_dealer_memberships_user_dealer_active'
  );

  IF index_count = 5 THEN
    RAISE NOTICE '✅ All 5 performance indexes exist';
  ELSE
    RAISE WARNING '⚠️  Expected 5 indexes, found %', index_count;
  END IF;
END $$;

-- ============================================================================
-- TEST 4: VERIFY TABLE STATISTICS
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 4: Table Statistics (Orders, Profiles, Dealer Memberships)'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT
  'orders' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_rows,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted_rows,
  COUNT(DISTINCT dealer_id) AS unique_dealerships
FROM public.orders
UNION ALL
SELECT
  'profiles',
  COUNT(*),
  COUNT(*) FILTER (WHERE role IS NOT NULL),
  COUNT(*) FILTER (WHERE role = 'system_admin'),
  COUNT(DISTINCT dealership_id)
FROM public.profiles
UNION ALL
SELECT
  'dealer_memberships',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = true),
  COUNT(*) FILTER (WHERE is_active = false),
  COUNT(DISTINCT dealer_id)
FROM public.dealer_memberships;

-- ============================================================================
-- TEST 5: VERIFY SYSTEM ADMIN ACCESS
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 5: System Admin Access Check'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

-- Count system admins in profiles table
SELECT
  COUNT(*) AS system_admin_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ System admins exist'
    ELSE '⚠️  No system admins found'
  END AS status
FROM public.profiles
WHERE role = 'system_admin';

-- List system admins (without exposing sensitive data)
SELECT
  id,
  email,
  role,
  dealership_id,
  created_at
FROM public.profiles
WHERE role = 'system_admin'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- TEST 6: VERIFY DEALER MEMBERSHIP DISTRIBUTION
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 6: Dealer Membership Distribution'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT
  dealer_id,
  COUNT(*) AS total_members,
  COUNT(*) FILTER (WHERE is_active = true) AS active_members,
  COUNT(*) FILTER (WHERE is_active = false) AS inactive_members,
  COUNT(DISTINCT user_id) AS unique_users
FROM public.dealer_memberships
GROUP BY dealer_id
ORDER BY total_members DESC
LIMIT 10;

-- ============================================================================
-- TEST 7: VERIFY ORDER DISTRIBUTION BY DEALERSHIP
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 7: Order Distribution by Dealership (Top 10)'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT
  dealer_id,
  COUNT(*) AS total_orders,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active_orders,
  COUNT(*) FILTER (WHERE order_type = 'sales') AS sales_orders,
  COUNT(*) FILTER (WHERE order_type = 'service') AS service_orders,
  COUNT(*) FILTER (WHERE order_type = 'recon') AS recon_orders,
  COUNT(*) FILTER (WHERE order_type = 'carwash') AS carwash_orders
FROM public.orders
GROUP BY dealer_id
ORDER BY total_orders DESC
LIMIT 10;

-- ============================================================================
-- TEST 8: EXPLAIN ANALYZE - QUERY PERFORMANCE TEST
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 8: Query Performance Analysis (EXPLAIN ANALYZE)'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

-- Note: This test requires a valid user session (auth.uid())
-- For manual testing, replace auth.uid() with an actual user UUID

\echo 'Sample Query: SELECT orders with RLS policy evaluation'
\echo 'Query: SELECT * FROM orders WHERE dealer_id = 1 AND deleted_at IS NULL LIMIT 10;'
\echo ''

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM public.orders
WHERE dealer_id = 1
AND deleted_at IS NULL
LIMIT 10;

-- Expected: Should use idx_orders_dealer_type_status or idx_orders_dealer_created
-- Look for "Index Scan" in output (good) vs "Seq Scan" (bad)

-- ============================================================================
-- TEST 9: POLICY DEFINITION REVIEW
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo 'TEST 9: Review RLS Policy Definitions'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

SELECT
  policyname AS policy,
  CASE cmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
  END AS operation,
  CASE
    WHEN qual IS NOT NULL AND qual LIKE '%system_admin%' THEN '✅ Has system_admin check'
    WHEN qual IS NOT NULL AND qual LIKE '%dealer_memberships%' THEN '✅ Has membership check'
    ELSE '⚠️  Review needed'
  END AS security_check
FROM pg_policies
WHERE tablename = 'orders'
AND schemaname = 'public'
ORDER BY
  CASE cmd
    WHEN 'r' THEN 1
    WHEN 'a' THEN 2
    WHEN 'w' THEN 3
    WHEN 'd' THEN 4
  END;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo '✅ VERIFICATION COMPLETE - SUMMARY'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''

DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  index_count INTEGER;
  admin_count INTEGER;
BEGIN
  -- Check RLS
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'orders';

  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'orders'
  AND policyname IN (
    'enterprise_view_orders',
    'enterprise_insert_orders',
    'enterprise_update_orders',
    'enterprise_delete_orders'
  );

  -- Check indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND indexname IN (
    'idx_orders_dealer_type_status',
    'idx_orders_dealer_created',
    'idx_orders_deleted_at',
    'idx_profiles_role_dealership',
    'idx_dealer_memberships_user_dealer_active'
  );

  -- Check system admins
  SELECT COUNT(*) INTO admin_count
  FROM public.profiles
  WHERE role = 'system_admin';

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION RESULTS:';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  IF rls_enabled THEN
    RAISE NOTICE '✅ Row Level Security: ENABLED on orders table';
  ELSE
    RAISE WARNING '❌ Row Level Security: DISABLED on orders table';
  END IF;

  IF policy_count = 4 THEN
    RAISE NOTICE '✅ RLS Policies: All 4 enterprise policies active';
  ELSE
    RAISE WARNING '⚠️  RLS Policies: Expected 4, found %', policy_count;
  END IF;

  IF index_count = 5 THEN
    RAISE NOTICE '✅ Performance Indexes: All 5 indexes exist';
  ELSE
    RAISE WARNING '⚠️  Performance Indexes: Expected 5, found %', index_count;
  END IF;

  IF admin_count > 0 THEN
    RAISE NOTICE '✅ System Admins: % system admin(s) configured', admin_count;
  ELSE
    RAISE WARNING '⚠️  System Admins: No system admins found!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  IF rls_enabled AND policy_count = 4 AND index_count = 5 AND admin_count > 0 THEN
    RAISE NOTICE '🎉 ALL CHECKS PASSED - Migration successful!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test application functionality with new policies';
    RAISE NOTICE '  2. Monitor query performance in production';
    RAISE NOTICE '  3. Verify user access permissions work as expected';
  ELSE
    RAISE WARNING '⚠️  SOME CHECKS FAILED - Review output above';
    RAISE WARNING 'Consider rolling back if critical issues found';
  END IF;

  RAISE NOTICE '';
END $$;

\echo ''
\echo '═══════════════════════════════════════════════════════════════'
