# FASE 2 - Resumen Ejecutivo: Backend Logic Design
## Sistema de Notificaciones Enterprise - My Detail Area

**Fecha**: 2025-10-28
**Status**: 📋 ANÁLISIS COMPLETO - AWAITING APPROVAL
**Tiempo estimado de implementación**: 2-3 semanas

---

## 🎯 OBJETIVO DE FASE 2

Integrar el nuevo sistema de notificaciones enterprise (FASE 1) con las Edge Functions existentes, implementando un motor de decisión PUSH+PULL que:

1. ✅ **Usa las nuevas tablas** (`user_notification_preferences_universal`, `dealer_notification_rules`)
2. ✅ **Respeta preferencias de usuario** (eventos habilitados, canales, quiet hours, rate limits)
3. ✅ **Aplica reglas de dealership** (quién recibe, cuándo, con qué prioridad)
4. ✅ **Mantiene backward compatibility** (zero breaking changes)
5. ✅ **Permite rollback instantáneo** (feature flags)

---

## 📊 ESTADO ACTUAL - ANÁLISIS COMPLETO

### Edge Functions Revisadas (4 principales)

| Function | Líneas | Status | Tabla Usada | Problema Principal |
|----------|--------|--------|-------------|-------------------|
| **send-order-sms-notification** | 515 | 🟡 Usa tabla antigua | `user_sms_notification_preferences` (deprecated) | No usa dealer rules, no usa helper functions |
| **enhanced-notification-engine** | 561 | 🟡 Usa tabla antigua | `user_notification_preferences` (Get Ready only) | Tabla `dealer_notification_configs` no existe |
| **notification-engine** | 272 | 🔴 Legacy | `notification_workflows` (viejo) | Sin rate limits, sin quiet hours |
| **send-notification** | 458 | 🟢 Funcional | Ninguna (directo FCM) | No verifica preferencias del usuario |

### Tablas Existentes (Verificadas)

#### ✅ Nuevas (FASE 1 - Production Ready)
- `user_notification_preferences_universal` - Preferencias universales multi-módulo
- `dealer_notification_rules` - Reglas de negocio del dealership
- Helper Functions (6): `get_user_notification_config`, `get_notification_recipients`, etc.

#### ⚠️ Antiguas (Deprecated pero funcionales)
- `user_notification_preferences` - Solo Get Ready (backward compatible)
- `user_sms_notification_preferences` - SMS legacy (backward compatible)

#### ✅ Otras (En uso)
- `notification_templates` - Plantillas multi-canal (Settings Hub)
- `notification_queue` - Cola de procesamiento asíncrono
- `notification_log` - Log de notificaciones in-app
- `sms_send_history` - Historial de SMS enviados
- `notification_analytics` - Métricas de delivery

---

## 🏗️ ARQUITECTURA PROPUESTA

### Flujo PUSH+PULL (Híbrido)

```
┌─────────────────────────────────────────────────────────────┐
│  EVENT TRIGGER (Order Created, Status Changed, etc.)       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICATION DECISION ENGINE (_shared)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Query dealer_notification_rules                   │   │
│  │    → Quién: roles, users, assigned, followers        │   │
│  │    → Cuándo: conditions (priority, status, SLA)      │   │
│  │    → Canales: [in_app, email, sms, push]           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 2. Expand recipients (roles → user_ids)             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 3. Filter by user_notification_preferences_universal│   │
│  │    → Check: event enabled?                          │   │
│  │    → Check: channel enabled?                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 4. Check quiet hours (is_user_in_quiet_hours RPC)  │   │
│  │    → Normal priority: DEFER                         │   │
│  │    → High priority (≥90): SEND ANYWAY              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 5. Check rate limits (check_user_rate_limit RPC)   │   │
│  │    → Normal priority: SKIP if exceeded              │   │
│  │    → High priority (≥80): OVERRIDE                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  OUTPUT: List of recipients with channels + scheduled_for  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │  Decision:            │
         │  - Send PUSH (urgent) │
         │  - Queue PULL (defer) │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────────┐
│  PUSH (Direct)  │    │  PULL (Queue)        │
│                 │    │                      │
│ - SMS urgent    │    │ - Email (always)     │
│ - Push critical │    │ - In-app (defer)     │
│ - Priority ≥90  │    │ - Quiet hours defer  │
│                 │    │ - Rate limit retry   │
│ sendSMS()       │    │                      │
│ sendPush()      │    │ notification_queue   │
└─────────────────┘    └──────────┬───────────┘
                                  │
                                  ▼
                     ┌────────────────────────┐
                     │ enhanced-notification- │
                     │ engine (PULL worker)   │
                     │ - Process queue        │
                     │ - Render templates     │
                     │ - Send multi-channel   │
                     │ - Track analytics      │
                     └────────────────────────┘
```

### Componente Central: notification-decision-engine.ts

**Ubicación**: `supabase/functions/_shared/notification-decision-engine.ts` (NUEVO)

**Funciones Principales**:
1. `decideNotificationStrategy(event)` - Decide quién recibe, por qué canal, cuándo
2. `expandRecipients(dealerRules)` - Convierte roles/followers en user_ids
3. `evaluateUserEligibility(userId, event)` - Filtra por preferences + quiet hours + rate limits
4. `queueNotifications(recipients)` - Inserta en notification_queue

**Ventajas**:
- ✅ Lógica centralizada (DRY)
- ✅ Reutilizable por todas las Edge Functions
- ✅ Fácil de testear independientemente
- ✅ Usa helper functions de FASE 1

---

## 🛠️ PLAN DE IMPLEMENTACIÓN (6 Fases)

### FASE 2.1: Preparación (NO BREAKING)
- [ ] Crear `_shared/notification-decision-engine.ts`
- [ ] Implementar funciones helper
- [ ] Tests unitarios
- **Tiempo**: 3 días
- **Riesgo**: 🟢 BAJO (no afecta código existente)

### FASE 2.2: Modificar send-order-sms-notification (INCREMENTAL)
- [ ] Agregar feature flag `USE_NEW_NOTIFICATION_SYSTEM`
- [ ] Implementar new path (usa decision engine)
- [ ] Mantener old path (sin cambios)
- [ ] Tests A/B (comparar resultados)
- **Tiempo**: 2 días
- **Riesgo**: 🟢 BAJO (feature flag permite rollback instantáneo)

### FASE 2.3: Modificar enhanced-notification-engine (SAFE)
- [ ] Actualizar `getUserPreferences()` - usar helper function
- [ ] Actualizar `getDealerConfig()` - usar dealer_notification_rules
- [ ] Tests de integración
- **Tiempo**: 2 días
- **Riesgo**: 🟡 MEDIO (requiere migration 2.4 primero)

### FASE 2.4: Database Change (REQUIRED)
- [ ] Migration: Agregar columna `module` a `notification_queue`
- [ ] Backfill existing rows (default: 'get_ready')
- [ ] Add index: `idx_notification_queue_module`
- **Tiempo**: 1 día
- **Riesgo**: 🟡 MEDIO (cambio de schema, pero safe con backfill)

### FASE 2.5: notification-engine (SKIP FOR NOW)
- [ ] ⏭️ OPTIONAL - Bajo uso, evaluar después
- **Tiempo**: TBD
- **Riesgo**: 🟢 BAJO (puede seguir con workflow system)

### FASE 2.6: send-notification (FUTURE)
- [ ] 🔮 FUTURE - Agregar preference checks
- **Tiempo**: TBD
- **Riesgo**: 🟢 BAJO (solo push notifications)

---

## ⚠️ RIESGOS Y MITIGACIONES

| Riesgo | Severidad | Impacto | Mitigación |
|--------|-----------|---------|------------|
| Tabla `notification_queue` sin `module` | 🔴 HIGH | Breaking change en enhanced-notification-engine | ✅ Migration 2.4 ANTES de code changes |
| Feature flag no configurado | 🟡 MEDIUM | Old path sigue usándose | ✅ Default a old path (safe), docs claras |
| Rate limit double-counting | 🟡 MEDIUM | Users bloqueados incorrectamente | ✅ Helper function usa una sola fuente |
| Quiet hours timezone bugs | 🟡 MEDIUM | Notificaciones en horario incorrecto | ✅ Helper function maneja timezone, tests multi-TZ |
| Performance degradation | 🟡 MEDIUM | Queries lentas | ✅ Índices de FASE 1 (18), RPC STABLE, monitoring |
| SMS costs increase | 🟢 LOW | Más SMS enviados | ✅ Rate limits por defecto, override solo high priority |

---

## 🔄 ROLLBACK PLAN (4 Niveles)

### NIVEL 1: Feature Flag (INSTANT - 0 downtime)
```bash
supabase secrets set USE_NEW_NOTIFICATION_SYSTEM=false
```
**Efecto**: Vuelve a old path
**Downtime**: 0 segundos

### NIVEL 2: Code Rollback (FAST - 2-5 min)
```bash
git revert <commit-hash>
supabase functions deploy send-order-sms-notification
```
**Efecto**: Código anterior
**Downtime**: 2-5 minutos

### NIVEL 3: Database Rollback (COMPLEX - Plan B)
```sql
ALTER TABLE notification_queue DROP COLUMN module;
```
**Efecto**: Elimina columna module
**⚠️ NO RECOMENDADO** (data loss)

### NIVEL 4: Emergency Disable (NUCLEAR)
```sql
UPDATE dealer_notification_rules SET enabled = false;
```
**Efecto**: Desactiva sistema completamente
**Recovery**: Simple UPDATE

---

## ✅ TESTING STRATEGY

### Pre-Deployment (Staging)
- [ ] Migration 20251029000004 (notification_queue.module)
- [ ] Tests unitarios (decision engine)
- [ ] Tests de integración (old vs new path)
- [ ] Tests E2E (scenarios completos)
- [ ] Performance benchmarks
  - Target: decideNotificationStrategy < 200ms
  - Target: RPC functions < 20ms each

### Deployment (Production)
- [ ] Week 1: Soft launch (1 dealer, A/B test)
- [ ] Week 2: 25% dealers
- [ ] Week 3: 50% dealers
- [ ] Week 4: 100% rollout

### Post-Deployment
- [ ] Monitor logs (24-48 hours intensivo)
- [ ] Dashboard metrics
  - SMS delivery rate > 99%
  - Error rate < 1%
  - Rate limit violations < 1%
- [ ] User feedback collection

---

## 📊 MÉTRICAS DE ÉXITO

### Performance
- ✅ Decision time: < 200ms (p95)
- ✅ Queue processing: < 1 min backlog
- ✅ SMS delivery: < 5 seconds (p95)

### Reliability
- ✅ Delivery rate: > 99%
- ✅ Error rate: < 1%
- ✅ Quiet hours compliance: 100%

### Business
- ✅ User opt-out: < 5% monthly
- ✅ Dealer rules active: > 80%
- ✅ Multi-channel usage: > 50%

---

## 📚 ARCHIVOS ENTREGADOS

### Documentación Principal
1. ✅ **FASE_2_BACKEND_LOGIC_DESIGN.md** (11,000+ words)
   - Análisis exhaustivo de Edge Functions
   - Flujo PUSH+PULL completo
   - Plan de cambios incrementales
   - Riesgos y mitigaciones
   - Testing checklist
   - Rollback plan detallado

2. ✅ **FASE_2_IMPLEMENTATION_GUIDE.md** (6,000+ words)
   - Ejemplos prácticos con código
   - Código diff específico
   - Test cases completos (Deno tests)
   - Troubleshooting guide
   - Performance optimization tips

3. ✅ **FASE_2_EXECUTIVE_SUMMARY_ES.md** (Este documento)
   - Resumen ejecutivo en español
   - Overview visual
   - Decisión de aprobar/rechazar

### Código Propuesto (NO IMPLEMENTADO AÚN)
4. ⏳ `supabase/functions/_shared/notification-decision-engine.ts` (Diseñado)
5. ⏳ `supabase/migrations/20251029000004_add_module_to_notification_queue.sql` (Diseñado)

---

## 🎯 PRÓXIMOS PASOS - DECISIÓN REQUERIDA

### Opción A: ✅ APROBAR E IMPLEMENTAR

**Si apruebas**:
1. Implementaré `notification-decision-engine.ts`
2. Crearé tests unitarios completos
3. Aplicaré migration 20251029000004 en staging
4. Modificaré `send-order-sms-notification` con feature flag
5. Testing exhaustivo en staging
6. Deployment gradual a producción (4 semanas)

**Timeline**: 2-3 semanas implementation + 4 semanas rollout = **6-7 semanas total**

---

### Opción B: 🔄 REVISAR Y AJUSTAR

**Si necesitas cambios**:
1. Especifica qué partes del diseño quieres modificar
2. Ajustaré el approach y volveré a presentar
3. Iteramos hasta aprobación

**Timeline**: +1-2 semanas de ajustes

---

### Opción C: ⏸️ POSPONER

**Si prefieres esperar**:
1. Sistema actual sigue funcionando (stable)
2. Podemos implementar FASE 2 en Q2 2025
3. Migraciones de FASE 1 permanecen (no afectan)

**Ventaja**: Sin urgencia, sistema legacy estable

---

## 💬 PREGUNTAS FRECUENTES

### ¿Por qué no implementar directamente sin feature flags?

**Respuesta**: Feature flags nos permiten:
- ✅ A/B testing en producción (comparar old vs new)
- ✅ Rollback instantáneo sin redeploy (0 downtime)
- ✅ Gradual rollout por dealer (reducir riesgo)
- ✅ Debugging más fácil (ver qué path se usó)

### ¿Por qué no usar solo PUSH o solo PULL?

**Respuesta**: Arquitectura híbrida optimiza para cada caso:
- **PUSH directo**: SMS urgentes, alertas críticas (latencia < 5s)
- **PULL (queue)**: Email, in-app, quiet hours defer (procesamiento asíncrono)

### ¿Qué pasa con el código frontend?

**Respuesta**: FASE 2 es **backend-only**, frontend sigue funcionando:
- Frontend usa endpoints existentes (sin cambios)
- Backend decide internamente qué sistema usar (feature flag)
- FASE 3 (futuro): Frontend UI para configurar preferences

### ¿Cuánto costará en términos de infraestructura?

**Respuesta**: Impacto mínimo:
- Edge Functions: Same execution time (~100-200ms)
- Database: Queries ya optimizadas con 18 índices (FASE 1)
- RPC Functions: STABLE (cacheable por Postgres)
- SMS: Mismo costo (Twilio), mejor targeting reduce volume

### ¿Qué pasa si un dealer no configura rules?

**Respuesta**: Sistema tiene fallbacks inteligentes:
1. Si no hay `dealer_notification_rules` → No send (safe default)
2. O podemos crear "default rules" en migración
3. Frontend UI (FASE 3) facilitará configuración

---

## 🏆 CONCLUSIÓN

### Lo que tenemos (FASE 1 ✅)
- Schema enterprise unificado
- Helper functions production-ready
- Data migrada sin pérdida
- Backward compatibility garantizada

### Lo que diseñamos (FASE 2 📋)
- Motor de decisión PUSH+PULL completo
- Integración con Edge Functions existentes
- Feature flags para safe deployment
- Rollback plan multi-nivel
- Testing strategy comprehensiva

### Lo que necesitamos
- ✅ **Tu aprobación para proceder**
- ✅ **Confirmación de timeline (6-7 semanas OK?)**
- ✅ **Feedback sobre approach propuesto**

---

## 📞 CONTACTO

**Para dudas técnicas**:
- @api-architect - Arquitectura y diseño
- @database-expert - Schema y performance
- @test-engineer - Testing strategy

**Para feedback**:
Responde con:
- ✅ APROBAR (proceder con implementación)
- 🔄 REVISAR (qué cambiar)
- ⏸️ POSPONER (razón)

---

**Status Final**: 📋 DISEÑO COMPLETO - AWAITING APPROVAL
**Autor**: api-architect + database-expert + Claude Code
**Fecha**: 2025-10-28
**Versión**: 2.0.0
