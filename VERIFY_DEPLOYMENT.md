# ✅ Verificación de Deployment - Edge Function

**Fecha:** 2025-11-21
**Función:** send-order-sms-notification
**Cambio:** Level 3 simplificado (global SMS toggle)

---

## 1. Verificar Deployment de Edge Function

### Opción A: Via Dashboard (RECOMENDADO)

1. **Ir al Dashboard de Supabase:**
   ```
   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/functions
   ```

2. **Buscar la función:** `send-order-sms-notification`

3. **Verificar indicadores:**
   - ✅ Status: **Active** (círculo verde)
   - ✅ Last deployed: Debe mostrar fecha/hora reciente (hoy)
   - ✅ Version: Debe ser la más reciente

4. **Ver logs recientes:**
   - Click en la función
   - Tab **"Logs"**
   - Buscar errores de deployment (no debería haber)

### Opción B: Via API Health Check

```bash
curl -i "https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/send-order-sms-notification"
```

**Respuesta esperada:**
```
HTTP/2 401
{"code":401,"message":"Invalid JWT"}
```

✅ **401 es correcto** - La función está activa, solo falta autenticación
❌ **404 Not Found** - La función NO está deployada

---

## 2. Verificar Estado de Alice Ruiz

### Query SQL (Ejecutar en Dashboard → SQL Editor)

```sql
-- 1. Verificar configuración de Alice Ruiz
SELECT
  p.id,
  p.first_name || ' ' || p.last_name as name,
  p.email,
  p.phone_number,
  up.notification_sms as sms_enabled_global,
  up.notification_email,
  up.notification_in_app,
  dm.is_active as member_active,
  dcr.role_name
FROM profiles p
LEFT JOIN user_preferences up ON up.user_id = p.id
LEFT JOIN dealer_memberships dm ON dm.user_id = p.id AND dm.is_active = true
LEFT JOIN dealer_custom_roles dcr ON dcr.id = dm.custom_role_id
WHERE p.first_name = 'Alice' AND p.last_name = 'Ruiz';
```

**Resultado esperado:**
```
id: [uuid]
name: Alice Ruiz
email: alice@example.com
phone_number: +1234567890 (NOT NULL) ✅
sms_enabled_global: true ✅
notification_email: true
notification_in_app: true
member_active: true ✅
role_name: [nombre del rol] ✅
```

### Si `sms_enabled_global` es `false` o `NULL`:

```sql
-- Habilitar SMS para Alice
UPDATE user_preferences
SET notification_sms = true
WHERE user_id = (
  SELECT id FROM profiles
  WHERE first_name = 'Alice' AND last_name = 'Ruiz'
);

-- Verificar que se aplicó
SELECT
  p.first_name || ' ' || p.last_name as name,
  up.notification_sms
FROM profiles p
INNER JOIN user_preferences up ON up.user_id = p.id
WHERE p.first_name = 'Alice' AND p.last_name = 'Ruiz';
```

---

## 3. Verificar que Alice es Follower de una Orden

```sql
-- Verificar órdenes que Alice sigue
SELECT
  ef.entity_id as order_id,
  ef.notification_level,
  ef.is_active,
  ef.created_at,
  so.order_number,
  so.current_status
FROM entity_followers ef
LEFT JOIN sales_orders so ON so.id::text = ef.entity_id
WHERE ef.user_id = (
  SELECT id FROM profiles WHERE first_name = 'Alice' AND last_name = 'Ruiz'
)
AND ef.entity_type = 'order'
AND ef.is_active = true
ORDER BY ef.created_at DESC
LIMIT 5;
```

**Resultado esperado:**
```
order_id: [uuid]
notification_level: all ✅
is_active: true ✅
order_number: #12345
current_status: new/in_progress/completed
```

### Si NO es follower de ninguna orden:

```sql
-- Hacer a Alice follower de una orden existente
INSERT INTO entity_followers (
  user_id,
  entity_type,
  entity_id,
  dealer_id,
  notification_level,
  is_active
)
VALUES (
  (SELECT id FROM profiles WHERE first_name = 'Alice' AND last_name = 'Ruiz'),
  'order',
  '[ID_DE_UNA_ORDEN_DE_PRUEBA]',
  5, -- BMW of Sudbury dealer_id
  'all',
  true
);
```

---

## 4. Verificar Permisos del Role (Level 2)

```sql
-- Verificar que el role de Alice permite el evento "status_changed"
SELECT
  dcr.role_name,
  rne.module,
  rne.event_type,
  rne.enabled,
  rne.event_config
FROM dealer_custom_roles dcr
INNER JOIN role_notification_events rne ON rne.role_id = dcr.id
WHERE dcr.id = (
  SELECT dm.custom_role_id
  FROM dealer_memberships dm
  INNER JOIN profiles p ON p.id = dm.user_id
  WHERE p.first_name = 'Alice' AND p.last_name = 'Ruiz'
  AND dm.is_active = true
  LIMIT 1
)
AND rne.module = 'sales_orders'
AND rne.event_type = 'status_changed';
```

**Resultado esperado:**
```
role_name: [Sales Advisor / Manager / etc]
module: sales_orders
event_type: status_changed
enabled: true ✅
event_config: {...}
```

### Si el evento NO está habilitado:

```sql
-- Habilitar "status_changed" para el role de Alice
INSERT INTO role_notification_events (
  role_id,
  module,
  event_type,
  enabled,
  event_config
)
VALUES (
  (SELECT dm.custom_role_id
   FROM dealer_memberships dm
   INNER JOIN profiles p ON p.id = dm.user_id
   WHERE p.first_name = 'Alice' AND p.last_name = 'Ruiz'
   AND dm.is_active = true
   LIMIT 1),
  'sales_orders',
  'status_changed',
  true,
  '{}'::jsonb
)
ON CONFLICT (role_id, module, event_type)
DO UPDATE SET enabled = true;
```

---

## 5. Test End-to-End (Prueba Real)

### Paso 1: Preparar el test

1. ✅ Alice tiene `phone_number` configurado
2. ✅ Alice tiene `notification_sms = true`
3. ✅ Alice es follower activo de una orden
4. ✅ El role de Alice permite evento "status_changed"

### Paso 2: Trigger la notificación

**Opción A: Cambiar status de orden via UI**
1. Ir a la orden que Alice sigue
2. Cambiar status (ej: "new" → "in_progress")
3. Guardar

**Opción B: Trigger manual via SQL**
```sql
-- Actualizar status de orden
UPDATE sales_orders
SET current_status = 'completed',
    updated_at = NOW()
WHERE id = '[ID_DE_ORDEN_QUE_ALICE_SIGUE]';
```

### Paso 3: Verificar logs de Edge Function

1. **Dashboard → Edge Functions → send-order-sms-notification → Logs**

2. **Buscar el log más reciente** (dentro de los últimos 2 minutos)

3. **Logs esperados:**

```
🔔 === EVALUATING SMS NOTIFICATION ===
Order ID: [uuid]
Event: status_changed
Module: sales_orders

1️⃣ LEVEL 1: Checking FOLLOWERS...
   ✅ Found 1 follower: Alice Ruiz

2️⃣ LEVEL 2: Checking ROLE permissions...
   ✅ Role "[role_name]" allows event "status_changed"

3️⃣ LEVEL 3: Checking USER preferences...
   ✅ LEVEL 3 PASSED: User has SMS globally enabled
   → Phone: +1234567890

✅✅✅ USER ELIGIBLE: Alice Ruiz
📤 SENDING SMS VIA TWILIO...
✅ SMS sent successfully
```

### Paso 4: Verificar en tabla `sms_send_history`

```sql
-- Verificar SMS enviados recientemente
SELECT
  ssh.sent_at,
  ssh.user_id,
  p.first_name || ' ' || p.last_name as user_name,
  ssh.phone_number,
  ssh.message_content,
  ssh.status,
  ssh.twilio_sid,
  ssh.error_message
FROM sms_send_history ssh
INNER JOIN profiles p ON p.id = ssh.user_id
WHERE ssh.user_id = (
  SELECT id FROM profiles WHERE first_name = 'Alice' AND last_name = 'Ruiz'
)
ORDER BY ssh.sent_at DESC
LIMIT 5;
```

**Resultado esperado:**
```
sent_at: 2025-11-21 [hora reciente]
user_name: Alice Ruiz
phone_number: +1234567890
message_content: "📋 Order #12345 status changed to 'Completed'. View: https://mda.to/ABC12"
status: sent ✅
twilio_sid: SM[...] ✅
error_message: NULL
```

---

## 6. Verificar Detail Manager (NO debe recibir)

### Query: Verificar que Detail Manager tiene eventos deshabilitados

```sql
-- Verificar configuración del role "Detail Manager"
SELECT
  dcr.role_name,
  COUNT(rne.id) FILTER (WHERE rne.enabled = true) as events_enabled,
  COUNT(rne.id) as total_events
FROM dealer_custom_roles dcr
LEFT JOIN role_notification_events rne ON rne.role_id = dcr.id
WHERE dcr.role_name ILIKE '%detail%manager%'
GROUP BY dcr.id, dcr.role_name;
```

**Resultado esperado:**
```
role_name: Detail Manager
events_enabled: 0 ✅ (TODOS deshabilitados)
total_events: 10
```

### Test: Detail Manager NO debe recibir SMS

1. Hacer a un usuario "Detail Manager" follower de una orden
2. Cambiar status de la orden
3. Verificar logs:

```
1️⃣ LEVEL 1: Checking FOLLOWERS...
   ✅ Found 1 follower: Detail Department

2️⃣ LEVEL 2: Checking ROLE permissions...
   ❌ LEVEL 2 FAILED: Role "detail_manager" does NOT allow event "status_changed"

Total eligible users: 0
⚠️ NO ELIGIBLE USERS - Returning 0 sent
```

✅ **CORRECTO** - Detail Manager NO recibe notificaciones

---

## 7. Checklist Final

### Pre-Flight Checks:
- [ ] Edge Function status: **Active**
- [ ] Alice Ruiz: `phone_number` NOT NULL
- [ ] Alice Ruiz: `notification_sms = true`
- [ ] Alice Ruiz: es follower activo de al menos 1 orden
- [ ] Role de Alice: tiene `status_changed` enabled

### Test Results:
- [ ] Alice recibe SMS cuando cambia status de orden
- [ ] Logs muestran "✅ LEVEL 3 PASSED: User has SMS globally enabled"
- [ ] Tabla `sms_send_history` muestra `status = 'sent'`
- [ ] Detail Manager NO recibe SMS (Level 2 bloquea)

### Performance:
- [ ] Edge Function responde en < 3 segundos
- [ ] Solo 1 query a `user_preferences` (no 2 como antes)
- [ ] Logs muestran código simplificado (sin `user_sms_notification_preferences`)

---

## Troubleshooting

### Problema: Alice NO recibe SMS

**1. Verificar Edge Function logs primero:**
```
Dashboard → Edge Functions → send-order-sms-notification → Logs
```

**2. Identificar en qué nivel falla:**

- **"No followers found"** → Alice NO es follower
- **"LEVEL 2 FAILED"** → Role no tiene evento habilitado
- **"LEVEL 3 FAILED: SMS globally disabled"** → `notification_sms = false`
- **"LEVEL 3 FAILED: No user preferences"** → Falta registro en `user_preferences`

**3. Aplicar fix correspondiente:**

Ver secciones 2, 3, 4 arriba para queries de corrección.

### Problema: Edge Function da error 500

**1. Ver logs de error:**
```
Dashboard → Edge Functions → Logs → Filter by "error"
```

**2. Errores comunes:**

- **"Twilio credentials not configured"** → Falta env vars en Supabase
- **"Invalid access token format"** → JWT expirado
- **"RLS policy violation"** → Permisos de base de datos

**3. Rollback si necesario:**

```bash
# Restaurar versión anterior
cp supabase/functions/send-order-sms-notification/index.ts.backup-level3-simplification-20251121 \
   supabase/functions/send-order-sms-notification/index.ts

# Redeploy via Dashboard
```

---

## Contacto

**Si todo falla:**
1. Revisar [NOTIFICATION_LEVEL3_SIMPLIFICATION.md](./NOTIFICATION_LEVEL3_SIMPLIFICATION.md)
2. Revisar [NOTIFICATION_LEVEL2_FIX.md](./NOTIFICATION_LEVEL2_FIX.md)
3. Ejecutar diagnostic: [supabase/diagnostics/CHECK_LEVEL_2_NOTIFICATIONS.sql](./supabase/diagnostics/CHECK_LEVEL_2_NOTIFICATIONS.sql)

---

✅ **Deployment verified by:** [Your Name]
📅 **Verification date:** 2025-11-21
🎯 **Status:** Awaiting manual verification
