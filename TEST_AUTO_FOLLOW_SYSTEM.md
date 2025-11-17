# 🧪 Test Scenarios: Auto-Follow + SMS Notification System

## 🎯 Pre-requisitos para Testing

Antes de empezar los tests, asegúrate de que:

1. ✅ Has aplicado las migraciones (`APPLY_AUTO_FOLLOW_MIGRATIONS.sql`)
2. ✅ Tienes al menos 2 usuarios con números de teléfono válidos
3. ✅ Tienes Twilio configurado (credenciales en Supabase Edge Functions)
4. ✅ Tienes al menos un custom role creado

---

## 📋 Test Suite 1: Auto-Follow Automático

### Test 1.1: Creator como Follower (SIEMPRE)

**Objetivo:** Verificar que el creador siempre se agrega como follower

**Pasos:**
1. Login como Usuario A
2. Ve a Sales Orders → Create New Order
3. Completa los campos mínimos:
   - Dealership: (selecciona uno)
   - Customer Name: "Test Customer"
   - VIN: "TEST123456789"
   - Service: (selecciona uno)
4. Click "Save"

**Resultado Esperado:**
- ✅ Orden creada exitosamente
- ✅ Abre la orden creada → Ve a la pestaña "Followers" (si existe en la UI)
- ✅ O ejecuta en Supabase SQL Editor:
  ```sql
  SELECT
    ef.user_id,
    ef.follow_type,
    ef.auto_added_reason,
    p.first_name,
    p.last_name
  FROM entity_followers ef
  JOIN profiles p ON p.id = ef.user_id
  WHERE ef.entity_id = '[ORDER_ID_AQUI]'
    AND ef.entity_type = 'order'
    AND ef.is_active = true;
  ```
- ✅ Debería mostrar Usuario A con `follow_type = 'creator'`

---

### Test 1.2: Assigned User como Follower (SIEMPRE)

**Objetivo:** Verificar que el usuario asignado se agrega como follower

**Pasos:**
1. Login como Usuario A
2. Create New Sales Order
3. En el campo "Assigned To": selecciona Usuario B
4. Completa otros campos y guarda

**Resultado Esperado:**
```sql
-- Ejecuta en Supabase:
SELECT
  ef.user_id,
  ef.follow_type,
  ef.auto_added_reason,
  p.first_name || ' ' || p.last_name as name
FROM entity_followers ef
JOIN profiles p ON p.id = ef.user_id
WHERE ef.entity_id = '[ORDER_ID]'
  AND ef.entity_type = 'order'
ORDER BY ef.follow_type;
```

**Resultado:**
- ✅ Usuario A (creador) - `follow_type = 'creator'`
- ✅ Usuario B (asignado) - `follow_type = 'assigned'`

---

### Test 1.3: Role-Based Auto-Follow (CONDICIONAL)

**Objetivo:** Verificar que usuarios con roles configurados se agregan automáticamente

**Setup:**
1. Ve a Settings → Dealers → Custom Roles
2. Selecciona o crea un rol "Sales Manager"
3. Click en el icono de campana (🔔)
4. En "Sales Orders":
   - Habilita "Order Created" con canal SMS
   - **Activa el toggle "Auto-Follow New Orders"**
5. Guarda
6. Asigna este rol a Usuario C

**Pasos del Test:**
1. Login como Usuario A
2. Create New Sales Order (NO asignes a nadie)
3. Guarda

**Resultado Esperado:**
```sql
SELECT
  ef.user_id,
  ef.follow_type,
  ef.auto_added_reason,
  p.first_name || ' ' || p.last_name as name
FROM entity_followers ef
JOIN profiles p ON p.id = ef.user_id
WHERE ef.entity_id = '[ORDER_ID]'
ORDER BY ef.follow_type;
```

**Resultado:**
- ✅ Usuario A (creador) - `follow_type = 'creator'`
- ✅ Usuario C (Sales Manager) - `follow_type = 'auto_role'`, `auto_added_reason = 'Auto-follow: Sales Manager'`

---

### Test 1.4: Multiple Roles Auto-Follow

**Objetivo:** Verificar que múltiples roles se agregan correctamente

**Setup:**
1. Crea dos roles: "Sales Manager" y "Sales Supervisor"
2. Configura ambos con auto-follow en Sales Orders
3. Asigna "Sales Manager" a Usuario C
4. Asigna "Sales Supervisor" a Usuario D

**Pasos:**
1. Create New Sales Order
2. Verifica followers

**Resultado Esperado:**
- ✅ Creador
- ✅ Usuario C (Sales Manager)
- ✅ Usuario D (Sales Supervisor)

---

## 📱 Test Suite 2: SMS Notifications

### Test 2.1: SMS en Order Created

**Setup:**
1. Usuario B tiene rol con auto-follow en Sales Orders
2. Usuario B tiene:
   - Número de teléfono configurado
   - Preferencias SMS habilitadas
   - Evento "Order Created" habilitado

**Pasos:**
1. Login como Usuario A
2. Create New Sales Order
3. Guarda

**Resultado Esperado:**
- ✅ Usuario B recibe SMS:
  ```
  ✨ New Order #SA-1234 created. Customer Name View: [link]
  ```
- ✅ Check en Supabase:
  ```sql
  SELECT * FROM sms_send_history
  WHERE entity_id = '[ORDER_ID]'
  ORDER BY sent_at DESC
  LIMIT 10;
  ```

---

### Test 2.2: SMS en Status Changed → "Completed" (✅ Debe enviar)

**Setup:**
1. Crea una orden con followers configurados para SMS
2. Orden en status "In Progress"

**Pasos:**
1. Abre la orden
2. Cambia status a "Completed"
3. Guarda

**Resultado Esperado:**
- ✅ Followers reciben SMS:
  ```
  📋 Order #SA-1234 status changed to "Completed". View: [link]
  ```
- ✅ Verifica en console del navegador (F12):
  ```
  [SMS Filter] Status changed to "completed" - proceeding with SMS notifications
  ```

---

### Test 2.3: SMS en Status Changed → "In Progress" (❌ NO debe enviar)

**Pasos:**
1. Abre una orden en status "Pending"
2. Cambia status a "In Progress"
3. Guarda

**Resultado Esperado:**
- ❌ NO se envían SMS
- ✅ Verifica en console del navegador:
  ```
  [SMS Filter] Status changed to "in_progress" - SMS only sent for "completed" status
  ```

---

### Test 2.4: SMS en Status Changed → "Cancelled" (❌ NO debe enviar)

**Pasos:**
1. Cambia status a "Cancelled"

**Resultado Esperado:**
- ❌ NO se envían SMS
- ✅ Console muestra el filtro activo

---

### Test 2.5: Verificar que el Trigger User NO recibe SMS

**Objetivo:** El usuario que activa el evento no debe recibir notificación

**Pasos:**
1. Login como Usuario A (que es follower de la orden)
2. Cambia el status de la orden a "Completed"

**Resultado Esperado:**
- ❌ Usuario A NO recibe SMS (porque él activó el cambio)
- ✅ Otros followers SÍ reciben SMS

---

## 🔧 Test Suite 3: Configuración y Preferencias

### Test 3.1: Usuario sin Auto-Follow Config NO se agrega

**Setup:**
1. Usuario E tiene un rol "Sales Rep"
2. El rol "Sales Rep" NO tiene auto-follow habilitado

**Pasos:**
1. Create New Sales Order

**Resultado Esperado:**
- ✅ Usuario E NO aparece en followers
- ✅ Solo aparecen: creador, assigned, y roles con auto-follow

---

### Test 3.2: Usuario sin Teléfono NO recibe SMS

**Setup:**
1. Usuario F es follower pero no tiene phone_number en perfil

**Pasos:**
1. Cambia status de orden a "Completed"

**Resultado Esperado:**
- ❌ Usuario F NO recibe SMS
- ✅ Log en Edge Function:
  ```
  Found 0 followers with SMS permission (filtered out users without phone)
  ```

---

### Test 3.3: Usuario con SMS Disabled NO recibe SMS

**Setup:**
1. Usuario G es follower
2. Ve a Settings → Notifications → Sales Orders
3. Deshabilita "SMS Enabled"

**Pasos:**
1. Cambia status de orden a "Completed"

**Resultado Esperado:**
- ❌ Usuario G NO recibe SMS
- ✅ Otros followers con SMS enabled SÍ reciben

---

### Test 3.4: Quiet Hours

**Setup:**
1. Usuario H tiene quiet hours: 22:00 - 08:00
2. Son las 23:00 (dentro de quiet hours)

**Pasos:**
1. Cambia status a "Completed"

**Resultado Esperado:**
- ❌ Usuario H NO recibe SMS
- ✅ Log en Edge Function:
  ```
  🌙 User [ID] is in quiet hours, skipping
  ```

---

### Test 3.5: Rate Limit

**Setup:**
1. Usuario I tiene max_sms_per_hour = 2
2. Usuario I ya recibió 2 SMS en la última hora

**Pasos:**
1. Intenta enviar un tercer SMS (cambia status de otra orden)

**Resultado Esperado:**
- ❌ Usuario I NO recibe el tercer SMS
- ✅ Log:
  ```
  ⏱️ User [ID] hit hourly limit (2/2)
  ```

---

## 🔍 Test Suite 4: Edge Cases

### Test 4.1: Orden sin Assigned User

**Pasos:**
1. Create Order sin asignar a nadie

**Resultado Esperado:**
- ✅ Creador es follower
- ✅ Roles con auto-follow son followers
- ✅ NO hay error por assigned_contact_id = null

---

### Test 4.2: Módulo sin Config de Notificaciones

**Setup:**
1. Role "Test Role" NO tiene ninguna configuración en dealer_notification_rules

**Pasos:**
1. Create Order con Usuario que tiene "Test Role"

**Resultado Esperado:**
- ✅ Usuario NO se agrega como follower
- ✅ No hay errores

---

### Test 4.3: Evento NO Habilitado en Rules

**Setup:**
1. Role tiene auto-follow pero el evento "Order Created" NO tiene canal SMS

**Pasos:**
1. Create Order

**Resultado Esperado:**
- ✅ Usuario se agrega como follower (auto-follow funciona)
- ❌ NO se envía SMS (evento no configurado)
- ✅ Log:
  ```
  Event "order_created" not configured for SMS in notification rules
  ```

---

## 📊 Verification Queries

### Ver todos los followers de una orden:

```sql
SELECT
  o.order_number,
  ef.follow_type,
  ef.auto_added_reason,
  p.first_name || ' ' || p.last_name as follower_name,
  p.phone_number,
  ef.notification_level,
  ef.is_active
FROM entity_followers ef
JOIN orders o ON o.id = ef.entity_id
JOIN profiles p ON p.id = ef.user_id
WHERE ef.entity_id = '[ORDER_ID]'
  AND ef.entity_type = 'order'
ORDER BY ef.followed_at;
```

### Ver reglas de auto-follow activas:

```sql
SELECT
  dnr.module,
  dnr.event,
  dnr.rule_name,
  dnr.auto_follow_enabled,
  dnr.recipients,
  dnr.channels,
  dnr.enabled
FROM dealer_notification_rules dnr
WHERE dnr.dealer_id = [DEALER_ID]
  AND dnr.auto_follow_enabled = true
  AND dnr.enabled = true
ORDER BY dnr.module, dnr.event;
```

### Ver historial de SMS enviados:

```sql
SELECT
  ssh.sent_at,
  ssh.module,
  ssh.event_type,
  o.order_number,
  p.first_name || ' ' || p.last_name as recipient,
  ssh.phone_number,
  ssh.status,
  ssh.message_content
FROM sms_send_history ssh
JOIN orders o ON o.id = ssh.entity_id
JOIN profiles p ON p.id = ssh.user_id
WHERE ssh.dealer_id = [DEALER_ID]
  AND ssh.sent_at > NOW() - INTERVAL '24 hours'
ORDER BY ssh.sent_at DESC
LIMIT 20;
```

---

## ✅ Checklist Completo

### Database:
- [ ] Migraciones aplicadas sin errores
- [ ] Columna `auto_follow_enabled` existe
- [ ] Trigger `auto_add_order_creator_follower` existe
- [ ] Función actualizada incluye lógica de roles

### UI Configuration:
- [ ] Modal de notificaciones muestra toggle "Auto-Follow"
- [ ] Toggle guarda correctamente en `dealer_notification_rules`
- [ ] Cambios se reflejan inmediatamente

### Auto-Follow:
- [ ] Creador siempre se agrega como follower
- [ ] Assigned user siempre se agrega como follower
- [ ] Usuarios con roles configurados se agregan
- [ ] Múltiples roles funcionan correctamente

### SMS Notifications:
- [ ] SMS se envía en "Order Created"
- [ ] SMS se envía en "Status Changed" a "Completed"
- [ ] SMS NO se envía en otros cambios de status
- [ ] SMS respeta preferencias de usuario
- [ ] SMS respeta quiet hours
- [ ] SMS respeta rate limits
- [ ] Trigger user NO recibe SMS

### Edge Cases:
- [ ] Funciona sin assigned user
- [ ] Funciona sin configuración de notificaciones
- [ ] No hay errores en logs de Supabase

---

## 🚨 Troubleshooting

Si algo falla, revisa:

1. **Logs de Supabase:**
   - Dashboard → Logs → Filter por "[AutoFollow]"

2. **Console del Navegador:**
   - F12 → Console → Filter por "SMS"

3. **Twilio Logs:**
   - Twilio Dashboard → Monitor → Logs → SMS Logs

4. **Database State:**
   - Usa los queries de verificación arriba

---

## 📝 Reportar Problemas

Si encuentras un bug, incluye:

1. Qué test estabas ejecutando
2. Resultado esperado vs resultado actual
3. Screenshots de logs (Supabase + Browser Console)
4. Query de verificación que muestra el estado actual

---

¡Buena suerte con el testing! 🚀












