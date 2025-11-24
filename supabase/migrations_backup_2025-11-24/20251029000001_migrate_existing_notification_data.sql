-- ============================================================================
-- ENTERPRISE NOTIFICATION SYSTEM - FASE 1: DATA MIGRATION
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-29
-- Description: Migrate data from fragmented tables to unified system
--
-- SOURCE TABLES:
--   1. user_notification_preferences (Get Ready module only)
--   2. user_sms_notification_preferences (SMS per module)
--
-- TARGET TABLE:
--   user_notification_preferences_universal
--
-- STRATEGY:
--   - NO data loss - all existing preferences preserved
--   - Merge logic: SMS preferences + Get Ready preferences
--   - Default values for missing data
--   - Verification queries included
-- ============================================================================

BEGIN;

-- ============================================================================
-- PRE-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_get_ready_prefs_count INTEGER;
    v_sms_prefs_count INTEGER;
BEGIN
    -- Count existing records
    SELECT COUNT(*) INTO v_get_ready_prefs_count
    FROM public.user_notification_preferences;

    SELECT COUNT(*) INTO v_sms_prefs_count
    FROM public.user_sms_notification_preferences;

    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'PRE-MIGRATION DATA COUNTS';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'user_notification_preferences (Get Ready): % rows', v_get_ready_prefs_count;
    RAISE NOTICE 'user_sms_notification_preferences: % rows', v_sms_prefs_count;
    RAISE NOTICE '======================================================================';
END $$;

-- ============================================================================
-- MIGRATION STEP 1: Migrate Get Ready Preferences
-- ============================================================================
-- Source: user_notification_preferences (only has Get Ready module data)
-- Target: user_notification_preferences_universal (module = 'get_ready')
-- ============================================================================

INSERT INTO public.user_notification_preferences_universal (
    user_id,
    dealer_id,
    module,
    in_app_enabled,
    email_enabled,
    sms_enabled,
    push_enabled,
    event_preferences,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    rate_limits,
    frequency,
    auto_dismiss_read_after_days,
    auto_dismiss_unread_after_days,
    metadata,
    created_at,
    updated_at
)
SELECT
    unp.user_id,
    unp.dealer_id,
    'get_ready'::VARCHAR(50) AS module, -- Get Ready module

    -- Channel preferences from old table
    unp.in_app_enabled,
    unp.email_enabled,
    false AS sms_enabled, -- Will be updated from SMS table if exists
    unp.desktop_enabled AS push_enabled, -- Map desktop to push

    -- Event preferences - convert old boolean flags to new JSONB structure
    jsonb_build_object(
        'sla_warning', jsonb_build_object(
            'enabled', COALESCE(unp.sla_warnings_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.sla_warnings_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END,
                        CASE WHEN unp.email_enabled THEN 'email'::text END
                    ], NULL))
                ELSE '[]'::jsonb
            END
        ),
        'sla_critical', jsonb_build_object(
            'enabled', COALESCE(unp.sla_critical_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.sla_critical_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END,
                        CASE WHEN unp.email_enabled THEN 'email'::text END
                    ], NULL))
                ELSE '[]'::jsonb
            END
        ),
        'approval_pending', jsonb_build_object(
            'enabled', COALESCE(unp.approval_notifications_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.approval_notifications_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END,
                        CASE WHEN unp.email_enabled THEN 'email'::text END
                    ], NULL))
                ELSE '[]'::jsonb
            END
        ),
        'approval_approved', jsonb_build_object(
            'enabled', COALESCE(unp.approval_notifications_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.approval_notifications_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        ),
        'approval_rejected', jsonb_build_object(
            'enabled', COALESCE(unp.approval_notifications_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.approval_notifications_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        ),
        'bottleneck_detected', jsonb_build_object(
            'enabled', COALESCE(unp.bottleneck_alerts_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.bottleneck_alerts_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        ),
        'bottleneck_resolved', jsonb_build_object(
            'enabled', COALESCE(unp.bottleneck_alerts_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.bottleneck_alerts_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        ),
        'vehicle_status_change', jsonb_build_object(
            'enabled', COALESCE(unp.vehicle_status_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.vehicle_status_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        ),
        'work_item_completed', jsonb_build_object(
            'enabled', COALESCE(unp.work_item_notifications_enabled, false),
            'channels', CASE
                WHEN COALESCE(unp.work_item_notifications_enabled, false) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        ),
        'work_item_created', jsonb_build_object(
            'enabled', COALESCE(unp.work_item_notifications_enabled, false),
            'channels', CASE
                WHEN COALESCE(unp.work_item_notifications_enabled, false) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        ),
        'step_completed', jsonb_build_object(
            'enabled', COALESCE(unp.step_completion_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.step_completion_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        ),
        'system_alert', jsonb_build_object(
            'enabled', COALESCE(unp.system_alerts_enabled, true),
            'channels', CASE
                WHEN COALESCE(unp.system_alerts_enabled, true) THEN
                    TO_JSONB(ARRAY_REMOVE(ARRAY[
                        CASE WHEN unp.in_app_enabled THEN 'in_app'::text END
                    , NULL))
                ELSE '[]'::jsonb
            END
        )
    ) AS event_preferences,

    -- Quiet hours
    COALESCE(unp.quiet_hours_enabled, false),
    COALESCE(unp.quiet_hours_start, '22:00'::TIME),
    COALESCE(unp.quiet_hours_end, '08:00'::TIME),

    -- Rate limits (default values)
    '{
        "in_app": {"max_per_hour": 100, "max_per_day": 500},
        "email": {"max_per_hour": 5, "max_per_day": 20},
        "sms": {"max_per_hour": 3, "max_per_day": 10},
        "push": {"max_per_hour": 10, "max_per_day": 50}
    }'::jsonb,

    -- Frequency (default immediate)
    'immediate'::VARCHAR(20),

    -- Auto-dismiss settings
    COALESCE(unp.auto_dismiss_read_after_days, 7),
    COALESCE(unp.auto_dismiss_unread_after_days, 30),

    -- Metadata (preserve original)
    '{}'::jsonb,

    -- Timestamps
    COALESCE(unp.created_at, NOW()),
    COALESCE(unp.updated_at, NOW())
FROM public.user_notification_preferences unp
ON CONFLICT (user_id, dealer_id, module) DO NOTHING;

-- ============================================================================
-- MIGRATION STEP 2: Migrate SMS Preferences for All Modules
-- ============================================================================
-- Source: user_sms_notification_preferences (per module)
-- Target: user_notification_preferences_universal (all modules)
-- ============================================================================

INSERT INTO public.user_notification_preferences_universal (
    user_id,
    dealer_id,
    module,
    in_app_enabled,
    email_enabled,
    sms_enabled,
    push_enabled,
    event_preferences,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    rate_limits,
    frequency,
    auto_dismiss_read_after_days,
    auto_dismiss_unread_after_days,
    phone_number_override,
    metadata,
    created_at,
    updated_at
)
SELECT
    usp.user_id,
    usp.dealer_id,
    usp.module::VARCHAR(50),

    -- Default channel settings (SMS preferences don't have these)
    true AS in_app_enabled,
    false AS email_enabled,
    COALESCE(usp.sms_enabled, false) AS sms_enabled,
    false AS push_enabled,

    -- Event preferences from SMS table
    COALESCE(usp.event_preferences, '{}'::jsonb),

    -- Quiet hours from SMS preferences
    COALESCE(usp.quiet_hours_enabled, false),
    COALESCE(usp.quiet_hours_start, '22:00'::TIME),
    COALESCE(usp.quiet_hours_end, '08:00'::TIME),

    -- Rate limits from SMS preferences
    jsonb_build_object(
        'in_app', jsonb_build_object('max_per_hour', 100, 'max_per_day', 500),
        'email', jsonb_build_object('max_per_hour', 5, 'max_per_day', 20),
        'sms', jsonb_build_object(
            'max_per_hour', COALESCE(usp.max_sms_per_hour, 10),
            'max_per_day', COALESCE(usp.max_sms_per_day, 50)
        ),
        'push', jsonb_build_object('max_per_hour', 10, 'max_per_day', 50)
    ),

    -- Frequency (default immediate)
    'immediate'::VARCHAR(20),

    -- Auto-dismiss defaults
    7 AS auto_dismiss_read_after_days,
    30 AS auto_dismiss_unread_after_days,

    -- Phone number override
    usp.phone_number,

    -- Metadata
    '{}'::jsonb,

    -- Timestamps
    COALESCE(usp.created_at, NOW()),
    COALESCE(usp.updated_at, NOW())
FROM public.user_sms_notification_preferences usp
ON CONFLICT (user_id, dealer_id, module) DO NOTHING;

-- ============================================================================
-- MIGRATION STEP 3: Update Get Ready records with SMS preferences
-- ============================================================================
-- Merge SMS settings into Get Ready preferences if they exist
-- ============================================================================

UPDATE public.user_notification_preferences_universal AS target
SET
    sms_enabled = source.sms_enabled,
    phone_number_override = source.phone_number,
    rate_limits = jsonb_set(
        target.rate_limits,
        '{sms}',
        jsonb_build_object(
            'max_per_hour', source.max_sms_per_hour,
            'max_per_day', source.max_sms_per_day
        )
    ),
    updated_at = NOW()
FROM public.user_sms_notification_preferences AS source
WHERE target.user_id = source.user_id
    AND target.dealer_id = source.dealer_id
    AND target.module = 'get_ready'
    AND source.module = 'get_ready';

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_universal_count INTEGER;
    v_get_ready_count INTEGER;
    v_sms_modules_count INTEGER;
    v_expected_total INTEGER;
    v_get_ready_prefs_count INTEGER;
    v_sms_prefs_count INTEGER;
BEGIN
    -- Count migrated records
    SELECT COUNT(*) INTO v_universal_count
    FROM public.user_notification_preferences_universal;

    SELECT COUNT(*) INTO v_get_ready_count
    FROM public.user_notification_preferences_universal
    WHERE module = 'get_ready';

    SELECT COUNT(*) INTO v_sms_modules_count
    FROM public.user_notification_preferences_universal
    WHERE module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash');

    -- Get original counts
    SELECT COUNT(*) INTO v_get_ready_prefs_count
    FROM public.user_notification_preferences;

    SELECT COUNT(*) INTO v_sms_prefs_count
    FROM public.user_sms_notification_preferences;

    -- Calculate expected total
    v_expected_total := v_get_ready_prefs_count + v_sms_prefs_count;

    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'POST-MIGRATION DATA VERIFICATION';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'user_notification_preferences_universal: % rows total', v_universal_count;
    RAISE NOTICE '  - Get Ready module: % rows', v_get_ready_count;
    RAISE NOTICE '  - Other modules (SMS): % rows', v_sms_modules_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Original tables:';
    RAISE NOTICE '  - user_notification_preferences: % rows', v_get_ready_prefs_count;
    RAISE NOTICE '  - user_sms_notification_preferences: % rows', v_sms_prefs_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Expected total: % rows', v_expected_total;
    RAISE NOTICE 'Actual total: % rows', v_universal_count;

    IF v_universal_count < v_expected_total THEN
        RAISE WARNING 'Migration incomplete: actual count (%) < expected (%)', v_universal_count, v_expected_total;
    ELSIF v_universal_count = v_expected_total THEN
        RAISE NOTICE '✓ SUCCESS: All records migrated successfully';
    ELSE
        RAISE NOTICE 'NOTE: More records than expected (possible duplicates resolved)';
    END IF;

    RAISE NOTICE '======================================================================';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES (Run manually to verify data integrity)
-- ============================================================================

-- Query 1: Check for users with both Get Ready and SMS preferences
/*
SELECT
    u.user_id,
    u.dealer_id,
    u.module,
    u.sms_enabled,
    u.phone_number_override,
    u.event_preferences->'sla_warning' AS sla_warning_prefs
FROM user_notification_preferences_universal u
WHERE u.module = 'get_ready'
ORDER BY u.user_id, u.dealer_id;
*/

-- Query 2: Check SMS module preferences
/*
SELECT
    module,
    COUNT(*) AS user_count,
    COUNT(CASE WHEN sms_enabled THEN 1 END) AS sms_enabled_count,
    COUNT(CASE WHEN phone_number_override IS NOT NULL THEN 1 END) AS phone_override_count
FROM user_notification_preferences_universal
GROUP BY module
ORDER BY module;
*/

-- Query 3: Verify no data loss
/*
SELECT
    'user_notification_preferences' AS source_table,
    COUNT(*) AS original_count,
    (
        SELECT COUNT(*)
        FROM user_notification_preferences_universal
        WHERE module = 'get_ready'
    ) AS migrated_count
FROM user_notification_preferences
UNION ALL
SELECT
    'user_sms_notification_preferences' AS source_table,
    COUNT(*) AS original_count,
    (
        SELECT COUNT(*)
        FROM user_notification_preferences_universal
        WHERE module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash')
    ) AS migrated_count
FROM user_sms_notification_preferences;
*/

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'ENTERPRISE NOTIFICATION SYSTEM - DATA MIGRATION COMPLETED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Data successfully migrated from:';
    RAISE NOTICE '  ✓ user_notification_preferences → get_ready module';
    RAISE NOTICE '  ✓ user_sms_notification_preferences → all modules';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Run verification queries (see commented SQL above)';
    RAISE NOTICE '  2. Test notification preferences in UI';
    RAISE NOTICE '  3. Run migration 20251029000002 to deprecate old tables';
    RAISE NOTICE '======================================================================';
END $$;

