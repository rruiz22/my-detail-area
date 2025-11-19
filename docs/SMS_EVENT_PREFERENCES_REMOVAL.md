# 🚨 BREAKING CHANGE: event_preferences Validation Removed

**Fecha:** 2025-11-18
**Versión:** send-order-sms-notification v30
**Tipo:** Breaking Change
**Severidad:** HIGH

---

## 📋 Cambio Realizado

### Validación Anterior (v29 y anteriores)

**Level 3 Validation - DOS checks:**
```typescript
// 1. Check global SMS toggle
if (!userPrefs.sms_enabled) {
  continue; // User filtered out
}

// 2. Check event-specific preference
const eventPref = userPrefs.event_preferences?.[eventType];
if (!eventPref || eventPref.sms !== true) {
  continue; // User filtered out
}
```

**Resultado:** Usuario necesitaba:
- ✅ `sms_enabled = true` (global)
- ✅ `event_preferences.comment_added.sms = true` (específico)

---

### Validación Nueva (v30+)

**Level 3 Validation - UN solo check:**
```typescript
// Only check global SMS toggle
if (!userPrefs.sms_enabled) {
  console.log(`❌ LEVEL 3 FAILED: User has SMS globally disabled`);
  continue;
}

// SIMPLIFIED: event_preferences completely ignored
console.log(`✅ LEVEL 3 PASSED: User has SMS globally enabled (event_preferences ignored)`);
```

**Resultado:** Usuario solo necesita:
- ✅ `sms_enabled = true` (global)
- ~~event_preferences~~ ❌ IGNORADO

---

## 💥 Impacto del Cambio

### Usuarios Afectados

**Escenario Crítico:** Usuario con configuración granular
```json
{
  "sms_enabled": true,  // Global ON
  "event_preferences": {
    "order_created": { "sms": true },   // ✅ Habilitado
    "comment_added": { "sms": false },  // ❌ DESHABILITADO explícitamente
    "status_changed": { "sms": false }  // ❌ DESHABILITADO explícitamente
  }
}
```

**Comportamiento ANTES (v29):**
- `comment_added` → ❌ NO recibe SMS (respeta `false`)
- `status_changed` → ❌ NO recibe SMS (respeta `false`)

**Comportamiento AHORA (v30):**
- `comment_added` → ✅ **SÍ recibe SMS** (ignora `false`)
- `status_changed` → ✅ **SÍ recibe SMS** (ignora `false`)

### Impacto en Production

**Usuarios con preferencias custom:** 6/6 (100%)
**Preferencias ignoradas:** Todas las configuraciones granulares de `event_preferences`

---

## 🎯 Justificación del Cambio

### Problema de Arquitectura Dual

El sistema tenía **redundancia de control:**

1. **Custom Roles** (Admin control) - Define QUÉ eventos puede recibir cada role
2. **event_preferences** (User control) - Usuario define QUÉ eventos quiere recibir

**Problema:** Dos lugares controlando lo mismo = confusión

### Nueva Arquitectura Simplificada

**Control de eventos:** Solo en **Custom Roles** (Admin configura)
**Control de usuario:** Solo **sms_enabled** toggle (User elige: todo o nada)

**Ventajas:**
- ✅ Más simple de entender
- ✅ Un solo lugar de configuración de eventos (Custom Roles)
- ✅ User control: "¿Quiero SMS?" Sí/No (binario)
- ✅ Reduce complejidad de UI

**Desventajas:**
- ❌ Users pierden control granular
- ❌ No pueden deshabilitar eventos individuales
- ❌ Todo o nada (no hay middle ground)

---

## 🔄 Validación Actual (Post v30)

### 3-Level Architecture

**Level 1: Follower Check**
- Usuario debe ser follower de la orden
- `notification_level != 'none'`
- `is_active = true`

**Level 2: Custom Role Permission**
- Custom role debe permitir el evento
- `role_notification_events.enabled = true`
- Validación de `allowed_statuses` (si aplica)

**Level 3: User SMS Global Toggle** ⭐ SIMPLIFICADO
- Solo verifica: `sms_enabled = true`
- **event_preferences IGNORADO completamente**

**Level 4 (Optional): Dealer Rules**
- Reglas de negocio opcionales
- Fail-safe si hay error

---

## 📊 Datos NO Borrados

**Importante:** `event_preferences` **NO se borra de la database**

**Tabla:** `user_sms_notification_preferences`
**Campo:** `event_preferences` (jsonb) - **SIGUE EXISTIENDO**
**Estado:** Poblado con datos de usuarios, pero **IGNORADO** en la validación

**Rollback:** Fácil - revertir a v29 y las preferencias vuelven a funcionar

---

## 🔙 Rollback Plan

### Si usuarios reportan SMS no deseados:

**Paso 1:** Revert edge function
```bash
# Redeployar versión anterior (v29)
# Tiempo: <5 minutos
```

**Paso 2:** Verificar
- Users vuelven a tener control granular
- event_preferences respetadas
- No se perdió data

**Datos:** ✅ 100% intactos (solo validación cambió)
**Tiempo de rollback:** <5 minutos

---

## ✅ Testing Verificado

**Test realizado (2025-11-18 23:08 UTC):**
- ✅ SMS enviado a Detail Department (+15084942278)
- ✅ Twilio SID: SM1fc09dbcb4cef55dc412f7986fc8effa
- ✅ sent_day poblado: 2025-11-19
- ✅ retry_count: 0
- ✅ Validación simplificada funcionando
- ✅ Log message confirma: "event_preferences ignored"

---

## 📚 Documentación Actualizada

**Archivos modificados:**
- `supabase/functions/send-order-sms-notification/index.ts` (línea 512-515)
- `docs/SMS_EVENT_PREFERENCES_REMOVAL.md` (este documento)

**Backups creados:**
- `backups/sms-event-preferences-removal/send-order-sms-notification-v29.backup`

---

## ⚠️ Recomendación para Usuarios

**Comunicación a usuarios:**

```
Sistema SMS Simplificado (v30)

Hemos simplificado el sistema de notificaciones SMS para mejorar la experiencia:

ANTES:
- Control de eventos en Custom Roles (Admin)
- Control de eventos en Preferencias (Usuario)
- Confusión: ¿dónde se configuran los eventos?

AHORA:
- Control de eventos: Solo en Custom Roles (Admin decide)
- Control del usuario: Un toggle "Enable SMS Notifications" (todo o nada)

Si quieres dejar de recibir SMS de ciertos eventos, contacta a tu admin
para que lo configure en tu Custom Role.
```

---

## 🔍 Monitoreo Post-Deploy

**Métricas a monitorear:**
- SMS send rate (should stay similar)
- User complaints (sobre SMS no deseados)
- Rate limiting hits (should stay same)
- Delivery rates (should stay same)

**Duración:** 1 semana de monitoreo

---

**Versión:** 1.0
**Autor:** Sistema automatizado
**Revisión:** Requerida
