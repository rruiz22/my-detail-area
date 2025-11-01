# ⚡ QUICK START: Unificación del Sistema de Notificaciones

## 🎯 Objetivo
Hacer **visible y accesible** la funcionalidad que ya existe pero está oculta, en **2-3 días de trabajo**.

---

## 📋 ACCIÓN 1: HACER ACCESIBLE EL MODAL DE PREFERENCIAS (2-3 horas)

### ✅ Paso 1.1: Actualizar SmartNotificationCenter

**Archivo:** `src/components/notifications/SmartNotificationCenter.tsx`

**Cambios:**

```tsx
// Agregar import
import { NotificationPreferencesModal } from './NotificationPreferencesModal';
import { Settings } from 'lucide-react';

// Dentro del componente, agregar state
const [preferencesOpen, setPreferencesOpen] = useState(false);

// En el CardHeader, agregar botón de settings:
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle className="flex items-center gap-2">
      <Bell className="h-5 w-5" />
      {t('notifications.title')}
      {unreadCount > 0 && (
        <Badge variant="secondary">{unreadCount}</Badge>
      )}
    </CardTitle>

    {/* AGREGAR ESTE BLOQUE */}
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setPreferencesOpen(true)}
        title={t('notifications.preferences')}
      >
        <Settings className="h-4 w-4" />
      </Button>

      {/* Resto de controles existentes */}
    </div>
  </div>
</CardHeader>

// Al final del componente, antes del closing </Card>:
{dealerId && (
  <NotificationPreferencesModal
    open={preferencesOpen}
    onOpenChange={setPreferencesOpen}
    dealerId={dealerId}
  />
)}
```

### ✅ Paso 1.2: Agregar en User Profile Popover

**Archivo:** `src/components/UserProfilePopover.tsx` o `src/components/ui/user-dropdown.tsx`

**Cambios:**

```tsx
// Agregar import
import { Bell } from 'lucide-react';
import { NotificationPreferencesModal } from '@/components/notifications/NotificationPreferencesModal';

// Agregar state
const [notifPrefsOpen, setNotifPrefsOpen] = useState(false);
const { currentDealership } = useAccessibleDealerships();

// En el DropdownMenu, agregar item:
<DropdownMenuSeparator />
<DropdownMenuItem onClick={() => setNotifPrefsOpen(true)}>
  <Bell className="mr-2 h-4 w-4" />
  <span>{t('notifications.preferences')}</span>
</DropdownMenuItem>

// Al final del componente:
{currentDealership?.id && (
  <NotificationPreferencesModal
    open={notifPrefsOpen}
    onOpenChange={setNotifPrefsOpen}
    dealerId={currentDealership.id}
  />
)}
```

**Resultado:** ✅ Los usuarios pueden ahora acceder a sus preferencias de notificaciones desde 2 lugares

---

## 📋 ACCIÓN 2: CREAR RUTA PARA ANALYTICS (1 hora)

### ✅ Paso 2.1: Agregar en Admin Routes

**Archivo:** `src/App.tsx` o tu archivo de rutas

**Cambios:**

```tsx
import { NotificationAnalyticsDashboard } from '@/components/notifications/NotificationAnalyticsDashboard';

// En las rutas de admin:
<Route
  path="/admin/notifications/analytics"
  element={
    <PrivateRoute>
      <NotificationAnalyticsDashboard dealerId={currentDealership?.id || 5} />
    </PrivateRoute>
  }
/>
```

### ✅ Paso 2.2: Agregar enlace en Sidebar (si tienes admin sidebar)

**Archivo:** `src/components/AppSidebar.tsx` o similar

**Cambios:**

```tsx
// En la sección de Admin:
{
  title: "Notifications",
  url: "/admin/notifications/analytics",
  icon: Bell,
  visible: userType === 'system_admin'
}
```

**Resultado:** ✅ Los admins pueden ver analytics de notificaciones

---

## 📋 ACCIÓN 3: POBLAR notification_log CON DATOS DE PRUEBA (30 min)

### ✅ Paso 3.1: Script SQL

**Crear archivo:** `test_data_notifications.sql`

```sql
-- Script para poblar notification_log con datos de prueba
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- Insertar notificaciones de diferentes módulos y prioridades
-- Reemplaza 'YOUR_USER_ID' con un UUID real de auth.users

-- 1. Sales Order - Normal priority
INSERT INTO notification_log (
    user_id, dealer_id, module, event,
    entity_type, entity_id,
    title, message, action_url,
    priority, target_channels,
    is_read, created_at
) VALUES (
    'YOUR_USER_ID'::uuid,
    5,
    'sales_orders',
    'order_created',
    'order',
    '12345',
    'New Sales Order Created',
    'Order #12345 has been created for customer John Doe',
    '/sales/orders/12345',
    'normal',
    '["in_app", "push"]'::jsonb,
    false,
    NOW() - INTERVAL '5 minutes'
);

-- 2. Service Order - High priority
INSERT INTO notification_log (
    user_id, dealer_id, module, event,
    entity_type, entity_id,
    title, message, action_url,
    priority, target_channels,
    is_read, created_at
) VALUES (
    'YOUR_USER_ID'::uuid,
    5,
    'service_orders',
    'status_changed',
    'order',
    '67890',
    'Service Order Completed',
    'Order #67890 has been marked as completed',
    '/service/orders/67890',
    'high',
    '["in_app", "push", "sms"]'::jsonb,
    false,
    NOW() - INTERVAL '10 minutes'
);

-- 3. Get Ready - Urgent priority
INSERT INTO notification_log (
    user_id, dealer_id, module, event,
    entity_type, entity_id,
    title, message, action_url,
    priority, target_channels,
    is_read, created_at
) VALUES (
    'YOUR_USER_ID'::uuid,
    5,
    'get_ready',
    'sla_critical',
    'vehicle',
    'B35009B',
    'SLA VIOLATION: Vehicle B35009B',
    'Vehicle B35009B has exceeded its SLA deadline',
    '/get-ready?vehicle=B35009B',
    'urgent',
    '["in_app", "push", "sms"]'::jsonb,
    false,
    NOW() - INTERVAL '2 minutes'
);

-- 4. Recon Order - High priority
INSERT INTO notification_log (
    user_id, dealer_id, module, event,
    entity_type, entity_id,
    title, message, action_url,
    priority, target_channels,
    is_read, created_at
) VALUES (
    'YOUR_USER_ID'::uuid,
    5,
    'recon_orders',
    'approval_required',
    'order',
    'R-123',
    'Approval Required',
    'Recon order R-123 requires your approval',
    '/recon/orders/R-123',
    'high',
    '["in_app", "email", "push"]'::jsonb,
    false,
    NOW() - INTERVAL '15 minutes'
);

-- 5. Chat - High priority
INSERT INTO notification_log (
    user_id, dealer_id, module, event,
    entity_type, entity_id,
    title, message, action_url,
    priority, target_channels,
    is_read, created_at
) VALUES (
    'YOUR_USER_ID'::uuid,
    5,
    'chat',
    'new_message',
    'message',
    'msg-456',
    'New Message from Jane Smith',
    'Hey, can you check order #12345?',
    '/chat/conversations/conv-123',
    'high',
    '["in_app", "push"]'::jsonb,
    false,
    NOW() - INTERVAL '1 minute'
);

-- 6. Contact - Normal priority
INSERT INTO notification_log (
    user_id, dealer_id, module, event,
    entity_type, entity_id,
    title, message, action_url,
    priority, target_channels,
    is_read, created_at
) VALUES (
    'YOUR_USER_ID'::uuid,
    5,
    'contacts',
    'new_lead',
    'contact',
    'lead-789',
    'New Lead Created',
    'New lead Michael Brown has been added',
    '/contacts/lead-789',
    'normal',
    '["in_app"]'::jsonb,
    false,
    NOW() - INTERVAL '30 minutes'
);

-- 7. System - Low priority
INSERT INTO notification_log (
    user_id, dealer_id, module, event,
    entity_type, entity_id,
    title, message, action_url,
    priority, target_channels,
    is_read, created_at
) VALUES (
    'YOUR_USER_ID'::uuid,
    5,
    'system',
    'maintenance_scheduled',
    'system',
    'maint-001',
    'Scheduled Maintenance',
    'System maintenance scheduled for tonight at 2 AM',
    '/system/maintenance',
    'low',
    '["in_app", "email"]'::jsonb,
    false,
    NOW() - INTERVAL '1 hour'
);

-- 8. Car Wash - Normal priority
INSERT INTO notification_log (
    user_id, dealer_id, module, event,
    entity_type, entity_id,
    title, message, action_url,
    priority, target_channels,
    is_read, created_at
) VALUES (
    'YOUR_USER_ID'::uuid,
    5,
    'car_wash',
    'shift_assigned',
    'order',
    'cw-555',
    'Car Wash Shift Assigned',
    'You have been assigned to car wash order CW-555',
    '/car-wash/orders/cw-555',
    'normal',
    '["in_app", "sms"]'::jsonb,
    false,
    NOW() - INTERVAL '45 minutes'
);

COMMIT;

-- Verificar que se insertaron
SELECT
    COUNT(*) as total_notifications,
    module,
    priority,
    COUNT(*) FILTER (WHERE is_read = false) as unread_count
FROM notification_log
WHERE user_id = 'YOUR_USER_ID'::uuid
GROUP BY module, priority
ORDER BY module, priority;

-- Ver las notificaciones más recientes
SELECT
    id,
    module,
    event,
    title,
    priority,
    created_at
FROM notification_log
WHERE user_id = 'YOUR_USER_ID'::uuid
ORDER BY created_at DESC
LIMIT 10;
```

### ✅ Paso 3.2: Ejecutar Script

1. Abre Supabase Dashboard → SQL Editor
2. Obtén tu user_id:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'tu-email@ejemplo.com';
   ```
3. Reemplaza `'YOUR_USER_ID'` en el script con tu UUID real
4. Ejecuta el script completo

**Resultado:** ✅ Ahora verás 8 notificaciones en el NotificationBell

---

## 📋 ACCIÓN 4: CONFIGURAR CREDENCIALES DE SERVICIOS (30 min)

### ✅ Paso 4.1: Crear .env.local (solo VAPID public key)

**Archivo:** `.env.local` (en la raíz del proyecto)

```bash
# ============================================================================
# VARIABLES DE AMBIENTE - My Detail Area
# ============================================================================
# Solo la clave PÚBLICA de VAPID va aquí (es seguro exponerla al cliente)
# Todas las credenciales PRIVADAS van en Supabase Secrets
# ============================================================================

# Push Notifications - Public Key (OK exponerla)
VITE_VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A

# ❌ NO agregues aquí credenciales privadas (Twilio, Sendgrid, SMTP)
# ✅ Ver SUPABASE_SECRETS_SETUP.md para configurar credenciales privadas
```

### ✅ Paso 4.2: Configurar Supabase Secrets

**Opción A: Via Supabase CLI (Recomendado)**

```bash
# 1. Login a Supabase
supabase login

# 2. Link al proyecto (si no lo has hecho)
supabase link --project-ref your-project-ref

# 3. Configurar secrets (TODAS las credenciales privadas)

# Push Notifications
supabase secrets set VAPID_PUBLIC_KEY="BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A"
supabase secrets set VAPID_PRIVATE_KEY="whhN1lt0K0bTF6zSIlPx4I56HSnkxkEvhWC_cDN2bPs"
supabase secrets set VAPID_SUBJECT="mailto:support@mydetailarea.com"

# SMS (Twilio) - Reemplaza con tus valores reales
supabase secrets set TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
supabase secrets set TWILIO_AUTH_TOKEN="your_auth_token"
supabase secrets set TWILIO_PHONE_NUMBER="+12345678900"

# Email (Sendgrid) - Reemplaza con tus valores reales
supabase secrets set SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
supabase secrets set EMAIL_FROM_ADDRESS="notifications@mydetailarea.com"
supabase secrets set EMAIL_FROM_NAME="My Detail Area"

# 4. Verificar
supabase secrets list
```

**Opción B: Via Dashboard**

1. Ir a: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/edge-functions
2. Tab "Secrets"
3. Agregar cada secret manualmente

**📚 Guía completa:** Ver `SUPABASE_SECRETS_SETUP.md` para:
- Cómo obtener credenciales de Twilio
- Cómo obtener API key de Sendgrid
- Configuración de SMTP alternativo
- Testing de cada servicio

### ✅ Paso 4.3: Verificar Edge Functions

```bash
# Listar funciones desplegadas
supabase functions list

# Deberías ver:
# - push-notification-sender ✓
# - send-sms ✓
# - send-email ✓
# - enhanced-notification-engine ✓
```

### ✅ Paso 4.4: Reiniciar Dev Server

```bash
# Detener servidor (Ctrl+C)
# Reiniciar:
npm run dev
```

**Resultado:** ✅ Sistema configurado con arquitectura segura (credenciales en backend)

---

## 📋 ACCIÓN 5: TESTING COMPLETO (1 hora)

### ✅ Test 1: Preferencias Modal

1. Click en NotificationBell (🔔)
2. Click en botón Settings (⚙️)
3. **Esperado:**
   - Modal se abre
   - 4 tabs visibles
   - Switches funcionan
   - Guardar funciona

### ✅ Test 2: Notificaciones Visibles

1. Refresh página
2. **Esperado:**
   - Badge muestra "8" (o número de notifs de prueba)
   - Click en bell → Lista de notificaciones
   - Filtros funcionan
   - Mark as read funciona

### ✅ Test 3: Analytics Dashboard

1. Navegar a `/admin/notifications/analytics`
2. **Esperado:**
   - Dashboard carga
   - Gráficos muestran datos
   - Filtros funcionan

### ✅ Test 4: Push Notifications

1. En Preferences Modal, ir a tab "Channels"
2. Habilitar "Push Notifications"
3. Aceptar permiso del browser
4. Click "Send Test Notification"
5. **Esperado:**
   - Push notification aparece en el sistema operativo
   - Click en notification → Navega a la app

**💡 Alternativa - Test via SQL:**
```sql
-- Test directo de Push
SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/push-notification-sender',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
        'userId', 'your-user-uuid',
        'dealerId', 5,
        'payload', jsonb_build_object(
            'title', 'Test Push',
            'body', 'Testing from Supabase!'
        )
    )
);
```

### ✅ Test 5: Real-time Updates

1. Abrir app en 2 pestañas
2. En Supabase SQL Editor, ejecutar:
   ```sql
   INSERT INTO notification_log (
     user_id, dealer_id, module, event,
     title, message, priority, target_channels
   ) VALUES (
     'YOUR_USER_ID'::uuid, 5, 'system', 'test',
     'Real-time Test', 'This should appear instantly',
     'normal', '["in_app"]'::jsonb
   );
   ```
3. **Esperado:**
   - Badge incrementa automáticamente en ambas pestañas
   - Notificación aparece sin refresh

---

## 📊 CHECKLIST DE VALIDACIÓN

```
✅ COMPONENTES:
[ ] NotificationBell visible en header
[ ] Badge muestra contador correcto
[ ] Click abre SmartNotificationCenter
[ ] Botón Settings abre modal
[ ] Modal de preferencias funcional
[ ] Analytics dashboard accesible

✅ DATOS:
[ ] notification_log tiene datos de prueba
[ ] Notificaciones aparecen en UI
[ ] Filtros funcionan correctamente
[ ] Mark as read funciona
[ ] Delete funciona

✅ PUSH:
[ ] .env.local creado con VAPID key
[ ] Service Worker registrado
[ ] Permission request funciona
[ ] Test notification se envía
[ ] Notification aparece en OS

✅ REAL-TIME:
[ ] Nuevas notificaciones aparecen sin refresh
[ ] Badge se actualiza automáticamente
[ ] Sound alerts funcionan (si habilitados)
[ ] Toast alerts para high priority

✅ NAVEGACIÓN:
[ ] Action URLs funcionan
[ ] Click en notif → Navega correctamente
[ ] Panel se cierra después de navegar
[ ] Notificación se marca como leída

✅ PREFERENCIAS:
[ ] Modal accesible desde 2 lugares
[ ] Todas las tabs funcionan
[ ] Guardar persiste cambios
[ ] Cambios se reflejan en comportamiento
```

---

## 🚀 SIGUIENTES PASOS (Post Quick Start)

### Fase 2: Integración de Módulos (1-2 semanas)

1. **Sales Orders:**
   - Agregar notificationService.send() en:
     - Crear orden
     - Asignar usuario
     - Cambiar estado
     - Due date approaching

2. **Service Orders:**
   - Similar a Sales Orders

3. **Recon Orders:**
   - Approval workflows
   - Status changes

4. **Etc...**

### Fase 3: Canales Adicionales (1 semana)

1. **SMS:**
   - Integrar Twilio
   - Crear channel handler
   - Testing

2. **Email:**
   - Integrar Sendgrid/Resend
   - Crear templates HTML
   - Testing

---

## 💡 TIPS

### Para Desarrollo:

1. **Console Logging:**
   ```tsx
   // En useSmartNotifications, agregar logs:
   console.log('[Notifications] Fetched:', notifications.length);
   console.log('[Notifications] Unread:', unreadCount);
   ```

2. **DevTools:**
   - Application → Service Workers (verificar registro)
   - Application → Storage → IndexedDB (ver cache)
   - Console → Filter "notification" (ver logs)

3. **Supabase Dashboard:**
   - Table Editor → notification_log (ver datos)
   - Logs → Realtime (ver eventos)
   - API Logs (ver queries)

### Para Debugging:

1. **Si notificaciones no aparecen:**
   - Verificar user_id en notification_log
   - Verificar dealer_id coincide
   - Check RLS policies
   - Ver console logs

2. **Si push no funciona:**
   - Verificar .env.local
   - Check service worker en DevTools
   - Ver permiso del browser
   - Logs de Edge Function

3. **Si preferencias no guardan:**
   - Verificar user_notification_preferences_universal tiene datos
   - Check console errors
   - Ver Supabase logs

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Check los reportes:**
   - `REPORTE_SISTEMA_NOTIFICACIONES_COMPLETO.md`
   - `DIAGRAMA_ARQUITECTURA_NOTIFICACIONES.md`

2. **Documentación existente:**
   - `GET_READY_NOTIFICATIONS_SYSTEM_COMPLETE.md`
   - `PUSH_NOTIFICATIONS_COMPLETE.md`
   - `NOTIFICATION_SYSTEM_README.md`

3. **Supabase Logs:**
   - Dashboard → Logs
   - Function Logs
   - Realtime Logs

---

**¡Con estos pasos, tendrás un sistema de notificaciones unificado y funcional en 2-3 días!**

**Próximo milestone:** Integrar módulos restantes (Sales, Service, Recon, etc.)
