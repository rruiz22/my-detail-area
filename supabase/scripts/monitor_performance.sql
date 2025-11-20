-- =====================================================
-- CONTINUOUS PERFORMANCE MONITORING SCRIPT
-- =====================================================
-- Purpose: Regular monitoring of database performance and index health
-- Usage: Run daily/weekly to track performance trends
-- Recommendation: Set up as a cron job or scheduled query
-- =====================================================

\timing on
\x auto

\echo '======================================================================'
\echo 'MyDetailArea - Database Performance Monitor'
\echo 'Generated: ' :`date`
\echo '======================================================================'
\echo ''

-- =====================================================
-- SECTION 1: SLOW QUERIES DASHBOARD
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 1: TOP 20 SLOW QUERIES'
\echo '======================================================================'
\echo 'Queries with highest average execution time'
\echo ''

SELECT
    LEFT(query, 150) as query_preview,
    calls as total_calls,
    ROUND(mean_time::numeric, 2) as avg_time_ms,
    ROUND(total_time::numeric / 1000, 2) as total_time_sec,
    ROUND(stddev_time::numeric, 2) as stddev_ms,
    ROUND((total_time / sum(total_time) OVER ()) * 100, 2) as pct_of_total_time,
    CASE
        WHEN mean_time > 100 THEN '🔴 CRITICAL'
        WHEN mean_time > 50 THEN '🟠 HIGH'
        WHEN mean_time > 20 THEN '🟡 MEDIUM'
        ELSE '🟢 OK'
    END as severity
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
  AND query NOT LIKE '%pg_catalog%'
ORDER BY mean_time DESC
LIMIT 20;

\echo ''
\echo 'Performance Thresholds:'
\echo '  🔴 CRITICAL: > 100ms'
\echo '  🟠 HIGH: 50-100ms'
\echo '  🟡 MEDIUM: 20-50ms'
\echo '  🟢 OK: < 20ms'
\echo ''

-- =====================================================
-- SECTION 2: INDEX USAGE MONITORING
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 2: OPTIMIZATION INDEXES HEALTH CHECK'
\echo '======================================================================'
\echo 'Status of indexes created by optimization migration'
\echo ''

SELECT
    indexname,
    tablename,
    idx_scan as times_used,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE
        WHEN idx_scan = 0 THEN '🔴 UNUSED'
        WHEN idx_scan < 100 THEN '🟡 LOW USAGE'
        WHEN idx_scan < 1000 THEN '🟢 MODERATE'
        WHEN idx_scan < 10000 THEN '🟩 GOOD'
        ELSE '✅ EXCELLENT'
    END as usage_status,
    CASE
        WHEN idx_scan > 0 THEN ROUND((idx_tup_fetch::numeric / idx_scan), 2)
        ELSE 0
    END as avg_tuples_per_scan
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

-- =====================================================
-- SECTION 3: TARGET QUERY PERFORMANCE
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 3: TARGET QUERY PERFORMANCE TRACKING'
\echo '======================================================================'
\echo 'Performance of queries targeted by optimization'
\echo ''

\echo 'Orders Queries:'
\echo '----------------------------------------------------------------------'
SELECT
    'orders_by_type_dealer' as query_type,
    COUNT(*) as call_count,
    ROUND(AVG(mean_time)::numeric, 2) as avg_ms,
    ROUND(MIN(mean_time)::numeric, 2) as min_ms,
    ROUND(MAX(mean_time)::numeric, 2) as max_ms,
    CASE
        WHEN AVG(mean_time) < 15 THEN '✅ OPTIMIZED'
        WHEN AVG(mean_time) < 25 THEN '🟡 ACCEPTABLE'
        ELSE '🔴 SLOW'
    END as status
FROM pg_stat_statements
WHERE query LIKE '%SELECT%FROM%orders%'
  AND query LIKE '%order_type%'
  AND query LIKE '%dealer_id%'
  AND query LIKE '%ORDER BY%created_at%';

\echo ''
\echo 'User Presence Queries:'
\echo '----------------------------------------------------------------------'
SELECT
    'user_presence_updates' as query_type,
    COUNT(*) as call_count,
    ROUND(AVG(mean_time)::numeric, 2) as avg_ms,
    ROUND(MIN(mean_time)::numeric, 2) as min_ms,
    ROUND(MAX(mean_time)::numeric, 2) as max_ms,
    CASE
        WHEN AVG(mean_time) < 2.5 THEN '✅ OPTIMIZED'
        WHEN AVG(mean_time) < 4.0 THEN '🟡 ACCEPTABLE'
        ELSE '🔴 SLOW'
    END as status
FROM pg_stat_statements
WHERE query LIKE '%UPDATE%user_presence%'
  AND query LIKE '%last_activity_at%';

\echo ''
SELECT
    'user_presence_selects' as query_type,
    COUNT(*) as call_count,
    ROUND(AVG(mean_time)::numeric, 2) as avg_ms,
    ROUND(MIN(mean_time)::numeric, 2) as min_ms,
    ROUND(MAX(mean_time)::numeric, 2) as max_ms,
    CASE
        WHEN AVG(mean_time) < 2.0 THEN '✅ OPTIMIZED'
        WHEN AVG(mean_time) < 3.0 THEN '🟡 ACCEPTABLE'
        ELSE '🔴 SLOW'
    END as status
FROM pg_stat_statements
WHERE query LIKE '%SELECT%FROM%user_presence%'
  AND query LIKE '%dealer_id%';

\echo ''
\echo 'Notification Queries:'
\echo '----------------------------------------------------------------------'
SELECT
    'notification_log_queries' as query_type,
    COUNT(*) as call_count,
    ROUND(AVG(mean_time)::numeric, 2) as avg_ms,
    ROUND(MIN(mean_time)::numeric, 2) as min_ms,
    ROUND(MAX(mean_time)::numeric, 2) as max_ms,
    CASE
        WHEN AVG(mean_time) < 2.0 THEN '✅ OPTIMIZED'
        WHEN AVG(mean_time) < 3.5 THEN '🟡 ACCEPTABLE'
        ELSE '🔴 SLOW'
    END as status
FROM pg_stat_statements
WHERE query LIKE '%SELECT%FROM%notification_log%'
  AND query LIKE '%user_id%'
  AND query LIKE '%dealer_id%';

\echo ''
\echo 'Target Performance (Post-Optimization):'
\echo '  Orders: < 15ms'
\echo '  User Presence UPDATE: < 2.5ms'
\echo '  User Presence SELECT: < 2.0ms'
\echo '  Notifications: < 2.0ms'
\echo ''

-- =====================================================
-- SECTION 4: TABLE BLOAT DETECTION
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 4: TABLE BLOAT DETECTION'
\echo '======================================================================'
\echo 'Identify tables that may need VACUUM or REINDEX'
\echo ''

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    ROUND(
        CASE
            WHEN n_live_tup > 0 THEN
                (n_dead_tup::float / (n_live_tup + n_dead_tup)) * 100
            ELSE 0
        END,
        2
    ) as dead_tuple_pct,
    CASE
        WHEN n_dead_tup > 10000 AND
             (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) > 0.2
        THEN '🔴 NEEDS VACUUM'
        WHEN n_dead_tup > 5000 AND
             (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) > 0.1
        THEN '🟡 MONITOR'
        ELSE '🟢 OK'
    END as bloat_status,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup + n_dead_tup > 100
ORDER BY n_dead_tup DESC
LIMIT 20;

\echo ''
\echo 'Bloat Thresholds:'
\echo '  🔴 NEEDS VACUUM: > 20% dead tuples AND > 10K dead rows'
\echo '  🟡 MONITOR: > 10% dead tuples AND > 5K dead rows'
\echo '  🟢 OK: Below thresholds'
\echo ''
\echo 'Recommendation: Run VACUUM ANALYZE on 🔴 tables'
\echo ''

-- =====================================================
-- SECTION 5: INDEX BLOAT & EFFICIENCY
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 5: INDEX BLOAT & EFFICIENCY'
\echo '======================================================================'
\echo 'Identify indexes that may need rebuilding'
\echo ''

SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE
        WHEN idx_scan = 0 THEN '🔴 UNUSED'
        WHEN idx_scan < 100 THEN '🟡 LOW USAGE'
        WHEN idx_tup_read > 0 THEN
            ROUND((idx_tup_fetch::numeric / idx_tup_read) * 100, 2)
        ELSE 100
    END as efficiency_pct,
    CASE
        WHEN idx_scan = 0 THEN 'Consider dropping'
        WHEN idx_scan < 100 THEN 'Monitor usage'
        WHEN idx_tup_read > 0 AND
             (idx_tup_fetch::numeric / idx_tup_read) < 0.5
        THEN 'Low efficiency - review query'
        ELSE 'Performing well'
    END as recommendation
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND pg_relation_size(indexrelid) > 10 * 1024 * 1024 -- Indexes > 10MB
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 30;

\echo ''
\echo 'Index Efficiency:'
\echo '  100%: All read tuples are fetched (ideal)'
\echo '  50-99%: Good efficiency'
\echo '  < 50%: May indicate query optimization needed'
\echo ''

-- =====================================================
-- SECTION 6: REAL-TIME SUBSCRIPTION LOAD
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 6: REAL-TIME SUBSCRIPTION ANALYSIS'
\echo '======================================================================'
\echo 'Analysis of real-time function calls (60% of DB time)'
\echo ''

SELECT
    LEFT(query, 100) as query_preview,
    calls as total_calls,
    ROUND(mean_time::numeric, 2) as avg_ms,
    ROUND(total_time::numeric / 3600000, 2) as total_hours,
    ROUND((total_time / sum(total_time) OVER ()) * 100, 2) as pct_of_total
FROM pg_stat_statements
WHERE query LIKE '%realtime%' OR query LIKE '%list_changes%'
ORDER BY total_time DESC
LIMIT 10;

\echo ''
\echo 'Note: Real-time queries dominate DB time (expected behavior)'
\echo 'Optimization focus: Reduce overhead via RLS policy optimization'
\echo ''

-- =====================================================
-- SECTION 7: CONNECTION & RESOURCE USAGE
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 7: DATABASE RESOURCE USAGE'
\echo '======================================================================'
\echo ''

\echo 'Database Size:'
\echo '----------------------------------------------------------------------'
SELECT
    pg_size_pretty(pg_database_size(current_database())) as total_db_size,
    pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as tables_size,
    pg_size_pretty(sum(pg_indexes_size(schemaname||'.'||tablename))::bigint) as indexes_size,
    ROUND(
        (sum(pg_indexes_size(schemaname||'.'||tablename))::float /
         NULLIF(sum(pg_total_relation_size(schemaname||'.'||tablename))::float, 0)) * 100,
        1
    ) as index_ratio_pct
FROM pg_tables
WHERE schemaname = 'public';

\echo ''
\echo 'Active Connections:'
\echo '----------------------------------------------------------------------'
SELECT
    COUNT(*) as total_connections,
    COUNT(*) FILTER (WHERE state = 'active') as active,
    COUNT(*) FILTER (WHERE state = 'idle') as idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
    MAX(now() - query_start) as longest_query_duration
FROM pg_stat_activity
WHERE datname = current_database();

\echo ''
\echo 'Cache Hit Ratio (Target: > 99%):'
\echo '----------------------------------------------------------------------'
SELECT
    ROUND(
        (sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)) * 100,
        2
    ) as cache_hit_ratio_pct,
    pg_size_pretty(sum(heap_blks_hit) * 8192) as data_served_from_cache,
    pg_size_pretty(sum(heap_blks_read) * 8192) as data_read_from_disk,
    CASE
        WHEN (sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)) > 0.99
        THEN '✅ EXCELLENT'
        WHEN (sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)) > 0.95
        THEN '🟢 GOOD'
        WHEN (sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)) > 0.90
        THEN '🟡 OK'
        ELSE '🔴 LOW - Consider increasing shared_buffers'
    END as status
FROM pg_statio_user_tables;

\echo ''

-- =====================================================
-- SECTION 8: TOP TABLES BY SIZE
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 8: LARGEST TABLES & INDEXES'
\echo '======================================================================'
\echo ''

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
    n_live_tup as row_count,
    ROUND(
        (pg_indexes_size(schemaname||'.'||tablename)::float /
         NULLIF(pg_total_relation_size(schemaname||'.'||tablename)::float, 0)) * 100,
        1
    ) as index_ratio_pct
FROM pg_tables
LEFT JOIN pg_stat_user_tables USING (schemaname, tablename)
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

\echo ''
\echo 'Note: Index ratio > 100% indicates many indexes on table'
\echo '      Consider index consolidation if ratio is very high'
\echo ''

-- =====================================================
-- SECTION 9: RECOMMENDATIONS SUMMARY
-- =====================================================

\echo '======================================================================'
\echo 'SECTION 9: AUTOMATED RECOMMENDATIONS'
\echo '======================================================================'
\echo ''

\echo 'Slow Queries (> 50ms):'
\echo '----------------------------------------------------------------------'
SELECT
    COUNT(*) as slow_query_count,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ No slow queries detected'
        WHEN COUNT(*) < 5 THEN '🟡 Few slow queries - review and optimize'
        ELSE '🔴 Multiple slow queries - optimization needed'
    END as status
FROM pg_stat_statements
WHERE mean_time > 50
  AND query NOT LIKE '%pg_stat%';

\echo ''
\echo 'Unused Indexes (0 scans):'
\echo '----------------------------------------------------------------------'
SELECT
    COUNT(*) as unused_index_count,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as wasted_space,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ No unused indexes'
        WHEN COUNT(*) < 3 THEN '🟡 Few unused indexes - consider dropping'
        ELSE '🔴 Multiple unused indexes - cleanup recommended'
    END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelid NOT IN (
    SELECT indexrelid FROM pg_index WHERE indisunique OR indisprimary
  );

\echo ''
\echo 'Tables Needing VACUUM (> 20% dead tuples):'
\echo '----------------------------------------------------------------------'
SELECT
    COUNT(*) as tables_needing_vacuum,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ All tables healthy'
        WHEN COUNT(*) < 3 THEN '🟡 Few tables need vacuum'
        ELSE '🔴 Multiple tables need vacuum - run VACUUM ANALYZE'
    END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_dead_tup > 10000
  AND (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) > 0.2;

\echo ''

-- =====================================================
-- FOOTER
-- =====================================================

\echo '======================================================================'
\echo 'PERFORMANCE MONITORING COMPLETE'
\echo '======================================================================'
\echo ''
\echo 'Next Steps:'
\echo '  1. Review slow queries and optimize as needed'
\echo '  2. Drop unused indexes to reclaim disk space'
\echo '  3. Run VACUUM ANALYZE on bloated tables'
\echo '  4. Monitor index usage weekly'
\echo '  5. Track query performance trends'
\echo ''
\echo 'Schedule: Run this script daily/weekly for ongoing monitoring'
\echo '======================================================================'

\timing off
