# 🏗️ DIAGRAMAS DE ARQUITECTURA - SISTEMA DE NOTIFICACIONES

## 1. ARQUITECTURA ACTUAL (Estado Real)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + TypeScript)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────┐      ┌──────────────────────────────┐    │
│  │   SISTEMA GLOBAL         │      │   SISTEMA GET READY          │    │
│  │   (Parcialmente usado)   │      │   (Completamente funcional)  │    │
│  ├──────────────────────────┤      ├──────────────────────────────┤    │
│  │                          │      │                              │    │
│  │  NotificationBell        │      │  NotificationBell            │    │
│  │  ↓                       │      │  ↓                           │    │
│  │  SmartNotificationCenter │      │  NotificationPanel           │    │
│  │  ↓                       │      │  ↓                           │    │
│  │  useSmartNotifications  │      │  useGetReadyNotifications    │    │
│  │  ↓                       │      │  ↓                           │    │
│  │  notification_log ✅     │      │  get_ready_notifications ✅  │    │
│  │                          │      │                              │    │
│  │  ❌ No accesible:        │      │  ✅ Todo funciona:           │    │
│  │  - Preferences Modal     │      │  - Settings Modal            │    │
│  │  - Analytics Dashboard   │      │  - Real-time updates         │    │
│  │                          │      │  - Filters & actions         │    │
│  └──────────────────────────┘      └──────────────────────────────┘    │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   SERVICIOS (No conectados)                                      │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  NotificationService (enterprise)                                │   │
│  │  PushNotificationService (config pendiente)                      │   │
│  │  useEnhancedNotifications (no usado)                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Backend)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────────────┐     ┌─────────────────────────────────┐     │
│  │ TABLAS ENTERPRISE     │     │ TABLAS LEGACY (En uso)          │     │
│  │ (Subutilizadas)      │     │                                 │     │
│  ├───────────────────────┤     ├─────────────────────────────────┤     │
│  │                       │     │                                 │     │
│  │ notification_log      │     │ get_ready_notifications         │     │
│  │ ├─ 27 columnas       │     │ ├─ 15 columnas                 │     │
│  │ ├─ 10 índices        │     │ ├─ 7 índices                   │     │
│  │ ├─ 6 RLS policies    │     │ ├─ 4 RLS policies              │     │
│  │ └─ 🟡 Casi vacía     │     │ └─ ✅ En uso activo            │     │
│  │                       │     │                                 │     │
│  │ notification_delivery │     │ user_notification_preferences   │     │
│  │ _log                 │     │ (deprecated)                    │     │
│  │ └─ 🟡 No usado       │     │ └─ ⚠️ Aún en uso              │     │
│  │                       │     │                                 │     │
│  │ user_notification_    │     │ user_sms_notification_         │     │
│  │ preferences_universal │     │ preferences (deprecated)        │     │
│  │ └─ 🟡 No poblada     │     │ └─ ⚠️ Aún en uso              │     │
│  │                       │     │                                 │     │
│  │ dealer_notification_  │     │                                 │     │
│  │ rules                │     │                                 │     │
│  │ └─ 🟡 No poblada     │     │                                 │     │
│  └───────────────────────┘     └─────────────────────────────────┘     │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ EDGE FUNCTIONS (Implementadas, no verificadas)                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ enhanced-notification-engine (procesa queue)                     │   │
│  │ push-notification-sender (VAPID no configurado)                  │   │
│  │ notification-logging (sin uso activo)                            │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. FLUJO ACTUAL DE NOTIFICACIONES GET READY

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. EVENTO TRIGGER                                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────┐
        │ Cambio en get_ready_vehicles:        │
        │ - sla_status → 'yellow' o 'red'     │
        │ - requires_approval → true          │
        │ - current_step_id → cambió          │
        └──────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. DATABASE TRIGGER                                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────┐
        │ trigger_sla_warning_notification     │
        │ trigger_approval_pending_notification│
        │ trigger_step_completion_notification │
        └──────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. INSERT INTO get_ready_notifications                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────┐
        │ notification_id: UUID                │
        │ dealer_id: BIGINT                    │
        │ user_id: UUID (o NULL para todos)   │
        │ type: 'sla_warning'                  │
        │ priority: 'high'                     │
        │ title: "SLA Warning"                 │
        │ message: "Vehicle #B35009B..."       │
        │ is_read: false                       │
        └──────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. REAL-TIME SUBSCRIPTION (Supabase)                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────┐
        │ useGetReadyNotifications.tsx         │
        │ ↓                                    │
        │ Escucha eventos INSERT               │
        │ ↓                                    │
        │ Actualiza estado React (optimistic) │
        └──────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. UI UPDATE                                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────────────────────────┐
        │ NotificationBell                     │
        │ ├─ Badge: +1                         │
        │ ├─ Animación "wiggle"                │
        │ └─ Color según prioridad             │
        │                                      │
        │ NotificationPanel                    │
        │ ├─ Nueva notificación arriba         │
        │ ├─ Badge "New"                       │
        │ └─ Unread counter actualizado        │
        │                                      │
        │ Browser Notification                 │
        │ └─ Si habilitado y prioridad alta    │
        │                                      │
        │ Sound Alert                          │
        │ └─ Según prioridad                   │
        │                                      │
        │ Toast (in-app)                       │
        │ └─ Si critical/high                  │
        └──────────────────────────────────────┘
```

---

## 3. ARQUITECTURA OBJETIVO (Lo que debería ser)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + TypeScript)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   SISTEMA UNIFICADO (Single Source of Truth)                     │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  [Header Global]                                                 │   │
│  │     ↓                                                            │   │
│  │  NotificationBell (único, global)                                │   │
│  │     ├─ Badge counter (todos los módulos)                         │   │
│  │     ├─ Click → SmartNotificationCenter                           │   │
│  │     └─ [⚙️] → NotificationPreferencesModal                       │   │
│  │                                                                   │   │
│  │  SmartNotificationCenter                                         │   │
│  │     ├─ Tabs: [Grouped] [All] [Unread]                           │   │
│  │     ├─ Filters: Module, Priority, Date                           │   │
│  │     ├─ Actions: Mark as read, Delete, Navigate                   │   │
│  │     └─ Real-time updates                                         │   │
│  │                                                                   │   │
│  │  NotificationPreferencesModal                                    │   │
│  │     ├─ Tab 1: Channels (SMS, Email, Push, In-App)              │   │
│  │     ├─ Tab 2: Priorities (Low → Critical)                       │   │
│  │     ├─ Tab 3: Schedule (Quiet Hours)                            │   │
│  │     └─ Tab 4: Entities (Módulos)                                │   │
│  │                                                                   │   │
│  │  useSmartNotifications                                           │   │
│  │     ├─ Fetch desde notification_log                             │   │
│  │     ├─ Real-time subscriptions                                  │   │
│  │     ├─ Grouping & filtering                                     │   │
│  │     └─ Actions (read, delete, etc)                              │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │   SERVICIOS INTEGRADOS                                           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  NotificationService (singleton)                                 │   │
│  │     ├─ send(request) → Queue notification                        │   │
│  │     ├─ sendBatch(requests) → Bulk sending                        │   │
│  │     ├─ getTemplates() → Template management                      │   │
│  │     ├─ getUserPreferences() → User settings                      │   │
│  │     └─ trackAnalytics() → Metrics                                │   │
│  │                                                                   │   │
│  │  PushNotificationService                                         │   │
│  │     ├─ requestPermission() → Browser permission                  │   │
│  │     ├─ subscribe() → Register subscription                       │   │
│  │     └─ sendTest() → Test push                                    │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (Backend)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ TABLAS ENTERPRISE (Única fuente de verdad)                       │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  notification_log (main table)                                   │   │
│  │     ├─ Todos los módulos                                         │   │
│  │     ├─ Multi-priority                                            │   │
│  │     ├─ Entity linking                                            │   │
│  │     ├─ Read/unread tracking                                      │   │
│  │     └─ Threading support                                         │   │
│  │                                                                   │   │
│  │  notification_delivery_log                                       │   │
│  │     ├─ Por canal (SMS, Email, Push, In-App)                     │   │
│  │     ├─ Estado (pending, sent, delivered, failed)                │   │
│  │     ├─ Retry tracking                                            │   │
│  │     └─ Error logging                                             │   │
│  │                                                                   │   │
│  │  user_notification_preferences_universal                         │   │
│  │     ├─ Por (user_id, dealer_id, module)                         │   │
│  │     ├─ Channel preferences                                       │   │
│  │     ├─ Event preferences (JSONB)                                 │   │
│  │     ├─ Quiet hours                                               │   │
│  │     └─ Rate limiting                                             │   │
│  │                                                                   │   │
│  │  dealer_notification_rules                                       │   │
│  │     ├─ Business rules                                            │   │
│  │     ├─ Recipient targeting                                       │   │
│  │     ├─ Conditions (JSONB)                                        │   │
│  │     └─ Priority override                                         │   │
│  │                                                                   │   │
│  │  notification_templates                                          │   │
│  │     ├─ System templates                                          │   │
│  │     ├─ Custom templates                                          │   │
│  │     ├─ Multi-channel content                                     │   │
│  │     └─ Variable interpolation                                    │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ EDGE FUNCTIONS (Procesamiento)                                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │                                                                   │   │
│  │  enhanced-notification-engine                                    │   │
│  │     ├─ Procesa notification_log                                  │   │
│  │     ├─ Evalúa preferencias de usuario                            │   │
│  │     ├─ Aplica reglas de dealer                                   │   │
│  │     ├─ Renderiza templates                                       │   │
│  │     ├─ Respeta quiet hours                                       │   │
│  │     ├─ Verifica rate limits                                      │   │
│  │     └─ Despacha a channel handlers                               │   │
│  │                                                                   │   │
│  │  Channel Handlers:                                               │   │
│  │     ├─ push-notification-sender (Web Push API)                   │   │
│  │     ├─ sms-sender (Twilio/MessageBird)                          │   │
│  │     ├─ email-sender (Sendgrid/Resend)                           │   │
│  │     └─ webhook-sender (Custom integrations)                      │   │
│  │                                                                   │   │
│  │  notification-logger                                             │   │
│  │     └─ Escribe a notification_delivery_log                       │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                     ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Twilio    │  │  Sendgrid   │  │  Firebase   │  │   Custom    │  │
│  │     SMS     │  │    Email    │  │  Cloud Msg  │  │  Webhooks   │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. FLUJO COMPLETO DE UNA NOTIFICACIÓN (Objetivo)

```
┌─────────────────────────────────────────────────────────────────┐
│ PASO 1: EVENTO OCURRE EN CUALQUIER MÓDULO                       │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │ Sales Order: Nuevo pedido creado                   │
    │ Service Order: Estado cambiado a "completed"       │
    │ Get Ready: SLA crítico                            │
    │ Recon: Approval requerido                         │
    │ Car Wash: Turno asignado                          │
    │ Contact: Nuevo lead                               │
    │ Chat: Mensaje recibido                            │
    │ System: Mantenimiento programado                  │
    └───────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 2: CÓDIGO DEL MÓDULO LLAMA NotificationService             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │ await notificationService.send({                   │
    │   dealerId: 5,                                     │
    │   userId: 'uuid',                                  │
    │   notificationType: 'order_created',               │
    │   entityType: 'order',                             │
    │   entityId: '12345',                               │
    │   channels: ['in_app', 'push', 'sms'],            │
    │   data: {                                          │
    │     order_number: '12345',                         │
    │     customer_name: 'John Doe',                     │
    │     status: 'pending'                              │
    │   },                                               │
    │   priority: 'high'                                 │
    │ });                                                │
    └───────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 3: NotificationService PROCESA REQUEST                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │ 1. Valida request                                  │
    │ 2. Obtiene user preferences                        │
    │ 3. Obtiene dealer config                           │
    │ 4. Aplica filtros (quiet hours, enabled channels)  │
    │ 5. Verifica rate limits                            │
    │ 6. Renderiza template (si existe)                  │
    │ 7. Inserta en notification_log                     │
    │ 8. Llama Edge Function                             │
    └───────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 4: INSERT INTO notification_log                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │ INSERT INTO notification_log (                     │
    │   user_id, dealer_id, module, event,              │
    │   entity_type, entity_id,                         │
    │   title, message, action_url,                     │
    │   priority, target_channels,                      │
    │   is_read, created_at                             │
    │ ) VALUES (...)                                     │
    │                                                    │
    │ → Retorna notification_id                         │
    └───────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 5: REAL-TIME SUBSCRIPTION DISPARA UPDATE EN UI             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │ useSmartNotifications recibe evento INSERT        │
    │ ↓                                                  │
    │ Actualiza estado React (optimistic)               │
    │ ↓                                                  │
    │ NotificationBell:                                  │
    │   - Badge +1                                       │
    │   - Animación wiggle                               │
    │   - Color según prioridad                          │
    │ ↓                                                  │
    │ Sound alert (si habilitado)                        │
    │ ↓                                                  │
    │ Browser notification (si permiso)                  │
    │ ↓                                                  │
    │ Toast (si high/urgent/critical)                    │
    └───────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 6: EDGE FUNCTION PROCESA OTROS CANALES (Async)             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │ enhanced-notification-engine                       │
    │ ↓                                                  │
    │ Para cada canal en target_channels:                │
    │                                                    │
    │   PUSH:                                            │
    │   ├─ Obtiene subscriptions activas                │
    │   ├─ Envía via Web Push API                       │
    │   └─ Log resultado                                 │
    │                                                    │
    │   SMS:                                             │
    │   ├─ Obtiene phone number                         │
    │   ├─ Llama Twilio API                             │
    │   └─ Log resultado                                 │
    │                                                    │
    │   EMAIL:                                           │
    │   ├─ Renderiza HTML template                      │
    │   ├─ Llama Sendgrid API                           │
    │   └─ Log resultado                                 │
    │                                                    │
    │   WEBHOOK:                                         │
    │   ├─ Construye payload                            │
    │   ├─ POST a URL configurada                       │
    │   └─ Log resultado                                 │
    └───────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 7: DELIVERY LOG ACTUALIZADO                                │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │ INSERT INTO notification_delivery_log (            │
    │   notification_id,                                 │
    │   channel: 'push',                                 │
    │   status: 'delivered',                             │
    │   delivered_at: NOW(),                             │
    │   provider: 'web-push',                            │
    │   metadata: {...}                                  │
    │ )                                                  │
    │                                                    │
    │ → Permite tracking y analytics                     │
    └───────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ PASO 8: USUARIO INTERACTÚA                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────┐
    │ Usuario click en notificación:                     │
    │                                                    │
    │ IN-APP:                                            │
    │   ├─ Marca como leída                             │
    │   ├─ Navega a action_url                          │
    │   └─ Analytics: 'clicked'                          │
    │                                                    │
    │ PUSH (Browser):                                    │
    │   ├─ Service Worker captura click                 │
    │   ├─ Abre/enfoca app                               │
    │   ├─ Navega a URL                                  │
    │   └─ Marca como leída                             │
    │                                                    │
    │ SMS:                                               │
    │   └─ Usuario click en link → Deep link a app      │
    │                                                    │
    │ EMAIL:                                             │
    │   └─ Usuario click en CTA → Deep link a app       │
    └───────────────────────────────────────────────────┘
```

---

## 5. COMPARACIÓN: ANTES vs DESPUÉS

### ANTES (Estado Actual - Fragmentado):

```
Get Ready Module:
┌──────────────────────────┐
│ NotificationBell         │
│ ↓                        │
│ get_ready_notifications  │
│ ↓                        │
│ Solo Get Ready           │
└──────────────────────────┘

Global System (Inactivo):
┌──────────────────────────┐
│ NotificationBell         │
│ ↓                        │
│ notification_log (vacía) │
│ ↓                        │
│ No se usa                │
└──────────────────────────┘

Otros Módulos:
┌──────────────────────────┐
│ Sin notificaciones       │
└──────────────────────────┘

Resultado: 😞
- Usuario ve 2 bells diferentes
- Datos fragmentados
- Mantenimiento duplicado
- Canales no configurados
```

### DESPUÉS (Objetivo - Unificado):

```
TODOS LOS MÓDULOS:
┌────────────────────────────────────────┐
│          NotificationBell              │
│               (único)                  │
│                 ↓                      │
│        notification_log                │
│                 ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ • Sales Orders                    │ │
│  │ • Service Orders                  │ │
│  │ • Get Ready                       │ │
│  │ • Recon Orders                    │ │
│  │ • Car Wash                        │ │
│  │ • Contacts                        │ │
│  │ • Chat                            │ │
│  │ • System                          │ │
│  └──────────────────────────────────┘ │
│                 ↓                      │
│  ┌──────────────────────────────────┐ │
│  │ Channels:                         │ │
│  │ • In-App ✅                       │ │
│  │ • Push ✅                         │ │
│  │ • SMS ✅                          │ │
│  │ • Email ✅                        │ │
│  │ • Webhook ✅                      │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘

Resultado: 🎉
- Una sola fuente de verdad
- Experiencia unificada
- Multi-canal operativo
- Analytics completos
- Fácil de mantener
```

---

## 6. PUNTOS DE INTEGRACIÓN POR MÓDULO

### Sales Orders:
```typescript
// En cualquier acción relevante:
import { notificationService } from '@/services/notificationService';

// Ejemplo: Nuevo pedido creado
await notificationService.send({
  dealerId,
  userId: assignedUserId,
  notificationType: 'order_created',
  entityType: 'sales_order',
  entityId: order.id,
  channels: ['in_app', 'push'],
  data: {
    order_number: order.order_number,
    customer_name: order.customer_name,
    status: order.status
  },
  priority: 'normal'
});

// Ejemplo: Estado cambió
await notificationService.send({
  dealerId,
  userId: order.assigned_user_id,
  notificationType: 'status_changed',
  entityType: 'sales_order',
  entityId: order.id,
  channels: ['in_app', 'push', 'sms'],
  data: {
    order_number: order.order_number,
    old_status: oldStatus,
    new_status: newStatus
  },
  priority: newStatus === 'completed' ? 'high' : 'normal'
});
```

### Service Orders:
```typescript
// Ejemplo: Due date approaching
await notificationService.send({
  dealerId,
  userId: order.assigned_user_id,
  notificationType: 'due_date_approaching',
  entityType: 'service_order',
  entityId: order.id,
  channels: ['in_app', 'push', 'sms'],
  data: {
    order_number: order.order_number,
    due_date: order.due_date,
    minutes_until_due: 30
  },
  priority: 'urgent'
});
```

### Recon Orders:
```typescript
// Ejemplo: Approval required
await notificationService.send({
  dealerId,
  userId: null, // broadcast a managers
  notificationType: 'approval_required',
  entityType: 'recon_order',
  entityId: order.id,
  channels: ['in_app', 'email', 'push'],
  data: {
    order_number: order.order_number,
    requested_by: requester.name,
    reason: 'High cost item'
  },
  priority: 'high'
});
```

### Chat:
```typescript
// Ejemplo: Nuevo mensaje
await notificationService.send({
  dealerId,
  userId: recipientId,
  notificationType: 'new_message',
  entityType: 'chat_message',
  entityId: message.id,
  channels: ['in_app', 'push'],
  data: {
    sender_name: sender.name,
    message_preview: message.content.substring(0, 100),
    conversation_id: message.conversation_id
  },
  priority: 'high'
});
```

---

## 7. RESUMEN VISUAL DE GAPS

```
COMPONENTES:
┌────────────────────┬──────────┬──────────┬──────────┐
│ Componente         │ Existe   │ Visible  │ Funciona │
├────────────────────┼──────────┼──────────┼──────────┤
│ NotificationBell   │    ✅    │    ✅    │    ✅    │
│ SmartCenter        │    ✅    │    ✅    │    🟡    │
│ PreferencesModal   │    ✅    │    ❌    │    ✅    │
│ AnalyticsDashboard │    ✅    │    ❌    │    ✅    │
│ TemplateManager    │    ❌    │    ❌    │    ❌    │
└────────────────────┴──────────┴──────────┴──────────┘

SERVICIOS:
┌────────────────────┬──────────┬──────────┬──────────┐
│ Servicio           │ Código   │ Config   │ En Uso   │
├────────────────────┼──────────┼──────────┼──────────┤
│ NotificationSvc    │    ✅    │    ✅    │    ❌    │
│ PushNotifSvc       │    ✅    │    ❌    │    ❌    │
│ SMSHandler         │    ✅    │    ❌    │    ❌    │
│ EmailHandler       │    ✅    │    ❌    │    ❌    │
│ WebhookHandler     │    ❌    │    ❌    │    ❌    │
└────────────────────┴──────────┴──────────┴──────────┘

BASE DE DATOS:
┌────────────────────┬──────────┬──────────┬──────────┐
│ Tabla              │ Creada   │ Poblada  │ En Uso   │
├────────────────────┼──────────┼──────────┼──────────┤
│ notification_log   │    ✅    │    ❌    │    🟡    │
│ delivery_log       │    ✅    │    ❌    │    ❌    │
│ preferences_univ   │    ✅    │    ❌    │    ❌    │
│ dealer_rules       │    ✅    │    ❌    │    ❌    │
│ templates          │    ❌    │    ❌    │    ❌    │
└────────────────────┴──────────┴──────────┴──────────┘

MÓDULOS:
┌────────────────────┬──────────────────────────────┐
│ Módulo             │ Status Integración           │
├────────────────────┼──────────────────────────────┤
│ Get Ready          │ ✅ Funcional (tabla legacy)  │
│ Sales Orders       │ ❌ Sin integrar              │
│ Service Orders     │ ❌ Sin integrar              │
│ Recon Orders       │ ❌ Sin integrar              │
│ Car Wash           │ ❌ Sin integrar              │
│ Contacts           │ ❌ Sin integrar              │
│ Chat               │ ❌ Sin integrar              │
│ System             │ ❌ Sin integrar              │
└────────────────────┴──────────────────────────────┘

CANALES:
┌────────────────────┬──────────┬──────────┬──────────┐
│ Canal              │ Código   │ Config   │ Operativo│
├────────────────────┼──────────┼──────────┼──────────┤
│ In-App             │    ✅    │    ✅    │    ✅    │
│ Push (Web)         │    ✅    │    ❌    │    ❌    │
│ SMS                │    ✅    │    ❌    │    ❌    │
│ Email              │    ✅    │    ❌    │    ❌    │
│ Webhook            │    🟡    │    ❌    │    ❌    │
└────────────────────┴──────────┴──────────┴──────────┘

Leyenda:
✅ Completo/Funcional
🟡 Parcial/En Progreso
❌ Faltante/No Funcional
```

---

**Este diagrama complementa el reporte principal y puede ser usado para presentaciones al equipo.**

**Próxima actualización:** Después de completar Fase 1 del Roadmap
