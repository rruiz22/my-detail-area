-- ============================================================================
-- 🔍 DIAGNÓSTICO COMPLETO DE NOTIFICACIONES SMS
-- ============================================================================
-- Este script verifica TODA la cadena de configuración necesaria para que
-- funcionen las notificaciones SMS de order_created
-- ============================================================================

-- ============================================================================
-- PARTE 1: Verificar Reglas de Notificación (dealer_notification_rules)
-- ============================================================================
SELECT
  '🔔 REGLAS DE NOTIFICACIÓN' as check_type,
  jsonb_build_object(
    'rule_name', dnr.rule_name,
    'module', dnr.module,
    'event', dnr.event,
    'enabled', dnr.enabled,
    'auto_follow_enabled', dnr.auto_follow_enabled,
    'channels', dnr.channels,
    'sms_enabled', dnr.channels @> '["sms"]'::jsonb,
    'configured_roles', dnr.recipients->'roles'
  ) as config
FROM dealer_notification_rules dnr
WHERE dnr.dealer_id = 5
  AND dnr.module = 'sales_orders'
  AND dnr.event = 'order_created'
ORDER BY dnr.rule_name;

-- ============================================================================
-- PARTE 2: Verificar Usuarios con el Rol (user_custom_role_assignments)
-- ============================================================================
SELECT
  '👥 USUARIOS CON ROL' as check_type,
  jsonb_build_object(
    'user_id', ucra.user_id,
    'email', p.email,
    'role_id', dcr.id,
    'role_name', dcr.display_name,
    'is_active', ucra.is_active,
    'has_phone', p.phone_number IS NOT NULL,
    'phone', p.phone_number
  ) as user_info
FROM user_custom_role_assignments ucra
INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
INNER JOIN profiles p ON p.id = ucra.user_id
WHERE ucra.dealer_id = 5
  AND dcr.display_name = 'Detail Manager'
  AND ucra.is_active = true;

-- ============================================================================
-- PARTE 3: Verificar Permisos del Rol (receive_sms_notifications)
-- ============================================================================
SELECT
  '🔐 PERMISOS DEL ROL' as check_type,
  jsonb_build_object(
    'role_id', dcr.id,
    'role_name', dcr.display_name,
    'module', mp.module,
    'permission', mp.permission_key,
    'has_sms_permission', (
      SELECT COUNT(*) > 0
      FROM role_module_permissions_new rmpn
      INNER JOIN module_permissions mp2 ON mp2.id = rmpn.permission_id
      WHERE rmpn.role_id = dcr.id
        AND mp2.module = 'sales_orders'
        AND mp2.permission_key = 'receive_sms_notifications'
    )
  ) as permission_check
FROM dealer_custom_roles dcr
LEFT JOIN role_module_permissions_new rmpn ON rmpn.role_id = dcr.id
LEFT JOIN module_permissions mp ON mp.id = rmpn.permission_id
  AND mp.module = 'sales_orders'
  AND mp.permission_key = 'receive_sms_notifications'
WHERE dcr.dealer_id = 5
  AND dcr.display_name = 'Detail Manager';

-- ============================================================================
-- PARTE 4: Verificar Preferencias de SMS del Usuario
-- ============================================================================
SELECT
  '⚙️ PREFERENCIAS DE SMS' as check_type,
  jsonb_build_object(
    'user_id', usnp.user_id,
    'email', p.email,
    'module', usnp.module,
    'sms_enabled', usnp.sms_enabled,
    'order_created_enabled', (usnp.event_preferences->>'order_created')::boolean,
    'max_per_hour', usnp.max_sms_per_hour,
    'max_per_day', usnp.max_sms_per_day,
    'quiet_hours', usnp.quiet_hours_enabled
  ) as preferences
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
-- PARTE 5: Verificar Auto-Follow (¿Se agregó como follower?)
-- ============================================================================
SELECT
  '👁️ FOLLOWERS DE ÓRDENES RECIENTES' as check_type,
  jsonb_build_object(
    'order_id', o.id,
    'order_number', o.order_number,
    'order_type', o.order_type,
    'created_at', o.created_at,
    'follower_email', p.email,
    'follow_type', ef.follow_type,
    'auto_added_reason', ef.auto_added_reason,
    'notification_level', ef.notification_level
  ) as follower_info
FROM orders o
LEFT JOIN entity_followers ef ON ef.entity_id = o.id AND ef.entity_type = 'order'
LEFT JOIN profiles p ON p.id = ef.user_id
WHERE o.dealer_id = 5
  AND o.order_type = 'sales'
  AND o.created_at > NOW() - INTERVAL '1 hour'
ORDER BY o.created_at DESC, p.email;

-- ============================================================================
-- PARTE 6: Verificar Historial de SMS Recientes
-- ============================================================================
SELECT
  '📱 HISTORIAL DE SMS' as check_type,
  jsonb_build_object(
    'sent_at', ssh.sent_at,
    'user_email', p.email,
    'event_type', ssh.event_type,
    'status', ssh.status,
    'phone_number', ssh.phone_number,
    'entity_id', ssh.entity_id,
    'error_message', ssh.error_message
  ) as sms_history
FROM sms_send_history ssh
INNER JOIN profiles p ON p.id = ssh.user_id
WHERE ssh.dealer_id = 5
  AND ssh.module = 'sales_orders'
  AND ssh.event_type = 'order_created'
  AND ssh.sent_at > NOW() - INTERVAL '1 hour'
ORDER BY ssh.sent_at DESC;

-- ============================================================================
-- PARTE 7: Verificar Logs del Trigger de Auto-Follow
-- ============================================================================
SELECT
  '📝 LOGS DEL TRIGGER' as check_type,
  jsonb_build_object(
    'order_id', tdl.order_id,
    'message', tdl.message,
    'timestamp', tdl.created_at
  ) as trigger_log
FROM trigger_debug_log tdl
WHERE tdl.order_id IN (
  SELECT o.id
  FROM orders o
  WHERE o.dealer_id = 5
    AND o.order_type = 'sales'
    AND o.created_at > NOW() - INTERVAL '1 hour'
)
ORDER BY tdl.created_at DESC;

-- ============================================================================
-- RESUMEN Y DIAGNÓSTICO
-- ============================================================================
WITH
rule_check AS (
  SELECT COUNT(*) > 0 as has_rule
  FROM dealer_notification_rules
  WHERE dealer_id = 5
    AND module = 'sales_orders'
    AND event = 'order_created'
    AND enabled = true
    AND channels @> '["sms"]'::jsonb
),
user_check AS (
  SELECT COUNT(*) as user_count
  FROM user_custom_role_assignments ucra
  INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
  WHERE ucra.dealer_id = 5
    AND dcr.display_name = 'Detail Manager'
    AND ucra.is_active = true
),
permission_check AS (
  SELECT COUNT(*) as users_with_permission
  FROM user_custom_role_assignments ucra
  INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
  INNER JOIN role_module_permissions_new rmpn ON rmpn.role_id = dcr.id
  INNER JOIN module_permissions mp ON mp.id = rmpn.permission_id
  WHERE ucra.dealer_id = 5
    AND dcr.display_name = 'Detail Manager'
    AND ucra.is_active = true
    AND mp.module = 'sales_orders'
    AND mp.permission_key = 'receive_sms_notifications'
),
prefs_check AS (
  SELECT COUNT(*) as users_with_prefs
  FROM user_sms_notification_preferences usnp
  INNER JOIN user_custom_role_assignments ucra ON ucra.user_id = usnp.user_id
  INNER JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
  WHERE usnp.dealer_id = 5
    AND usnp.module = 'sales_orders'
    AND usnp.sms_enabled = true
    AND (usnp.event_preferences->>'order_created')::boolean = true
    AND dcr.display_name = 'Detail Manager'
    AND ucra.is_active = true
)
SELECT
  '🎯 RESUMEN DIAGNÓSTICO' as check_type,
  jsonb_build_object(
    'step_1_rule_exists', rc.has_rule,
    'step_2_users_with_role', uc.user_count,
    'step_3_users_with_permission', pc.users_with_permission,
    'step_4_users_with_prefs_enabled', prc.users_with_prefs,
    'diagnosis', CASE
      WHEN NOT rc.has_rule THEN '❌ NO HAY REGLA de notificación configurada para order_created con SMS'
      WHEN uc.user_count = 0 THEN '❌ NO HAY USUARIOS asignados al rol Detail Manager'
      WHEN pc.users_with_permission = 0 THEN '❌ El rol NO TIENE el permiso receive_sms_notifications'
      WHEN prc.users_with_prefs = 0 THEN '❌ Los usuarios NO TIENEN preferencias de SMS habilitadas o no tienen order_created habilitado'
      ELSE '✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE - Revisar logs de Supabase Edge Functions'
    END
  ) as summary
FROM rule_check rc, user_check uc, permission_check pc, prefs_check prc;
