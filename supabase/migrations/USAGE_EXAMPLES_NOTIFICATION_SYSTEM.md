# Sistema de Notificaciones Enterprise - Ejemplos de Uso Práctico

Esta guía proporciona ejemplos reales de cómo usar el nuevo sistema de notificaciones unificado.

---

## Tabla de Contenidos
1. [Configuración Básica de Usuario](#1-configuración-básica-de-usuario)
2. [Gestión de Event Preferences](#2-gestión-de-event-preferences)
3. [Dealer Rules Configuration](#3-dealer-rules-configuration)
4. [Quiet Hours Management](#4-quiet-hours-management)
5. [Rate Limiting](#5-rate-limiting)
6. [Notification Delivery](#6-notification-delivery)
7. [Queries Comunes](#7-queries-comunes)
8. [Frontend Integration Examples](#8-frontend-integration-examples)

---

## 1. Configuración Básica de Usuario

### 1.1 Obtener Config Completo de Usuario

```sql
-- Get complete notification config for a user
SELECT * FROM get_user_notification_config(
    'user-uuid-here',
    1, -- dealer_id
    'sales_orders'
);

-- Returns: Full config including preferences and applicable dealer rules
```

### 1.2 Crear Preferencias Default para Nuevo Usuario

```sql
-- Auto-create default preferences if don't exist
SELECT create_default_notification_preferences(
    'new-user-uuid',
    1, -- dealer_id
    'get_ready'
);

-- Returns: true if created, false if already exists
```

### 1.3 Listar Todos los Módulos de un Usuario

```sql
SELECT
    module,
    in_app_enabled,
    email_enabled,
    sms_enabled,
    push_enabled,
    frequency
FROM user_notification_preferences_universal
WHERE user_id = 'user-uuid'
AND dealer_id = 1
ORDER BY module;
```

---

## 2. Gestión de Event Preferences

### 2.1 Habilitar SMS para un Evento Específico

```sql
-- Enable SMS for order_assigned event
SELECT update_user_event_preference(
    'user-uuid',
    1, -- dealer_id
    'sales_orders',
    'order_assigned',
    'sms', -- channel
    true -- enabled
);
```

### 2.2 Deshabilitar Todas las Notificaciones de un Evento

```sql
-- Disable all channels for work_item_completed
SELECT update_user_event_preference(
    'user-uuid',
    1,
    'get_ready',
    'work_item_completed',
    NULL, -- NULL = all channels
    false
);
```

### 2.3 Configurar Multi-Canal para Evento Crítico

```sql
-- Enable in-app + SMS + push for sla_critical
DO $$
DECLARE
    v_user_id UUID := 'user-uuid';
    v_dealer_id BIGINT := 1;
BEGIN
    -- Enable in_app
    PERFORM update_user_event_preference(v_user_id, v_dealer_id, 'get_ready', 'sla_critical', 'in_app', true);

    -- Enable SMS
    PERFORM update_user_event_preference(v_user_id, v_dealer_id, 'get_ready', 'sla_critical', 'sms', true);

    -- Enable push
    PERFORM update_user_event_preference(v_user_id, v_dealer_id, 'get_ready', 'sla_critical', 'push', true);
END $$;
```

### 2.4 Update Manual de Event Preferences (JSONB)

```sql
-- Manual JSONB update for complex scenarios
UPDATE user_notification_preferences_universal
SET
    event_preferences = jsonb_set(
        event_preferences,
        '{order_created}',
        '{"enabled": true, "channels": ["in_app", "email"], "priority": "high"}'::jsonb
    ),
    updated_at = NOW()
WHERE user_id = 'user-uuid'
AND dealer_id = 1
AND module = 'sales_orders';
```

---

## 3. Dealer Rules Configuration

### 3.1 Crear Regla para Notificar Admins en SLA Crítico

```sql
INSERT INTO dealer_notification_rules (
    dealer_id,
    module,
    event,
    rule_name,
    description,
    recipients,
    conditions,
    channels,
    priority,
    enabled,
    created_by
) VALUES (
    1,
    'get_ready',
    'sla_critical',
    'Critical SLA - Notify All Admins',
    'Immediately notify all dealer admins when SLA is violated',
    jsonb_build_object(
        'roles', jsonb_build_array('admin'),
        'users', jsonb_build_array(),
        'include_assigned_user', true,
        'include_followers', false,
        'include_creator', false
    ),
    jsonb_build_object(
        'priority', jsonb_build_array('urgent', 'high')
    ),
    jsonb_build_array('in_app', 'sms', 'push'),
    90, -- high priority
    true,
    auth.uid()
);
```

### 3.2 Regla Condicional - Solo Vehículos VIP

```sql
INSERT INTO dealer_notification_rules (
    dealer_id,
    module,
    event,
    rule_name,
    description,
    recipients,
    conditions,
    channels,
    priority,
    enabled,
    created_by
) VALUES (
    1,
    'sales_orders',
    'order_created',
    'VIP Customer Alert',
    'Notify management team for VIP customer orders',
    jsonb_build_object(
        'roles', jsonb_build_array('manager', 'admin'),
        'users', jsonb_build_array()
    ),
    jsonb_build_object(
        'customer_type', jsonb_build_object('operator', '=', 'value', 'vip'),
        'order_value', jsonb_build_object('operator', '>=', 'value', 50000)
    ),
    jsonb_build_array('in_app', 'email'),
    70,
    true,
    auth.uid()
);
```

### 3.3 Regla para Notificar Usuario Asignado

```sql
INSERT INTO dealer_notification_rules (
    dealer_id,
    module,
    event,
    rule_name,
    description,
    recipients,
    conditions,
    channels,
    priority,
    enabled,
    created_by
) VALUES (
    1,
    'service_orders',
    'order_assigned',
    'Notify Assigned Technician',
    'Alert technician immediately when order is assigned',
    jsonb_build_object(
        'roles', jsonb_build_array(),
        'users', jsonb_build_array(),
        'include_assigned_user', true, -- Key: notify assigned user
        'include_followers', false,
        'include_creator', false
    ),
    '{}'::jsonb, -- No conditions, always apply
    jsonb_build_array('in_app', 'sms'),
    50,
    true,
    auth.uid()
);
```

### 3.4 Listar Todas las Reglas de un Dealer

```sql
SELECT
    id,
    rule_name,
    module,
    event,
    recipients->>'roles' AS target_roles,
    channels,
    priority,
    enabled,
    created_at
FROM dealer_notification_rules
WHERE dealer_id = 1
AND enabled = true
ORDER BY priority DESC, module, event;
```

---

## 4. Quiet Hours Management

### 4.1 Configurar Horario de No Molestar

```sql
UPDATE user_notification_preferences_universal
SET
    quiet_hours_enabled = true,
    quiet_hours_start = '22:00'::TIME,
    quiet_hours_end = '08:00'::TIME,
    quiet_hours_timezone = 'America/New_York',
    updated_at = NOW()
WHERE user_id = 'user-uuid'
AND dealer_id = 1
AND module = 'sales_orders';
```

### 4.2 Verificar si Usuario Está en Quiet Hours

```sql
-- Check if user is currently in quiet hours
SELECT is_user_in_quiet_hours(
    'user-uuid',
    1, -- dealer_id
    'sales_orders'
);

-- Returns: true/false
```

### 4.3 Deshabilitar Quiet Hours

```sql
UPDATE user_notification_preferences_universal
SET
    quiet_hours_enabled = false,
    updated_at = NOW()
WHERE user_id = 'user-uuid'
AND dealer_id = 1
AND module = 'sales_orders';
```

### 4.4 Quiet Hours por Timezone (Multi-Dealer)

```sql
-- User works in multiple dealerships with different timezones
UPDATE user_notification_preferences_universal
SET
    quiet_hours_enabled = true,
    quiet_hours_start = '22:00'::TIME,
    quiet_hours_end = '08:00'::TIME,
    quiet_hours_timezone = CASE dealer_id
        WHEN 1 THEN 'America/New_York'
        WHEN 2 THEN 'America/Los_Angeles'
        WHEN 3 THEN 'America/Chicago'
        ELSE 'America/New_York'
    END,
    updated_at = NOW()
WHERE user_id = 'user-uuid';
```

---

## 5. Rate Limiting

### 5.1 Configurar Rate Limits por Canal

```sql
UPDATE user_notification_preferences_universal
SET
    rate_limits = jsonb_build_object(
        'in_app', jsonb_build_object('max_per_hour', 100, 'max_per_day', 500),
        'email', jsonb_build_object('max_per_hour', 5, 'max_per_day', 20),
        'sms', jsonb_build_object('max_per_hour', 3, 'max_per_day', 10),
        'push', jsonb_build_object('max_per_hour', 10, 'max_per_day', 50)
    ),
    updated_at = NOW()
WHERE user_id = 'user-uuid'
AND dealer_id = 1
AND module = 'sales_orders';
```

### 5.2 Verificar Rate Limit Antes de Enviar

```sql
-- Check if user can receive SMS notification
SELECT check_user_rate_limit(
    'user-uuid',
    1,
    'sales_orders',
    'sms'
);

-- Returns: true if under limit, false if exceeded
```

### 5.3 Rate Limits Más Restrictivos para SMS

```sql
UPDATE user_notification_preferences_universal
SET
    rate_limits = jsonb_set(
        rate_limits,
        '{sms}',
        '{"max_per_hour": 2, "max_per_day": 5}'::jsonb
    ),
    updated_at = NOW()
WHERE user_id = 'user-uuid'
AND dealer_id = 1
AND module = 'get_ready';
```

---

## 6. Notification Delivery

### 6.1 Calcular Recipients para un Evento

```sql
-- Get all users who should receive notification
SELECT * FROM get_notification_recipients(
    1, -- dealer_id
    'sales_orders',
    'order_created',
    jsonb_build_object(
        'assigned_user_id', 'assigned-user-uuid',
        'created_by', 'creator-uuid',
        'priority', 'urgent',
        'order_value', 75000
    )
);

-- Returns: user_id, channels, rule_matched, priority
```

### 6.2 Filtrar Recipients por Canal

```sql
-- Get only users who want SMS notifications
SELECT DISTINCT
    r.user_id,
    r.channels
FROM get_notification_recipients(
    1,
    'sales_orders',
    'order_assigned',
    '{"assigned_user_id": "uuid"}'::jsonb
) r
WHERE r.channels @> '["sms"]'::jsonb; -- Contains 'sms' channel
```

### 6.3 Respetar Quiet Hours en Delivery

```sql
-- Get recipients and filter out those in quiet hours
SELECT
    r.user_id,
    r.channels,
    r.rule_matched,
    is_user_in_quiet_hours(r.user_id, 1, 'sales_orders') AS in_quiet_hours
FROM get_notification_recipients(
    1,
    'sales_orders',
    'order_created',
    '{"priority": "normal"}'::jsonb
) r
WHERE NOT is_user_in_quiet_hours(r.user_id, 1, 'sales_orders');
```

### 6.4 Verificar Rate Limits en Batch

```sql
-- Check rate limits for multiple users
SELECT
    r.user_id,
    r.channels,
    check_user_rate_limit(r.user_id, 1, 'sales_orders', 'sms') AS can_send_sms,
    check_user_rate_limit(r.user_id, 1, 'sales_orders', 'push') AS can_send_push
FROM get_notification_recipients(
    1,
    'sales_orders',
    'order_created',
    '{}'::jsonb
) r;
```

---

## 7. Queries Comunes

### 7.1 Usuarios con SMS Habilitado por Módulo

```sql
SELECT
    module,
    COUNT(*) AS users_with_sms,
    COUNT(CASE WHEN phone_number_override IS NOT NULL THEN 1 END) AS with_custom_phone
FROM user_notification_preferences_universal
WHERE dealer_id = 1
AND sms_enabled = true
GROUP BY module
ORDER BY module;
```

### 7.2 Preferencias de un Usuario en Todos los Módulos

```sql
SELECT
    module,
    in_app_enabled,
    email_enabled,
    sms_enabled,
    push_enabled,
    frequency,
    quiet_hours_enabled,
    (event_preferences->>'order_created') AS order_created_pref
FROM user_notification_preferences_universal
WHERE user_id = 'user-uuid'
AND dealer_id = 1
ORDER BY module;
```

### 7.3 Buscar Usuarios por Event Preference

```sql
-- Find users who want push notifications for sla_critical
SELECT
    user_id,
    module,
    event_preferences->'sla_critical' AS sla_critical_config
FROM user_notification_preferences_universal
WHERE dealer_id = 1
AND module = 'get_ready'
AND (event_preferences->'sla_critical'->>'enabled')::BOOLEAN = true
AND event_preferences->'sla_critical'->'channels' @> '["push"]'::jsonb;
```

### 7.4 Reglas de Dealer con Prioridad Alta

```sql
SELECT
    rule_name,
    module,
    event,
    recipients,
    priority,
    enabled
FROM dealer_notification_rules
WHERE dealer_id = 1
AND priority >= 70
AND enabled = true
ORDER BY priority DESC;
```

### 7.5 Usuarios Sin Configuración de Notificaciones

```sql
-- Find users who don't have notification preferences set
SELECT
    p.id AS user_id,
    p.email,
    dm.dealer_id,
    'missing_config' AS status
FROM profiles p
INNER JOIN dealer_memberships dm ON p.id = dm.user_id
LEFT JOIN user_notification_preferences_universal unp
    ON p.id = unp.user_id
    AND dm.dealer_id = unp.dealer_id
    AND unp.module = 'sales_orders'
WHERE dm.is_active = true
AND unp.id IS NULL
LIMIT 100;
```

---

## 8. Frontend Integration Examples

### 8.1 TypeScript Interface Definitions

```typescript
// User notification preferences
interface UserNotificationPreferences {
  id: string;
  user_id: string;
  dealer_id: number;
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' | 'get_ready';

  // Channel preferences
  in_app_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;

  // Event preferences (JSONB)
  event_preferences: {
    [event: string]: {
      enabled: boolean;
      channels: ('in_app' | 'email' | 'sms' | 'push')[];
      conditions?: any;
    };
  };

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string; // TIME
  quiet_hours_end?: string; // TIME
  quiet_hours_timezone?: string;

  // Rate limits
  rate_limits: {
    [channel: string]: {
      max_per_hour: number;
      max_per_day: number;
    };
  };

  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  auto_dismiss_read_after_days?: number;
  auto_dismiss_unread_after_days?: number;
  phone_number_override?: string;

  metadata?: any;
  created_at: string;
  updated_at: string;
}

// Dealer notification rule
interface DealerNotificationRule {
  id: string;
  dealer_id: number;
  module: string;
  event: string;
  rule_name: string;
  description?: string;

  recipients: {
    roles: string[];
    users: string[];
    include_assigned_user: boolean;
    include_followers: boolean;
    include_creator: boolean;
  };

  conditions: any;
  channels: ('in_app' | 'email' | 'sms' | 'push')[];
  priority: number;
  enabled: boolean;

  metadata?: any;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}
```

### 8.2 React Hook - useNotificationPreferences

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useNotificationPreferences(userId: string, dealerId: number, module: string) {
  const queryClient = useQueryClient();

  // Fetch preferences
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['notification-preferences', userId, dealerId, module],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_notification_config', {
          p_user_id: userId,
          p_dealer_id: dealerId,
          p_module: module
        });

      if (error) throw error;
      return data[0] as UserNotificationPreferences;
    }
  });

  // Update event preference
  const updateEventPreference = useMutation({
    mutationFn: async ({
      event,
      channel,
      enabled
    }: {
      event: string;
      channel: string | null;
      enabled: boolean;
    }) => {
      const { data, error } = await supabase
        .rpc('update_user_event_preference', {
          p_user_id: userId,
          p_dealer_id: dealerId,
          p_module: module,
          p_event: event,
          p_channel: channel,
          p_enabled: enabled
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: ['notification-preferences', userId, dealerId, module]
      });
    }
  });

  return {
    preferences,
    isLoading,
    error,
    updateEventPreference
  };
}
```

### 8.3 React Component - Notification Settings UI

```typescript
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function NotificationSettings({ userId, dealerId, module }: Props) {
  const { preferences, updateEventPreference } = useNotificationPreferences(
    userId,
    dealerId,
    module
  );

  if (!preferences) return <Loading />;

  const handleToggle = (event: string, channel: string, enabled: boolean) => {
    updateEventPreference.mutate({ event, channel, enabled });
  };

  return (
    <div className="space-y-6">
      <h2>Notification Preferences - {module}</h2>

      {/* Global Channel Settings */}
      <div className="space-y-4">
        <h3>Channels</h3>
        <div className="flex items-center justify-between">
          <Label>In-App Notifications</Label>
          <Switch
            checked={preferences.in_app_enabled}
            onCheckedChange={(checked) => {
              // Update via direct SQL or create separate RPC
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Email Notifications</Label>
          <Switch checked={preferences.email_enabled} />
        </div>
        <div className="flex items-center justify-between">
          <Label>SMS Notifications</Label>
          <Switch checked={preferences.sms_enabled} />
        </div>
      </div>

      {/* Event-Specific Settings */}
      <div className="space-y-4">
        <h3>Event Preferences</h3>
        {Object.entries(preferences.event_preferences).map(([event, config]) => (
          <div key={event} className="border p-4 rounded">
            <h4>{event}</h4>
            <div className="space-y-2">
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) =>
                  handleToggle(event, null, checked)
                }
              />
              {config.enabled && (
                <div className="ml-4">
                  {['in_app', 'email', 'sms', 'push'].map((channel) => (
                    <div key={channel}>
                      <Label>{channel}</Label>
                      <Switch
                        checked={config.channels.includes(channel)}
                        onCheckedChange={(checked) =>
                          handleToggle(event, channel, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 8.4 Supabase Client - Notification Delivery

```typescript
// Send notification respecting user preferences
async function sendNotification(
  dealerId: number,
  module: string,
  event: string,
  metadata: any
) {
  // 1. Get recipients
  const { data: recipients, error } = await supabase
    .rpc('get_notification_recipients', {
      p_dealer_id: dealerId,
      p_module: module,
      p_event: event,
      p_metadata: metadata
    });

  if (error) throw error;

  // 2. For each recipient, check quiet hours and rate limits
  for (const recipient of recipients) {
    // Check quiet hours
    const { data: inQuietHours } = await supabase
      .rpc('is_user_in_quiet_hours', {
        p_user_id: recipient.user_id,
        p_dealer_id: dealerId,
        p_module: module
      });

    if (inQuietHours) {
      console.log(`User ${recipient.user_id} is in quiet hours, skipping`);
      continue;
    }

    // Check rate limits for each channel
    for (const channel of recipient.channels) {
      const { data: canSend } = await supabase
        .rpc('check_user_rate_limit', {
          p_user_id: recipient.user_id,
          p_dealer_id: dealerId,
          p_module: module,
          p_channel: channel
        });

      if (canSend) {
        // Send notification via channel
        await sendViaChannel(recipient.user_id, channel, event, metadata);
      }
    }
  }
}

async function sendViaChannel(
  userId: string,
  channel: string,
  event: string,
  metadata: any
) {
  switch (channel) {
    case 'in_app':
      // Insert into notifications table
      break;
    case 'email':
      // Send via email service
      break;
    case 'sms':
      // Send via SMS provider
      break;
    case 'push':
      // Send via push notification service
      break;
  }
}
```

---

## 9. Testing & Debugging

### 9.1 Test User Preferences Creation

```sql
-- Create test user preferences
SELECT create_default_notification_preferences(
    'test-user-uuid',
    1,
    'sales_orders'
);

-- Verify creation
SELECT * FROM user_notification_preferences_universal
WHERE user_id = 'test-user-uuid';
```

### 9.2 Test Event Preference Update

```sql
-- Enable SMS for order_created
SELECT update_user_event_preference(
    'test-user-uuid',
    1,
    'sales_orders',
    'order_created',
    'sms',
    true
);

-- Verify update
SELECT
    event_preferences->'order_created' AS order_created_config
FROM user_notification_preferences_universal
WHERE user_id = 'test-user-uuid'
AND module = 'sales_orders';
```

### 9.3 Test Recipient Calculation

```sql
-- Test with mock metadata
SELECT * FROM get_notification_recipients(
    1,
    'sales_orders',
    'order_created',
    jsonb_build_object(
        'assigned_user_id', 'test-user-uuid',
        'created_by', 'creator-uuid',
        'priority', 'urgent'
    )
);
```

---

**Última Actualización**: 2025-10-29
**Versión**: 1.0.0
**Status**: ✅ PRODUCTION READY
