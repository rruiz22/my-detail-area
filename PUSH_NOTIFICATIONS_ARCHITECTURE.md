# 📱 Arquitectura Completa de Push Notifications

**Para**: rruiz@lima.llc
**Fecha**: 2025-12-03

---

## 🎯 Pregunta: ¿Cómo funciona todo el sistema?

### 1️⃣ **¿Cómo los usuarios obtienen sus tokens FCM?**

**Respuesta corta**: **Automático al cargar la app** ✨

#### **Flujo de Registro de Token (Automático)**

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Usuario abre la app (http://localhost:8080)                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. App.tsx renderiza → FirebaseMessagingProvider montado       │
│    (línea 316-346 en src/App.tsx)                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. FirebaseMessagingProvider llama useFirebaseMessaging()      │
│    (src/hooks/useFirebaseMessaging.ts)                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. useFirebaseMessaging verifica:                              │
│    - ¿Notificaciones soportadas? (línea 117)                   │
│    - ¿Permisos ya otorgados? (línea 239-248)                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│ Permisos NO  │          │ Permisos SÍ  │
│ otorgados    │          │ otorgados    │
└──────┬───────┘          └──────┬───────┘
       │                         │
       ▼                         ▼
┌──────────────┐          ┌──────────────┐
│ Espera a que │          │ Auto-registra│
│ usuario haga │          │ token FCM    │
│ clic "Allow" │          │ (línea 246)  │
└──────┬───────┘          └──────┬───────┘
       │                         │
       └────────────┬────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. requestNotificationPermission() (src/lib/firebase.ts:54)    │
│    - Registra Service Worker (/firebase-messaging-sw.js)       │
│    - Obtiene token FCM de Firebase                             │
│    - Token ejemplo: "dc_GMMROOiZxfKM-cfBrW9:APA91bE67J_p..."   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. saveTokenToDatabase() (useFirebaseMessaging.ts:64-111)      │
│    - Busca dealership_id del user (tabla profiles)             │
│    - UPSERT en tabla fcm_tokens:                               │
│      {                                                          │
│        user_id: "122c8d5b...",                                  │
│        dealer_id: 5,                                            │
│        fcm_token: "dc_GMMROOiZ...",                             │
│        is_active: true                                          │
│      }                                                          │
│    - UPSERT previene duplicados (onConflict constraint)        │
└─────────────────────────────────────────────────────────────────┘
```

#### **Tabla: fcm_tokens (Supabase)**

```sql
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  dealer_id INTEGER REFERENCES dealerships(id),
  fcm_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint único: 1 token por user/dealer/device
  UNIQUE(user_id, dealer_id, fcm_token)
);
```

#### **¿Cuándo se registra el token?**

✅ **Automáticamente en estos casos**:
1. **Primera vez**: Usuario abre app y da permiso "Allow"
2. **Cada recarga**: Si permisos ya otorgados, auto-registra (línea 238-248)
3. **Refresh manual**: Si usuario revoca y vuelve a dar permisos

❌ **NO se registra si**:
1. Usuario bloquea notificaciones ("Block")
2. Navegador no soporta notificaciones (Safari < 16, Firefox < 44)
3. Usuario está en modo incógnito (algunos navegadores)

---

### 2️⃣ **¿Dónde está la interfaz para configurar eventos?**

**Respuesta**: Sistema de **"Followers"** (Seguidores de Órdenes) 👥

#### **UI Componentes**

```typescript
// 📍 Ubicación: src/components/followers/UniversalFollowButton.tsx

<UniversalFollowButton
  entityType="order"
  entityId={orderId}
  dealerId={dealerId}
  variant="default"
  showCount={true}
  showFollowers={true}
/>
```

#### **¿Dónde se usa?**

Los usuarios ven el botón **"Follow"** en:

1. **Modales de órdenes** (Sales, Service, Recon, CarWash)
   - Botón en el header del modal
   - Dropdown para configurar nivel de notificación

2. **Vista de detalle de órdenes**
   - Sidebar con lista de followers
   - Avatar stack mostrando quién sigue la orden

3. **Cards de órdenes** (opcional)
   - Icono compacto de follow

#### **Niveles de Notificación**

Cuando un usuario hace "Follow", puede elegir:

| Nivel | Descripción | Eventos que Recibe |
|-------|-------------|-------------------|
| **all** | Todas las notificaciones | • Status changes<br>• New comments<br>• File uploads<br>• Assignments |
| **important** | Solo notificaciones importantes | • Status changes<br>• Assignments<br>• Urgencias |
| **none** | Sin notificaciones | ❌ No recibe notificaciones (pero sigue siendo follower) |

```typescript
// Cambiar nivel de notificación
<DropdownMenu>
  <DropdownMenuItem onClick={() => updateNotificationLevel('all')}>
    <Bell /> All notifications
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => updateNotificationLevel('important')}>
    <Settings /> Important only
  </DropdownMenuItem>
  <DropdownMenuItem onClick={() => updateNotificationLevel('none')}>
    <BellOff /> No notifications
  </DropdownMenuItem>
</DropdownMenu>
```

#### **Tabla: entity_followers (Supabase)**

```sql
CREATE TABLE entity_followers (
  id UUID PRIMARY KEY,
  entity_type TEXT NOT NULL,          -- 'order', 'contact', 'vehicle'
  entity_id TEXT NOT NULL,            -- Order ID, Contact ID, etc.
  user_id UUID REFERENCES profiles(id),
  dealer_id INTEGER REFERENCES dealerships(id),
  follow_type TEXT DEFAULT 'manual',  -- 'manual' | 'auto' | 'assigned'
  notification_level TEXT DEFAULT 'all', -- 'all' | 'important' | 'none'
  is_active BOOLEAN DEFAULT true,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  followed_by UUID REFERENCES profiles(id),

  UNIQUE(entity_type, entity_id, user_id, dealer_id)
);
```

---

### 3️⃣ **¿Cómo funciona el flujo completo?**

#### **Flujo End-to-End: Cambio de Status → Notificación**

```
┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: Usuario cambia status de orden                         │
│ ────────────────────────────────────────────────────────────    │
│ • bosdetail abre orden SA-365                                   │
│ • Cambia status: "Pending" → "In Progress"                     │
│ • Click en botón "Save" o dropdown de status                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: useStatusPermissions.updateOrderStatus()               │
│ ────────────────────────────────────────────────────────────    │
│ • Archivo: src/hooks/useStatusPermissions.tsx:91-330           │
│ • Verifica permisos del usuario                                 │
│ • UPDATE en tabla orders (línea 107-113):                      │
│   UPDATE orders SET status = 'in_progress' WHERE id = 'xxx'    │
│ • Obtiene datos de la orden (order_number, stock, vehicle)     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: pushNotificationHelper.notifyOrderStatusChange()       │
│ ────────────────────────────────────────────────────────────    │
│ • Archivo: src/services/pushNotificationHelper.ts:417-443      │
│ • Formatea el mensaje:                                          │
│   - Title: "Order SA-365 Status Updated"                       │
│   - Body: "Detail Department changed status to In Progress"    │
│   - URL: "/orders/c9efefa2-34e4-4258-a51b-c55de36cbf50"        │
│ • Llama a notifyOrderFollowers() (línea 208-297)               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 4: Query followers de la orden                            │
│ ────────────────────────────────────────────────────────────    │
│ • Query SQL (línea 228-244):                                    │
│   SELECT user_id, notification_level, dealer_id                │
│   FROM entity_followers                                         │
│   WHERE entity_type = 'order'                                   │
│     AND entity_id = 'c9efefa2-34e4-4258-a51b-c55de36cbf50'     │
│     AND is_active = true                                        │
│     AND notification_level != 'none'                            │
│     AND user_id != 'bosdetail-uuid'  ← Auto-exclusión          │
│                                                                  │
│ • Resultado ejemplo:                                            │
│   [{ user_id: 'rruiz-uuid', notification_level: 'all', ... }]  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 5: Enviar notificación a cada follower                    │
│ ────────────────────────────────────────────────────────────    │
│ • Loop por cada follower (línea 259-289)                       │
│ • Para rruiz:                                                   │
│   await sendNotification({                                      │
│     userId: 'rruiz-uuid',                                       │
│     dealerId: 5,                                                │
│     title: 'Order SA-365 Status Updated',                      │
│     body: 'Detail Department changed status to In Progress',   │
│     url: '/orders/c9efefa2-34e4-4258-a51b-c55de36cbf50'        │
│   })                                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 6: Edge Function - send-notification                      │
│ ────────────────────────────────────────────────────────────    │
│ • Archivo: supabase/functions/send-notification/index.ts       │
│ • Query tokens FCM de rruiz (línea 471-476):                   │
│   SELECT fcm_token FROM fcm_tokens                              │
│   WHERE user_id = 'rruiz-uuid'                                  │
│     AND dealer_id = 5                                           │
│     AND is_active = true                                        │
│                                                                  │
│ • Resultado: ["dc_GMMROOiZxfKM-cfBrW9:APA91bE67J_p..."]        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 7: Llamada a Firebase Cloud Messaging API v1              │
│ ────────────────────────────────────────────────────────────    │
│ • OAuth2 token generation (línea 91-203)                       │
│ • POST a FCM API (línea 322-332):                              │
│   POST https://fcm.googleapis.com/v1/projects/                 │
│        my-detail-area/messages:send                             │
│   Headers: {                                                    │
│     Authorization: "Bearer {oauth2_token}",                     │
│     Content-Type: "application/json"                            │
│   }                                                             │
│   Body: {                                                       │
│     message: {                                                  │
│       token: "dc_GMMROOiZ...",                                  │
│       notification: {                                           │
│         title: "Order SA-365 Status Updated",                  │
│         body: "Detail Department changed..."                   │
│       },                                                        │
│       data: { url: "/orders/..." },                            │
│       webpush: { fcm_options: { link: "/orders/..." } }        │
│     }                                                           │
│   }                                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 8: Firebase envía push a dispositivo de rruiz             │
│ ────────────────────────────────────────────────────────────    │
│ • Firebase Cloud Messaging procesa el request                   │
│ • Usa el token FCM para identificar el dispositivo              │
│ • Envía push notification a través de:                          │
│   - Windows Notification Service (WNS) para Edge/Chrome Windows│
│   - Apple Push Notification Service (APNS) para Safari         │
│   - Google Cloud Messaging (GCM) para Android Chrome           │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│ App ABIERTA  │          │ App CERRADA  │
│ (Foreground) │          │ (Background) │
└──────┬───────┘          └──────┬───────┘
       │                         │
       ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│ onForegroundMessage  │  │ Service Worker       │
│ (firebase.ts:100)    │  │ onBackgroundMessage  │
│                      │  │ (sw.js:36-68)        │
│ • Recibe payload     │  │                      │
│ • Muestra toast UI   │  │ • Recibe payload     │
│   shadcn/ui          │  │ • Llama showNotif()  │
│                      │  │ • OS banner + sound  │
└──────────────────────┘  └──────────────────────┘
```

---

## 🔑 **Conceptos Clave**

### **1. Sistema de Followers (Quién recibe qué)**

```typescript
// Usuarios se vuelven followers de 3 formas:

// 1️⃣ MANUAL: Click en botón "Follow"
await followEntity('all'); // notification_level = 'all'

// 2️⃣ AUTO: Cuando crean una orden
// (El creador automáticamente se vuelve follower)
INSERT INTO entity_followers (
  entity_type = 'order',
  entity_id = '123',
  user_id = 'creator-uuid',
  follow_type = 'auto',
  notification_level = 'all'
)

// 3️⃣ ASIGNACIÓN: Cuando son asignados a una orden
// (Usuario asignado se vuelve follower automáticamente)
```

### **2. Auto-exclusión (No te notificas a ti mismo)**

```typescript
// En pushNotificationHelper.ts:241-244
if (options?.triggeredBy) {
  query = query.neq('user_id', options.triggeredBy);
}

// En useStatusPermissions.tsx:216
triggeredBy: enhancedUser.id  // Usuario que hizo el cambio
```

**Ejemplo**:
- bosdetail cambia status → triggeredBy = "bosdetail-uuid"
- Query filtra: `WHERE user_id != 'bosdetail-uuid'`
- Resultado: bosdetail NO recibe notificación de su propio cambio ✅

### **3. Multi-dispositivo**

Un usuario puede tener múltiples tokens FCM:

```sql
SELECT * FROM fcm_tokens WHERE user_id = 'rruiz-uuid';

-- Resultado:
-- | fcm_token                 | device            |
-- |---------------------------|-------------------|
-- | dc_GMMROOiZ...           | Laptop Edge       |
-- | eA7_XY9mNp...            | Phone Chrome      |
-- | fK2_ZW8qQr...            | Tablet Firefox    |
```

**Edge Function envía a TODOS los tokens activos**:
```typescript
// supabase/functions/send-notification/index.ts:499-503
const results = await Promise.allSettled(
  tokens.map((tokenRecord) =>
    sendFCMNotificationV1(tokenRecord.fcm_token, title, body, ...)
  )
);
```

Resultado: Usuario recibe notificación en TODOS sus dispositivos 📱💻🖥️

---

## 🎨 **Ejemplo de UI Real**

### **En el modal de una orden**:

```typescript
// src/components/orders/UnifiedOrderDetailModal.tsx

<DialogContent>
  <DialogHeader>
    <div className="flex items-center justify-between">
      <DialogTitle>Order SA-365</DialogTitle>

      {/* 👇 Botón de Follow con dropdown */}
      <UniversalFollowButton
        entityType="order"
        entityId={orderId}
        dealerId={dealerId}
        variant="default"
        showFollowers={true}
      />
    </div>
  </DialogHeader>

  {/* Contenido de la orden... */}

  {/* 👇 Sidebar con followers */}
  <aside>
    <FollowersAvatarStack
      followers={followers}
      maxDisplay={5}
    />
    {/* Muestra avatares de los 5 primeros followers */}
  </aside>
</DialogContent>
```

**Vista del usuario**:
```
┌─────────────────────────────────────────────────┐
│ Order SA-365                    [Follow ▼]      │ ← Dropdown
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ ⚙️ All notifications            ✓           │ │ ← Seleccionado
│ │ 📢 Important only                           │ │
│ │ 🔕 No notifications                         │ │
│ │ ──────────────────────────────────────────  │ │
│ │ ❌ Unfollow                                 │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ Followers (3):                                   │
│ [👤][👤][👤] +0 more                            │ ← Avatar stack
│                                                  │
│ Vehicle: 2023 BMW X5                            │
│ Status: In Progress                              │
│ ...                                              │
└─────────────────────────────────────────────────┘
```

---

## 📊 **Resumen de Tablas Involucradas**

### **1. fcm_tokens** - Tokens de dispositivos
```sql
user_id | dealer_id | fcm_token          | is_active
--------+-----------+--------------------+-----------
rruiz   | 5         | dc_GMMROOiZ...     | true
bosdet  | 5         | eA7_XY9mNp...      | true
```

### **2. entity_followers** - Quién sigue qué
```sql
entity_type | entity_id | user_id | notification_level
------------+-----------+---------+-------------------
order       | SA-365    | rruiz   | all
order       | SA-365    | jdoe    | important
order       | SA-366    | rruiz   | all
```

### **3. orders** - Órdenes (con status)
```sql
id      | order_number | status      | assigned_to
--------+--------------+-------------+-------------
abc123  | SA-365       | in_progress | bosdetail
```

### **4. notification_delivery_log** - Log de envíos
```sql
notification_id | user_id | channel | status | sent_at
----------------+---------+---------+--------+--------------------
uuid-1          | rruiz   | push    | sent   | 2025-12-03 19:45:00
```

---

## 🚀 **Próximos Pasos (Futuro)**

### **Configuración Avanzada de Eventos**

Actualmente no hay UI para configurar **qué eventos** específicos disparan notificaciones (siempre es "status change"). En el futuro podrías agregar:

```typescript
// Tabla: user_notification_preferences (futuro)
CREATE TABLE user_notification_preferences (
  user_id UUID,
  dealer_id INTEGER,
  event_type TEXT, -- 'status_change', 'new_comment', 'file_upload'
  enabled BOOLEAN DEFAULT true,
  notification_channels TEXT[], -- ['push', 'email', 'sms']

  PRIMARY KEY(user_id, dealer_id, event_type)
);

// Ejemplo de registros:
user_id | event_type    | enabled | channels
--------+---------------+---------+------------------
rruiz   | status_change | true    | [push, email]
rruiz   | new_comment   | true    | [push]
rruiz   | file_upload   | false   | []
```

**UI de Configuración** (Settings → Notifications):
```
┌─────────────────────────────────────────┐
│ Notification Preferences                │
│                                          │
│ ☑ Order status changes     [Push][Email]│
│ ☑ New comments             [Push]       │
│ ☐ File uploads                          │
│ ☑ Assignments              [Push][SMS]  │
│                                          │
│ [Save Preferences]                      │
└─────────────────────────────────────────┘
```

---

## ✅ **Conclusión**

### **¿Cómo funciona?**
1. **Tokens**: Auto-registro al cargar app (FirebaseMessagingProvider)
2. **Eventos**: Sistema de followers (UniversalFollowButton)
3. **Envío**: Edge Function → FCM API → Service Worker → OS notification

### **¿Dónde configurar?**
- **Follow/Unfollow**: Botón en modales de órdenes
- **Notification level**: Dropdown (all/important/none)
- **Ver followers**: Avatar stack en sidebar

### **¿Qué falta?**
- ✅ **Implementado**: Sistema básico funciona 100%
- ✅ **Completado (2025-12-04)**: Dealer-configurable push notifications con quiet hours

---

## 🔧 Dealer-Configurable Push Notifications (Diciembre 2025)

**Implementado**: 2025-12-04
**Fases**: 1-7 (Base de datos → Documentación)

### **📋 Resumen de la Implementación**

Sistema de 5 capas de validación que permite:
- **Dealers**: Configurar qué eventos envían notificaciones
- **Usuarios**: Personalizar sound, vibración, background, quiet hours
- **Sistema**: Fail-safe defaults (permite notificaciones si validación falla)

### **🎯 Nuevas Características**

#### 1. Configuración por Dealer (Settings → Push Notifications)

**Acceso**: Solo `dealer_admin` y `system_admin`

**Módulos configurables**:
- Sales Orders (13 eventos)
- Service Orders (9 eventos)
- Recon Orders (9 eventos)
- Car Wash (9 eventos)
- Get Ready (13 eventos)

**Eventos típicos**:
- `order_created`, `order_status_changed`, `order_completed`
- `order_deleted`, `order_assigned`
- `comment_added`, `file_uploaded`
- `follower_added`, `user_mentioned`
- Y eventos específicos por módulo

**UI**: `src/components/settings/PushNotificationSettings.tsx`

#### 2. Preferencias de Usuario (Profile → Notifications)

**Acceso**: Todos los usuarios

**Configuraciones**:
- **Push Enabled**: Toggle global (desactiva TODAS las notificaciones)
- **Allow Background**: Notificaciones persistentes (require interaction)
- **Allow Sound**: Habilita/deshabilita sonido
- **Allow Vibration**: Habilita/deshabilita vibración
- **Quiet Hours**: Bloquea notificaciones en horario especificado
  - Soporta rangos normales: 08:00 - 22:00
  - Soporta midnight-spanning: 22:00 - 08:00

**UI**: `src/components/profile/ProfileNotificationPreferences.tsx`

### **🗄️ Nuevas Tablas de Base de Datos**

#### `dealer_push_notification_preferences`

```sql
CREATE TABLE dealer_push_notification_preferences (
  id UUID PRIMARY KEY,
  dealer_id INTEGER REFERENCES dealerships(id),
  module VARCHAR(50),        -- 'sales_orders', 'service_orders', etc.
  event_type VARCHAR(50),    -- 'order_created', 'comment_added', etc.
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE(dealer_id, module, event_type)
);
```

**RLS Policies**: Solo `dealer_admin` y `system_admin`

#### `user_push_notification_preferences`

```sql
CREATE TABLE user_push_notification_preferences (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  push_enabled BOOLEAN DEFAULT true,
  allow_background BOOLEAN DEFAULT true,
  allow_sound BOOLEAN DEFAULT true,
  allow_vibration BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id)
);
```

**RLS Policies**: Usuarios pueden ver/modificar sus propias preferencias

#### `fcm_tokens` (Enhanced)

Nuevas columnas de metadata:
- `device_name VARCHAR(255)`
- `browser VARCHAR(100)`
- `browser_version VARCHAR(50)`
- `os VARCHAR(100)`
- `os_version VARCHAR(50)`
- `user_agent TEXT`
- `last_used_at TIMESTAMPTZ`

### **⚙️ Funciones RPC Nuevas**

#### `is_push_enabled_for_event(user_id, dealer_id, module, event_type)`

Valida si una notificación debe enviarse basado en:
1. Configuración de dealer
2. Preferencias de usuario (push_enabled)

**Returns**: `BOOLEAN`

**Default behavior**: Si no hay configuración, retorna `TRUE` (allow)

```sql
-- Ejemplo de uso
SELECT is_push_enabled_for_event(
  '122c8d5b-e5f5-4782-a179-544acbaaceb9'::UUID,
  5,
  'sales_orders',
  'comment_added'
);
```

#### `get_user_push_devices(user_id, dealer_id)`

Obtiene todos los FCM tokens activos del usuario.

**Returns**: `TABLE(fcm_token TEXT, device_info JSONB)`

#### `deactivate_fcm_token(token TEXT)`

Marca un FCM token como inactivo.

**Usage**: Al hacer logout o unregister de notificaciones.

### **🔄 Flujo de Validación (5 Capas)**

#### **Nueva Arquitectura de Validación**

```
Notification Trigger (Comment, Status Change, etc.)
       │
       ↓
┌──────────────────────────────────────────────────┐
│ Layer 1: Dealer Config (Database RPC)           │
│ ✓ is_push_enabled_for_event()                   │
│   - Dealer disabled this event? → BLOCK         │
│   - No config? → ALLOW (default)                │
└──────────────┬───────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────┐
│ Layer 2: User Global Toggle (Database RPC)      │
│ ✓ user_push_notification_preferences             │
│   - push_enabled = false? → BLOCK               │
│   - No preferences? → ALLOW (default)           │
└──────────────┬───────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────┐
│ Layer 3: Active FCM Token (Database Query)      │
│ ✓ fcm_tokens WHERE is_active = true             │
│   - No tokens? → BLOCK (cannot send)            │
│   - Has tokens? → PROCEED                       │
└──────────────┬───────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────┐
│ Layer 4: Quiet Hours (Client-side check)        │
│ ✓ pushNotificationHelper early exit             │
│   - In quiet hours? → SKIP (optimization)       │
│   - Not in quiet hours? → PROCEED               │
└──────────────┬───────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────┐
│ Layer 5: Edge Function (Authoritative)          │
│ send-notification Edge Function:                │
│  1. Fetch user preferences                       │
│  2. Check quiet hours (midnight-spanning logic)  │
│     - In quiet hours? → BLOCK (200 response)    │
│  3. Apply preferences to FCM payload:            │
│     - silent: !allow_sound                       │
│     - requireInteraction: allow_background       │
│     - vibrate: allow_vibration ? [200,100,200]:0│
│  4. Send to FCM API v1                           │
└──────────────┬───────────────────────────────────┘
               │
               ↓
          ✅ FCM → Device
```

### **🔥 Edge Function Updates**

**Archivo**: `supabase/functions/send-notification/index.ts` (v30)

**Nuevas características**:

1. **getUserPreferences(userId)**:
   - Fetch de `user_push_notification_preferences`
   - Fail-safe: retorna `null` si no hay preferencias

2. **isInQuietHours(preferences)**:
   - Validación de quiet hours con lógica midnight-spanning
   - Soporta rangos como 22:00-08:00 (cruza medianoche)
   - Fail-safe: retorna `false` si check falla

3. **sendFCMNotificationV1(token, ..., preferences)**:
   - Aplica preferencias de usuario al payload FCM:
     - `silent: !allow_sound`
     - `requireInteraction: allow_background`
     - `vibrate: allow_vibration ? [200, 100, 200] : [0]`
   - Logging de preferencias aplicadas

4. **Main handler validation**:
   - Fetch de preferencias antes de enviar
   - Check de quiet hours con early return
   - Parallel send a todos los tokens con preferencias

### **🧪 Suite de Tests**

**Archivo**: `PUSH_NOTIFICATION_TESTS.sql`

**Tests incluidos**:
1. Dealer Configuration Tests
2. User Toggle Tests
3. Validation Cascade Tests
4. Quiet Hours Tests
5. Multiple Devices Tests
6. Edge Function Logs Validation

**Uso**:
```sql
-- Cambiar IDs de test
-- Ejecutar secciones manualmente
-- Validar resultados esperados
```

### **📖 Documentación**

#### Nuevos Documentos

1. **PUSH_NOTIFICATION_DEALER_CONFIG.md** (27KB)
   - Guía completa de configuración
   - Access requirements
   - Event types por módulo
   - Troubleshooting guide
   - Database schema reference

2. **PUSH_NOTIFICATION_TESTS.sql**
   - Suite de tests manuales SQL
   - Setup, tests, cleanup
   - Health checks

### **🎨 Componentes UI**

#### Settings UI
- **Archivo**: `src/components/settings/PushNotificationSettings.tsx`
- **Funcionalidad**: Grid de módulos y eventos con toggles
- **Permisos**: Solo `dealer_admin` y `system_admin`
- **State**: TanStack Query + optimistic updates

#### Profile UI
- **Archivo**: `src/components/profile/ProfileNotificationPreferences.tsx`
- **Funcionalidad**: Preferencias personales (sound, vibration, quiet hours)
- **Acceso**: Todos los usuarios
- **Validaciones**: Quiet hours con time pickers

### **⚡ Service Layer Updates**

**Archivo**: `src/services/pushNotificationHelper.ts`

**Métodos actualizados**:

1. `notifyNewComment(orderId, orderNumber, commenterName, commentText, module?, eventType?)`
2. `notifyNewAttachment(orderId, orderNumber, uploaderName, fileName, module?, eventType?)`
3. `notifyOrderAssignment(userId, dealerId, orderId, orderNumber, assignedBy, module?, eventType?)`

**Backward compatibility**: Parámetros `module` y `eventType` son opcionales

**Validación**:
- Si `module` y `eventType` provistos → Valida con `isEnabledForUser()`
- Si no provistos → Legacy mode (envía sin validación adicional)

### **📊 Estado Actual (2025-12-04)**

**Base de Datos**:
- ✅ 192 configuraciones de dealer activas
- ✅ 0 preferencias de usuario (todos usan defaults)
- ✅ 1 FCM token activo
- ✅ 496 logs de Edge Function en últimos 7 días

**Tests**:
- ✅ RPC function `is_push_enabled_for_event()` funciona correctamente
- ✅ Estructura de `fcm_tokens` validada con metadata
- ✅ Edge Function v30 desplegada con quiet hours + preferences
- ✅ Validación de 5 capas operativa

**Documentación**:
- ✅ Guía de configuración completa (PUSH_NOTIFICATION_DEALER_CONFIG.md)
- ✅ Suite de tests SQL (PUSH_NOTIFICATION_TESTS.sql)
- ✅ Arquitectura actualizada (este documento)

### **🚀 Migraciones Aplicadas**

1. `20251204214603_add_dealer_push_notification_preferences.sql`
2. `20251204214604_add_user_push_notification_preferences.sql`
3. `20251204214606_enhance_fcm_tokens_table.sql`
4. `20251204214607_add_push_notification_rpc_functions.sql`
5. `20251204220000_migrate_push_preferences_data.sql` (documentación)

### **🎯 Próximos Pasos (Futuro)**

- ⏳ **Analytics Dashboard**: Métricas de delivery rate, engagement
- ⏳ **A/B Testing**: Experimentar con títulos/copy de notificaciones
- ⏳ **Rich Notifications**: Imágenes, actions buttons en notificaciones
- ⏳ **Notification Templates**: Plantillas reutilizables por evento
- ⏳ **Digest Mode**: Agrupar notificaciones similares (batch)

---

**Estado actual**: ✅ **Sistema dealer-configurable listo para producción**
**Documentado por**: Claude Code
**Última actualización**: 2025-12-04
