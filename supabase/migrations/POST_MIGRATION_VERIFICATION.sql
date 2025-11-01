-- ============================================================================
-- ENTERPRISE NOTIFICATION SYSTEM - POST-MIGRATION VERIFICATION
-- ============================================================================
-- Run this AFTER applying all migrations to verify success
-- ============================================================================

-- Set nice output formatting
\pset border 2
\pset format wrapped

\echo '======================================================================'
\echo 'NOTIFICATION SYSTEM - POST-MIGRATION VERIFICATION'
\echo '======================================================================'
\echo ''

-- ============================================================================
-- 1. VERIFY NEW TABLES EXIST
-- ============================================================================
\echo '1. VERIFYING NEW TABLES EXIST'
\echo '----------------------------------------------------------------------'

SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
    CASE
        WHEN tablename IN ('user_notification_preferences_universal', 'dealer_notification_rules')
        THEN '✓ CREATED'
        ELSE '✗ MISSING'
    END AS status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'user_notification_preferences_universal',
    'dealer_notification_rules'
)
ORDER BY tablename;

\echo ''

-- ============================================================================
-- 2. VERIFY DATA MIGRATION SUCCESS
-- ============================================================================
\echo '2. VERIFYING DATA MIGRATION'
\echo '----------------------------------------------------------------------'

DO $$
DECLARE
    v_original_get_ready INTEGER;
    v_original_sms INTEGER;
    v_migrated_total INTEGER;
    v_migrated_get_ready INTEGER;
    v_migrated_sms INTEGER;
    v_expected_total INTEGER;
    v_migration_success BOOLEAN := true;
BEGIN
    -- Original counts
    SELECT COUNT(*) INTO v_original_get_ready
    FROM public.user_notification_preferences;

    SELECT COUNT(*) INTO v_original_sms
    FROM public.user_sms_notification_preferences;

    v_expected_total := v_original_get_ready + v_original_sms;

    -- Migrated counts
    SELECT COUNT(*) INTO v_migrated_total
    FROM public.user_notification_preferences_universal;

    SELECT COUNT(*) INTO v_migrated_get_ready
    FROM public.user_notification_preferences_universal
    WHERE module = 'get_ready';

    SELECT COUNT(*) INTO v_migrated_sms
    FROM public.user_notification_preferences_universal
    WHERE module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash');

    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'DATA MIGRATION RESULTS';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'ORIGINAL TABLES:';
    RAISE NOTICE '  user_notification_preferences: % rows', v_original_get_ready;
    RAISE NOTICE '  user_sms_notification_preferences: % rows', v_original_sms;
    RAISE NOTICE '  Expected total: % rows', v_expected_total;
    RAISE NOTICE '';
    RAISE NOTICE 'NEW TABLE (user_notification_preferences_universal):';
    RAISE NOTICE '  Total rows: % rows', v_migrated_total;
    RAISE NOTICE '  Get Ready module: % rows', v_migrated_get_ready;
    RAISE NOTICE '  Other modules (SMS): % rows', v_migrated_sms;
    RAISE NOTICE '';

    -- Verify data integrity
    IF v_migrated_total >= v_expected_total THEN
        RAISE NOTICE '✓ SUCCESS: All records migrated (% >= %)', v_migrated_total, v_expected_total;
    ELSE
        RAISE NOTICE '✗ ERROR: Missing records (% < %)', v_migrated_total, v_expected_total;
        v_migration_success := false;
    END IF;

    IF v_migrated_get_ready = v_original_get_ready THEN
        RAISE NOTICE '✓ Get Ready module: Complete migration';
    ELSIF v_migrated_get_ready > v_original_get_ready THEN
        RAISE NOTICE '⚠ Get Ready module: More records than expected (possible merge with SMS)';
    ELSE
        RAISE NOTICE '✗ Get Ready module: Missing records';
        v_migration_success := false;
    END IF;

    RAISE NOTICE '';
    IF v_migration_success THEN
        RAISE NOTICE '✓✓✓ DATA MIGRATION SUCCESSFUL ✓✓✓';
    ELSE
        RAISE NOTICE '✗✗✗ DATA MIGRATION INCOMPLETE ✗✗✗';
    END IF;
    RAISE NOTICE '====================================================================';
END $$;

\echo ''

-- ============================================================================
-- 3. VERIFY MODULE DISTRIBUTION
-- ============================================================================
\echo '3. VERIFYING MODULE DISTRIBUTION'
\echo '----------------------------------------------------------------------'

SELECT
    module,
    COUNT(*) AS user_count,
    COUNT(CASE WHEN in_app_enabled THEN 1 END) AS in_app_enabled,
    COUNT(CASE WHEN email_enabled THEN 1 END) AS email_enabled,
    COUNT(CASE WHEN sms_enabled THEN 1 END) AS sms_enabled,
    COUNT(CASE WHEN push_enabled THEN 1 END) AS push_enabled
FROM public.user_notification_preferences_universal
GROUP BY module
ORDER BY module;

\echo ''

-- ============================================================================
-- 4. VERIFY INDEXES CREATED
-- ============================================================================
\echo '4. VERIFYING INDEXES'
\echo '----------------------------------------------------------------------'

SELECT
    schemaname,
    tablename,
    indexname,
    CASE
        WHEN indexname LIKE 'idx_%' THEN '✓ CREATED'
        ELSE 'PRIMARY/UNIQUE'
    END AS status
FROM pg_indexes
WHERE tablename IN (
    'user_notification_preferences_universal',
    'dealer_notification_rules'
)
ORDER BY tablename, indexname;

\echo ''

-- Count indexes
SELECT
    tablename,
    COUNT(*) AS index_count
FROM pg_indexes
WHERE tablename IN (
    'user_notification_preferences_universal',
    'dealer_notification_rules'
)
GROUP BY tablename;

\echo ''

-- ============================================================================
-- 5. VERIFY RLS POLICIES
-- ============================================================================
\echo '5. VERIFYING RLS POLICIES'
\echo '----------------------------------------------------------------------'

SELECT
    schemaname,
    tablename,
    COUNT(*) AS policy_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✓ POLICIES EXIST'
        ELSE '✗ NO POLICIES'
    END AS status
FROM pg_policies
WHERE tablename IN (
    'user_notification_preferences_universal',
    'dealer_notification_rules'
)
GROUP BY schemaname, tablename;

\echo ''

-- List all policies
SELECT
    tablename,
    policyname,
    cmd AS operation,
    permissive
FROM pg_policies
WHERE tablename IN (
    'user_notification_preferences_universal',
    'dealer_notification_rules'
)
ORDER BY tablename, policyname;

\echo ''

-- ============================================================================
-- 6. VERIFY HELPER FUNCTIONS
-- ============================================================================
\echo '6. VERIFYING HELPER FUNCTIONS'
\echo '----------------------------------------------------------------------'

SELECT
    proname AS function_name,
    pronargs AS num_args,
    CASE
        WHEN proname IN (
            'get_user_notification_config',
            'update_user_event_preference',
            'get_notification_recipients',
            'is_user_in_quiet_hours',
            'check_user_rate_limit',
            'create_default_notification_preferences'
        ) THEN '✓ CREATED'
        ELSE 'UNKNOWN'
    END AS status
FROM pg_proc
WHERE proname IN (
    'get_user_notification_config',
    'update_user_event_preference',
    'get_notification_recipients',
    'is_user_in_quiet_hours',
    'check_user_rate_limit',
    'create_default_notification_preferences'
)
ORDER BY proname;

\echo ''

-- ============================================================================
-- 7. VERIFY DEPRECATION MARKERS
-- ============================================================================
\echo '7. VERIFYING DEPRECATION MARKERS'
\echo '----------------------------------------------------------------------'

-- Check deprecated_at column
SELECT
    'user_notification_preferences' AS table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_notification_preferences'
            AND column_name = 'deprecated_at'
        ) THEN '✓ DEPRECATED'
        ELSE '✗ NOT MARKED'
    END AS status
UNION ALL
SELECT
    'user_sms_notification_preferences' AS table_name,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'user_sms_notification_preferences'
            AND column_name = 'deprecated_at'
        ) THEN '✓ DEPRECATED'
        ELSE '✗ NOT MARKED'
    END AS status;

\echo ''

-- ============================================================================
-- 8. VERIFY BACKWARD COMPATIBILITY VIEWS
-- ============================================================================
\echo '8. VERIFYING BACKWARD COMPATIBILITY VIEWS'
\echo '----------------------------------------------------------------------'

SELECT
    schemaname,
    viewname,
    CASE
        WHEN viewname IN (
            'user_notification_preferences_legacy',
            'user_sms_notification_preferences_legacy'
        ) THEN '✓ CREATED'
        ELSE 'UNKNOWN'
    END AS status
FROM pg_views
WHERE viewname IN (
    'user_notification_preferences_legacy',
    'user_sms_notification_preferences_legacy'
)
ORDER BY viewname;

\echo ''

-- Test legacy views
\echo 'Testing legacy view row counts:'
SELECT
    'user_notification_preferences_legacy' AS view_name,
    COUNT(*) AS row_count
FROM public.user_notification_preferences_legacy
UNION ALL
SELECT
    'user_sms_notification_preferences_legacy' AS view_name,
    COUNT(*) AS row_count
FROM public.user_sms_notification_preferences_legacy;

\echo ''

-- ============================================================================
-- 9. DATA QUALITY CHECKS
-- ============================================================================
\echo '9. DATA QUALITY VERIFICATION'
\echo '----------------------------------------------------------------------'

-- Check for NULL user_ids
SELECT
    'NULL user_ids' AS check_name,
    COUNT(*) AS count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS status
FROM public.user_notification_preferences_universal
WHERE user_id IS NULL;

-- Check for NULL dealer_ids
SELECT
    'NULL dealer_ids' AS check_name,
    COUNT(*) AS count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS status
FROM public.user_notification_preferences_universal
WHERE dealer_id IS NULL;

-- Check for invalid modules
SELECT
    'Invalid modules' AS check_name,
    COUNT(*) AS count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END AS status
FROM public.user_notification_preferences_universal
WHERE module NOT IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready');

-- Check for invalid phone numbers
SELECT
    'Invalid phone numbers' AS check_name,
    COUNT(*) AS count,
    CASE
        WHEN COUNT(*) = 0 THEN '✓ PASS'
        ELSE '⚠ WARNING'
    END AS status
FROM public.user_notification_preferences_universal
WHERE phone_number_override IS NOT NULL
AND phone_number_override !~ '^\+1[0-9]{10}$';

\echo ''

-- ============================================================================
-- 10. SAMPLE DATA INSPECTION
-- ============================================================================
\echo '10. SAMPLE DATA INSPECTION'
\echo '----------------------------------------------------------------------'

\echo 'Sample Get Ready preferences:'
SELECT
    user_id,
    dealer_id,
    module,
    in_app_enabled,
    sms_enabled,
    (event_preferences->>'sla_warning')::TEXT AS sla_warning,
    quiet_hours_enabled
FROM public.user_notification_preferences_universal
WHERE module = 'get_ready'
LIMIT 3;

\echo ''
\echo 'Sample SMS module preferences:'
SELECT
    user_id,
    dealer_id,
    module,
    sms_enabled,
    phone_number_override,
    (rate_limits->'sms'->>'max_per_day')::TEXT AS sms_daily_limit
FROM public.user_notification_preferences_universal
WHERE module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash')
LIMIT 3;

\echo ''

-- ============================================================================
-- 11. PERFORMANCE TEST
-- ============================================================================
\echo '11. PERFORMANCE TEST'
\echo '----------------------------------------------------------------------'

-- Test common query patterns
\timing on

\echo 'Query 1: Get user config (should use idx_notif_prefs_user_module)'
EXPLAIN ANALYZE
SELECT * FROM public.user_notification_preferences_universal
WHERE user_id = (SELECT user_id FROM public.user_notification_preferences_universal LIMIT 1)
AND module = 'get_ready';

\echo ''
\echo 'Query 2: Get dealer users with SMS enabled (should use idx_notif_prefs_sms_enabled)'
EXPLAIN ANALYZE
SELECT COUNT(*) FROM public.user_notification_preferences_universal
WHERE dealer_id = (SELECT dealer_id FROM public.user_notification_preferences_universal LIMIT 1)
AND sms_enabled = true;

\timing off

\echo ''

-- ============================================================================
-- 12. FUNCTION TESTING
-- ============================================================================
\echo '12. TESTING HELPER FUNCTIONS'
\echo '----------------------------------------------------------------------'

DO $$
DECLARE
    v_user_id UUID;
    v_dealer_id BIGINT;
    v_config RECORD;
    v_result BOOLEAN;
BEGIN
    -- Get a sample user
    SELECT user_id, dealer_id INTO v_user_id, v_dealer_id
    FROM public.user_notification_preferences_universal
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE '⚠ No data to test functions';
        RETURN;
    END IF;

    RAISE NOTICE 'Testing with user_id: %, dealer_id: %', v_user_id, v_dealer_id;
    RAISE NOTICE '';

    -- Test 1: get_user_notification_config
    BEGIN
        SELECT * INTO v_config FROM get_user_notification_config(v_user_id, v_dealer_id, 'get_ready');
        RAISE NOTICE '✓ get_user_notification_config: SUCCESS';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ get_user_notification_config: FAILED - %', SQLERRM;
    END;

    -- Test 2: is_user_in_quiet_hours
    BEGIN
        SELECT is_user_in_quiet_hours(v_user_id, v_dealer_id, 'get_ready') INTO v_result;
        RAISE NOTICE '✓ is_user_in_quiet_hours: SUCCESS (Result: %)', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ is_user_in_quiet_hours: FAILED - %', SQLERRM;
    END;

    -- Test 3: check_user_rate_limit
    BEGIN
        SELECT check_user_rate_limit(v_user_id, v_dealer_id, 'get_ready', 'sms') INTO v_result;
        RAISE NOTICE '✓ check_user_rate_limit: SUCCESS (Result: %)', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ check_user_rate_limit: FAILED - %', SQLERRM;
    END;

    -- Test 4: update_user_event_preference
    BEGIN
        SELECT update_user_event_preference(
            v_user_id,
            v_dealer_id,
            'get_ready',
            'sla_warning',
            'push',
            true
        ) INTO v_result;
        RAISE NOTICE '✓ update_user_event_preference: SUCCESS (Result: %)', v_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✗ update_user_event_preference: FAILED - %', SQLERRM;
    END;

    RAISE NOTICE '';
    RAISE NOTICE 'Function tests completed';
END $$;

\echo ''

-- ============================================================================
-- 13. FINAL STATUS REPORT
-- ============================================================================
\echo '13. FINAL MIGRATION STATUS'
\echo '----------------------------------------------------------------------'

DO $$
DECLARE
    v_tables_exist BOOLEAN;
    v_data_migrated BOOLEAN;
    v_indexes_exist BOOLEAN;
    v_policies_exist BOOLEAN;
    v_functions_exist BOOLEAN;
    v_deprecated_marked BOOLEAN;
    v_views_exist BOOLEAN;
    v_all_success BOOLEAN := true;
BEGIN
    -- Check tables
    SELECT COUNT(*) = 2 INTO v_tables_exist
    FROM pg_tables
    WHERE tablename IN ('user_notification_preferences_universal', 'dealer_notification_rules');

    -- Check data
    SELECT COUNT(*) > 0 INTO v_data_migrated
    FROM public.user_notification_preferences_universal;

    -- Check indexes
    SELECT COUNT(*) >= 18 INTO v_indexes_exist
    FROM pg_indexes
    WHERE tablename IN ('user_notification_preferences_universal', 'dealer_notification_rules');

    -- Check policies
    SELECT COUNT(*) >= 8 INTO v_policies_exist
    FROM pg_policies
    WHERE tablename IN ('user_notification_preferences_universal', 'dealer_notification_rules');

    -- Check functions
    SELECT COUNT(*) = 6 INTO v_functions_exist
    FROM pg_proc
    WHERE proname IN (
        'get_user_notification_config',
        'update_user_event_preference',
        'get_notification_recipients',
        'is_user_in_quiet_hours',
        'check_user_rate_limit',
        'create_default_notification_preferences'
    );

    -- Check deprecation
    SELECT
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notification_preferences' AND column_name = 'deprecated_at')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sms_notification_preferences' AND column_name = 'deprecated_at')
    INTO v_deprecated_marked;

    -- Check views
    SELECT COUNT(*) = 2 INTO v_views_exist
    FROM pg_views
    WHERE viewname IN ('user_notification_preferences_legacy', 'user_sms_notification_preferences_legacy');

    RAISE NOTICE '====================================================================';
    RAISE NOTICE 'MIGRATION STATUS SUMMARY';
    RAISE NOTICE '====================================================================';
    RAISE NOTICE '';

    IF v_tables_exist THEN
        RAISE NOTICE '✓ Tables created successfully';
    ELSE
        RAISE NOTICE '✗ Tables missing or incomplete';
        v_all_success := false;
    END IF;

    IF v_data_migrated THEN
        RAISE NOTICE '✓ Data migrated successfully';
    ELSE
        RAISE NOTICE '✗ Data migration failed or incomplete';
        v_all_success := false;
    END IF;

    IF v_indexes_exist THEN
        RAISE NOTICE '✓ Indexes created successfully';
    ELSE
        RAISE NOTICE '⚠ Some indexes may be missing';
    END IF;

    IF v_policies_exist THEN
        RAISE NOTICE '✓ RLS policies created successfully';
    ELSE
        RAISE NOTICE '✗ RLS policies missing or incomplete';
        v_all_success := false;
    END IF;

    IF v_functions_exist THEN
        RAISE NOTICE '✓ Helper functions created successfully';
    ELSE
        RAISE NOTICE '✗ Some functions missing';
        v_all_success := false;
    END IF;

    IF v_deprecated_marked THEN
        RAISE NOTICE '✓ Old tables marked as deprecated';
    ELSE
        RAISE NOTICE '⚠ Deprecation markers may be missing';
    END IF;

    IF v_views_exist THEN
        RAISE NOTICE '✓ Backward compatibility views created';
    ELSE
        RAISE NOTICE '⚠ Legacy views may be missing';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '====================================================================';

    IF v_all_success THEN
        RAISE NOTICE '✓✓✓ MIGRATION SUCCESSFUL - SYSTEM OPERATIONAL ✓✓✓';
        RAISE NOTICE '';
        RAISE NOTICE 'Next Steps:';
        RAISE NOTICE '  1. Update frontend to use new table';
        RAISE NOTICE '  2. Monitor application logs for errors';
        RAISE NOTICE '  3. Test notification preferences UI';
        RAISE NOTICE '  4. Monitor legacy view usage';
    ELSE
        RAISE NOTICE '✗✗✗ MIGRATION INCOMPLETE - REVIEW ERRORS ABOVE ✗✗✗';
        RAISE NOTICE '';
        RAISE NOTICE 'Action Required:';
        RAISE NOTICE '  1. Review error messages above';
        RAISE NOTICE '  2. Check migration logs';
        RAISE NOTICE '  3. Consider rollback if necessary';
    END IF;

    RAISE NOTICE '====================================================================';
END $$;

\echo ''
\echo 'POST-MIGRATION VERIFICATION COMPLETE'
\echo '======================================================================'
