# FASE 2: Implementation Guide - Ejemplos Prácticos
## Guía de Implementación con Código Completo

**Complemento de**: FASE_2_BACKEND_LOGIC_DESIGN.md
**Propósito**: Ejemplos prácticos y código listo para usar

---

## 📋 TABLA DE CONTENIDOS

1. [Ejemplos de Uso - Decision Engine](#ejemplos-de-uso)
2. [Código Diff - send-order-sms-notification](#código-diff)
3. [Test Cases Completos](#test-cases)
4. [Troubleshooting Guide](#troubleshooting)
5. [Performance Optimization Tips](#performance-tips)

---

## 💡 EJEMPLOS DE USO

### Ejemplo 1: Order Created - SMS a Managers

```typescript
// Trigger: Cuando se crea una orden de venta
import { decideNotificationStrategy, queueNotifications } from '../_shared/notification-decision-engine.ts';

const event: NotificationEvent = {
  dealerId: 1,
  module: 'sales_orders',
  event: 'order_created',
  entityType: 'sales_order',
  entityId: 'order-uuid-123',
  eventData: {
    orderNumber: 'SO-2025-001',
    customerName: 'John Doe',
    vehicleInfo: '2024 Toyota Camry',
    shortLink: 'https://mda.to/ABC12',
    totalAmount: 45000
  },
  triggeredBy: 'user-who-created-order-uuid'
};

// 1. Decide notification strategy
const decision = await decideNotificationStrategy(supabase, event);

console.log('Decision:', {
  shouldSend: decision.shouldSend,
  recipientCount: decision.recipients.length,
  queuedCount: decision.queuedCount,
  skippedCount: decision.skippedCount
});

// 2. Queue notifications
if (decision.shouldSend) {
  const result = await queueNotifications(supabase, event, decision);
  console.log('Queued:', result);
}

// Output example:
// {
//   shouldSend: true,
//   recipientCount: 3,
//   queuedCount: 3,
//   skippedCount: 1,
//   reasoning: [
//     '✅ Found 2 matching dealer rules',
//     '📋 Expanded to 4 unique recipients',
//     '👤 Removed trigger user from recipients',
//     '⏭️ Skipped user abc-123: Event disabled in preferences',
//     '✅ Final eligible recipients: 3'
//   ]
// }
```

---

### Ejemplo 2: Status Changed - Multi-Canal

```typescript
const event: NotificationEvent = {
  dealerId: 1,
  module: 'sales_orders',
  event: 'status_changed',
  entityType: 'sales_order',
  entityId: 'order-uuid-456',
  eventData: {
    orderNumber: 'SO-2025-002',
    oldStatus: 'pending',
    newStatus: 'in_progress',
    assignedToName: 'Jane Smith',
    shortLink: 'https://mda.to/XYZ89'
  },
  triggeredBy: 'manager-uuid'
};

const decision = await decideNotificationStrategy(supabase, event);

// Decision result example:
// recipients: [
//   {
//     userId: 'user-1',
//     channels: ['in_app', 'push'],  // No SMS (disabled by user)
//     scheduledFor: Date('2025-10-28T10:00:00Z'),
//     priority: 50
//   },
//   {
//     userId: 'user-2',
//     channels: ['in_app', 'sms', 'push'],  // All enabled
//     scheduledFor: Date('2025-10-28T10:00:00Z'),
//     priority: 50
//   },
//   {
//     userId: 'user-3',
//     channels: ['in_app'],  // In quiet hours - SMS/Push deferred
//     scheduledFor: Date('2025-10-28T16:00:00Z'),  // After quiet hours
//     priority: 50
//   }
// ]
```

---

### Ejemplo 3: High Priority SLA Warning - Override Quiet Hours

```typescript
const event: NotificationEvent = {
  dealerId: 1,
  module: 'get_ready',
  event: 'sla_critical',
  entityType: 'recon_order',
  entityId: 'recon-uuid-789',
  eventData: {
    orderNumber: 'RO-2025-010',
    vehicleInfo: '2023 Honda Accord',
    hoursRemaining: 1.5,
    slaDeadline: '2025-10-28T18:00:00Z'
  },
  triggeredBy: 'system',
  priority: 95  // HIGH PRIORITY - overrides quiet hours
};

const decision = await decideNotificationStrategy(supabase, event);

// Decision result example:
// recipients: [
//   {
//     userId: 'manager-1',
//     channels: ['in_app', 'sms', 'push'],  // All channels even in quiet hours
//     scheduledFor: Date('2025-10-28T10:00:00Z'),  // IMMEDIATE
//     priority: 95  // HIGH - overrides user preferences
//   }
// ]
// reasoning: [
//   '✅ Found 1 matching dealer rules',
//   '🚨 High priority rule (95) - may override user preferences',
//   '📋 Expanded to 2 unique recipients',
//   '⚡ High priority: Allowing critical channels despite quiet hours',
//   '✅ Final eligible recipients: 2'
// ]
```

---

## 🔧 CÓDIGO DIFF - send-order-sms-notification

### Cambios Específicos (Minimal Invasive)

```diff
--- a/supabase/functions/send-order-sms-notification/index.ts
+++ b/supabase/functions/send-order-sms-notification/index.ts
@@ -1,6 +1,7 @@
 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 import { corsHeaders } from "../_shared/cors.ts";
+import { decideNotificationStrategy } from "../_shared/notification-decision-engine.ts";

 const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
 const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
@@ -75,6 +76,11 @@ interface SMSPreferences {
 // =====================================================

 const handler = async (req: Request): Promise<Response> => {
+  // ============================================================================
+  // FEATURE FLAG: New notification system
+  // ============================================================================
+  const USE_NEW_NOTIFICATION_SYSTEM = Deno.env.get('USE_NEW_NOTIFICATION_SYSTEM') === 'true';
+
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
@@ -88,6 +94,95 @@ const handler = async (req: Request): Promise<Response> => {
     const request: SMSNotificationRequest = await req.json();
     console.log('📱 SMS Notification Request:', request);

+    // ============================================================================
+    // NEW PATH: Use decision engine
+    // ============================================================================
+    if (USE_NEW_NOTIFICATION_SYSTEM) {
+      console.log('🆕 Using NEW notification system (FASE 2)');
+
+      const decision = await decideNotificationStrategy(supabase, {
+        dealerId: request.dealerId,
+        module: request.module,
+        event: request.eventType,
+        entityType: 'order',
+        entityId: request.orderId,
+        eventData: request.eventData,
+        triggeredBy: request.triggeredBy
+      });
+
+      console.log('📊 Decision:', {
+        shouldSend: decision.shouldSend,
+        recipients: decision.recipients.length,
+        reasoning: decision.reasoning
+      });
+
+      // Filter only SMS recipients
+      const smsRecipients = decision.recipients.filter(r => r.channels.includes('sms'));
+
+      if (smsRecipients.length === 0) {
+        console.log('ℹ️ No SMS recipients after decision engine filtering');
+        return new Response(
+          JSON.stringify({
+            success: true,
+            sent: 0,
+            message: 'No SMS recipients after filtering',
+            decision_reasoning: decision.reasoning
+          }),
+          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
+        );
+      }
+
+      // Get user details (phone numbers)
+      const userIds = smsRecipients.map(r => r.userId);
+      const { data: profiles, error: profilesError } = await supabase
+        .from('profiles')
+        .select('id, first_name, last_name, phone_number')
+        .in('id', userIds)
+        .not('phone_number', 'is', null);
+
+      if (profilesError) {
+        throw new Error(`Error fetching user profiles: ${profilesError.message}`);
+      }
+
+      if (!profiles || profiles.length === 0) {
+        console.log('⚠️ No users with phone numbers found');
+        return new Response(
+          JSON.stringify({
+            success: true,
+            sent: 0,
+            message: 'No users with phone numbers',
+            decision_reasoning: decision.reasoning
+          }),
+          { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
+        );
+      }
+
+      // Convert to SMSRecipient format (reuse existing type)
+      const finalUsers: SMSRecipient[] = profiles.map(p => ({
+        id: p.id,
+        name: `${p.first_name} ${p.last_name}`.trim(),
+        phone_number: p.phone_number,
+      }));
+
+      console.log(`✅ Final SMS recipients: ${finalUsers.length}`);
+
+      // Continue with EXISTING logic (steps 5-6)
+      const messages = generateMessages(finalUsers, request.eventType, request.eventData);
+      const results = await Promise.allSettled(
+        messages.map(({ user, message }) => sendSMS(user.phone_number, message, request.orderId))
+      );
+
+      await recordSMSHistory(results, finalUsers, messages, request.dealerId, request.module, request.eventType, request.orderId);
+
+      const successCount = results.filter(r => r.status === 'fulfilled').length;
+      const failedCount = results.filter(r => r.status === 'rejected').length;
+
+      console.log(`✅ NEW PATH - SMS Sent: ${successCount} successful, ${failedCount} failed`);
+
+      // Return with decision reasoning for debugging
+      return new Response(
+        JSON.stringify({
+          success: true,
+          sent: successCount,
+          failed: failedCount,
+          recipients: finalUsers.length,
+          decision_reasoning: decision.reasoning,
+          system_version: 'FASE_2'
+        }),
+        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
+      );
+    }
+
+    // ============================================================================
+    // OLD PATH: Existing logic (unchanged)
+    // ============================================================================
+    console.log('🔄 Using OLD notification system (legacy)');
+
     // 1. Get users with SMS permission for this module
     const usersWithPermission = await getUsersWithSMSPermission(
       request.dealerId,
@@ -173,7 +268,8 @@ const handler = async (req: Request): Promise<Response> => {
         success: true,
         sent: successCount,
         failed: failedCount,
-        recipients: finalUsers.length
+        recipients: finalUsers.length,
+        system_version: 'LEGACY'
       }),
       {
         status: 200,
```

**Líneas agregadas**: ~100
**Líneas modificadas**: 3
**Breaking changes**: 0
**Feature flag**: `USE_NEW_NOTIFICATION_SYSTEM`

---

## 🧪 TEST CASES COMPLETOS

### Test Suite 1: Decision Engine

```typescript
// File: supabase/functions/_shared/__tests__/notification-decision-engine.test.ts

import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { decideNotificationStrategy } from '../notification-decision-engine.ts';

// Mock Supabase client
const mockSupabase = {
  rpc: async (fnName: string, params: any) => {
    if (fnName === 'get_notification_recipients') {
      return {
        data: [
          {
            rule_id: 'rule-1',
            priority: 50,
            recipients: {
              roles: ['manager'],
              users: [],
              include_assigned_user: true,
              include_followers: false
            },
            channels: ['in_app', 'sms']
          }
        ],
        error: null
      };
    }
    if (fnName === 'get_user_notification_config') {
      return {
        data: [{
          in_app_enabled: true,
          email_enabled: false,
          sms_enabled: true,
          push_enabled: false,
          event_preferences: {
            order_created: {
              enabled: true,
              channels: ['in_app', 'sms']
            }
          },
          quiet_hours_enabled: false,
          rate_limits: {
            sms: { max_per_hour: 10, max_per_day: 50 }
          }
        }],
        error: null
      };
    }
    if (fnName === 'is_user_in_quiet_hours') {
      return { data: false, error: null };
    }
    if (fnName === 'check_user_rate_limit') {
      return { data: true, error: null };
    }
    return { data: null, error: null };
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        in: () => ({
          single: async () => ({ data: { assigned_to: 'user-123' }, error: null })
        })
      })
    })
  })
};

Deno.test('Decision Engine - Simple Order Created', async () => {
  const event = {
    dealerId: 1,
    module: 'sales_orders' as const,
    event: 'order_created',
    entityType: 'sales_order',
    entityId: 'order-123',
    eventData: { orderNumber: 'SO-001' }
  };

  const result = await decideNotificationStrategy(mockSupabase as any, event);

  assertEquals(result.shouldSend, true);
  assertEquals(result.recipients.length > 0, true);
  assertEquals(result.reasoning.length > 0, true);
});

Deno.test('Decision Engine - No Dealer Rules', async () => {
  const mockSupabaseNoRules = {
    ...mockSupabase,
    rpc: async (fnName: string) => {
      if (fnName === 'get_notification_recipients') {
        return { data: [], error: null };
      }
      return mockSupabase.rpc(fnName, {});
    }
  };

  const event = {
    dealerId: 1,
    module: 'sales_orders' as const,
    event: 'order_created',
    entityType: 'sales_order',
    entityId: 'order-123',
    eventData: { orderNumber: 'SO-001' }
  };

  const result = await decideNotificationStrategy(mockSupabaseNoRules as any, event);

  assertEquals(result.shouldSend, false);
  assertEquals(result.queuedCount, 0);
  assertEquals(result.reasoning.includes('ℹ️ No dealer rules matched for this event'), true);
});

Deno.test('Decision Engine - User in Quiet Hours', async () => {
  const mockSupabaseQuietHours = {
    ...mockSupabase,
    rpc: async (fnName: string, params: any) => {
      if (fnName === 'is_user_in_quiet_hours') {
        return { data: true, error: null };
      }
      return mockSupabase.rpc(fnName, params);
    }
  };

  const event = {
    dealerId: 1,
    module: 'sales_orders' as const,
    event: 'order_created',
    entityType: 'sales_order',
    entityId: 'order-123',
    eventData: { orderNumber: 'SO-001' }
  };

  const result = await decideNotificationStrategy(mockSupabaseQuietHours as any, event);

  // Should still send but scheduled for later
  assertEquals(result.shouldSend, true);
  assertEquals(result.recipients[0]?.scheduledFor > new Date(), true);
});

Deno.test('Decision Engine - High Priority Override', async () => {
  const mockSupabaseHighPriority = {
    ...mockSupabase,
    rpc: async (fnName: string, params: any) => {
      if (fnName === 'get_notification_recipients') {
        return {
          data: [{
            rule_id: 'rule-1',
            priority: 95,  // HIGH PRIORITY
            recipients: { roles: ['manager'] },
            channels: ['sms']
          }],
          error: null
        };
      }
      if (fnName === 'is_user_in_quiet_hours') {
        return { data: true, error: null };  // In quiet hours
      }
      if (fnName === 'check_user_rate_limit') {
        return { data: false, error: null };  // Rate limit exceeded
      }
      return mockSupabase.rpc(fnName, params);
    }
  };

  const event = {
    dealerId: 1,
    module: 'sales_orders' as const,
    event: 'sla_critical',
    entityType: 'sales_order',
    entityId: 'order-123',
    eventData: { orderNumber: 'SO-001' },
    priority: 95
  };

  const result = await decideNotificationStrategy(mockSupabaseHighPriority as any, event);

  // High priority should override quiet hours and rate limits
  assertEquals(result.shouldSend, true);
  assertEquals(result.recipients[0]?.priority, 95);
  assertEquals(result.recipients[0]?.channels.length > 0, true);
});
```

**Para ejecutar tests**:
```bash
cd C:\Users\rudyr\apps\mydetailarea
deno test supabase/functions/_shared/__tests__/notification-decision-engine.test.ts
```

---

### Test Suite 2: Integration Tests

```typescript
// File: supabase/functions/send-order-sms-notification/__tests__/integration.test.ts

import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

Deno.test('Integration - OLD PATH vs NEW PATH comparison', async () => {
  // Setup test data
  const testRequest = {
    orderId: 'test-order-123',
    dealerId: 1,
    module: 'sales_orders',
    eventType: 'order_created',
    eventData: {
      orderNumber: 'SO-TEST-001',
      customerName: 'Test Customer',
      shortLink: 'https://mda.to/TEST1'
    }
  };

  // Call with OLD PATH (feature flag OFF)
  Deno.env.set('USE_NEW_NOTIFICATION_SYSTEM', 'false');
  const responseOld = await fetch(`${SUPABASE_URL}/functions/v1/send-order-sms-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(testRequest)
  });
  const resultOld = await responseOld.json();

  // Call with NEW PATH (feature flag ON)
  Deno.env.set('USE_NEW_NOTIFICATION_SYSTEM', 'true');
  const responseNew = await fetch(`${SUPABASE_URL}/functions/v1/send-order-sms-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(testRequest)
  });
  const resultNew = await responseNew.json();

  console.log('OLD PATH result:', resultOld);
  console.log('NEW PATH result:', resultNew);

  // Compare results
  assertEquals(resultOld.success, resultNew.success);
  assertEquals(resultOld.recipients, resultNew.recipients);
  // Note: sent/failed may differ slightly due to timing, but recipients count should match
});

Deno.test('Integration - Verify sms_send_history recording', async () => {
  const testRequest = {
    orderId: 'test-order-456',
    dealerId: 1,
    module: 'sales_orders',
    eventType: 'status_changed',
    eventData: {
      orderNumber: 'SO-TEST-002',
      newStatus: 'in_progress',
      shortLink: 'https://mda.to/TEST2'
    }
  };

  // Send notification
  Deno.env.set('USE_NEW_NOTIFICATION_SYSTEM', 'true');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-order-sms-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`
    },
    body: JSON.stringify(testRequest)
  });
  const result = await response.json();

  // Verify sms_send_history was updated
  const { data: history, error } = await supabase
    .from('sms_send_history')
    .select('*')
    .eq('entity_id', testRequest.orderId)
    .eq('event_type', testRequest.eventType)
    .order('sent_at', { ascending: false })
    .limit(1);

  assertEquals(error, null);
  assertEquals(history?.length > 0, true);
  assertEquals(history?.[0].status, 'sent');
});
```

---

## 🔍 TROUBLESHOOTING GUIDE

### Issue 1: Feature Flag no funciona

**Síntoma**: Logs muestran "Using OLD notification system" aunque flag está ON

**Diagnóstico**:
```bash
# Verificar env variable en Edge Function
supabase functions env list --project-ref <project-id>

# Debe mostrar:
# USE_NEW_NOTIFICATION_SYSTEM=true
```

**Solución**:
```bash
# Set env variable
supabase secrets set USE_NEW_NOTIFICATION_SYSTEM=true --project-ref <project-id>

# Redeploy function
supabase functions deploy send-order-sms-notification
```

---

### Issue 2: RPC function no encontrada

**Síntoma**: Error: `function get_notification_recipients does not exist`

**Diagnóstico**:
```sql
-- Verificar que funciones existen
SELECT proname FROM pg_proc WHERE proname LIKE '%notification%';

-- Debe retornar:
-- get_user_notification_config
-- update_user_event_preference
-- get_notification_recipients
-- is_user_in_quiet_hours
-- check_user_rate_limit
-- create_default_notification_preferences
```

**Solución**:
```bash
# Aplicar migration FASE 1
cd C:\Users\rudyr\apps\mydetailarea
supabase db push

# O manualmente
psql <connection-string> -f supabase/migrations/20251029000003_create_notification_helper_functions.sql
```

---

### Issue 3: No recipients después de filtering

**Síntoma**: `decision.recipients.length === 0` pero debería haber recipients

**Diagnóstico**:
```typescript
// Agregar logs detallados
console.log('Decision reasoning:', decision.reasoning);

// Verificar dealer rules existen
const { data: rules } = await supabase
  .from('dealer_notification_rules')
  .select('*')
  .eq('dealer_id', dealerId)
  .eq('module', module)
  .eq('event', event)
  .eq('enabled', true);

console.log('Dealer rules found:', rules);

// Verificar user preferences
const { data: prefs } = await supabase
  .from('user_notification_preferences_universal')
  .select('*')
  .eq('dealer_id', dealerId)
  .eq('module', module);

console.log('User preferences found:', prefs);
```

**Solución**:
1. Crear dealer rules si no existen
2. Verificar que users tienen preferences habilitadas
3. Verificar que event está en `event_preferences` JSONB

---

### Issue 4: Rate limit siempre excedido

**Síntoma**: Todos los usuarios son skipped por rate limit

**Diagnóstico**:
```sql
-- Verificar rate limits configurados
SELECT
  user_id,
  module,
  rate_limits
FROM user_notification_preferences_universal
WHERE dealer_id = 1;

-- Verificar historial de SMS
SELECT
  user_id,
  COUNT(*) as count,
  MAX(sent_at) as last_sent
FROM sms_send_history
WHERE dealer_id = 1
AND sent_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id;
```

**Solución**:
```sql
-- Ajustar rate limits si son muy bajos
UPDATE user_notification_preferences_universal
SET rate_limits = jsonb_set(
  rate_limits,
  '{sms,max_per_hour}',
  '20'
)
WHERE dealer_id = 1 AND module = 'sales_orders';
```

---

### Issue 5: Quiet hours calculation incorrect

**Síntoma**: Notificaciones enviadas durante quiet hours o demoradas incorrectamente

**Diagnóstico**:
```typescript
// Test quiet hours function
const { data: inQuietHours } = await supabase.rpc(
  'is_user_in_quiet_hours',
  {
    p_user_id: 'user-uuid',
    p_dealer_id: 1,
    p_module: 'sales_orders'
  }
);

console.log('User in quiet hours?', inQuietHours);

// Verificar timezone
const { data: prefs } = await supabase
  .from('user_notification_preferences_universal')
  .select('quiet_hours_start, quiet_hours_end, quiet_hours_timezone')
  .eq('user_id', 'user-uuid')
  .eq('dealer_id', 1)
  .single();

console.log('Quiet hours config:', prefs);

// Check current time in user's timezone
const now = new Date();
const userTimezone = prefs.quiet_hours_timezone || 'America/New_York';
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: userTimezone,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});
console.log('Current time in user timezone:', formatter.format(now));
```

**Solución**:
1. Verificar que `quiet_hours_timezone` esté correcto
2. Verificar que `quiet_hours_start` < `quiet_hours_end` (no overnight)
3. Para overnight (ej: 22:00 - 08:00), verificar lógica en helper function

---

## ⚡ PERFORMANCE OPTIMIZATION TIPS

### Tip 1: Batch RPC Calls

**Problema**: N+1 queries cuando procesamos múltiples usuarios

```typescript
// ❌ BAD: N queries
for (const userId of userIds) {
  const { data } = await supabase.rpc('get_user_notification_config', {
    p_user_id: userId,
    p_dealer_id: dealerId,
    p_module: module
  });
  // Process...
}

// ✅ GOOD: Batch query
const { data: allConfigs } = await supabase
  .from('user_notification_preferences_universal')
  .select('*')
  .in('user_id', Array.from(userIds))
  .eq('dealer_id', dealerId)
  .eq('module', module);

// Then evaluate locally
const eligibleUsers = allConfigs.filter(config => {
  // Filter logic...
});
```

---

### Tip 2: Cache Dealer Rules

**Problema**: Query dealer_notification_rules en cada evento

```typescript
// ✅ GOOD: Cache in-memory (válido por 5 minutos)
const dealerRulesCache = new Map<string, { rules: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedDealerRules(
  supabase: SupabaseClient,
  dealerId: number,
  module: string,
  event: string
): Promise<any[]> {
  const cacheKey = `${dealerId}:${module}:${event}`;
  const cached = dealerRulesCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('🎯 Cache hit for dealer rules');
    return cached.rules;
  }

  const { data: rules } = await supabase
    .from('dealer_notification_rules')
    .select('*')
    .eq('dealer_id', dealerId)
    .eq('module', module)
    .eq('event', event)
    .eq('enabled', true);

  dealerRulesCache.set(cacheKey, {
    rules: rules || [],
    timestamp: Date.now()
  });

  return rules || [];
}
```

---

### Tip 3: Parallel Processing

**Problema**: Sequential processing de usuarios es lento

```typescript
// ❌ BAD: Sequential
for (const userId of userIds) {
  const result = await evaluateUserEligibility(supabase, userId, event, priority);
  if (result.eligible) {
    recipients.push(result);
  }
}

// ✅ GOOD: Parallel
const results = await Promise.all(
  Array.from(userIds).map(userId =>
    evaluateUserEligibility(supabase, userId, event, priority)
  )
);

const recipients = results
  .filter(r => r.eligible)
  .map(r => ({
    userId: r.userId,
    channels: r.channels,
    scheduledFor: r.scheduledFor,
    priority: r.priority
  }));
```

---

### Tip 4: Index Optimization

**Problema**: Queries lentas en notification_queue

```sql
-- ✅ Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_notification_queue_processing
ON notification_queue(dealer_id, module, status, scheduled_for)
WHERE status IN ('queued', 'processing');

-- ✅ Partial index for active notifications only
CREATE INDEX IF NOT EXISTS idx_notification_queue_active
ON notification_queue(user_id, dealer_id, created_at DESC)
WHERE status NOT IN ('completed', 'failed');

-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM notification_queue
WHERE dealer_id = 1
AND module = 'sales_orders'
AND status = 'queued'
AND scheduled_for <= NOW()
ORDER BY priority DESC, scheduled_for ASC
LIMIT 50;
```

---

### Tip 5: Monitoring Queries

```sql
-- Dashboard query: Notifications per hour
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  module,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_seconds
FROM notification_queue
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, module
ORDER BY hour DESC;

-- Dashboard query: Rate limit violations
SELECT
  user_id,
  module,
  COUNT(*) as attempts,
  SUM(CASE WHEN status = 'skipped_rate_limit' THEN 1 ELSE 0 END) as blocked
FROM notification_analytics
WHERE event_type = 'rate_limit_check'
AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id, module
HAVING SUM(CASE WHEN status = 'skipped_rate_limit' THEN 1 ELSE 0 END) > 3
ORDER BY blocked DESC;

-- Dashboard query: Top notification events
SELECT
  module,
  notification_type,
  COUNT(*) as total,
  AVG(response_time_ms) as avg_response_time
FROM notification_analytics
WHERE event_type = 'sent'
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY module, notification_type
ORDER BY total DESC
LIMIT 10;
```

---

## 📚 RECURSOS ADICIONALES

### Archivos Relacionados
- `FASE_2_BACKEND_LOGIC_DESIGN.md` - Diseño completo
- `EXECUTIVE_SUMMARY_NOTIFICATION_SYSTEM.md` - FASE 1 overview
- `NOTIFICATION_SYSTEM_README.md` - Technical docs completos

### Testing Tools
```bash
# Test RPC functions directamente
psql <connection-string> << EOF
SELECT * FROM get_user_notification_config(
  'user-uuid',
  1,
  'sales_orders'
);
EOF

# Load test con k6
k6 run supabase/functions/__tests__/load-test.js
```

### Logs & Debugging
```typescript
// Structured logging para debugging
console.log(JSON.stringify({
  level: 'debug',
  function: 'decideNotificationStrategy',
  dealerId: event.dealerId,
  module: event.module,
  event: event.event,
  recipientCount: recipients.length,
  reasoning: decision.reasoning
}, null, 2));
```

---

**Status**: ✅ IMPLEMENTATION GUIDE COMPLETE
**Next**: Review + Code Implementation + Testing
**Contact**: @api-architect, @test-engineer
