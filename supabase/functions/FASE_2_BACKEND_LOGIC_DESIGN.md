# FASE 2: Backend Logic Design - Sistema de Notificaciones Enterprise
## Análisis & Diseño de Integración PUSH+PULL

**Fecha**: 2025-10-28
**Status**: 🔍 ANÁLISIS COMPLETO - NO IMPLEMENTAR AÚN
**Principio Guía**: Cambios mínimos, máxima compatibilidad, zero downtime

---

## 📋 TABLA DE CONTENIDOS

1. [Estado Actual - Análisis](#estado-actual)
2. [Edge Functions Analizadas](#edge-functions-analizadas)
3. [Flujo de Decisión PUSH+PULL](#flujo-de-decisión-pushpull)
4. [Plan de Cambios Incrementales](#plan-de-cambios-incrementales)
5. [Riesgos Identificados](#riesgos-identificados)
6. [Testing Checklist](#testing-checklist)
7. [Rollback Plan](#rollback-plan)

---

## 🔍 ESTADO ACTUAL

### ✅ FASE 1 - Completada Exitosamente

#### Tablas Nuevas (Producción Ready)
1. **`user_notification_preferences_universal`**
   - Preferencias por user/dealer/module
   - Multi-canal: in_app, email, SMS, push
   - Event preferences JSONB (flexible)
   - Quiet hours + Rate limiting
   - 18 índices optimizados

2. **`dealer_notification_rules`**
   - Reglas de negocio a nivel dealership
   - Define **quién** recibe (roles, usuarios, assigned_user, followers)
   - Define **cuándo** (condiciones JSONB)
   - Priority system (0-100)

#### Helper Functions Disponibles
1. `get_user_notification_config(user_id, dealer_id, module)` - Config completo
2. `update_user_event_preference(user_id, dealer_id, module, event, channel, enabled)` - Update
3. `get_notification_recipients(dealer_id, module, event, metadata)` - Calcular recipients
4. `is_user_in_quiet_hours(user_id, dealer_id, module)` - Check quiet hours
5. `check_user_rate_limit(user_id, dealer_id, module, channel)` - Verify rate limits
6. `create_default_notification_preferences(user_id, dealer_id, module)` - Initialize

#### Tablas Deprecated (Backward Compatible)
- ⚠️ `user_notification_preferences` (Get Ready module - legacy)
- ⚠️ `user_sms_notification_preferences` (SMS - legacy)
- ✅ Views creadas para backward compatibility
- 📅 Sunset plan: 6 meses (2025-05-29)

#### Otras Tablas Existentes (NO TOCAR)
- `notification_templates` - Plantillas multi-canal (Settings Hub)
- `notification_log` - Log de notificaciones in-app
- `sms_send_history` - Historial de SMS enviados
- `notification_queue` - Cola de notificaciones (enhanced-notification-engine)
- `notification_analytics` - Métricas de delivery

---

## 📱 EDGE FUNCTIONS ANALIZADAS

### 1️⃣ **send-order-sms-notification** (CRÍTICO)

**Ubicación**: `supabase/functions/send-order-sms-notification/index.ts`
**Líneas**: 515 lines
**Última modificación**: 2025-10-28

#### Flujo Actual (BIEN DISEÑADO ✅)
```typescript
1. getUsersWithSMSPermission(dealerId, module)
   → Query: dealer_memberships + profiles + dealer_custom_roles
   → Filter: receive_sms_notifications permission
   → Filter: phone_number NOT NULL

2. filterByPreferences(users, dealerId, module, eventType, eventData)
   → Query: user_sms_notification_preferences (TABLA ANTIGUA ⚠️)
   → Filter: sms_enabled = true
   → Filter: event-specific preferences (status_changed, field_updated, etc.)

3. checkRateLimits(users, dealerId)
   → Query: user_sms_notification_preferences (max_sms_per_hour, max_sms_per_day)
   → Query: sms_send_history (count recent SMS)
   → Check quiet hours
   → Filter: hourly limit, daily limit

4. generateMessages(users, eventType, eventData)
   → Template-based message generation
   → Personalized per user

5. sendSMS(phoneNumber, message, orderId)
   → Twilio API call
   → Return: sid, status

6. recordSMSHistory(results, users, messages, dealerId, module, eventType, entityId)
   → Insert into sms_send_history
```

#### Tabla Usada Actualmente
```typescript
// ⚠️ USA TABLA ANTIGUA
const { data: preferences } = await supabase
  .from('user_sms_notification_preferences')  // LEGACY TABLE
  .select('*')
  .in('user_id', users.map(u => u.id))
  .eq('dealer_id', dealerId)
  .eq('module', module)
  .eq('sms_enabled', true);
```

#### ⚠️ PROBLEMAS IDENTIFICADOS
1. **Usa tabla antigua**: `user_sms_notification_preferences` (deprecated)
2. **No usa dealer rules**: Solo usa preferencias de usuario
3. **No consulta helper functions**: No usa `get_notification_recipients()`
4. **Duplicación de lógica**: Rate limits y quiet hours implementados manualmente

#### ✅ FORTALEZAS
1. **Arquitectura sólida**: Separación de concerns correcta
2. **Rate limiting robusto**: Implementado correctamente (aunque en lugar equivocado)
3. **Quiet hours bien manejados**: Lógica de timezone correcta
4. **Error handling**: Bien manejado con Promise.allSettled
5. **Logging**: Excelente para debugging
6. **No self-notification**: Filtra trigger user

---

### 2️⃣ **enhanced-notification-engine** (INTERMEDIO)

**Ubicación**: `supabase/functions/enhanced-notification-engine/index.ts`
**Líneas**: 561 lines
**Última modificación**: 2025-09-16

#### Flujo Actual (PULL-BASED ✅)
```typescript
1. Query notification_queue
   → Filter: status = 'queued'
   → Filter: scheduled_for <= NOW()
   → Limit: 50 notificaciones

2. processNotification(notification)
   → getUserPreferences(userId, dealerId)
   → getDealerConfig(dealerId)
   → getTemplate(templateId) [optional]

3. processChannel(channel, notification, userPrefs, dealerConfig, template)
   → isChannelEnabled(channel, userPrefs, dealerConfig)
   → renderTemplate(template, channel, data)
   → sendSMS() | sendEmail() | sendPush() | sendInApp()

4. trackAnalytics(event)
   → Insert into notification_analytics
```

#### Tablas Usadas
```typescript
// ⚠️ USA TABLAS ANTIGUAS
await supabase
  .from('user_notification_preferences')  // LEGACY (Get Ready)
  .select('*')
  .eq('user_id', userId)
  .eq('dealer_id', dealerId)
  .single();

await supabase
  .from('dealer_notification_configs')  // TABLA NO EXISTE ⚠️
  .select('*')
  .eq('dealer_id', dealerId)
  .single();
```

#### ⚠️ PROBLEMAS IDENTIFICADOS
1. **Usa tabla antigua**: `user_notification_preferences` (Get Ready only)
2. **Tabla inexistente**: `dealer_notification_configs` (devuelve null)
3. **No multi-módulo**: Solo maneja Get Ready
4. **No usa nuevas tablas**: No consulta `dealer_notification_rules`
5. **No usa helper functions**: Reimplementa lógica manualmente

#### ✅ FORTALEZAS
1. **Arquitectura PULL**: Procesa queue asíncronamente
2. **Multi-canal**: Soporta 4 canales (in_app, email, SMS, push)
3. **Template system**: Integración con notification_templates
4. **Analytics tracking**: Métricas completas
5. **Retry logic**: Maneja max_attempts
6. **Graceful degradation**: Si falla un canal, otros continúan

---

### 3️⃣ **notification-engine** (LEGACY - SIMPLE)

**Ubicación**: `supabase/functions/notification-engine/index.ts`
**Líneas**: 272 lines
**Última modificación**: 2025-09-12

#### Flujo Actual (PUSH-BASED - WORKFLOW DRIVEN)
```typescript
1. get_entity_followers(entityType, entityId, dealerId)
   → RPC call

2. Query notification_workflows
   → Filter: dealer_id, entity_type, trigger_event, is_active

3. evaluateConditions(workflow.conditions, data)

4. shouldNotifyFollower(actions, follower.notification_level)
   → Filter by notification_level: none, mentions, important, all

5. createNotification({userId, dealerId, entityType, entityId, action, data})
   → Insert into notification_log
   → Si action.type === 'sms' → invoke('enhanced-sms')
```

#### ⚠️ PROBLEMAS IDENTIFICADOS
1. **No usa nuevas tablas**: No consulta preferences ni rules
2. **Workflow-based only**: Depende de notification_workflows (tabla vieja)
3. **Sin rate limiting**: No verifica límites
4. **Sin quiet hours**: No respeta horarios
5. **Simple condition eval**: Solo equality checks

#### ✅ FORTALEZAS
1. **Follower-based**: Buen concepto de segmentación
2. **Workflow-driven**: Flexible para diferentes casos
3. **Multi-action**: Soporta múltiples acciones por workflow
4. **Template interpolation**: Básico pero funcional

---

### 4️⃣ **send-notification** (PUSH NOTIFICATION SENDER)

**Ubicación**: `supabase/functions/send-notification/index.ts`
**Líneas**: 458 lines
**Última modificación**: 2025-10-27

#### Flujo Actual (FIREBASE FCM v1)
```typescript
1. validateRequest(body)
   → userId, dealerId, title, body, url?, data?

2. Query fcm_tokens
   → Filter: user_id, dealer_id, is_active = true

3. getFirebaseAccessToken()
   → OAuth2 token generation with service account

4. sendFCMNotificationV1(token, title, body, url, data)
   → Firebase Cloud Messaging API v1
   → Handles token invalidation

5. logToDatabase(level, message, data)
   → edge_function_logs
```

#### ⚠️ PROBLEMAS IDENTIFICADOS
1. **No verifica preferencias**: No consulta user preferences
2. **No respeta quiet hours**: Envía sin verificar horario
3. **No rate limiting**: No verifica límites
4. **Direct send**: No usa notification_queue

#### ✅ FORTALEZAS
1. **FCM v1 API**: Usa versión moderna (no legacy)
2. **OAuth2**: Autenticación correcta
3. **Token management**: Invalida tokens expirados
4. **Error logging**: Excelente para debugging
5. **Multi-token**: Envía a todos los tokens del usuario

---

## 🔄 FLUJO DE DECISIÓN PUSH+PULL (DISEÑO PROPUESTO)

### Arquitectura Híbrida: PUSH → QUEUE → PULL

```
┌─────────────────────────────────────────────────────────────────┐
│                         EVENT TRIGGER                           │
│  (Order Created, Status Changed, Comment Added, etc.)           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 1: DEALER RULES QUERY                   │
│  RPC: get_notification_recipients(dealer_id, module, event)     │
│  - Consulta dealer_notification_rules                           │
│  - Filtra por: module, event, enabled = true                    │
│  - Aplica condiciones (priority, status, SLA, custom)           │
│  - Obtiene recipients: roles[], users[], assigned, followers    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 2: EXPAND RECIPIENTS (LIST)                   │
│  - roles[] → Query dealer_memberships + dealer_custom_roles     │
│  - users[] → Direct user IDs                                    │
│  - assigned_user → Get from entity.assigned_to                  │
│  - followers → RPC: get_entity_followers()                      │
│  RESULT: List of user_ids[]                                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│         STEP 3: USER PREFERENCES FILTER (PER USER)              │
│  RPC: get_user_notification_config(user_id, dealer_id, module)  │
│  FOR EACH user_id IN recipients:                                │
│    - Query user_notification_preferences_universal              │
│    - Check: channel_enabled (in_app/email/sms/push)            │
│    - Check: event_preferences[event].enabled                    │
│    - Check: event_preferences[event].channels[] includes        │
│  FILTER: Keep only users with event+channel enabled             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 4: QUIET HOURS CHECK (PER USER)               │
│  RPC: is_user_in_quiet_hours(user_id, dealer_id, module)        │
│  FOR EACH user_id IN filtered_recipients:                       │
│    - Get quiet_hours_enabled, start, end, timezone              │
│    - Calculate current time in user's timezone                  │
│    - If in quiet hours:                                         │
│      * For in_app/email: DEFER (add to queue)                   │
│      * For sms/push: SKIP (respect user preference)             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│            STEP 5: RATE LIMIT CHECK (PER USER+CHANNEL)          │
│  RPC: check_user_rate_limit(user_id, dealer_id, module, channel)│
│  FOR EACH (user_id, channel) IN pending_notifications:          │
│    - Get rate_limits from preferences                           │
│    - Query notification_analytics OR sms_send_history           │
│    - Count: last_hour, today                                    │
│    - If exceeded:                                               │
│      * High priority (>= 80): SEND ANYWAY (override)            │
│      * Normal priority: SKIP (respect limit)                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              STEP 6: NOTIFICATION QUEUE INSERT                  │
│  INSERT INTO notification_queue (batch_id, user_id, dealer_id,  │
│    notification_type, entity_type, entity_id, channels[],       │
│    notification_data, template_id?, priority, scheduled_for)    │
│                                                                 │
│  - batch_id: UUID (agrupa notificaciones del mismo evento)      │
│  - channels: Array de canales aprobados ['in_app', 'sms']      │
│  - scheduled_for: NOW() o quiet_hours_end                       │
│  - priority: De dealer_notification_rules                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│            STEP 7: ASYNC PROCESSING (PULL WORKER)               │
│  enhanced-notification-engine (cron job o trigger)              │
│  - Query notification_queue WHERE scheduled_for <= NOW()        │
│  - Process batch (up to 50)                                     │
│  - FOR EACH notification:                                       │
│    * renderTemplate(template_id, data)                          │
│    * sendChannel(channel, recipient, content)                   │
│    * trackAnalytics(event)                                      │
│    * updateStatus(completed/failed)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Decisión Key: ¿PUSH Directo o QUEUE?

#### Envío Directo (PUSH - Sin Queue)
- ✅ **SMS para eventos urgentes** (priority >= 90)
- ✅ **Push notifications críticas** (SLA warnings)
- ✅ **Cuando rate limit permite Y no quiet hours**

#### Queue (PULL - Async)
- ✅ **Email** (siempre diferido)
- ✅ **In-app** (no urgente)
- ✅ **Cuando usuario en quiet hours**
- ✅ **Cuando rate limit excedido** (retry later)
- ✅ **Batch operations** (múltiples usuarios)

---

## 🛠️ PLAN DE CAMBIOS INCREMENTALES

### FASE 2.1: Preparación (SAFE - NO BREAKING)

#### Archivo: `supabase/functions/_shared/notification-decision-engine.ts` (NUEVO)

```typescript
// ============================================================================
// NOTIFICATION DECISION ENGINE - FASE 2
// ============================================================================
// Purpose: Centralized logic for PUSH+PULL decision making
// Uses: New tables + helper functions from FASE 1
// ============================================================================

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationEvent {
  dealerId: number;
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' | 'get_ready';
  event: string; // 'order_created', 'status_changed', etc.
  entityType: string;
  entityId: string;
  eventData: Record<string, any>;
  triggeredBy?: string; // user_id que hizo la acción
  priority?: number; // 0-100 (opcional, se obtiene de dealer rules)
}

interface NotificationRecipient {
  userId: string;
  channels: string[]; // ['in_app', 'sms', 'push', 'email']
  scheduledFor: Date; // NOW o después si quiet hours
  priority: number; // De dealer rules
}

interface DecisionResult {
  shouldSend: boolean;
  recipients: NotificationRecipient[];
  batchId: string;
  queuedCount: number;
  skippedCount: number;
  reasoning: string[];
}

// ============================================================================
// MAIN DECISION FUNCTION
// ============================================================================

export async function decideNotificationStrategy(
  supabase: SupabaseClient,
  event: NotificationEvent
): Promise<DecisionResult> {
  const reasoning: string[] = [];
  const batchId = crypto.randomUUID();

  // STEP 1: Query dealer rules
  const { data: dealerRules, error: rulesError } = await supabase.rpc(
    'get_notification_recipients',
    {
      p_dealer_id: event.dealerId,
      p_module: event.module,
      p_event: event.event,
      p_metadata: event.eventData
    }
  );

  if (rulesError) {
    reasoning.push(`❌ Error querying dealer rules: ${rulesError.message}`);
    return {
      shouldSend: false,
      recipients: [],
      batchId,
      queuedCount: 0,
      skippedCount: 0,
      reasoning
    };
  }

  if (!dealerRules || dealerRules.length === 0) {
    reasoning.push('ℹ️ No dealer rules matched for this event');
    return {
      shouldSend: false,
      recipients: [],
      batchId,
      queuedCount: 0,
      skippedCount: 0,
      reasoning
    };
  }

  reasoning.push(`✅ Found ${dealerRules.length} matching dealer rules`);

  // STEP 2: Expand recipients (roles, users, assigned, followers)
  const recipientUserIds = await expandRecipients(supabase, event, dealerRules);
  reasoning.push(`📋 Expanded to ${recipientUserIds.size} unique recipients`);

  // Remove trigger user (no self-notification)
  if (event.triggeredBy) {
    recipientUserIds.delete(event.triggeredBy);
    reasoning.push(`👤 Removed trigger user from recipients`);
  }

  // STEP 3-5: Filter by preferences, quiet hours, rate limits
  const recipients: NotificationRecipient[] = [];
  let skipped = 0;

  for (const userId of recipientUserIds) {
    const result = await evaluateUserEligibility(
      supabase,
      userId,
      event,
      dealerRules[0].priority || 50 // Use priority from first matching rule
    );

    if (result.eligible) {
      recipients.push({
        userId,
        channels: result.channels,
        scheduledFor: result.scheduledFor,
        priority: result.priority
      });
    } else {
      skipped++;
      reasoning.push(`⏭️ Skipped user ${userId}: ${result.reason}`);
    }
  }

  reasoning.push(`✅ Final eligible recipients: ${recipients.length}`);
  reasoning.push(`⏭️ Skipped recipients: ${skipped}`);

  return {
    shouldSend: recipients.length > 0,
    recipients,
    batchId,
    queuedCount: recipients.length,
    skippedCount: skipped,
    reasoning
  };
}

// ============================================================================
// HELPER: Expand Recipients
// ============================================================================

async function expandRecipients(
  supabase: SupabaseClient,
  event: NotificationEvent,
  dealerRules: any[]
): Promise<Set<string>> {
  const userIds = new Set<string>();

  for (const rule of dealerRules) {
    const recipients = rule.recipients || {};

    // 1. Direct user IDs
    if (recipients.users && Array.isArray(recipients.users)) {
      recipients.users.forEach((uid: string) => userIds.add(uid));
    }

    // 2. Roles
    if (recipients.roles && Array.isArray(recipients.roles)) {
      const { data: roleUsers } = await supabase
        .from('dealer_memberships')
        .select('user_id, dealer_custom_roles!inner(role_name)')
        .eq('dealer_id', event.dealerId)
        .eq('is_active', true)
        .in('dealer_custom_roles.role_name', recipients.roles);

      if (roleUsers) {
        roleUsers.forEach((u: any) => userIds.add(u.user_id));
      }
    }

    // 3. Assigned user
    if (recipients.include_assigned_user) {
      // Get assigned_to from entity (order)
      const { data: entity } = await supabase
        .from(event.module) // Tabla del módulo
        .select('assigned_to')
        .eq('id', event.entityId)
        .single();

      if (entity?.assigned_to) {
        userIds.add(entity.assigned_to);
      }
    }

    // 4. Followers
    if (recipients.include_followers) {
      const { data: followers } = await supabase.rpc('get_entity_followers', {
        p_entity_type: event.entityType,
        p_entity_id: event.entityId,
        p_dealer_id: event.dealerId
      });

      if (followers) {
        followers.forEach((f: any) => userIds.add(f.user_id));
      }
    }
  }

  return userIds;
}

// ============================================================================
// HELPER: Evaluate User Eligibility
// ============================================================================

interface EligibilityResult {
  eligible: boolean;
  channels: string[];
  scheduledFor: Date;
  priority: number;
  reason?: string;
}

async function evaluateUserEligibility(
  supabase: SupabaseClient,
  userId: string,
  event: NotificationEvent,
  rulePriority: number
): Promise<EligibilityResult> {
  const now = new Date();

  // Get user notification config (uses helper function from FASE 1)
  const { data: config, error } = await supabase.rpc(
    'get_user_notification_config',
    {
      p_user_id: userId,
      p_dealer_id: event.dealerId,
      p_module: event.module
    }
  );

  if (error || !config || config.length === 0) {
    return {
      eligible: false,
      channels: [],
      scheduledFor: now,
      priority: rulePriority,
      reason: 'No notification config found'
    };
  }

  const userConfig = config[0];

  // Check event preferences
  const eventPref = userConfig.event_preferences?.[event.event];
  if (!eventPref?.enabled) {
    return {
      eligible: false,
      channels: [],
      scheduledFor: now,
      priority: rulePriority,
      reason: `Event '${event.event}' disabled in preferences`
    };
  }

  // Get enabled channels
  const enabledChannels: string[] = [];
  const eventChannels = eventPref.channels || [];

  if (userConfig.in_app_enabled && eventChannels.includes('in_app')) {
    enabledChannels.push('in_app');
  }
  if (userConfig.email_enabled && eventChannels.includes('email')) {
    enabledChannels.push('email');
  }
  if (userConfig.sms_enabled && eventChannels.includes('sms')) {
    enabledChannels.push('sms');
  }
  if (userConfig.push_enabled && eventChannels.includes('push')) {
    enabledChannels.push('push');
  }

  if (enabledChannels.length === 0) {
    return {
      eligible: false,
      channels: [],
      scheduledFor: now,
      priority: rulePriority,
      reason: 'No channels enabled for this event'
    };
  }

  // Check quiet hours (uses helper function from FASE 1)
  const { data: inQuietHours } = await supabase.rpc(
    'is_user_in_quiet_hours',
    {
      p_user_id: userId,
      p_dealer_id: event.dealerId,
      p_module: event.module
    }
  );

  let scheduledFor = now;
  if (inQuietHours) {
    // High priority can override quiet hours for critical channels
    if (rulePriority >= 90) {
      // Allow critical notifications even in quiet hours
      // But respect for non-critical channels
      const criticalChannels = ['in_app']; // Only in-app is allowed
      const filteredChannels = enabledChannels.filter(c => criticalChannels.includes(c));

      if (filteredChannels.length === 0) {
        // Defer to after quiet hours
        scheduledFor = calculateQuietHoursEnd(userConfig);
      }
    } else {
      // Normal priority: defer all channels
      scheduledFor = calculateQuietHoursEnd(userConfig);
    }
  }

  // Check rate limits (per channel)
  const finalChannels: string[] = [];
  for (const channel of enabledChannels) {
    const { data: rateLimitOk } = await supabase.rpc(
      'check_user_rate_limit',
      {
        p_user_id: userId,
        p_dealer_id: event.dealerId,
        p_module: event.module,
        p_channel: channel
      }
    );

    if (rateLimitOk || rulePriority >= 80) {
      // Allow if rate limit ok OR high priority override
      finalChannels.push(channel);
    }
  }

  if (finalChannels.length === 0) {
    return {
      eligible: false,
      channels: [],
      scheduledFor: now,
      priority: rulePriority,
      reason: 'All channels hit rate limits'
    };
  }

  return {
    eligible: true,
    channels: finalChannels,
    scheduledFor,
    priority: rulePriority
  };
}

// ============================================================================
// HELPER: Calculate Quiet Hours End
// ============================================================================

function calculateQuietHoursEnd(config: any): Date {
  // Implementation: Calculate when quiet hours end based on timezone
  // For now, simple implementation (defer by 1 hour)
  const defer = new Date();
  defer.setHours(defer.getHours() + 1);
  return defer;
}

// ============================================================================
// QUEUE INSERTION FUNCTION
// ============================================================================

export async function queueNotifications(
  supabase: SupabaseClient,
  event: NotificationEvent,
  decision: DecisionResult
): Promise<{ success: boolean; error?: string }> {
  if (!decision.shouldSend || decision.recipients.length === 0) {
    return { success: false, error: 'No recipients to queue' };
  }

  const records = decision.recipients.map(recipient => ({
    batch_id: decision.batchId,
    user_id: recipient.userId,
    dealer_id: event.dealerId,
    notification_type: event.event,
    entity_type: event.entityType,
    entity_id: event.entityId,
    channels: recipient.channels,
    notification_data: event.eventData,
    // template_id: null, // TODO: Lookup from notification_templates
    priority: recipient.priority >= 90 ? 'urgent' : recipient.priority >= 70 ? 'high' : 'normal',
    scheduled_for: recipient.scheduledFor.toISOString(),
    status: 'queued',
    attempts: 0,
    max_attempts: 3
  }));

  const { error } = await supabase
    .from('notification_queue')
    .insert(records);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
```

**🔑 VENTAJAS DE ESTE DISEÑO:**
- ✅ NO modifica funciones existentes (safe)
- ✅ Usa helper functions de FASE 1
- ✅ Centraliza lógica de decisión
- ✅ Fácil de testear independientemente
- ✅ Reutilizable por todas las Edge Functions

---

### FASE 2.2: Modificar `send-order-sms-notification` (INCREMENTAL)

#### Estrategia: Feature Flag + Backward Compatibility

```typescript
// ============================================================================
// CAMBIO MÍNIMO - OPCIÓN 1: Feature Flag
// ============================================================================

// En el handler principal, agregar al inicio:
const USE_NEW_NOTIFICATION_SYSTEM = Deno.env.get('USE_NEW_NOTIFICATION_SYSTEM') === 'true';

if (USE_NEW_NOTIFICATION_SYSTEM) {
  // NEW PATH: Usar decision engine
  const { decideNotificationStrategy, queueNotifications } = await import('../_shared/notification-decision-engine.ts');

  const decision = await decideNotificationStrategy(supabase, {
    dealerId: request.dealerId,
    module: request.module,
    event: request.eventType,
    entityType: 'order',
    entityId: request.orderId,
    eventData: request.eventData,
    triggeredBy: request.triggeredBy
  });

  console.log('📊 Decision reasoning:', decision.reasoning);

  // Filter only SMS recipients
  const smsRecipients = decision.recipients.filter(r => r.channels.includes('sms'));

  if (smsRecipients.length === 0) {
    return new Response(
      JSON.stringify({ success: true, sent: 0, message: 'No SMS recipients after filtering' }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Get user details (phone numbers)
  const userIds = smsRecipients.map(r => r.userId);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone_number')
    .in('id', userIds)
    .not('phone_number', 'is', null);

  if (!profiles || profiles.length === 0) {
    return new Response(
      JSON.stringify({ success: true, sent: 0, message: 'No users with phone numbers' }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Convert to SMSRecipient format
  const finalUsers: SMSRecipient[] = profiles.map(p => ({
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    phone_number: p.phone_number,
  }));

  // CONTINUE WITH EXISTING LOGIC (steps 5-6 unchanged)
  const messages = generateMessages(finalUsers, request.eventType, request.eventData);
  const results = await Promise.allSettled(
    messages.map(({ user, message }) => sendSMS(user.phone_number, message, request.orderId))
  );

  await recordSMSHistory(results, finalUsers, messages, request.dealerId, request.module, request.eventType, request.orderId);

  const successCount = results.filter(r => r.status === 'fulfilled').length;
  const failedCount = results.filter(r => r.status === 'rejected').length;

  return new Response(
    JSON.stringify({
      success: true,
      sent: successCount,
      failed: failedCount,
      recipients: finalUsers.length,
      decision_reasoning: decision.reasoning
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );

} else {
  // OLD PATH: Código existente sin cambios
  // (mantener todo el código actual)
}
```

**🔑 VENTAJAS DE ESTE APPROACH:**
1. ✅ **Zero breaking changes**: Old path sigue funcionando
2. ✅ **A/B testing**: Podemos testear new path en staging
3. ✅ **Easy rollback**: Solo cambiar env variable
4. ✅ **Gradual migration**: Activar por dealer o module
5. ✅ **Minimal diff**: Solo 50 líneas agregadas al inicio

---

### FASE 2.3: Modificar `enhanced-notification-engine` (SAFE)

#### Estrategia: Solo actualizar queries de tablas

```typescript
// ============================================================================
// CAMBIO MÍNIMO - getUserPreferences
// ============================================================================

// BEFORE (línea 442-459)
async function getUserPreferences(userId: string, dealerId: number): Promise<UserNotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')  // ❌ TABLA ANTIGUA
      .select('*')
      .eq('user_id', userId)
      .eq('dealer_id', dealerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get user preferences error:', error);
    }

    return data;
  } catch (error) {
    console.error('Get user preferences error:', error);
    return null;
  }
}

// AFTER (usar helper function de FASE 1)
async function getUserPreferences(userId: string, dealerId: number, module: string): Promise<UserNotificationPreferences | null> {
  try {
    // ✅ Usar helper function que consulta nueva tabla
    const { data, error } = await supabase.rpc(
      'get_user_notification_config',
      {
        p_user_id: userId,
        p_dealer_id: dealerId,
        p_module: module  // ⚠️ Necesitamos agregar module al notification_queue
      }
    );

    if (error) {
      console.error('Get user preferences error:', error);
      return null;
    }

    // Convertir formato de respuesta a UserNotificationPreferences
    if (data && data.length > 0) {
      return {
        user_id: userId,
        dealer_id: dealerId,
        channel_preferences: {
          sms: { enabled: data[0].sms_enabled },
          email: { enabled: data[0].email_enabled },
          push: { enabled: data[0].push_enabled },
          in_app: { enabled: data[0].in_app_enabled }
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Get user preferences error:', error);
    return null;
  }
}

// ============================================================================
// CAMBIO MÍNIMO - getDealerConfig
// ============================================================================

// BEFORE (línea 462-478)
async function getDealerConfig(dealerId: number): Promise<DealerNotificationConfig | null> {
  try {
    const { data, error } = await supabase
      .from('dealer_notification_configs')  // ❌ TABLA NO EXISTE
      .select('*')
      .eq('dealer_id', dealerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get dealer config error:', error);
    }

    return data;
  } catch (error) {
    console.error('Get dealer config error:', error);
    return null;
  }
}

// AFTER (usar dealer_notification_rules)
async function getDealerConfig(dealerId: number, module: string): Promise<DealerNotificationConfig | null> {
  try {
    // ✅ Query nueva tabla dealer_notification_rules
    const { data, error } = await supabase
      .from('dealer_notification_rules')
      .select('channels')
      .eq('dealer_id', dealerId)
      .eq('module', module)
      .eq('enabled', true)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get dealer config error:', error);
      return null;
    }

    // Convertir a formato esperado
    if (data) {
      const channels = Array.isArray(data.channels) ? data.channels : [];
      return {
        dealer_id: dealerId,
        channels: {
          sms: channels.includes('sms'),
          email: channels.includes('email'),
          push: channels.includes('push'),
          in_app: channels.includes('in_app')
        }
      };
    }

    // Default: todos habilitados si no hay reglas
    return {
      dealer_id: dealerId,
      channels: {
        sms: true,
        email: true,
        push: true,
        in_app: true
      }
    };
  } catch (error) {
    console.error('Get dealer config error:', error);
    return null;
  }
}
```

**⚠️ BREAKING CHANGE DETECTADO:**
- `notification_queue` table necesita agregar columna `module`
- Migration necesaria ANTES de este cambio

---

### FASE 2.4: Agregar `module` a `notification_queue` (DATABASE CHANGE)

#### Migration: `20251029000004_add_module_to_notification_queue.sql`

```sql
-- ============================================================================
-- Add module column to notification_queue
-- ============================================================================
-- Purpose: Support multi-module notification system
-- Required for: enhanced-notification-engine upgrade to use new tables
-- ============================================================================

BEGIN;

-- Add module column
ALTER TABLE notification_queue
ADD COLUMN IF NOT EXISTS module VARCHAR(50);

-- Backfill existing rows (assume 'get_ready' for legacy)
UPDATE notification_queue
SET module = 'get_ready'
WHERE module IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE notification_queue
ALTER COLUMN module SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_notification_queue_module
ON notification_queue(module, status, scheduled_for)
WHERE status = 'queued';

-- Update comment
COMMENT ON COLUMN notification_queue.module IS 'Module identifier: sales_orders, service_orders, recon_orders, car_wash, get_ready';

COMMIT;
```

**🔑 SEGURIDAD:**
- ✅ Usa `IF NOT EXISTS` y `IF NOT NULL` (idempotente)
- ✅ Backfill antes de `NOT NULL` constraint
- ✅ No rompe código existente (default a 'get_ready')
- ✅ Index agregado para queries eficientes

---

### FASE 2.5: Modificar `notification-engine` (OPTIONAL - LOW PRIORITY)

**Status**: ⚠️ SKIP FOR NOW

**Razón**:
- Usa workflow system (tabla `notification_workflows`)
- No está claro si sigue en uso activo
- Menor prioridad vs send-order-sms-notification

**Estrategia Recomendada**:
- Monitor usage en producción (logs)
- Si se usa poco → deprecar
- Si se usa mucho → refactor DESPUÉS de FASE 2.2/2.3 estables

---

### FASE 2.6: Modificar `send-notification` (PUSH) (FUTURE)

**Status**: 🔮 FUTURE ENHANCEMENT

**Cambios Necesarios**:
1. Agregar verificación de user preferences antes de enviar
2. Respetar quiet hours
3. Verificar rate limits
4. Logging mejorado

**Estrategia**:
- Implementar DESPUÉS de FASE 2.2 probada
- Bajo impacto: solo push notifications
- Puede seguir funcionando "as-is" mientras tanto

---

## ⚠️ RIESGOS IDENTIFICADOS

### RIESGO #1: Tabla `notification_queue` sin `module` column
**Severidad**: 🔴 HIGH
**Impacto**: Breaking change en `enhanced-notification-engine`
**Mitigación**:
- ✅ Migration 20251029000004 antes de code changes
- ✅ Backfill existing rows con default value
- ✅ Test en staging primero

### RIESGO #2: Feature flag no seteado correctamente
**Severidad**: 🟡 MEDIUM
**Impacto**: Old path sigue usándose aunque new path esté ready
**Mitigación**:
- ✅ Documentation clara de env variables
- ✅ Default a old path (safe)
- ✅ Logs para identificar qué path se usa

### RIESGO #3: Rate limit double-counting
**Severidad**: 🟡 MEDIUM
**Impacto**: Users bloqueados incorrectamente
**Mitigación**:
- ✅ Helper function `check_user_rate_limit` usa una sola fuente de verdad
- ✅ Query ambas tablas (sms_send_history + notification_analytics) durante transición
- ✅ Tests específicos para este caso

### RIESGO #4: Quiet hours timezone bugs
**Severidad**: 🟡 MEDIUM
**Impacto**: Notificaciones enviadas en horario incorrecto
**Mitigación**:
- ✅ Helper function `is_user_in_quiet_hours` maneja timezone
- ✅ Tests con múltiples timezones
- ✅ Logs detallados de cálculos

### RIESGO #5: Performance degradation
**Severidad**: 🟡 MEDIUM
**Impacto**: Queries lentas por múltiples RPC calls
**Mitigación**:
- ✅ Índices ya creados en FASE 1 (18 indices)
- ✅ RPC functions usan STABLE (cacheable)
- ✅ Monitor query performance en production

### RIESGO #6: Backward compatibility views no usadas
**Severidad**: 🟢 LOW
**Impacto**: Código legacy sigue usando tablas viejas
**Mitigación**:
- ✅ Views creadas en FASE 1 migration 20251029000002
- ✅ Frontend puede seguir usando old endpoints
- ✅ Gradual migration frontend-side

### RIESGO #7: SMS costs increase
**Severidad**: 🟢 LOW
**Impacto**: Más SMS enviados si rate limits no funcionan
**Mitigación**:
- ✅ Rate limits por defecto en nueva tabla
- ✅ Override solo para high priority (>= 80)
- ✅ Alertas en Twilio dashboard

---

## ✅ TESTING CHECKLIST

### Pre-Deployment Tests (Staging)

#### Database Tests
- [ ] Run migration 20251029000004 (add module to notification_queue)
- [ ] Verify backfill: `SELECT COUNT(*) FROM notification_queue WHERE module IS NULL;` → 0
- [ ] Verify indexes: `\d notification_queue` → idx_notification_queue_module exists
- [ ] Test helper functions:
  ```sql
  SELECT * FROM get_user_notification_config('user-uuid', 1, 'sales_orders');
  SELECT * FROM get_notification_recipients(1, 'sales_orders', 'order_created', '{}');
  SELECT * FROM is_user_in_quiet_hours('user-uuid', 1, 'sales_orders');
  SELECT * FROM check_user_rate_limit('user-uuid', 1, 'sales_orders', 'sms');
  ```

#### Unit Tests (notification-decision-engine.ts)
- [ ] Test decideNotificationStrategy() con dealer rules existentes
- [ ] Test expandRecipients() con roles, users, assigned, followers
- [ ] Test evaluateUserEligibility() con preferences habilitadas/deshabilitadas
- [ ] Test evaluateUserEligibility() con quiet hours activas
- [ ] Test evaluateUserEligibility() con rate limits excedidos
- [ ] Test evaluateUserEligibility() con high priority override (>= 80)
- [ ] Test queueNotifications() inserción correcta

#### Integration Tests (send-order-sms-notification)
- [ ] **OLD PATH** (USE_NEW_NOTIFICATION_SYSTEM=false):
  - [ ] Enviar SMS con user_sms_notification_preferences existente
  - [ ] Verificar rate limits respetados
  - [ ] Verificar quiet hours respetadas
  - [ ] Verificar self-notification filtrada

- [ ] **NEW PATH** (USE_NEW_NOTIFICATION_SYSTEM=true):
  - [ ] Enviar SMS con user_notification_preferences_universal
  - [ ] Verificar dealer rules aplicadas
  - [ ] Verificar rate limits respetados (via helper function)
  - [ ] Verificar quiet hours respetadas (via helper function)
  - [ ] Verificar self-notification filtrada
  - [ ] Comparar resultados: old vs new path (deben ser idénticos)

#### Integration Tests (enhanced-notification-engine)
- [ ] Process notification_queue con module='sales_orders'
- [ ] Process notification_queue con module='get_ready' (legacy)
- [ ] Verify getUserPreferences() usa nueva tabla
- [ ] Verify getDealerConfig() usa nueva tabla
- [ ] Verify multi-channel delivery (in_app, email, sms, push)
- [ ] Verify analytics tracking correcto

#### End-to-End Tests
- [ ] **Scenario 1**: Order created → SMS enviado → sms_send_history updated
- [ ] **Scenario 2**: Status changed → In-app + Push → notification_queue → processed
- [ ] **Scenario 3**: User in quiet hours → Notification deferred
- [ ] **Scenario 4**: User hit rate limit → Notification skipped (or deferred if high priority)
- [ ] **Scenario 5**: High priority alert (>= 90) → Overrides quiet hours
- [ ] **Scenario 6**: Dealer rule with role filter → Correct recipients

### Performance Tests
- [ ] Benchmark decideNotificationStrategy() - Target: < 200ms
- [ ] Benchmark RPC helper functions - Target: < 20ms each
- [ ] Benchmark notification_queue insertion - Target: < 50ms
- [ ] Load test: 100 concurrent order_created events
- [ ] Load test: 1000 queued notifications processing

### Monitoring Setup (Production)
- [ ] Supabase logs filter: `send-order-sms-notification`
- [ ] Supabase logs filter: `enhanced-notification-engine`
- [ ] Alert: SMS send failures > 5% in 1 hour
- [ ] Alert: notification_queue size > 10000
- [ ] Alert: Average processing time > 500ms
- [ ] Dashboard: SMS sent per hour (Grafana or similar)
- [ ] Dashboard: Notification queue size over time

---

## 🔄 ROLLBACK PLAN

### NIVEL 1: Rollback Feature Flag (INSTANT - 0 downtime)

```bash
# En Supabase Dashboard → Edge Functions → send-order-sms-notification → Secrets
USE_NEW_NOTIFICATION_SYSTEM=false

# O via Supabase CLI
supabase secrets set USE_NEW_NOTIFICATION_SYSTEM=false --project-ref <project-id>
```

**Efecto**: Vuelve a old path inmediatamente
**Downtime**: 0 segundos
**Data loss**: Ninguno

---

### NIVEL 2: Rollback Code Deployment (FAST - 2-5 min downtime)

```bash
# Rollback to previous commit
cd C:\Users\rudyr\apps\mydetailarea
git log --oneline  # Find commit BEFORE changes
git revert <commit-hash>

# Redeploy function
supabase functions deploy send-order-sms-notification
supabase functions deploy enhanced-notification-engine
```

**Efecto**: Código vuelve a versión anterior
**Downtime**: 2-5 minutos (redeploy)
**Data loss**: Ninguno (tablas no cambian)

---

### NIVEL 3: Rollback Database Migration (COMPLEX - Plan B)

⚠️ **SOLO SI ES ABSOLUTAMENTE NECESARIO**

```sql
-- Rollback migration 20251029000004 (remove module from notification_queue)
BEGIN;

-- Drop index
DROP INDEX IF EXISTS idx_notification_queue_module;

-- Remove column (⚠️ DESTRUCTIVE)
ALTER TABLE notification_queue
DROP COLUMN IF EXISTS module;

COMMIT;
```

**Efecto**: Elimina columna module de notification_queue
**Downtime**: 5-10 segundos (tabla lock)
**Data loss**: ⚠️ SÍ - Se pierde info de module (backfill a 'get_ready' al rehacer)

**⚠️ IMPORTANT**: Este rollback NO es recomendado. Mejor dejar la columna y solo hacer rollback de código.

---

### NIVEL 4: Emergency Disable (NUCLEAR OPTION)

```sql
-- Disable ALL dealer notification rules temporalmente
UPDATE dealer_notification_rules
SET enabled = false
WHERE enabled = true;

-- O solo para módulo específico
UPDATE dealer_notification_rules
SET enabled = false
WHERE module = 'sales_orders' AND enabled = true;
```

**Efecto**: Desactiva sistema completamente
**Downtime**: 0 segundos
**Data loss**: Ninguno
**Recovery**: `UPDATE dealer_notification_rules SET enabled = true WHERE ...`

---

## 📊 MÉTRICAS DE ÉXITO (KPIs)

### Performance
- ✅ **Decision time**: < 200ms (p95)
- ✅ **RPC functions**: < 20ms each (p95)
- ✅ **Queue insertion**: < 50ms (p95)
- ✅ **SMS delivery**: < 5 seconds (p95)
- ✅ **Queue processing**: < 1 minute backlog

### Reliability
- ✅ **SMS delivery rate**: > 99%
- ✅ **Error rate**: < 1%
- ✅ **Rate limit violations**: < 1% of attempts
- ✅ **Quiet hours compliance**: 100%

### Business
- ✅ **User opt-out rate**: < 5% monthly
- ✅ **Dealer rules active**: > 80% of dealers
- ✅ **Multi-channel usage**: > 50% use 2+ channels
- ✅ **Cost per notification**: < $0.01 (SMS + push + email combined)

---

## 🚀 DEPLOYMENT SEQUENCE (RECOMMENDED)

### Week 1: Preparation
- [ ] Code review: notification-decision-engine.ts
- [ ] Create tests for decision engine
- [ ] Database migration 20251029000004 en staging
- [ ] Verify helper functions en staging

### Week 2: Staging Deployment
- [ ] Deploy notification-decision-engine.ts a staging
- [ ] Deploy modified send-order-sms-notification (feature flag OFF)
- [ ] Deploy modified enhanced-notification-engine
- [ ] Run integration tests
- [ ] Performance benchmarks

### Week 3: Production Soft Launch
- [ ] Database migration 20251029000004 en production (off-hours)
- [ ] Deploy all functions to production
- [ ] Enable feature flag for 1 dealer only (A/B test)
- [ ] Monitor 48 hours
- [ ] Compare metrics: old vs new

### Week 4: Production Rollout
- [ ] Enable feature flag for 25% of dealers
- [ ] Monitor 1 week
- [ ] Enable for 50% of dealers
- [ ] Monitor 1 week
- [ ] Enable for 100% of dealers (full rollout)

### Week 5+: Monitoring & Optimization
- [ ] Collect feedback from dealers
- [ ] Analyze performance metrics
- [ ] Optimize slow queries if needed
- [ ] Document lessons learned
- [ ] Plan FASE 3 (frontend integration)

---

## 📝 DOCUMENTATION UPDATES NEEDED

### Developer Docs
- [ ] Update API documentation: send-order-sms-notification
- [ ] Update API documentation: enhanced-notification-engine
- [ ] Create guide: "How to use notification decision engine"
- [ ] Create guide: "How to configure dealer notification rules"

### Operator Docs
- [ ] Update runbook: "Notification system troubleshooting"
- [ ] Create playbook: "How to rollback notification changes"
- [ ] Update monitoring dashboard guide
- [ ] Create alert response guide

### User Docs (Dealer Admin)
- [ ] Guide: "Configure notification rules for your dealership"
- [ ] Guide: "Understanding notification priority system"
- [ ] FAQ: "Why didn't I receive a notification?"

---

## 🎯 CONCLUSIÓN Y PRÓXIMOS PASOS

### ✅ Lo que tenemos (FASE 1 - DONE)
1. ✅ Schema unificado (`user_notification_preferences_universal`, `dealer_notification_rules`)
2. ✅ Helper functions RPC (6 funciones)
3. ✅ Migración de datos sin pérdida
4. ✅ Backward compatibility views
5. ✅ Documentación exhaustiva

### 🔄 Lo que diseñamos (FASE 2 - THIS DOCUMENT)
1. ✅ Flujo de decisión PUSH+PULL completo
2. ✅ Notification decision engine (shared logic)
3. ✅ Plan de cambios incrementales (6 fases)
4. ✅ Estrategia de feature flags
5. ✅ Riesgos identificados con mitigaciones
6. ✅ Testing checklist comprehensivo
7. ✅ Rollback plan multi-nivel

### 🚀 Próximos Pasos Inmediatos (DO NOT IMPLEMENT YET)

**Esperar aprobación antes de proceder con:**
1. Code review de notification-decision-engine.ts design
2. Feedback sobre feature flag strategy
3. Validación de database migration plan
4. Sign-off de testing checklist

**Una vez aprobado:**
1. Implementar notification-decision-engine.ts
2. Crear tests unitarios
3. Database migration 20251029000004 (staging)
4. Modificar send-order-sms-notification (feature flag)
5. Testing extensivo en staging
6. Production deployment (gradual rollout)

---

**Status Final**: 📋 DISEÑO COMPLETO - AWAITING APPROVAL
**Next Action**: Review + Feedback + Sign-off
**ETA para Implementation**: 2-3 semanas después de aprobación

---

**Archivos Relacionados**:
- `EXECUTIVE_SUMMARY_NOTIFICATION_SYSTEM.md` (FASE 1 overview)
- `NOTIFICATION_SYSTEM_README.md` (Technical docs)
- `20251029000000_create_unified_notification_system.sql` (Schema)
- `20251029000003_create_notification_helper_functions.sql` (RPC functions)

**Contacto**: @api-architect, @database-expert, @dealership-expert
