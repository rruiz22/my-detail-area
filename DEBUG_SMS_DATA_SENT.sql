-- ============================================================================
-- 🔍 DEBUG: Ver datos que se están enviando en SMS
-- ============================================================================

-- Ver los últimos 10 SMS enviados con TODOS los detalles
SELECT
  '📱 SMS ENVIADOS' as tipo,
  jsonb_build_object(
    'sent_at', ssh.sent_at,
    'user_email', p.email,
    'phone', ssh.phone_number,
    'event_type', ssh.event_type,
    'status', ssh.status,
    'message_preview', LEFT(ssh.message_content, 100),
    'full_message', ssh.message_content,
    'order_id', ssh.entity_id,
    'module', ssh.module,
    'error', ssh.error_message
  ) as details
FROM sms_send_history ssh
INNER JOIN profiles p ON p.id = ssh.user_id
WHERE ssh.dealer_id = 5
ORDER BY ssh.sent_at DESC
LIMIT 10;

-- Ver las últimas órdenes creadas y sus datos
SELECT
  '📋 ÓRDENES CREADAS' as tipo,
  jsonb_build_object(
    'created_at', o.created_at,
    'order_number', o.order_number,
    'order_type', o.order_type,
    'stock_number', o.stock_number,
    'tag', o.tag,
    'customer_name', o.customer_name,
    'vehicle_year', o.vehicle_year,
    'vehicle_make', o.vehicle_make,
    'vehicle_model', o.vehicle_model,
    'services', o.services,
    'due_date', o.due_date,
    'short_link', o.short_link
  ) as order_data
FROM orders o
WHERE o.dealer_id = 5
  AND o.created_at > NOW() - INTERVAL '2 hours'
ORDER BY o.created_at DESC
LIMIT 5;

-- Ver si hay errores en el envío de SMS
SELECT
  '❌ ERRORES SMS' as tipo,
  jsonb_build_object(
    'sent_at', ssh.sent_at,
    'order_number', o.order_number,
    'user_email', p.email,
    'error_message', ssh.error_message,
    'status', ssh.status
  ) as error_details
FROM sms_send_history ssh
INNER JOIN profiles p ON p.id = ssh.user_id
LEFT JOIN orders o ON o.id::text = ssh.entity_id
WHERE ssh.dealer_id = 5
  AND ssh.status = 'failed'
  AND ssh.sent_at > NOW() - INTERVAL '2 hours'
ORDER BY ssh.sent_at DESC;

-- Ver formato exacto del último mensaje enviado
SELECT
  '💬 ÚLTIMO MENSAJE ENVIADO' as tipo,
  ssh.sent_at,
  ssh.message_content as mensaje_completo,
  LENGTH(ssh.message_content) as longitud,
  ssh.event_type,
  o.order_number,
  o.stock_number,
  o.tag,
  o.services,
  o.short_link
FROM sms_send_history ssh
LEFT JOIN orders o ON o.id::text = ssh.entity_id
WHERE ssh.dealer_id = 5
  AND ssh.event_type = 'order_created'
ORDER BY ssh.sent_at DESC
LIMIT 1;
