# Enterprise SMS Notification Service

## 📱 Overview

Sistema enterprise de notificaciones SMS con control granular de permisos, preferencias por evento, rate limiting y quiet hours.

---

## ✅ Sistema Nuevo vs Antiguo

### ❌ Sistema Antiguo (`orderSMSService.ts`) - DEPRECATED
- Basado en followers de órdenes
- No usa permisos de Custom Roles
- Sin preferencias granulares por evento
- Sin rate limiting inteligente
- Sin quiet hours

### ✅ Sistema Nuevo (`orderSMSNotificationService.ts`) - ENTERPRISE
- ✅ Permisos basados en Custom Roles (`receive_sms_notifications`)
- ✅ Preferencias granulares por evento (status_changed, order_assigned, etc.)
- ✅ Rate limiting inteligente (10/hora, 50/día por defecto)
- ✅ Quiet hours configurables
- ✅ Auto-exclusión del trigger user
- ✅ Registro completo en `sms_send_history`
- ✅ Soporte para múltiples módulos (sales, service, recon, car wash)

---

## 🚀 Quick Start

### Importar el Servicio

```typescript
import { orderSMSNotificationService } from '@/services/orderSMSNotificationService';
```

### Ejemplos de Uso

#### 1. Notificar Cambio de Estado

```typescript
import { orderSMSNotificationService } from '@/services/orderSMSNotificationService';
import { usePermissions } from '@/hooks/usePermissions';

// En tu componente o hook
const { enhancedUser } = usePermissions();

await orderSMSNotificationService.notifyStatusChange(
  orderId,              // UUID de la orden
  dealerId,             // ID del dealership
  'sales_orders',       // Módulo: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash'
  orderNumber,          // Número de orden (ej: "SO-00123")
  newStatus,            // Nuevo estado
  oldStatus,            // Estado anterior
  vehicleInfo,          // Opcional: "2024 BMW X5"
  shortLink,            // Opcional: Link mda.to
  enhancedUser.id       // Usuario que triggerea el evento
);
```

#### 2. Notificar Asignación

```typescript
await orderSMSNotificationService.notifyAssignment(
  orderId,
  dealerId,
  'sales_orders',
  orderNumber,
  assignedToUserId,     // UUID del usuario asignado
  assignedToName,       // Nombre del usuario asignado
  customerName,         // Opcional: nombre del cliente
  shortLink,
  enhancedUser.id
);
```

#### 3. Notificar Comentario Agregado

```typescript
await orderSMSNotificationService.notifyComment(
  orderId,
  dealerId,
  'sales_orders',
  orderNumber,
  commenterName,        // Nombre de quien comenta
  commentText,          // Texto del comentario
  shortLink,
  enhancedUser.id
);
```

#### 4. Notificar Adjunto

```typescript
await orderSMSNotificationService.notifyAttachment(
  orderId,
  dealerId,
  'sales_orders',
  orderNumber,
  shortLink,
  enhancedUser.id
);
```

#### 5. Notificar Orden Creada

```typescript
await orderSMSNotificationService.notifyOrderCreated(
  orderId,
  dealerId,
  'sales_orders',
  orderNumber,
  customerName,         // Opcional
  vehicleInfo,          // Opcional
  shortLink,
  enhancedUser.id
);
```

#### 6. Notificar Fecha Límite Próxima

```typescript
await orderSMSNotificationService.notifyDueDateApproaching(
  orderId,
  dealerId,
  'sales_orders',
  orderNumber,
  30,                   // Minutos hasta vencimiento
  dueDateTime,          // ISO string de la fecha límite
  vehicleInfo,
  shortLink,
  enhancedUser.id
);
```

#### 7. Notificar Orden Vencida

```typescript
await orderSMSNotificationService.notifyOverdue(
  orderId,
  dealerId,
  'sales_orders',
  orderNumber,
  shortLink,
  enhancedUser.id
);
```

#### 8. Notificar Cambio de Prioridad

```typescript
await orderSMSNotificationService.notifyPriorityChange(
  orderId,
  dealerId,
  'sales_orders',
  orderNumber,
  newPriority,          // "high", "medium", "normal", "low"
  oldPriority,
  shortLink,
  enhancedUser.id
);
```

---

## 🎯 Eventos Soportados

| Event Type | Descripción | Template SMS |
|------------|-------------|--------------|
| `order_created` | Nueva orden creada | ✨ New Order #SO-00123 created. Customer Name View: link |
| `order_assigned` | Usuario asignado | 🚗 You've been assigned to Order #SO-00123. Customer: John View: link |
| `status_changed` | Cambio de estado | 📋 Order #SO-00123 status changed to "in_progress". View: link |
| `field_updated` | Campo actualizado | ✏️ Order #SO-00123 - Field Name updated. View: link |
| `comment_added` | Comentario agregado | 💬 John commented on Order #SO-00123: "Text..." View: link |
| `attachment_added` | Archivo adjunto | 📎 New attachment added to Order #SO-00123. View: link |
| `follower_added` | Seguidor agregado | 👁️ You're now following Order #SO-00123. View: link |
| `due_date_approaching` | Fecha límite próxima | ⏰ REMINDER: Order #SO-00123 is due in 30 minutes! View: link |
| `overdue` | Orden vencida | 🚨 Order #SO-00123 is OVERDUE! Please update status. View: link |
| `priority_changed` | Cambio de prioridad | ⚡ Order #SO-00123 priority changed to high. View: link |

---

## 🔐 Sistema de Permisos

### Requisitos para Recibir SMS

Para que un usuario reciba notificaciones SMS, debe cumplir **TODOS** estos requisitos:

1. **Permiso de Custom Role**: El usuario debe tener el permiso `receive_sms_notifications` en su Custom Role para el módulo correspondiente
2. **Número de teléfono**: Debe tener `phone_number` configurado en su perfil
3. **Preferencias SMS habilitadas**: Debe tener registro en `user_sms_notification_preferences` con `sms_enabled = true`
4. **Evento habilitado**: El evento específico debe estar habilitado en sus preferencias
5. **No ser el trigger user**: No recibe SMS de sus propias acciones
6. **Dentro de rate limits**: No haber excedido límites de SMS/hora o SMS/día
7. **Fuera de quiet hours**: No estar en horario de no molestar

### Configurar Permiso en Custom Role

```sql
-- Verificar si el permiso existe en module_permissions
SELECT * FROM module_permissions
WHERE module = 'sales_orders' AND permission_key = 'receive_sms_notifications';

-- Si no existe, agregarlo
INSERT INTO module_permissions (module, permission_key, permission_name, description)
VALUES (
  'sales_orders',
  'receive_sms_notifications',
  'Receive SMS Notifications',
  'Allow user to receive SMS notifications for order events'
);

-- Asignar permiso a un rol
INSERT INTO role_module_permissions_new (role_id, module_permission_id, permission_level)
SELECT
  dr.id,
  mp.id,
  'read'
FROM dealer_custom_roles dr
CROSS JOIN module_permissions mp
WHERE dr.role_name = 'Sales Manager'
  AND mp.module = 'sales_orders'
  AND mp.permission_key = 'receive_sms_notifications';
```

---

## ⚙️ Preferencias de Usuario

### Tabla: `user_sms_notification_preferences`

```typescript
interface UserSMSPreferences {
  user_id: string;
  dealer_id: number;
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash';
  sms_enabled: boolean;

  // Preferencias por evento
  event_preferences: {
    status_changed?: {
      enabled: boolean;
      statuses?: string[];  // Solo ciertos estados
    };
    field_updated?: {
      enabled: boolean;
      fields?: string[];    // Solo ciertos campos
    };
    order_assigned?: boolean;
    order_created?: boolean;
    comment_added?: boolean;
    attachment_added?: boolean;
    due_date_approaching?: {
      enabled: boolean;
    };
    overdue?: boolean;
    priority_changed?: boolean;
  };

  // Rate limiting
  max_sms_per_hour: number;    // Default: 10
  max_sms_per_day: number;     // Default: 50

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;   // "22:00"
  quiet_hours_end: string;     // "08:00"
}
```

### Ejemplo: Configurar Preferencias

```sql
-- Habilitar SMS para status_changed solo en ciertos estados
INSERT INTO user_sms_notification_preferences (
  user_id, dealer_id, module, sms_enabled, event_preferences, max_sms_per_hour, max_sms_per_day
) VALUES (
  'user-uuid',
  1,
  'sales_orders',
  true,
  '{
    "status_changed": {
      "enabled": true,
      "statuses": ["in_progress", "completed", "cancelled"]
    },
    "order_assigned": true,
    "comment_added": true
  }'::jsonb,
  10,
  50
);
```

---

## 📊 Registro y Auditoría

### Tabla: `sms_send_history`

Todos los intentos de envío SMS se registran en esta tabla:

```typescript
interface SMSSendHistory {
  id: string;
  user_id: string;
  dealer_id: number;
  module: string;
  event_type: string;
  entity_id: string;         // Order ID
  phone_number: string;
  message_content: string;
  twilio_sid?: string;       // Solo si fue exitoso
  status: 'sent' | 'delivered' | 'failed' | 'undelivered';
  error_message?: string;
  cost_cents: number;        // Costo aproximado en centavos
  sent_at: string;
  sent_day: string;          // Para rate limiting diario
}
```

### Consultas Útiles

```sql
-- Ver SMS enviados hoy
SELECT * FROM sms_send_history
WHERE dealer_id = 1 AND sent_day = CURRENT_DATE
ORDER BY sent_at DESC;

-- Ver SMS fallidos
SELECT * FROM sms_send_history
WHERE status = 'failed'
ORDER BY sent_at DESC
LIMIT 20;

-- Costo total de SMS del mes
SELECT SUM(cost_cents) / 100.0 AS total_cost_usd
FROM sms_send_history
WHERE dealer_id = 1
  AND sent_at >= date_trunc('month', CURRENT_DATE);

-- SMS por evento type
SELECT event_type, COUNT(*), SUM(cost_cents) / 100.0 AS cost
FROM sms_send_history
WHERE dealer_id = 1
GROUP BY event_type
ORDER BY COUNT(*) DESC;
```

---

## 🔄 Migración desde Sistema Antiguo

### Paso 1: Identificar Usos del Servicio Antiguo

```bash
# Buscar todos los usos de orderSMSService
grep -r "orderSMSService" src/
```

### Paso 2: Reemplazar con Nuevo Servicio

**ANTES** (Sistema Antiguo):
```typescript
import { orderSMSService } from '@/services/orderSMSService';

await orderSMSService.notifyStatusChange(
  orderId,
  orderNumber,
  newStatus
);
```

**DESPUÉS** (Sistema Nuevo):
```typescript
import { orderSMSNotificationService } from '@/services/orderSMSNotificationService';

await orderSMSNotificationService.notifyStatusChange(
  orderId,
  dealerId,
  'sales_orders',
  orderNumber,
  newStatus,
  oldStatus,
  vehicleInfo,
  shortLink,
  enhancedUser.id
);
```

### Paso 3: Configurar Permisos

Asegúrate de que los Custom Roles tengan el permiso `receive_sms_notifications` configurado.

### Paso 4: Configurar Preferencias de Usuarios

Los usuarios deben configurar sus preferencias SMS en la UI de Settings o manualmente en la base de datos.

---

## 🐛 Troubleshooting

### No se envían SMS

**Verificar**:
1. ✅ Credentials de Twilio configurados en Supabase Secrets
2. ✅ Usuario tiene permiso `receive_sms_notifications`
3. ✅ Usuario tiene `phone_number` en perfil
4. ✅ Preferencias SMS habilitadas en `user_sms_notification_preferences`
5. ✅ Evento específico habilitado en preferencias
6. ✅ No está en quiet hours
7. ✅ No ha excedido rate limits

### Ver Logs de Edge Function

```bash
# Ver logs en tiempo real
npx supabase functions logs send-order-sms-notification --tail --project-ref swfnnrpzpkdypbrzmgnr

# Ver logs recientes
npx supabase functions logs send-order-sms-notification --project-ref swfnnrpzpkdypbrzmgnr
```

### Verificar SMS en Base de Datos

```sql
-- Últimos 20 SMS
SELECT
  user_id,
  event_type,
  status,
  message_content,
  sent_at,
  error_message
FROM sms_send_history
WHERE dealer_id = 1
ORDER BY sent_at DESC
LIMIT 20;
```

---

## 📚 Recursos Adicionales

- **Edge Function README**: `supabase/functions/send-order-sms-notification/README.md`
- **Tipo Definitions**: `src/services/orderSMSNotificationService.ts`
- **Ejemplos de Uso**: `src/hooks/useStatusPermissions.tsx` (líneas 157-172)

---

## ⚠️ Importante

- **Todas las invocaciones son non-blocking** - Los errores se logean pero no interrumpen el flujo
- **Auto-exclusión** - El usuario que triggerea el evento nunca recibe SMS
- **Rate limiting** - Protege contra spam (configurable por usuario)
- **Costos** - Cada SMS cuesta ~$0.0075 USD (7 centavos registrados en DB)
