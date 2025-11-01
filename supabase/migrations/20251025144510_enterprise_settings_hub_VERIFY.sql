-- ============================================================================
-- VERIFICATION SCRIPT FOR ENTERPRISE SETTINGS HUB MIGRATION
-- ============================================================================
-- Migration: 20251025144510_enterprise_settings_hub.sql
-- Purpose: Verify all tables, indexes, policies, and seed data were created
-- Usage: Run this script after migration to ensure everything is working
-- ============================================================================

-- ============================================================================
-- 1. VERIFY TABLES EXIST
-- ============================================================================

DO $$
DECLARE
    v_table_count INTEGER;
BEGIN
    RAISE NOTICE '=== VERIFYING TABLES ===';

    -- Check all 4 tables exist
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'dealer_integrations',
        'security_audit_log',
        'notification_templates',
        'platform_settings'
    );

    IF v_table_count = 4 THEN
        RAISE NOTICE '✅ All 4 tables created successfully';
    ELSE
        RAISE WARNING '❌ Expected 4 tables, found %', v_table_count;
    END IF;

    -- Verify each table
    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dealer_integrations';
    IF FOUND THEN
        RAISE NOTICE '  ✓ dealer_integrations';
    ELSE
        RAISE WARNING '  ✗ dealer_integrations NOT FOUND';
    END IF;

    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_audit_log';
    IF FOUND THEN
        RAISE NOTICE '  ✓ security_audit_log';
    ELSE
        RAISE WARNING '  ✗ security_audit_log NOT FOUND';
    END IF;

    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_templates';
    IF FOUND THEN
        RAISE NOTICE '  ✓ notification_templates';
    ELSE
        RAISE WARNING '  ✗ notification_templates NOT FOUND';
    END IF;

    PERFORM 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_settings';
    IF FOUND THEN
        RAISE NOTICE '  ✓ platform_settings';
    ELSE
        RAISE WARNING '  ✗ platform_settings NOT FOUND';
    END IF;
END $$;

-- ============================================================================
-- 2. VERIFY INDEXES
-- ============================================================================

DO $$
DECLARE
    v_index_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING INDEXES ===';

    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (
        tablename IN ('dealer_integrations', 'security_audit_log', 'notification_templates', 'platform_settings')
    );

    RAISE NOTICE 'Total indexes created: %', v_index_count;

    -- dealer_integrations indexes (3)
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'dealer_integrations';
    RAISE NOTICE '  dealer_integrations: % indexes', v_index_count;

    -- security_audit_log indexes (6)
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'security_audit_log';
    RAISE NOTICE '  security_audit_log: % indexes', v_index_count;

    -- notification_templates indexes (4)
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'notification_templates';
    RAISE NOTICE '  notification_templates: % indexes', v_index_count;

    -- platform_settings indexes (3)
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'platform_settings';
    RAISE NOTICE '  platform_settings: % indexes', v_index_count;
END $$;

-- ============================================================================
-- 3. VERIFY RLS ENABLED
-- ============================================================================

DO $$
DECLARE
    v_rls_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING ROW LEVEL SECURITY ===';

    SELECT COUNT(*) INTO v_rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('dealer_integrations', 'security_audit_log', 'notification_templates', 'platform_settings')
    AND rowsecurity = true;

    IF v_rls_count = 4 THEN
        RAISE NOTICE '✅ RLS enabled on all 4 tables';
    ELSE
        RAISE WARNING '❌ RLS should be enabled on 4 tables, found %', v_rls_count;
    END IF;
END $$;

-- ============================================================================
-- 4. VERIFY RLS POLICIES
-- ============================================================================

DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING RLS POLICIES ===';

    -- Count all policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('dealer_integrations', 'security_audit_log', 'notification_templates', 'platform_settings');

    RAISE NOTICE 'Total RLS policies: %', v_policy_count;

    -- dealer_integrations policies (4: SELECT, INSERT, UPDATE, DELETE)
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dealer_integrations';
    RAISE NOTICE '  dealer_integrations: % policies', v_policy_count;

    -- security_audit_log policies (2: SELECT, INSERT only - no UPDATE/DELETE)
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'security_audit_log';
    RAISE NOTICE '  security_audit_log: % policies (should be 2 - no UPDATE/DELETE)', v_policy_count;

    -- notification_templates policies (4: SELECT, INSERT, UPDATE, DELETE)
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'notification_templates';
    RAISE NOTICE '  notification_templates: % policies', v_policy_count;

    -- platform_settings policies (2: SELECT, ALL for modify)
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'platform_settings';
    RAISE NOTICE '  platform_settings: % policies', v_policy_count;
END $$;

-- ============================================================================
-- 5. VERIFY FUNCTIONS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING FUNCTIONS ===';

    -- Check log_security_event function
    PERFORM 1 FROM pg_proc WHERE proname = 'log_security_event';
    IF FOUND THEN
        RAISE NOTICE '  ✓ log_security_event()';
    ELSE
        RAISE WARNING '  ✗ log_security_event() NOT FOUND';
    END IF;

    -- Check test_dealer_integration function
    PERFORM 1 FROM pg_proc WHERE proname = 'test_dealer_integration';
    IF FOUND THEN
        RAISE NOTICE '  ✓ test_dealer_integration()';
    ELSE
        RAISE WARNING '  ✗ test_dealer_integration() NOT FOUND';
    END IF;
END $$;

-- ============================================================================
-- 6. VERIFY TRIGGERS
-- ============================================================================

DO $$
DECLARE
    v_trigger_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING TRIGGERS ===';

    SELECT COUNT(*) INTO v_trigger_count
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND event_object_table IN ('dealer_integrations', 'notification_templates', 'platform_settings')
    AND trigger_name LIKE 'update_%_updated_at';

    IF v_trigger_count >= 3 THEN
        RAISE NOTICE '✅ Updated_at triggers: %', v_trigger_count;
    ELSE
        RAISE WARNING '❌ Expected at least 3 updated_at triggers, found %', v_trigger_count;
    END IF;
END $$;

-- ============================================================================
-- 7. VERIFY SEED DATA
-- ============================================================================

DO $$
DECLARE
    v_settings_count INTEGER;
    v_templates_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING SEED DATA ===';

    -- Platform settings
    SELECT COUNT(*) INTO v_settings_count FROM platform_settings;
    IF v_settings_count >= 9 THEN
        RAISE NOTICE '✅ Platform settings: % rows (expected >= 9)', v_settings_count;
    ELSE
        RAISE WARNING '❌ Platform settings: % rows (expected >= 9)', v_settings_count;
    END IF;

    -- Notification templates
    SELECT COUNT(*) INTO v_templates_count FROM notification_templates;
    IF v_templates_count >= 5 THEN
        RAISE NOTICE '✅ Notification templates: % rows (expected >= 5)', v_templates_count;
    ELSE
        RAISE WARNING '❌ Notification templates: % rows (expected >= 5)', v_templates_count;
    END IF;
END $$;

-- ============================================================================
-- 8. VERIFY CONSTRAINTS
-- ============================================================================

DO $$
DECLARE
    v_constraint_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING CONSTRAINTS ===';

    -- UNIQUE constraints
    SELECT COUNT(*) INTO v_constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND constraint_type = 'UNIQUE'
    AND table_name IN ('dealer_integrations', 'notification_templates', 'platform_settings');

    RAISE NOTICE 'UNIQUE constraints: %', v_constraint_count;

    -- CHECK constraints
    SELECT COUNT(*) INTO v_constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND constraint_type = 'CHECK'
    AND table_name IN ('dealer_integrations', 'security_audit_log', 'notification_templates', 'platform_settings');

    RAISE NOTICE 'CHECK constraints: %', v_constraint_count;

    -- FOREIGN KEY constraints
    SELECT COUNT(*) INTO v_constraint_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND constraint_type = 'FOREIGN KEY'
    AND table_name IN ('dealer_integrations', 'security_audit_log', 'notification_templates', 'platform_settings');

    RAISE NOTICE 'FOREIGN KEY constraints: %', v_constraint_count;
END $$;

-- ============================================================================
-- 9. VERIFY SPECIFIC SEED DATA VALUES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING SPECIFIC SEED VALUES ===';

    -- Check default_timezone
    PERFORM 1 FROM platform_settings
    WHERE setting_key = 'default_timezone'
    AND setting_value = '"America/New_York"'::jsonb;
    IF FOUND THEN
        RAISE NOTICE '  ✓ default_timezone = America/New_York';
    ELSE
        RAISE WARNING '  ✗ default_timezone incorrect or missing';
    END IF;

    -- Check default_currency
    PERFORM 1 FROM platform_settings
    WHERE setting_key = 'default_currency'
    AND setting_value = '"USD"'::jsonb;
    IF FOUND THEN
        RAISE NOTICE '  ✓ default_currency = USD';
    ELSE
        RAISE WARNING '  ✗ default_currency incorrect or missing';
    END IF;

    -- Check business_name
    PERFORM 1 FROM platform_settings
    WHERE setting_key = 'business_name'
    AND setting_value = '"My Detail Area"'::jsonb;
    IF FOUND THEN
        RAISE NOTICE '  ✓ business_name = My Detail Area';
    ELSE
        RAISE WARNING '  ✗ business_name incorrect or missing';
    END IF;

    -- Check order_created template
    PERFORM 1 FROM notification_templates
    WHERE template_key = 'order_created'
    AND language = 'en'
    AND channel_type = 'email'
    AND is_global = true;
    IF FOUND THEN
        RAISE NOTICE '  ✓ order_created email template (en)';
    ELSE
        RAISE WARNING '  ✗ order_created template missing';
    END IF;

    -- Check slack_order_created template
    PERFORM 1 FROM notification_templates
    WHERE template_key = 'slack_order_created'
    AND language = 'en'
    AND channel_type = 'slack'
    AND is_global = true;
    IF FOUND THEN
        RAISE NOTICE '  ✓ slack_order_created template';
    ELSE
        RAISE WARNING '  ✗ slack_order_created template missing';
    END IF;
END $$;

-- ============================================================================
-- 10. TEST BASIC QUERIES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TESTING BASIC QUERIES ===';

    -- Test SELECT on platform_settings
    PERFORM * FROM platform_settings LIMIT 1;
    RAISE NOTICE '  ✓ SELECT on platform_settings works';

    -- Test SELECT on notification_templates
    PERFORM * FROM notification_templates LIMIT 1;
    RAISE NOTICE '  ✓ SELECT on notification_templates works';

    -- Test SELECT on dealer_integrations
    PERFORM * FROM dealer_integrations LIMIT 1;
    RAISE NOTICE '  ✓ SELECT on dealer_integrations works';

    -- Test SELECT on security_audit_log
    PERFORM * FROM security_audit_log LIMIT 1;
    RAISE NOTICE '  ✓ SELECT on security_audit_log works';

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '  ✗ Query test failed: %', SQLERRM;
END $$;

-- ============================================================================
-- 11. SUMMARY REPORT
-- ============================================================================

DO $$
DECLARE
    v_total_issues INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION SUMMARY ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Migration: 20251025144510_enterprise_settings_hub.sql';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '';

    -- Count any warnings in logs
    -- In production, you would parse the NOTICE messages
    RAISE NOTICE 'Verification complete. Review the output above for any ❌ or ✗ symbols.';
    RAISE NOTICE '';
    RAISE NOTICE 'If all checks show ✅ or ✓, the migration was successful!';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- 12. OPTIONAL: DISPLAY TABLE SCHEMAS
-- ============================================================================

-- Uncomment to see full table structures
/*
\d+ dealer_integrations
\d+ security_audit_log
\d+ notification_templates
\d+ platform_settings
*/

-- Uncomment to see all RLS policies
/*
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('dealer_integrations', 'security_audit_log', 'notification_templates', 'platform_settings')
ORDER BY tablename, policyname;
*/

-- ============================================================================
-- VERIFICATION SCRIPT COMPLETE
-- ============================================================================
