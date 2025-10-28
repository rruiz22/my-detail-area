# 🚀 Guía Rápida: Aplicar Migraciones SMS

## Opción 1: SQL Editor (RECOMENDADO - 2 minutos)

### Paso 1: Abrir Supabase Dashboard
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto **MyDetailArea**
3. Click en **SQL Editor** en el menú lateral

### Paso 2: Ejecutar Migración Consolidada
1. Click en **New query**
2. Abre el archivo: `supabase/migrations/APPLY_ALL_SMS_MIGRATIONS.sql`
3. **Copia TODO el contenido** del archivo
4. **Pega** en el SQL Editor
5. Click en **Run** (o presiona `Ctrl + Enter`)

### Paso 3: Verificar Éxito
Deberías ver el mensaje:
```
✅ SMS Notification System migrations applied successfully!

Next steps:
1. Add phone number to user profiles
2. Configure SMS preferences in Settings
3. Deploy Edge Function: send-order-sms-notification
4. Configure Twilio credentials in Edge Function secrets
```

### Paso 4: Verificar Tablas Creadas
Ejecuta esta query en SQL Editor:
```sql
-- Verificar tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'user_sms_notification_preferences',
  'sms_send_history'
);

-- Verificar permiso nuevo
SELECT module, permission_key, display_name
FROM module_permissions
WHERE permission_key = 'receive_sms_notifications';

-- Verificar columna phone_number
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'phone_number';
```

**Resultado esperado:**
- 2 tablas: `user_sms_notification_preferences`, `sms_send_history`
- 4 permisos: uno por cada módulo (sales_orders, service_orders, recon_orders, car_wash)
- 1 columna: `phone_number` en `profiles`

---

## Opción 2: Supabase CLI (Alternativa)

### Requisitos Previos
```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
supabase login
```

### Aplicar Migraciones
```bash
# Desde la raíz del proyecto
npx supabase db push
```

---

## Opción 3: Migración por Migración (Manual)

Si prefieres aplicar una a la vez:

### 1. Add phone_number to profiles
```bash
# Ejecutar en SQL Editor:
cat supabase/migrations/20251028180000_add_phone_to_profiles.sql
```

### 2. Create user_sms_notification_preferences
```bash
# Ejecutar en SQL Editor:
cat supabase/migrations/20251028180001_create_user_sms_notification_preferences.sql
```

### 3. Create sms_send_history
```bash
# Ejecutar en SQL Editor:
cat supabase/migrations/20251028180002_create_sms_send_history.sql
```

### 4. Add SMS permission
```bash
# Ejecutar en SQL Editor:
cat supabase/migrations/20251028180003_add_sms_notification_permission.sql
```

---

## 🧪 Testing Post-Migración

### Test 1: Insertar Preferencias de Prueba
```sql
-- Reemplaza 'tu-user-id' con tu UUID de profiles
INSERT INTO user_sms_notification_preferences (
  user_id,
  dealer_id,
  module,
  sms_enabled,
  phone_number,
  event_preferences
) VALUES (
  'tu-user-id',  -- ← CAMBIAR POR TU USER ID
  1,             -- ← CAMBIAR POR TU DEALER ID
  'sales_orders',
  true,
  '+15551234567', -- ← CAMBIAR POR TU TELÉFONO
  '{
    "order_assigned": true,
    "status_changed": {
      "enabled": true,
      "statuses": ["in_progress", "completed"]
    },
    "due_date_approaching": {
      "enabled": true,
      "minutes_before": 30
    },
    "overdue": true
  }'::jsonb
);
```

### Test 2: Verificar Preferencias
```sql
SELECT
  p.email,
  usn.module,
  usn.sms_enabled,
  usn.phone_number,
  usn.max_sms_per_hour,
  usn.max_sms_per_day
FROM user_sms_notification_preferences usn
JOIN profiles p ON p.id = usn.user_id
WHERE usn.sms_enabled = true;
```

### Test 3: Verificar Permisos en Rol
```sql
-- Ver qué roles tienen el permiso de SMS
SELECT
  dcr.role_name,
  dcr.display_name,
  mp.module,
  mp.permission_key
FROM dealer_custom_roles dcr
JOIN role_module_permissions_new rmp ON dcr.id = rmp.role_id
JOIN module_permissions mp ON rmp.permission_id = mp.id
WHERE mp.permission_key = 'receive_sms_notifications'
ORDER BY dcr.role_name, mp.module;
```

---

## ⚠️ Troubleshooting

### Error: "column phone_number already exists"
**Solución:** La columna ya existe. Continúa con las siguientes migraciones.

### Error: "relation user_sms_notification_preferences already exists"
**Solución:** La tabla ya existe. Continúa con las siguientes migraciones.

### Error: "permission denied for table profiles"
**Solución:** Asegúrate de estar usando el **service_role key** o ejecuta desde el SQL Editor del Dashboard (que tiene permisos completos).

### Error: "duplicate key value violates unique constraint"
**Solución:** Ya hay permisos creados. Esto es normal si re-ejecutas la migración.

---

## 📋 Checklist Final

Después de aplicar las migraciones, verifica:

- [ ] ✅ Tabla `user_sms_notification_preferences` existe
- [ ] ✅ Tabla `sms_send_history` existe
- [ ] ✅ Vista `sms_analytics` existe
- [ ] ✅ Columna `profiles.phone_number` existe
- [ ] ✅ 4 permisos `receive_sms_notifications` existen (uno por módulo)
- [ ] ✅ Índices creados correctamente
- [ ] ✅ RLS policies activadas

---

## 🎯 Siguientes Pasos

### 1. Configurar Twilio (2 minutos)
Ve a Supabase Dashboard → Project Settings → Edge Functions → Secrets

Agrega:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

### 2. Deploy Edge Function (1 minuto)
```bash
npx supabase functions deploy send-order-sms-notification
```

### 3. Probar con curl (30 segundos)
```bash
curl -X POST \
  'https://tu-proyecto.supabase.co/functions/v1/send-order-sms-notification' \
  -H 'Authorization: Bearer tu-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "test-123",
    "dealerId": 1,
    "module": "sales_orders",
    "eventType": "status_changed",
    "eventData": {
      "orderNumber": "SO-TEST",
      "newStatus": "in_progress"
    }
  }'
```

### 4. Actualizar tu Perfil (30 segundos)
```sql
-- Agregar tu número de teléfono
UPDATE profiles
SET phone_number = '+15551234567'  -- TU NÚMERO AQUÍ
WHERE email = 'tu-email@example.com';
```

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs de la Edge Function: `npx supabase functions logs`
2. Verifica que Twilio esté configurado correctamente
3. Confirma que tu usuario tiene el permiso `receive_sms_notifications`

¡Listo para enviar SMS! 🎉
