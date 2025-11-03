-- ============================================================================
-- 🔧 HABILITAR NOTIFICACIONES SMS PARA ORDER_CREATED
-- ============================================================================
-- Este script configura las notificaciones SMS para usuarios con rol específico
-- Se asegura de que reciban SMS cuando se crean nuevas órdenes
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Crear o actualizar preferencias SMS para usuarios con rol "Detail Manager"
-- ============================================================================
INSERT INTO user_sms_notification_preferences (
  user_id,
  dealer_id,
  module,
  sms_enabled,
  phone_number,
  event_preferences,
  max_sms_per_hour,
  max_sms_per_day,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end
)
SELECT DISTINCT
  ucra.user_id,
  ucra.dealer_id,
  'sales_orders'::text as module,
  true as sms_enabled, -- ✅ Habilitar SMS
  p.phone_number,
  jsonb_build_object(
    'order_created', true,              -- ✅ Habilitar order_created
    'order_assigned', true,
    'status_changed', jsonb_build_object(
      'enabled', true,
      'statuses', jsonb_build_array('completed')
    ),
    'field_updated', jsonb_build_object(
      'enabled', false,
      'fields', jsonb_build_array()
    ),
    'comment_added', false,
    'attachment_added', false,
    'follower_added', false,
    'due_date_approaching', jsonb_build_object(
      'enabled', true,
      'minutes_before', 30
    ),
    'overdue', true,
    'priority_changed', true
  ) as event_preferences,
  10 as max_sms_per_hour,
  50 as max_sms_per_day,
  false as quiet_hours_enabled,
  '22:00'::time as quiet_hours_start,
  '08:00'::time as quiet_hours_end
FROM user_custom_role_assignments ucra
INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
INNER JOIN profiles p ON p.id = ucra.user_id
WHERE ucra.dealer_id = 5
  AND dcr.display_name = 'Detail Manager'
  AND ucra.is_active = true
  AND p.phone_number IS NOT NULL -- Solo usuarios con teléfono
ON CONFLICT (user_id, dealer_id, module)
DO UPDATE SET
  sms_enabled = true,
  event_preferences = jsonb_set(
    EXCLUDED.event_preferences,
    '{order_created}',
    'true'::jsonb,
    true
  ),
  updated_at = NOW();

-- ============================================================================
-- PASO 2: Verificar que se crearon/actualizaron correctamente
-- ============================================================================
SELECT
  '✅ PREFERENCIAS CONFIGURADAS' as status,
  jsonb_build_object(
    'user_id', usnp.user_id,
    'email', p.email,
    'phone', p.phone_number,
    'sms_enabled', usnp.sms_enabled,
    'order_created_enabled', (usnp.event_preferences->>'order_created')::boolean,
    'max_per_hour', usnp.max_sms_per_hour,
    'max_per_day', usnp.max_sms_per_day
  ) as config
FROM user_sms_notification_preferences usnp
INNER JOIN profiles p ON p.id = usnp.user_id
WHERE usnp.dealer_id = 5
  AND usnp.module = 'sales_orders'
  AND usnp.user_id IN (
    SELECT ucra.user_id
    FROM user_custom_role_assignments ucra
    INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
    WHERE ucra.dealer_id = 5
      AND dcr.display_name = 'Detail Manager'
      AND ucra.is_active = true
  );

-- ============================================================================
-- PASO 3: Crear preferencias para service_orders también
-- ============================================================================
INSERT INTO user_sms_notification_preferences (
  user_id,
  dealer_id,
  module,
  sms_enabled,
  phone_number,
  event_preferences
)
SELECT DISTINCT
  ucra.user_id,
  ucra.dealer_id,
  'service_orders'::text as module,
  true as sms_enabled,
  p.phone_number,
  jsonb_build_object(
    'order_created', true,
    'order_assigned', true,
    'status_changed', jsonb_build_object(
      'enabled', true,
      'statuses', jsonb_build_array('completed')
    ),
    'field_updated', jsonb_build_object(
      'enabled', false,
      'fields', jsonb_build_array()
    ),
    'comment_added', false,
    'attachment_added', false,
    'follower_added', false,
    'due_date_approaching', jsonb_build_object(
      'enabled', true,
      'minutes_before', 30
    ),
    'overdue', true,
    'priority_changed', true
  ) as event_preferences
FROM user_custom_role_assignments ucra
INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
INNER JOIN profiles p ON p.id = ucra.user_id
WHERE ucra.dealer_id = 5
  AND dcr.display_name = 'Detail Manager'
  AND ucra.is_active = true
  AND p.phone_number IS NOT NULL
ON CONFLICT (user_id, dealer_id, module)
DO UPDATE SET
  sms_enabled = true,
  event_preferences = jsonb_set(
    EXCLUDED.event_preferences,
    '{order_created}',
    'true'::jsonb,
    true
  ),
  updated_at = NOW();

-- ============================================================================
-- VERIFICACIÓN FINAL: Mostrar resumen completo
-- ============================================================================
SELECT
  '📊 RESUMEN FINAL' as check_type,
  jsonb_build_object(
    'total_users', COUNT(DISTINCT usnp.user_id),
    'modules_configured', COUNT(*),
    'all_enabled', bool_and(usnp.sms_enabled AND (usnp.event_preferences->>'order_created')::boolean)
  ) as summary
FROM user_sms_notification_preferences usnp
WHERE usnp.dealer_id = 5
  AND usnp.user_id IN (
    SELECT ucra.user_id
    FROM user_custom_role_assignments ucra
    INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
    WHERE ucra.dealer_id = 5
      AND dcr.display_name = 'Detail Manager'
      AND ucra.is_active = true
  );

COMMIT;

-- ============================================================================
-- 📝 INSTRUCCIONES DE USO
-- ============================================================================
-- 1. Abre Supabase Dashboard → SQL Editor
-- 2. Copia y pega este script completo
-- 3. Haz clic en "Run"
-- 4. Verifica que veas "✅ PREFERENCIAS CONFIGURADAS" con tus usuarios
-- 5. Crea una nueva orden para probar
--
-- ⚠️ NOTA: Este script solo afecta a usuarios con:
--    - Rol "Detail Manager"
--    - Dealer ID = 5
--    - Teléfono configurado
--    - is_active = true
--
-- Para otros roles o dealers, modifica las líneas WHERE correspondientes
-- ============================================================================
