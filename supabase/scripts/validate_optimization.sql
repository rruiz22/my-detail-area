-- =====================================================
-- QUERY OPTIMIZATION VALIDATION SCRIPT
-- =====================================================
-- Purpose: Validate index creation and measure performance improvements
-- Usage: Run BEFORE and AFTER migration to compare results
-- =====================================================

\timing on
\x auto

-- =====================================================
-- SECTION 1: PRE-MIGRATION BASELINE CAPTURE
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 1: BASELINE METRICS (Run BEFORE migration)'
\echo '======================================================================'
\echo ''

-- 1.1: Current slow query statistics
\echo '1.1: Current Slow Query Statistics'
\echo '======================================================================'
SELECT
    LEFT(query, 120) as query_preview,
    calls,
    ROUND(mean_time::numeric, 2) as mean_time_ms,
    ROUND(total_time::numeric / 1000, 2) as total_time_sec,
    ROUND(stddev_time::numeric, 2) as stddev_ms,
    ROUND(min_time::numeric, 2) as min_ms,
    ROUND(max_time::numeric, 2) as max_ms
FROM pg_stat_statements
WHERE query LIKE '%user_presence%'
   OR query LIKE '%orders%'
   OR query LIKE '%notification_log%'
   OR query LIKE '%dealer_memberships%'
ORDER BY mean_time DESC
LIMIT 20;

\echo ''

-- 1.2: Current index list (check what exists before migration)
\echo '1.2: Current Indexes on Target Tables'
\echo '======================================================================'
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE tablename IN ('user_presence', 'orders', 'notification_log', 'dealer_memberships')
ORDER BY tablename, indexname;

\echo ''

-- 1.3: Table sizes before migration
\echo '1.3: Table Sizes Before Migration'
\echo '======================================================================'
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
    n_live_tup as row_count
FROM pg_tables
LEFT JOIN pg_stat_user_tables USING (schemaname, tablename)
WHERE tablename IN ('user_presence', 'orders', 'notification_log', 'dealer_memberships')
ORDER BY tablename;

\echo ''

-- 1.4: Sample EXPLAIN ANALYZE for orders query (BEFORE)
\echo '1.4: EXPLAIN ANALYZE - Orders Query (BEFORE)'
\echo '======================================================================'
\echo 'NOTE: Replace dealer_id with actual value from your database'
\echo ''
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM orders
WHERE order_type = 'sales'
  AND dealer_id = 1
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 100;

\echo ''

-- 1.5: Sample EXPLAIN ANALYZE for user_presence query (BEFORE)
\echo '1.5: EXPLAIN ANALYZE - User Presence Query (BEFORE)'
\echo '======================================================================'
\echo 'NOTE: Replace dealer_id with actual value from your database'
\echo ''
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT up.*, p.email, p.full_name
FROM user_presence up
LEFT JOIN profiles p ON up.user_id = p.id
WHERE up.dealer_id = 1
  AND up.status != 'offline'
ORDER BY up.last_activity_at DESC
LIMIT 50;

\echo ''

-- =====================================================
-- SECTION 2: POST-MIGRATION VALIDATION
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 2: POST-MIGRATION VALIDATION (Run AFTER migration)'
\echo '======================================================================'
\echo ''

-- 2.1: Verify new indexes were created
\echo '2.1: New Indexes Created (Should show 7 indexes)'
\echo '======================================================================'
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used,
    CASE
        WHEN idx_scan = 0 THEN '⚠️  Not yet used (normal immediately after creation)'
        WHEN idx_scan < 100 THEN '⚡ Low usage'
        ELSE '✅ Active'
    END as status
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
)
ORDER BY indexname;

\echo ''

-- 2.2: Check for missing indexes
\echo '2.2: Missing Indexes Check (Should return 0 rows)'
\echo '======================================================================'
SELECT
    expected_index,
    'MISSING' as status
FROM (
    VALUES
        ('idx_user_presence_user_dealer_update'),
        ('idx_user_presence_dealer_status_activity'),
        ('idx_orders_type_dealer_created_optimized'),
        ('idx_orders_dealer_type_covering'),
        ('idx_notification_log_user_dealer_created'),
        ('idx_notification_log_user_unread_priority'),
        ('idx_dealer_memberships_user_dealer_active_rls')
) AS expected(expected_index)
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = expected.expected_index
);

\echo ''

-- 2.3: Updated table sizes (after index creation)
\echo '2.3: Table Sizes After Migration'
\echo '======================================================================'
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
    ROUND(
        (pg_indexes_size(schemaname||'.'||tablename)::float /
         NULLIF(pg_total_relation_size(schemaname||'.'||tablename)::float, 0)) * 100,
        1
    ) as index_ratio_pct
FROM pg_tables
WHERE tablename IN ('user_presence', 'orders', 'notification_log', 'dealer_memberships')
ORDER BY tablename;

\echo ''

-- 2.4: Total disk space used by new indexes
\echo '2.4: Disk Space Used by New Indexes'
\echo '======================================================================'
SELECT
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as total_new_indexes_size,
    COUNT(*) as index_count
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
);

\echo ''

-- 2.5: Sample EXPLAIN ANALYZE for orders query (AFTER)
\echo '2.5: EXPLAIN ANALYZE - Orders Query (AFTER)'
\echo '======================================================================'
\echo 'NOTE: Compare with BEFORE results - should show Index Only Scan'
\echo ''
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT *
FROM orders
WHERE order_type = 'sales'
  AND dealer_id = 1
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 100;

\echo ''

-- 2.6: Sample EXPLAIN ANALYZE for user_presence query (AFTER)
\echo '2.6: EXPLAIN ANALYZE - User Presence Query (AFTER)'
\echo '======================================================================'
\echo 'NOTE: Compare with BEFORE results - should show Index Scan'
\echo ''
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT up.*, p.email, p.full_name
FROM user_presence up
LEFT JOIN profiles p ON up.user_id = p.id
WHERE up.dealer_id = 1
  AND up.status != 'offline'
ORDER BY up.last_activity_at DESC
LIMIT 50;

\echo ''

-- 2.7: Performance comparison (24-48 hours after migration)
\echo '2.7: Query Performance After Migration (Run 24-48 hours later)'
\echo '======================================================================'
SELECT
    LEFT(query, 120) as query_preview,
    calls,
    ROUND(mean_time::numeric, 2) as mean_time_ms,
    ROUND(total_time::numeric / 1000, 2) as total_time_sec,
    ROUND(stddev_time::numeric, 2) as stddev_ms,
    ROUND(min_time::numeric, 2) as min_ms,
    ROUND(max_time::numeric, 2) as max_ms
FROM pg_stat_statements
WHERE query LIKE '%user_presence%'
   OR query LIKE '%orders%'
   OR query LIKE '%notification_log%'
   OR query LIKE '%dealer_memberships%'
ORDER BY mean_time DESC
LIMIT 20;

\echo ''

-- =====================================================
-- SECTION 3: INDEX HEALTH CHECK (Run 1 week later)
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 3: INDEX HEALTH CHECK (Run 1 week after migration)'
\echo '======================================================================'
\echo ''

-- 3.1: Index usage statistics
\echo '3.1: Index Usage Statistics (1 week)'
\echo '======================================================================'
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE
        WHEN idx_scan = 0 THEN '🔴 UNUSED - Consider dropping'
        WHEN idx_scan < 1000 THEN '🟡 LOW USAGE - Monitor'
        WHEN idx_scan < 10000 THEN '🟢 MODERATE USAGE'
        ELSE '✅ HIGH USAGE'
    END as usage_status
FROM pg_stat_user_indexes
WHERE indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
)
ORDER BY idx_scan DESC;

\echo ''

-- 3.2: Index bloat detection
\echo '3.2: Index Bloat Detection'
\echo '======================================================================'
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan,
    n_tup_upd + n_tup_hot_upd as table_updates,
    ROUND(
        CASE
            WHEN idx_scan > 0 THEN
                (n_tup_upd + n_tup_hot_upd)::float / idx_scan
            ELSE 0
        END,
        2
    ) as bloat_ratio
FROM pg_stat_user_indexes
JOIN pg_stat_user_tables USING (schemaname, tablename)
WHERE indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
)
ORDER BY bloat_ratio DESC;

\echo ''

-- 3.3: Query performance improvement summary
\echo '3.3: Query Performance Improvement Summary'
\echo '======================================================================'
\echo 'Run this query to compare with pre-migration baseline'
\echo ''
SELECT
    'user_presence UPDATE' as query_type,
    COUNT(*) FILTER (WHERE query LIKE '%UPDATE%user_presence%') as calls,
    ROUND(AVG(mean_time) FILTER (WHERE query LIKE '%UPDATE%user_presence%'), 2) as avg_time_ms
FROM pg_stat_statements

UNION ALL

SELECT
    'user_presence SELECT' as query_type,
    COUNT(*) FILTER (WHERE query LIKE '%SELECT%user_presence%') as calls,
    ROUND(AVG(mean_time) FILTER (WHERE query LIKE '%SELECT%user_presence%'), 2) as avg_time_ms
FROM pg_stat_statements

UNION ALL

SELECT
    'orders SELECT' as query_type,
    COUNT(*) FILTER (WHERE query LIKE '%SELECT%orders%') as calls,
    ROUND(AVG(mean_time) FILTER (WHERE query LIKE '%SELECT%orders%'), 2) as avg_time_ms
FROM pg_stat_statements

UNION ALL

SELECT
    'notification_log SELECT' as query_type,
    COUNT(*) FILTER (WHERE query LIKE '%SELECT%notification_log%') as calls,
    ROUND(AVG(mean_time) FILTER (WHERE query LIKE '%SELECT%notification_log%'), 2) as avg_time_ms
FROM pg_stat_statements;

\echo ''

-- 3.4: Unused indexes across entire database
\echo '3.4: Unused Indexes (All Tables)'
\echo '======================================================================'
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as times_used
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid NOT IN (
    SELECT indexrelid
    FROM pg_index
    WHERE indisunique OR indisprimary
  )
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

\echo ''

-- =====================================================
-- SECTION 4: ROLLBACK VALIDATION (If rollback executed)
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 4: ROLLBACK VALIDATION (Only if rollback was executed)'
\echo '======================================================================'
\echo ''

-- 4.1: Verify indexes were dropped
\echo '4.1: Verify Indexes Were Dropped (Should return 0 rows if rollback successful)'
\echo '======================================================================'
SELECT
    indexname,
    'STILL EXISTS - Rollback incomplete' as status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
);

\echo ''

-- 4.2: Check query performance after rollback
\echo '4.2: Query Performance After Rollback'
\echo '======================================================================'
\echo 'NOTE: Performance should return to pre-migration baseline levels'
\echo ''
SELECT
    LEFT(query, 120) as query_preview,
    calls,
    ROUND(mean_time::numeric, 2) as mean_time_ms,
    ROUND(total_time::numeric / 1000, 2) as total_time_sec
FROM pg_stat_statements
WHERE query LIKE '%user_presence%'
   OR query LIKE '%orders%'
   OR query LIKE '%notification_log%'
ORDER BY mean_time DESC
LIMIT 10;

\echo ''
\echo '======================================================================'
\echo 'VALIDATION SCRIPT COMPLETE'
\echo '======================================================================'
\echo ''
\echo 'NEXT STEPS:'
\echo '  1. Compare BEFORE vs AFTER metrics'
\echo '  2. Verify all 7 indexes were created successfully'
\echo '  3. Monitor index usage for 1 week'
\echo '  4. Check for unused indexes and drop if necessary'
\echo '  5. Celebrate improved performance! 🎉'
\echo ''
\echo '======================================================================'

\timing off
