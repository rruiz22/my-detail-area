# FASE 2 - Quick Reference Guide
## Cheat Sheet para Desarrolladores

**Para**: Developers que implementarán FASE 2
**Última actualización**: 2025-10-28

---

## 🚀 SETUP RÁPIDO

### 1. Environment Variables

```bash
# Agregar a Supabase Edge Functions
supabase secrets set USE_NEW_NOTIFICATION_SYSTEM=false --project-ref <project-id>

# Para habilitar new system
supabase secrets set USE_NEW_NOTIFICATION_SYSTEM=true --project-ref <project-id>
```

### 2. Aplicar Migration

```bash
# Staging
supabase db push --linked

# Production (cuando esté listo)
supabase db push --linked --db-url <production-url>
```

### 3. Deploy Functions

```bash
# Deploy decision engine (shared)
supabase functions deploy

# Deploy individual function
supabase functions deploy send-order-sms-notification
supabase functions deploy enhanced-notification-engine
```

---

## 📝 CÓDIGO SNIPPETS

### Usar Decision Engine (Nuevo)

```typescript
import { decideNotificationStrategy, queueNotifications } from '../_shared/notification-decision-engine.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// 1. Define event
const event = {
  dealerId: 1,
  module: 'sales_orders' as const,
  event: 'order_created',
  entityType: 'sales_order',
  entityId: 'order-uuid',
  eventData: {
    orderNumber: 'SO-001',
    customerName: 'John Doe',
    shortLink: 'https://mda.to/ABC12'
  },
  triggeredBy: 'user-uuid' // Optional
};

// 2. Get decision
const decision = await decideNotificationStrategy(supabase, event);

// 3. Log reasoning (helpful for debugging)
console.log('Decision:', decision.reasoning);

// 4. Queue notifications (if should send)
if (decision.shouldSend) {
  await queueNotifications(supabase, event, decision);
}
```

---

### Llamar Helper Functions de FASE 1

```typescript
// Get user notification config
const { data: config } = await supabase.rpc(
  'get_user_notification_config',
  {
    p_user_id: 'user-uuid',
    p_dealer_id: 1,
    p_module: 'sales_orders'
  }
);

// Get notification recipients
const { data: recipients } = await supabase.rpc(
  'get_notification_recipients',
  {
    p_dealer_id: 1,
    p_module: 'sales_orders',
    p_event: 'order_created',
    p_metadata: { priority: 'high' }
  }
);

// Check if user is in quiet hours
const { data: inQuietHours } = await supabase.rpc(
  'is_user_in_quiet_hours',
  {
    p_user_id: 'user-uuid',
    p_dealer_id: 1,
    p_module: 'sales_orders'
  }
);

// Check rate limit
const { data: rateLimitOk } = await supabase.rpc(
  'check_user_rate_limit',
  {
    p_user_id: 'user-uuid',
    p_dealer_id: 1,
    p_module: 'sales_orders',
    p_channel: 'sms'
  }
);

// Update user event preference
await supabase.rpc(
  'update_user_event_preference',
  {
    p_user_id: 'user-uuid',
    p_dealer_id: 1,
    p_module: 'sales_orders',
    p_event: 'order_created',
    p_channel: 'sms',
    p_enabled: true
  }
);
```

---

### Queries Útiles

```sql
-- Ver todas las preferencias de un usuario
SELECT *
FROM user_notification_preferences_universal
WHERE user_id = 'user-uuid' AND dealer_id = 1;

-- Ver todas las reglas de un dealer
SELECT *
FROM dealer_notification_rules
WHERE dealer_id = 1 AND enabled = true
ORDER BY priority DESC;

-- Ver notification queue pendiente
SELECT *
FROM notification_queue
WHERE status = 'queued'
AND scheduled_for <= NOW()
ORDER BY priority DESC, scheduled_for ASC
LIMIT 50;

-- Ver historial de SMS
SELECT
  user_id,
  event_type,
  status,
  message_content,
  sent_at
FROM sms_send_history
WHERE dealer_id = 1
AND sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;

-- Dashboard: Notificaciones por hora
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  module,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
FROM notification_queue
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour, module
ORDER BY hour DESC;
```

---

## 🔍 DEBUGGING

### Logs de Decision Engine

```typescript
// Agregar logs detallados
console.log('='.repeat(80));
console.log('NOTIFICATION DECISION DEBUG');
console.log('Event:', JSON.stringify(event, null, 2));
console.log('Decision:', JSON.stringify(decision, null, 2));
console.log('Reasoning:', decision.reasoning);
console.log('='.repeat(80));
```

### Ver qué path se usó

```typescript
// En send-order-sms-notification response
{
  "success": true,
  "sent": 3,
  "system_version": "FASE_2" // o "LEGACY"
}
```

### Verificar feature flag

```bash
# Ver env variables
supabase secrets list --project-ref <project-id>

# Debe aparecer
# USE_NEW_NOTIFICATION_SYSTEM=true
```

### Test manual de Edge Function

```bash
# Test send-order-sms-notification
curl -X POST https://<project-id>.supabase.co/functions/v1/send-order-sms-notification \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "dealerId": 1,
    "module": "sales_orders",
    "eventType": "order_created",
    "eventData": {
      "orderNumber": "SO-TEST-001",
      "customerName": "Test User"
    }
  }'
```

---

## ⚠️ COMMON ISSUES

### Issue: "function does not exist"

**Error**: `function get_notification_recipients does not exist`

**Fix**:
```bash
# Aplicar migration de FASE 1
cd C:\Users\rudyr\apps\mydetailarea
supabase db push
```

---

### Issue: "column does not exist: module"

**Error**: `column "module" does not exist in table notification_queue`

**Fix**:
```bash
# Aplicar migration FASE 2.4
supabase db push
# O manual:
psql <connection> -f supabase/migrations/20251029000004_add_module_to_notification_queue.sql
```

---

### Issue: Feature flag no funciona

**Symptom**: Logs muestran "Using OLD notification system"

**Fix**:
```bash
# 1. Verificar env variable
supabase secrets list --project-ref <project-id>

# 2. Set si no existe
supabase secrets set USE_NEW_NOTIFICATION_SYSTEM=true --project-ref <project-id>

# 3. Redeploy function
supabase functions deploy send-order-sms-notification
```

---

### Issue: No recipients después de filtering

**Symptom**: `decision.recipients.length === 0`

**Debug**:
```sql
-- 1. Verificar dealer rules existen
SELECT * FROM dealer_notification_rules
WHERE dealer_id = 1 AND module = 'sales_orders' AND enabled = true;

-- 2. Verificar user preferences
SELECT * FROM user_notification_preferences_universal
WHERE dealer_id = 1 AND module = 'sales_orders';

-- 3. Ver reasoning
console.log(decision.reasoning); // En código
```

**Fix**:
```sql
-- Si no hay rules, crear una default
INSERT INTO dealer_notification_rules (
  dealer_id, module, event, rule_name,
  recipients, channels, priority, enabled
) VALUES (
  1, 'sales_orders', 'order_created',
  'Default Order Created Rule',
  '{"roles": ["admin", "manager"], "include_assigned_user": true}',
  '["in_app", "sms"]',
  50,
  true
);
```

---

## 🧪 TESTING

### Unit Test Template

```typescript
import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { decideNotificationStrategy } from '../notification-decision-engine.ts';

Deno.test('Decision Engine - Your Test Name', async () => {
  const mockSupabase = {
    rpc: async (fnName: string, params: any) => {
      // Mock responses
      if (fnName === 'get_notification_recipients') {
        return { data: [{ /* mock data */ }], error: null };
      }
      return { data: null, error: null };
    },
    from: () => ({ select: () => ({ /* mock chain */ }) })
  };

  const event = {
    dealerId: 1,
    module: 'sales_orders' as const,
    event: 'order_created',
    entityType: 'sales_order',
    entityId: 'test-123',
    eventData: {}
  };

  const result = await decideNotificationStrategy(mockSupabase as any, event);

  assertEquals(result.shouldSend, true);
  // More assertions...
});
```

### Run Tests

```bash
# Run all tests
deno test supabase/functions/_shared/__tests__/

# Run specific test
deno test supabase/functions/_shared/__tests__/notification-decision-engine.test.ts

# Run with coverage
deno test --coverage=cov_profile supabase/functions/_shared/__tests__/
deno coverage cov_profile
```

---

## 📊 MONITORING

### Key Metrics to Watch

```sql
-- Notification delivery rate (last 24h)
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as delivery_rate_pct
FROM notification_queue
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Average processing time
SELECT
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_seconds
FROM notification_queue
WHERE status = 'completed'
AND created_at >= NOW() - INTERVAL '24 hours';

-- Error rate by module
SELECT
  module,
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) as error_rate_pct
FROM notification_queue
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY module;

-- Queue backlog
SELECT
  module,
  COUNT(*) as pending_count,
  MAX(scheduled_for) - NOW() as oldest_pending_age
FROM notification_queue
WHERE status = 'queued'
GROUP BY module;
```

### Alerts to Set Up

```sql
-- Alert: High error rate (> 5%)
SELECT
  module,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) as total_count
FROM notification_queue
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY module
HAVING COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) > 5;

-- Alert: Large queue backlog (> 1000)
SELECT
  COUNT(*) as backlog_size
FROM notification_queue
WHERE status = 'queued'
HAVING COUNT(*) > 1000;

-- Alert: SMS rate limit violations
SELECT
  user_id,
  COUNT(*) as violations
FROM notification_analytics
WHERE event_type = 'rate_limit_exceeded'
AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 5;
```

---

## 🔄 ROLLBACK PROCEDURES

### 1. Quick Rollback (Feature Flag)

```bash
# Disable new system (instant)
supabase secrets set USE_NEW_NOTIFICATION_SYSTEM=false --project-ref <project-id>

# Verify
supabase secrets list --project-ref <project-id>
```

### 2. Code Rollback

```bash
# Find commit before changes
git log --oneline | grep "FASE 2"

# Revert
git revert <commit-hash>

# Redeploy
supabase functions deploy send-order-sms-notification
supabase functions deploy enhanced-notification-engine
```

### 3. Emergency Disable All Rules

```sql
-- Disable all dealer rules temporarily
UPDATE dealer_notification_rules
SET enabled = false
WHERE enabled = true;

-- Re-enable later
UPDATE dealer_notification_rules
SET enabled = true
WHERE id IN (/* specific rules */);
```

---

## 📦 FILES REFERENCE

### Core Implementation Files

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `_shared/notification-decision-engine.ts` | Decision logic | ~500 | ⏳ To implement |
| `send-order-sms-notification/index.ts` | SMS sender (modified) | 615 | ⏳ To modify |
| `enhanced-notification-engine/index.ts` | Queue processor (modified) | 561 | ⏳ To modify |
| `20251029000004_add_module_to_queue.sql` | Migration | ~50 | ⏳ To create |

### Documentation Files

| File | Purpose |
|------|---------|
| `FASE_2_BACKEND_LOGIC_DESIGN.md` | Full technical design (11k words) |
| `FASE_2_IMPLEMENTATION_GUIDE.md` | Code examples & troubleshooting |
| `FASE_2_EXECUTIVE_SUMMARY_ES.md` | Executive summary in Spanish |
| `FASE_2_QUICK_REFERENCE.md` | This file |

---

## 🎯 CHECKLIST DE DEPLOYMENT

### Pre-Deployment
- [ ] Code review de `notification-decision-engine.ts`
- [ ] Tests unitarios passing (coverage > 80%)
- [ ] Migration 20251029000004 aplicada en staging
- [ ] Integration tests passing (old vs new path)
- [ ] Performance benchmarks (< 200ms decision time)

### Deployment Staging
- [ ] Deploy `_shared/notification-decision-engine.ts`
- [ ] Deploy modified `send-order-sms-notification` (flag OFF)
- [ ] Deploy modified `enhanced-notification-engine`
- [ ] Enable flag para 1 dealer
- [ ] Monitor 24-48 hours
- [ ] Compare metrics: old vs new

### Deployment Production
- [ ] Database migration (off-hours)
- [ ] Deploy all functions
- [ ] Feature flag OFF inicialmente
- [ ] Enable para 25% dealers (Week 1)
- [ ] Monitor & verify
- [ ] Enable para 50% dealers (Week 2)
- [ ] Monitor & verify
- [ ] Enable para 100% dealers (Week 3)

### Post-Deployment
- [ ] Monitor dashboard (1 week intensive)
- [ ] Collect feedback from dealers
- [ ] Analyze performance metrics
- [ ] Document lessons learned
- [ ] Plan FASE 3 (frontend UI)

---

## 💡 BEST PRACTICES

### DO ✅

- ✅ **Always log decision reasoning** - Helps debugging
- ✅ **Use feature flags** - Safe deployments
- ✅ **Test old vs new path** - Verify parity
- ✅ **Monitor queue size** - Prevent backlog
- ✅ **Respect rate limits** - Prevent spam
- ✅ **Use RPC helper functions** - Consistent logic

### DON'T ❌

- ❌ **Don't skip migration 2.4** - Will break enhanced-notification-engine
- ❌ **Don't remove old code immediately** - Keep for rollback
- ❌ **Don't bypass quiet hours** - Unless high priority (>= 90)
- ❌ **Don't query tables directly** - Use helper functions
- ❌ **Don't enable 100% immediately** - Gradual rollout
- ❌ **Don't ignore logs** - They contain decision reasoning

---

## 🆘 SUPPORT

### Documentation
- **Full Design**: `FASE_2_BACKEND_LOGIC_DESIGN.md`
- **Implementation**: `FASE_2_IMPLEMENTATION_GUIDE.md`
- **Executive Summary**: `FASE_2_EXECUTIVE_SUMMARY_ES.md`

### Contacts
- **Architecture**: @api-architect
- **Database**: @database-expert
- **Testing**: @test-engineer
- **DevOps**: @deployment-engineer

### Useful Commands
```bash
# View Edge Function logs
supabase functions logs send-order-sms-notification --tail

# Test RPC function
psql <connection> -c "SELECT * FROM get_user_notification_config('user-uuid', 1, 'sales_orders');"

# Monitor queue
watch -n 5 'psql <connection> -c "SELECT module, COUNT(*) FROM notification_queue WHERE status = \"queued\" GROUP BY module;"'
```

---

**Last Updated**: 2025-10-28
**Version**: 1.0.0
**Status**: ✅ READY FOR USE (after FASE 2 approval)
