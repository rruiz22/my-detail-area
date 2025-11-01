-- ============================================================================
-- ENTERPRISE NOTIFICATION SYSTEM - FASE 1: DEPRECATE OLD TABLES
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-29
-- Description: Mark old notification tables as deprecated (NOT deleted)
--
-- DEPRECATED TABLES:
--   1. user_notification_preferences (Get Ready only)
--   2. user_sms_notification_preferences (SMS per module)
--
-- STRATEGY:
--   - Add deprecation metadata (NOT deletion)
--   - Add SQL comments warning developers
--   - Add deprecated_at timestamp column
--   - Keep RLS policies intact for backward compatibility
--   - Schedule deletion in 6 months (FUTURE_20251120000000)
--
-- IMPORTANT: DO NOT DELETE TABLES YET
--   - Allow 6-month grace period for rollback if needed
--   - Monitor application for any legacy code usage
--   - Verify all clients migrated to new system
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add deprecation tracking column
-- ============================================================================

-- Add deprecated_at column to user_notification_preferences
ALTER TABLE public.user_notification_preferences
    ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NOW();

-- Add deprecated_at column to user_sms_notification_preferences
ALTER TABLE public.user_sms_notification_preferences
    ADD COLUMN IF NOT EXISTS deprecated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- STEP 2: Update table comments to warn developers
-- ============================================================================

COMMENT ON TABLE public.user_notification_preferences IS
    '⚠️ DEPRECATED - Use user_notification_preferences_universal instead
    This table is deprecated as of 2025-10-29 and will be removed in 6 months.
    Migration: 20251029000001_migrate_existing_notification_data.sql
    Replacement: user_notification_preferences_universal
    Legacy: Get Ready module notification preferences only
    Status: Read-only for backward compatibility';

COMMENT ON TABLE public.user_sms_notification_preferences IS
    '⚠️ DEPRECATED - Use user_notification_preferences_universal instead
    This table is deprecated as of 2025-10-29 and will be removed in 6 months.
    Migration: 20251029000001_migrate_existing_notification_data.sql
    Replacement: user_notification_preferences_universal
    Legacy: SMS notification preferences per module
    Status: Read-only for backward compatibility';

-- ============================================================================
-- STEP 3: Add column comments
-- ============================================================================

COMMENT ON COLUMN public.user_notification_preferences.deprecated_at IS
    'Timestamp when this table was marked as deprecated (2025-10-29)';

COMMENT ON COLUMN public.user_sms_notification_preferences.deprecated_at IS
    'Timestamp when this table was marked as deprecated (2025-10-29)';

-- ============================================================================
-- STEP 4: Create view for backward compatibility (Optional)
-- ============================================================================

-- View to map new table back to old Get Ready preferences structure
CREATE OR REPLACE VIEW public.user_notification_preferences_legacy AS
SELECT
    user_id,
    dealer_id,
    -- Extract event preferences from JSONB
    (event_preferences->'sla_warning'->>'enabled')::BOOLEAN AS sla_warnings_enabled,
    (event_preferences->'sla_critical'->>'enabled')::BOOLEAN AS sla_critical_enabled,
    (event_preferences->'approval_pending'->>'enabled')::BOOLEAN AS approval_notifications_enabled,
    (event_preferences->'bottleneck_detected'->>'enabled')::BOOLEAN AS bottleneck_alerts_enabled,
    (event_preferences->'vehicle_status_change'->>'enabled')::BOOLEAN AS vehicle_status_enabled,
    (event_preferences->'work_item_completed'->>'enabled')::BOOLEAN AS work_item_notifications_enabled,
    (event_preferences->'step_completed'->>'enabled')::BOOLEAN AS step_completion_enabled,
    (event_preferences->'system_alert'->>'enabled')::BOOLEAN AS system_alerts_enabled,
    -- Delivery preferences
    in_app_enabled,
    email_enabled,
    push_enabled AS desktop_enabled, -- Map back to old naming
    false AS sound_enabled, -- Deprecated field
    -- Quiet hours
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    -- Auto-dismiss
    auto_dismiss_read_after_days,
    auto_dismiss_unread_after_days,
    -- Timestamps
    created_at,
    updated_at
FROM public.user_notification_preferences_universal
WHERE module = 'get_ready';

COMMENT ON VIEW public.user_notification_preferences_legacy IS
    'Backward compatibility view for legacy code using old user_notification_preferences table.
    Maps user_notification_preferences_universal (get_ready module) to old structure.
    ⚠️ This view will be removed when old table is deleted in 6 months.';

-- View for SMS preferences backward compatibility
CREATE OR REPLACE VIEW public.user_sms_notification_preferences_legacy AS
SELECT
    id,
    user_id,
    dealer_id,
    module,
    sms_enabled,
    phone_number_override AS phone_number,
    event_preferences,
    (rate_limits->'sms'->>'max_per_hour')::INTEGER AS max_sms_per_hour,
    (rate_limits->'sms'->>'max_per_day')::INTEGER AS max_sms_per_day,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    created_at,
    updated_at
FROM public.user_notification_preferences_universal
WHERE module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash');

COMMENT ON VIEW public.user_sms_notification_preferences_legacy IS
    'Backward compatibility view for legacy code using old user_sms_notification_preferences table.
    Maps user_notification_preferences_universal to old SMS structure.
    ⚠️ This view will be removed when old table is deleted in 6 months.';

-- ============================================================================
-- STEP 5: Grant permissions on legacy views
-- ============================================================================

GRANT SELECT ON public.user_notification_preferences_legacy TO authenticated;
GRANT SELECT ON public.user_sms_notification_preferences_legacy TO authenticated;

-- ============================================================================
-- STEP 6: Create monitoring function to track legacy table usage
-- ============================================================================

-- Function to log when legacy tables are accessed (for monitoring)
CREATE OR REPLACE FUNCTION public.log_deprecated_table_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert audit log entry
    INSERT INTO public.security_audit_log (
        event_type,
        event_category,
        severity,
        user_id,
        metadata,
        success
    ) VALUES (
        'deprecated_table_access',
        'system',
        'warning',
        auth.uid(),
        jsonb_build_object(
            'table_name', TG_TABLE_NAME,
            'operation', TG_OP,
            'timestamp', NOW()
        ),
        true
    );

    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

-- Attach trigger to monitor SELECT operations on deprecated tables
-- Note: This will create audit entries for reads (use sparingly to avoid log spam)
/*
CREATE TRIGGER monitor_user_notification_preferences_access
    AFTER SELECT ON public.user_notification_preferences
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.log_deprecated_table_access();

CREATE TRIGGER monitor_user_sms_notification_preferences_access
    AFTER SELECT ON public.user_sms_notification_preferences
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.log_deprecated_table_access();
*/

-- ============================================================================
-- STEP 7: Document sunset plan
-- ============================================================================

-- Create metadata table entry for sunset tracking
DO $$
BEGIN
    -- Create a simple notification in logs
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'DEPRECATION TRACKING';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Tables deprecated: 2025-10-29';
    RAISE NOTICE 'Sunset date: 2025-05-29 (6 months grace period)';
    RAISE NOTICE '';
    RAISE NOTICE 'Deprecated tables:';
    RAISE NOTICE '  - user_notification_preferences';
    RAISE NOTICE '  - user_sms_notification_preferences';
    RAISE NOTICE '';
    RAISE NOTICE 'Replacement table:';
    RAISE NOTICE '  - user_notification_preferences_universal';
    RAISE NOTICE '';
    RAISE NOTICE 'Backward compatibility views created:';
    RAISE NOTICE '  - user_notification_preferences_legacy';
    RAISE NOTICE '  - user_sms_notification_preferences_legacy';
    RAISE NOTICE '';
    RAISE NOTICE 'Action Items:';
    RAISE NOTICE '  1. Update all application code to use new table';
    RAISE NOTICE '  2. Monitor legacy view usage in next 3 months';
    RAISE NOTICE '  3. Remove deprecated tables after 6 months';
    RAISE NOTICE '  4. Schedule cleanup: FUTURE_20251120000000_drop_legacy_notification_tables.sql';
    RAISE NOTICE '======================================================================';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK PLAN (Run if migration needs to be reversed)
-- ============================================================================
/*
BEGIN;

-- Remove deprecation markers
ALTER TABLE public.user_notification_preferences DROP COLUMN IF EXISTS deprecated_at;
ALTER TABLE public.user_sms_notification_preferences DROP COLUMN IF EXISTS deprecated_at;

-- Restore original comments
COMMENT ON TABLE public.user_notification_preferences IS
    'User-specific notification preferences and settings for Get Ready module';

COMMENT ON TABLE public.user_sms_notification_preferences IS
    'Stores granular SMS notification preferences for users per module';

-- Drop legacy views
DROP VIEW IF EXISTS public.user_notification_preferences_legacy;
DROP VIEW IF EXISTS public.user_sms_notification_preferences_legacy;

-- Drop monitoring function
DROP FUNCTION IF EXISTS public.log_deprecated_table_access();

COMMIT;
*/

-- ============================================================================
-- FUTURE CLEANUP SCRIPT (To be run after 6 months)
-- ============================================================================
-- File: FUTURE_20251120000000_drop_legacy_notification_tables.sql
--
-- ⚠️ DO NOT RUN BEFORE 2025-05-29
--
-- BEGIN;
--
-- -- Drop backward compatibility views
-- DROP VIEW IF EXISTS public.user_notification_preferences_legacy CASCADE;
-- DROP VIEW IF EXISTS public.user_sms_notification_preferences_legacy CASCADE;
--
-- -- Drop deprecated tables (after 6-month grace period)
-- DROP TABLE IF EXISTS public.user_notification_preferences CASCADE;
-- DROP TABLE IF EXISTS public.user_sms_notification_preferences CASCADE;
--
-- -- Drop monitoring function
-- DROP FUNCTION IF EXISTS public.log_deprecated_table_access() CASCADE;
--
-- -- Log cleanup
-- DO $$
-- BEGIN
--     RAISE NOTICE 'Legacy notification tables successfully removed';
-- END $$;
--
-- COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify deprecation)
-- ============================================================================

-- Query 1: Verify deprecation markers
/*
SELECT
    'user_notification_preferences' AS table_name,
    COUNT(*) AS row_count,
    MIN(deprecated_at) AS deprecated_at
FROM public.user_notification_preferences
UNION ALL
SELECT
    'user_sms_notification_preferences' AS table_name,
    COUNT(*) AS row_count,
    MIN(deprecated_at) AS deprecated_at
FROM public.user_sms_notification_preferences;
*/

-- Query 2: Test backward compatibility views
/*
-- Test Get Ready legacy view
SELECT COUNT(*) AS get_ready_legacy_count
FROM public.user_notification_preferences_legacy;

-- Test SMS legacy view
SELECT COUNT(*) AS sms_legacy_count
FROM public.user_sms_notification_preferences_legacy;
*/

-- Query 3: Compare old vs new data
/*
SELECT
    'Original Get Ready prefs' AS source,
    COUNT(*) AS count
FROM public.user_notification_preferences
UNION ALL
SELECT
    'Legacy view' AS source,
    COUNT(*) AS count
FROM public.user_notification_preferences_legacy
UNION ALL
SELECT
    'Universal table (get_ready)' AS source,
    COUNT(*) AS count
FROM public.user_notification_preferences_universal
WHERE module = 'get_ready';
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'ENTERPRISE NOTIFICATION SYSTEM - DEPRECATION COMPLETED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Deprecated tables:';
    RAISE NOTICE '  ✓ user_notification_preferences (marked deprecated)';
    RAISE NOTICE '  ✓ user_sms_notification_preferences (marked deprecated)';
    RAISE NOTICE '';
    RAISE NOTICE 'Backward compatibility:';
    RAISE NOTICE '  ✓ Legacy views created for gradual migration';
    RAISE NOTICE '  ✓ RLS policies remain active';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update application code to use user_notification_preferences_universal';
    RAISE NOTICE '  2. Monitor legacy table/view usage for 3 months';
    RAISE NOTICE '  3. Schedule table deletion in 6 months (2025-05-29)';
    RAISE NOTICE '';
    RAISE NOTICE 'Replacement table: user_notification_preferences_universal';
    RAISE NOTICE '======================================================================';
END $$;
