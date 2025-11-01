-- ============================================================================
-- MIGRATION 2: Migrate Existing Notification Data (SIMPLIFIED VERSION)
-- ============================================================================
-- Esta es una versión simplificada que crea registros default
-- en lugar de migrar datos complejos de las tablas antiguas
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Crear preferencias default para usuarios existentes con Get Ready
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
    frequency
)
SELECT DISTINCT
    unp.user_id,
    unp.dealer_id,
    'get_ready'::VARCHAR(50) as module,
    COALESCE(unp.in_app_enabled, true),
    COALESCE(unp.email_enabled, false),
    false as sms_enabled, -- SMS no estaba en Get Ready
    COALESCE(unp.desktop_enabled, false) as push_enabled,
    '{}'::jsonb as event_preferences, -- Configuración granular la hará el usuario
    COALESCE(unp.quiet_hours_enabled, false),
    COALESCE(unp.quiet_hours_start, '22:00'::TIME),
    COALESCE(unp.quiet_hours_end, '08:00'::TIME),
    '{
        "in_app": {"max_per_hour": 100, "max_per_day": 500},
        "email": {"max_per_hour": 5, "max_per_day": 20},
        "sms": {"max_per_hour": 3, "max_per_day": 10},
        "push": {"max_per_hour": 10, "max_per_day": 50}
    }'::jsonb,
    'immediate'::VARCHAR(20)
FROM public.user_notification_preferences unp
ON CONFLICT (user_id, dealer_id, module) DO NOTHING;

-- ============================================================================
-- PASO 2: Crear preferencias default para usuarios con SMS preferences
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
    phone_number_override,
    rate_limits,
    frequency
)
SELECT DISTINCT
    usp.user_id,
    usp.dealer_id,
    usp.module,
    true as in_app_enabled,
    true as email_enabled,
    COALESCE(usp.sms_enabled, false),
    true as push_enabled,
    COALESCE(usp.event_preferences, '{}'::jsonb),
    COALESCE(usp.quiet_hours_enabled, false),
    COALESCE(usp.quiet_hours_start, '22:00'::TIME),
    COALESCE(usp.quiet_hours_end, '08:00'::TIME),
    usp.phone_number,
    jsonb_build_object(
        'in_app', jsonb_build_object('max_per_hour', 100, 'max_per_day', 500),
        'email', jsonb_build_object('max_per_hour', 5, 'max_per_day', 20),
        'sms', jsonb_build_object('max_per_hour', COALESCE(usp.max_sms_per_hour, 10), 'max_per_day', COALESCE(usp.max_sms_per_day, 50)),
        'push', jsonb_build_object('max_per_hour', 10, 'max_per_day', 50)
    ),
    'immediate'::VARCHAR(20)
FROM public.user_sms_notification_preferences usp
ON CONFLICT (user_id, dealer_id, module) DO UPDATE SET
    sms_enabled = EXCLUDED.sms_enabled,
    phone_number_override = EXCLUDED.phone_number_override,
    event_preferences = EXCLUDED.event_preferences,
    quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
    quiet_hours_start = EXCLUDED.quiet_hours_start,
    quiet_hours_end = EXCLUDED.quiet_hours_end,
    rate_limits = EXCLUDED.rate_limits;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    v_migrated_get_ready INTEGER;
    v_migrated_sms INTEGER;
    v_total_migrated INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_migrated_get_ready
    FROM user_notification_preferences_universal
    WHERE module = 'get_ready';

    SELECT COUNT(*) INTO v_migrated_sms
    FROM user_notification_preferences_universal
    WHERE module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash');

    v_total_migrated := v_migrated_get_ready + v_migrated_sms;

    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'DATA MIGRATION COMPLETED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Get Ready preferences migrated: %', v_migrated_get_ready;
    RAISE NOTICE 'SMS preferences migrated: %', v_migrated_sms;
    RAISE NOTICE 'Total records in new table: %', v_total_migrated;
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Run migration 20251029000002 to deprecate old tables';
    RAISE NOTICE '======================================================================';
END $$;
