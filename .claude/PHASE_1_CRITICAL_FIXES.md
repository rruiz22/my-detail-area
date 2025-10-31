# PHASE 1: CRITICAL FIXES - CHECKLIST DETALLADO
## MyDetailArea Notification System

**Duración Total**: 11.25 horas (1.5 días de trabajo)
**Prioridad**: P0 🚨 CRÍTICO
**Objetivo**: Desbloquear features de producción y cerrar gaps críticos

---

## OVERVIEW

FASE 1 consiste en **5 tareas críticas** que desbloquean el sistema de notificaciones enterprise para producción:

| # | Tarea | Esfuerzo | Owner | Blocker |
|---|-------|----------|-------|---------|
| 1 | Descomentar push_subscriptions | 15 min | Frontend | Sí |
| 2 | Crear notification_delivery_log | 6h | Backend | Sí |
| 3 | Conectar NotificationPreferencesModal | 2h | Frontend | Sí |
| 4 | NotificationBell en Topbar | 1h | Frontend | No |
| 5 | Real-time subscription | 2.25h | Frontend | No |

**Resultado Final**: Push notifications 100% funcionales, tracking completo, UI conectada

---

## TASK 1: DESCOMENTAR PUSH SUBSCRIPTIONS ⚡

**Duración**: 15 minutos
**Prioridad**: P0 🚨
**Blocking**: Push notifications en producción

### Descripción

La tabla `push_subscriptions` ya existe en Supabase (creada Oct 18, 2025). El código para guardar subscriptions está escrito pero comentado. Solo necesita activarse.

### Archivo a Modificar

```
src/services/pushNotificationService.ts
```

### Líneas Exactas: 227-244

### Código Actual (ANTES)

```typescript
// src/services/pushNotificationService.ts líneas 227-269

// TODO: Uncomment when push_subscriptions table is created via migration
console.log('Would save subscription:', { userId, dealerId, subscription });

/*
const { error } = await supabase
  .from('push_subscriptions')
  .upsert({
    user_id: userId,
    dealer_id: dealerId,
    endpoint: subscription.endpoint,
    p256dh_key: subscription.keys.p256dh,
    auth_key: subscription.keys.auth,
    is_active: true,
    updated_at: new Date().toISOString()
  });

if (error) {
  console.error('Error saving push subscription:', error);
  throw error;
}
*/

return subscription;
```

### Código Corregido (DESPUÉS)

```typescript
// src/services/pushNotificationService.ts líneas 227-269

// Save subscription to database
const { error } = await supabase
  .from('push_subscriptions')
  .upsert({
    user_id: userId,
    dealer_id: dealerId,
    endpoint: subscription.endpoint,
    p256dh_key: subscription.keys.p256dh,
    auth_key: subscription.keys.auth,
    is_active: true,
    updated_at: new Date().toISOString()
  });

if (error) {
  console.error('Error saving push subscription:', error);
  throw error;
}

return subscription;
```

### Cambios a Realizar

1. **Eliminar línea 228**:
   ```typescript
   // ELIMINAR ESTA LÍNEA:
   console.log('Would save subscription:', { userId, dealerId, subscription });
   ```

2. **Eliminar comentarios multilínea** (líneas 230 y 245):
   ```typescript
   // ELIMINAR: /*
   // ELIMINAR: */
   ```

3. **Actualizar comentario** (línea 227):
   ```typescript
   // CAMBIAR: // TODO: Uncomment when push_subscriptions table is created
   // A: // Save subscription to database
   ```

### Testing Checklist

- [ ] Código descomentado sin errores de sintaxis
- [ ] TypeScript compila sin errores (`npm run typecheck`)
- [ ] Dev server recarga sin errores
- [ ] Abrir Settings → Notifications (cuando esté conectado)
- [ ] Habilitar push notifications
- [ ] Permitir permisos del navegador
- [ ] Verificar en Supabase SQL Editor:
  ```sql
  SELECT * FROM push_subscriptions
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC;
  ```
- [ ] Verificar que aparece registro con endpoint, keys, etc.
- [ ] Enviar notificación de prueba
- [ ] Verificar que llega push notification al navegador

### Success Criteria

✅ Push subscription se guarda correctamente en BD
✅ Usuario puede habilitar/deshabilitar push
✅ Múltiples dispositivos soportados (UNIQUE constraint funciona)
✅ Subscriptions antiguas se actualizan (upsert funciona)

---

## TASK 2: CREAR NOTIFICATION_DELIVERY_LOG TABLE 🗄️

**Duración**: 6 horas
**Prioridad**: P0 🚨
**Blocking**: Analytics de delivery, tracking de engagement

### Descripción

Crear tabla para tracking detallado de cada intento de entrega de notificación por cada canal. Habilita métricas de engagement (opens, clicks) y debugging de fallos.

### Subtareas

#### 2.1 Crear Migración SQL (1 hora)

**Archivo**: `supabase/migrations/20251031000001_create_notification_delivery_log.sql`

**SQL Completo**: Ver en NOTIFICATION_SYSTEM_IMPLEMENTATION_PLAN.md (Task 1.2)

**Incluye**:
- Tabla con 20+ columnas
- 6 índices para performance
- 3 RLS policies
- Comments para documentación

**Comando**:
```bash
cd C:\Users\rudyr\apps\mydetailarea
npx supabase db push
```

#### 2.2 Integrar con Enhanced Notification Engine (3 horas)

**Archivo**: `supabase/functions/enhanced-notification-engine/index.ts`

**Cambios**:
1. Crear función `logDelivery()`
2. Llamar después de cada envío por canal
3. Registrar success/failure con detalles

**Código**:
```typescript
async function logDelivery(params: DeliveryLogParams) {
  await supabase.from('notification_delivery_log').insert({
    notification_id: params.notificationId,
    queue_id: params.queueId,
    user_id: params.userId,
    dealer_id: params.dealerId,
    channel: params.channel,
    status: params.status,
    provider: params.provider,
    provider_message_id: params.providerMessageId,
    error_message: params.errorMessage,
    sent_at: new Date().toISOString()
  });
}

// Usar en cada channel handler
try {
  await sendPushNotification(data);
  await logDelivery({ ...data, channel: 'push', status: 'sent' });
} catch (error) {
  await logDelivery({ ...data, channel: 'push', status: 'failed', errorMessage: error.message });
  throw error;
}
```

#### 2.3 Crear Hook para Analytics (1 hora)

**Archivo**: `src/hooks/useNotificationDeliveryMetrics.ts`

```typescript
export function useNotificationDeliveryMetrics(dealerId: number, dateRange: DateRange) {
  return useQuery({
    queryKey: ['notification-delivery-metrics', dealerId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_notification_delivery_metrics', {
          p_dealer_id: dealerId,
          p_start_date: dateRange.start,
          p_end_date: dateRange.end
        });

      if (error) throw error;
      return data;
    }
  });
}
```

#### 2.4 Crear RPC Function para Métricas (30 min)

**Archivo**: `supabase/migrations/20251031000002_create_delivery_metrics_rpc.sql`

```sql
CREATE OR REPLACE FUNCTION get_notification_delivery_metrics(
  p_dealer_id BIGINT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  channel TEXT,
  sent_count BIGINT,
  delivered_count BIGINT,
  failed_count BIGINT,
  opened_count BIGINT,
  clicked_count BIGINT,
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  click_through_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ndl.channel,
    COUNT(*) as sent_count,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened_count,
    COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as clicked_count,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'delivered')::numeric /
      NULLIF(COUNT(*), 0) * 100, 2
    ) as delivery_rate,
    ROUND(
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL)::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status = 'delivered'), 0) * 100, 2
    ) as open_rate,
    ROUND(
      COUNT(*) FILTER (WHERE clicked_at IS NOT NULL)::numeric /
      NULLIF(COUNT(*) FILTER (WHERE opened_at IS NOT NULL), 0) * 100, 2
    ) as click_through_rate
  FROM notification_delivery_log ndl
  WHERE ndl.dealer_id = p_dealer_id
    AND ndl.created_at >= p_start_date
    AND ndl.created_at <= p_end_date
  GROUP BY ndl.channel;
END;
$$ LANGUAGE plpgsql STABLE;
```

#### 2.5 Integrar con Dashboard (30 min)

**Archivo**: `src/components/notifications/NotificationAnalyticsDashboard.tsx`

Conectar con hook y mostrar métricas en charts.

#### 2.6 Testing Completo (1 hora)

**Test Cases**:
- [ ] Enviar notificación in-app → Registro en delivery_log
- [ ] Enviar email → Registro con provider 'sendgrid'
- [ ] Enviar SMS → Registro con Twilio SID
- [ ] Enviar push → Registro con FCM token
- [ ] Simular fallo → Status 'failed' con error_message
- [ ] Verificar RPC function retorna métricas
- [ ] Dashboard muestra datos correctos

---

## TASK 3: CONECTAR NOTIFICATIONPREFERENCESMODAL 🎨

**Duración**: 2 horas
**Prioridad**: P0 🚨
**Blocking**: Users no pueden configurar preferencias

### Descripción

El componente `NotificationPreferencesModal` ya existe y está completamente implementado, pero no está accesible desde la UI. Necesita conectarse a Settings page.

### Subtareas

#### 3.1 Modificar Settings Page (45 min)

**Archivo**: `src/pages/Settings.tsx`

**Paso 1**: Importar componente
```typescript
import { NotificationPreferencesModal } from "@/components/notifications/NotificationPreferencesModal";
```

**Paso 2**: Localizar Tabs component
Buscar `<Tabs>` o `<TabsList>` en el archivo

**Paso 3**: Agregar tab de notificaciones
```typescript
<TabsList>
  <TabsTrigger value="profile">{t('settings.tabs.profile')}</TabsTrigger>
  <TabsTrigger value="notifications">{t('settings.tabs.notifications')}</TabsTrigger>
  <TabsTrigger value="security">{t('settings.tabs.security')}</TabsTrigger>
  <TabsTrigger value="preferences">{t('settings.tabs.preferences')}</TabsTrigger>
</TabsList>
```

**Paso 4**: Agregar contenido del tab
```typescript
<TabsContent value="notifications" className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>{t('settings.notifications.title')}</CardTitle>
      <CardDescription>
        {t('settings.notifications.description')}
      </CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      <NotificationPreferencesModal />
    </CardContent>
  </Card>
</TabsContent>
```

#### 3.2 Agregar Traducciones (30 min)

**Archivos**:
- `public/translations/en.json`
- `public/translations/es.json`
- `public/translations/pt-BR.json`

**Keys a agregar**:
```json
{
  "settings": {
    "tabs": {
      "notifications": "Notifications"
    },
    "notifications": {
      "title": "Notification Preferences",
      "description": "Configure how and when you receive notifications for each module",
      "save_success": "Preferences saved successfully",
      "save_error": "Failed to save preferences"
    }
  }
}
```

**ES** (español):
```json
{
  "settings": {
    "tabs": {
      "notifications": "Notificaciones"
    },
    "notifications": {
      "title": "Preferencias de Notificaciones",
      "description": "Configura cómo y cuándo recibes notificaciones para cada módulo",
      "save_success": "Preferencias guardadas exitosamente",
      "save_error": "Error al guardar preferencias"
    }
  }
}
```

**PT-BR** (portugués):
```json
{
  "settings": {
    "tabs": {
      "notifications": "Notificações"
    },
    "notifications": {
      "title": "Preferências de Notificações",
      "description": "Configure como e quando você recebe notificações para cada módulo",
      "save_success": "Preferências salvas com sucesso",
      "save_error": "Erro ao salvar preferências"
    }
  }
}
```

#### 3.3 Verificar Permisos (15 min)

Asegurar que el componente está accesible para todos los usuarios (no solo admins).

#### 3.4 Testing (30 min)

**Test Cases**:
- [ ] Tab "Notifications" visible en Settings
- [ ] Click en tab carga componente sin errores
- [ ] Preferencias actuales se cargan correctamente
- [ ] Toggle de canales funciona (in_app, email, sms, push)
- [ ] Quiet hours se pueden configurar
- [ ] Event preferences por módulo funcionan
- [ ] Botón "Save" guarda en BD
- [ ] Toast de confirmación aparece
- [ ] Refresh mantiene configuración guardada
- [ ] Traducciones funcionan (EN/ES/PT-BR)

### Checklist Completo

- [ ] Settings.tsx modificado con nuevo tab
- [ ] NotificationPreferencesModal importado
- [ ] Traducciones agregadas (3 idiomas)
- [ ] Testing manual completado
- [ ] No hay errores en console
- [ ] HMR funcionó correctamente
- [ ] Preferencias se guardan en `user_notification_preferences_universal`
- [ ] Documentation actualizada

---

## TASK 4: NOTIFICATIONBELL EN TOPBAR 🔔

**Duración**: 1 hora
**Prioridad**: P0 🚨
**Blocking**: Visibilidad de notificaciones

### Descripción

Agregar NotificationBell component al topbar/navbar para que usuarios vean notificaciones desde cualquier página.

### Subtareas

#### 4.1 Localizar Topbar Component (10 min)

**Posibles ubicaciones**:
- `src/components/layout/Topbar.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/ui/topbar.tsx`

**Buscar**: Componente que renderiza la barra superior con logo, navigation, user menu

#### 4.2 Importar y Agregar Component (20 min)

**Importaciones necesarias**:
```typescript
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAccessibleDealerships } from "@/hooks/useAccessibleDealerships";
```

**Obtener dealer context**:
```typescript
const { currentDealership } = useAccessibleDealerships();
```

**Agregar NotificationBell**:
```typescript
<div className="flex items-center gap-3">
  {/* Existing items (search, etc.) */}

  <NotificationBell dealerId={currentDealership?.id} />

  {/* User menu */}
  <UserMenu />
</div>
```

**Posicionamiento**: Entre funcionalidades de la derecha, antes del user menu.

#### 4.3 Styling y Responsive (15 min)

Asegurar que:
- Se ve bien en desktop (size apropiado)
- Se adapta a mobile (mantiene funcionalidad)
- Badge de count es visible
- Z-index correcto para dropdown

#### 4.4 Testing (15 min)

**Test Cases**:
- [ ] Bell icon visible en topbar
- [ ] Badge muestra count correcto de unread
- [ ] Click abre NotificationCenter (popover/dropdown)
- [ ] Notificaciones se muestran en lista
- [ ] Mark as read funciona
- [ ] Dismiss funciona
- [ ] Click en notificación navega a entity
- [ ] Real-time updates cambian el badge count
- [ ] Responsive en mobile
- [ ] No overlaps con otros elementos

### Checklist Completo

- [ ] Topbar component localizado
- [ ] NotificationBell agregado
- [ ] Dealer context pasado correctamente
- [ ] Styling apropiado
- [ ] Responsive funciona
- [ ] Testing manual completado
- [ ] No hay errores en console

---

## TASK 5: REAL-TIME SUBSCRIPTION 💨

**Duración**: 2.25 horas
**Prioridad**: P0 🚨
**Blocking**: Notificaciones en tiempo real

### Descripción

Habilitar Supabase Realtime subscription en `useSmartNotifications` para que nuevas notificaciones aparezcan automáticamente sin necesidad de refresh o polling.

### Subtareas

#### 5.1 Agregar Subscription (1 hora)

**Archivo**: `src/hooks/useSmartNotifications.tsx`

**Localizar**: useEffect que hace fetchNotifications

**Agregar después de fetchNotifications()**:
```typescript
// Real-time subscription for new notifications
const subscription = supabase
  .channel(`notifications-${user.id}-${dealerId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notification_log',
    filter: `user_id=eq.${user.id},dealer_id=eq.${dealerId}`
  }, (payload) => {
    console.log('🔔 New notification received via real-time:', payload.new);

    // Add to list without re-fetching
    setNotifications(prev => [payload.new as Notification, ...prev]);

    // Update unread count
    if (!payload.new.read_at) {
      setUnreadCount(prev => prev + 1);
    }

    // Play sound if enabled
    const shouldPlaySound = userPrefs?.notification_sound?.enabled ?? true;
    if (shouldPlaySound) {
      playNotificationSound(payload.new.priority);
    }

    // Show browser notification if permitted
    if (Notification.permission === 'granted') {
      showBrowserNotification(payload.new);
    }

    // Show toast for high priority
    if (['high', 'urgent', 'critical'].includes(payload.new.priority)) {
      toast({
        title: payload.new.title,
        description: payload.new.message,
        duration: payload.new.priority === 'urgent' ? 10000 : 5000
      });
    }
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'notification_log',
    filter: `user_id=eq.${user.id},dealer_id=eq.${dealerId}`
  }, (payload) => {
    console.log('🔔 Notification updated via real-time:', payload.new);

    // Update in list
    setNotifications(prev =>
      prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
    );

    // Update unread count if read status changed
    if (payload.new.read_at && !payload.old.read_at) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  })
  .subscribe();

// Cleanup on unmount
return () => {
  supabase.removeChannel(subscription);
};
```

#### 5.2 Crear Utilidad de Sonido (30 min)

**Archivo**: `src/utils/notificationUtils.ts`

```typescript
export function playNotificationSound(priority: string = 'normal') {
  try {
    const soundFile = ['urgent', 'critical'].includes(priority)
      ? '/sounds/notification-urgent.mp3'
      : '/sounds/notification.mp3';

    const audio = new Audio(soundFile);
    audio.volume = 0.5;
    audio.play().catch(err => {
      // Navegadores bloquean autoplay - ignorar silenciosamente
      console.debug('Notification sound blocked by browser:', err);
    });
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

export function showBrowserNotification(notification: any) {
  if (Notification.permission !== 'granted') return;

  try {
    const browserNotif = new Notification(notification.title, {
      body: notification.message,
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: notification.id,
      requireInteraction: ['urgent', 'critical'].includes(notification.priority),
      data: {
        url: notification.data?.action_url || '/'
      }
    });

    browserNotif.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (notification.data?.action_url) {
        window.location.href = notification.data.action_url;
      }
      browserNotif.close();
    };
  } catch (error) {
    console.warn('Could not show browser notification:', error);
  }
}
```

#### 5.3 Agregar Archivos de Audio (15 min)

**Archivos a crear**:
- `public/sounds/notification.mp3` (sonido normal)
- `public/sounds/notification-urgent.mp3` (sonido urgente)

**Opciones**:
1. Usar sonidos del sistema (simplificado)
2. Crear/descargar sonidos personalizados
3. Usar Web Audio API para generar sonido programáticamente

**Simplificado** (sin archivos):
```typescript
export function playNotificationSound(priority: string = 'normal') {
  // Usar Web Audio API
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Frecuencia según prioridad
  oscillator.frequency.value = priority === 'urgent' ? 800 : 400;
  gainNode.gain.value = 0.3;

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}
```

#### 5.4 Testing (30 min)

**Test Cases**:
- [ ] Abrir dos pestañas con mismo usuario
- [ ] En pestaña A, crear notificación (simular desde backend o usar UI)
- [ ] Verificar que aparece en pestaña B automáticamente (sin refresh)
- [ ] Verificar que badge count se actualiza en ambas pestañas
- [ ] Verificar que sonido se reproduce (si habilitado)
- [ ] Verificar browser notification aparece (si permitido)
- [ ] Marcar como leída en pestaña A
- [ ] Verificar que se actualiza en pestaña B
- [ ] Performance: Sin lag, sin memoria leaks
- [ ] Cleanup: Subscription se limpia al desmontar

### Checklist Completo

- [ ] Subscription agregada en useSmartNotifications
- [ ] INSERT event handler implementado
- [ ] UPDATE event handler implementado
- [ ] notificationUtils.ts creado con helpers
- [ ] Sonido implementado (archivos o Web Audio API)
- [ ] Testing de real-time completado
- [ ] Multi-tab testing exitoso
- [ ] No hay memory leaks
- [ ] Subscription se limpia correctamente

---

## ORDEN DE EJECUCIÓN RECOMENDADO

### Secuencia Óptima

```
1. Task 1 (15 min) → Rápido, desbloquea push
↓
2. Task 3 (2h) → Permite configurar preferencias
↓
3. Task 4 (1h) → Hace visible las notificaciones
↓
4. Task 5 (2.25h) → Notificaciones en tiempo real
↓
5. Task 2 (6h) → Analytics (puede hacerse en paralelo)
```

### Paralelización Posible

Si hay 2 developers:
- **Dev 1**: Tasks 1, 3, 4, 5 (frontend - 5.5h)
- **Dev 2**: Task 2 (backend - 6h)

**Timeline**: 1 día en paralelo

---

## SUCCESS CRITERIA - FASE 1

### Funcionalidad

- [ ] Push notifications se habilitan en Settings
- [ ] Push subscriptions se guardan en BD
- [ ] Notificaciones in-app aparecen en real-time
- [ ] NotificationBell visible y funcional
- [ ] Badge count actualiza automáticamente
- [ ] User preferences se pueden configurar
- [ ] Delivery log registra todos los envíos
- [ ] Quiet hours funciona
- [ ] Rate limiting funciona

### Performance

- [ ] Notification list carga en <500ms
- [ ] Real-time updates latencia <1s
- [ ] No memory leaks en long sessions
- [ ] Subscriptions limpian correctamente

### UX

- [ ] Diseño Notion-style consistente
- [ ] Responsive en mobile y desktop
- [ ] Traducciones completas (EN/ES/PT-BR)
- [ ] Error handling graceful
- [ ] Loading states apropiados

### Accesibilidad

- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation funciona
- [ ] Screen reader compatible
- [ ] Color contrast ratios 4.5:1+

---

## NOTAS Y ADVERTENCIAS

### ⚠️ Cuidado Con

1. **RLS Policies**: Verificar que permiten lectura/escritura apropiada
2. **Índices**: Crear antes de insertar muchos datos
3. **Rate Limits**: No exceder límites de Supabase Realtime (200 connections)
4. **Browser Permissions**: Request de Notification permission en momento apropiado
5. **Audio Autoplay**: Navegadores bloquean, necesita interacción del usuario primero

### 💡 Tips

1. **Testing Local**: Usar dos navegadores/pestañas para verificar real-time
2. **Supabase Dashboard**: Monitorear tabla notifications_log mientras se prueba
3. **DevTools Network**: Verificar WebSocket connection activa
4. **Console Logs**: Dejar temporalmente para debugging, remover en producción

---

## REFERENCIAS RÁPIDAS

### Comandos Útiles

```bash
# Aplicar migraciones
cd C:\Users\rudyr\apps\mydetailarea
npx supabase db push

# Typecheck
npm run typecheck

# Build
npm run build:dev

# Audit de traducciones
node scripts/audit-translations.cjs

# Dev server
npm run dev
```

### SQL Queries Útiles

```sql
-- Ver notificaciones recientes
SELECT id, user_id, notification_type, channel, title, status, created_at
FROM notification_log
ORDER BY created_at DESC
LIMIT 20;

-- Ver push subscriptions activas
SELECT user_id, dealer_id, is_active, created_at
FROM push_subscriptions
WHERE is_active = true;

-- Ver preferencias de usuario
SELECT module, in_app_enabled, push_enabled, email_enabled, sms_enabled
FROM user_notification_preferences_universal
WHERE user_id = 'user-id-here';

-- Métricas de delivery (cuando tabla exista)
SELECT channel, COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'delivered') as delivered
FROM notification_delivery_log
WHERE dealer_id = 1
GROUP BY channel;
```

---

**FIN DE FASE 1 CHECKLIST**

**Próximo Paso**: Comenzar con Task 1 (15 minutos para quick win)
**Última Actualización**: 2025-10-30 20:00
