# Issue #3: Sanitización de Búsquedas SQL - PENDIENTE

**Fecha:** 2025-10-23
**Estado:** 90% Completado - Requiere finalización manual
**Prioridad:** 🔴 CRÍTICO
**Esfuerzo Restante:** 30-45 minutos

---

## 🎯 OBJETIVO

Sanitizar términos de búsqueda antes de usarlos en queries SQL ILIKE para prevenir bypass de filtros con wildcards y asegurar resultados precisos.

---

## 🚨 PROBLEMA IDENTIFICADO

### Ubicaciones Afectadas (3)

**Archivo:** `src/hooks/useGetReadyVehicles.tsx`

1. Línea ~89 - `useOverviewTable()`
2. Línea ~327 - `useGetReadyVehiclesList()`
3. Línea ~532 - `useGetReadyVehiclesInfinite()`

### Código Problemático Actual

```typescript
if (searchTerm) {
  const term = searchTerm.toLowerCase();
  query = query.or(`stock_number.ilike.%${term}%,vin.ilike.%${term}%,...`);
}
```

### Vulnerabilidad Demostrada

**Ejemplo: Usuario busca "BMW%"**
- Query SQL: `stock_number ILIKE '%bmw%%'`
- Coincide con: "BMW1", "BMW2", "BMWABC" ❌
- Debería coincidir solo con: "BMW%" ✅

**Ejemplo: Usuario busca "STK_001"**
- Query SQL: `stock_number ILIKE '%stk_001%'`
- Coincide con: "STK1001", "STKA001" ❌
- Debería coincidir solo con: "STK_001" ✅

---

## ✅ TRABAJO COMPLETADO

### 1. Análisis Profundo
- ✅ 6 etapas de pensamiento secuencial
- ✅ Problema confirmado y entendido
- ✅ Solución diseñada

### 2. Tests Creados
- ✅ `src/utils/__tests__/searchSanitization.test.ts` (148 líneas)
- ✅ 40+ test cases diseñados
- ✅ Cobertura de edge cases y security

### 3. Diseño de Solución
- ✅ Función de sanitización diseñada
- ✅ Orden de escaping determinado
- ✅ Integración en hooks planificada

---

## 🚧 BLOQUEADOR TÉCNICO

**Problema:** Escapes de regex en Bash/Heredoc
**Métodos Intentados:** 6 diferentes (todos fallaron)
**Causa:** Múltiples niveles de escaping (Bash → JS → TS → Regex)

---

## 💡 SOLUCIÓN MANUAL (15 minutos)

### Paso 1: Crear Archivo de Sanitización

Crear `src/utils/searchSanitization.ts` con este contenido:

```typescript
export function sanitizeSearchTerm(term: unknown): string | null {
  if (term === null || term === undefined) return null;
  if (typeof term !== 'string') return null;

  const trimmed = term.trim();
  if (!trimmed) return null;

  return trimmed
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

export function sanitizeAndLowercase(term: unknown): string | null {
  const sanitized = sanitizeSearchTerm(term);
  return sanitized ? sanitized.toLowerCase() : null;
}
```

### Paso 2: Agregar Import

En `src/hooks/useGetReadyVehicles.tsx` línea 9:

```typescript
import { sanitizeAndLowercase } from '@/utils/searchSanitization';
```

### Paso 3: Reemplazar 3 Ubicaciones

**Patrón ANTES:**
```typescript
if (searchTerm) {
  const term = searchTerm.toLowerCase();
  query = query.or(`stock_number.ilike.%${term}%,...`);
}
```

**Patrón DESPUÉS:**
```typescript
if (searchTerm) {
  const sanitized = sanitizeAndLowercase(searchTerm);
  if (sanitized) {
    query = query.or(`stock_number.ilike.%${sanitized}%,...`);
  }
}
```

### Paso 4: Validación

```bash
# Tests
npm run test -- src/utils/__tests__/searchSanitization.test.ts

# TypeScript
npx tsc --noEmit

# Servidor
npm run dev
# Verificar http://localhost:8080/get-ready
```

### Paso 5: Commit

```bash
git add src/utils/searchSanitization.ts src/hooks/useGetReadyVehicles.tsx
git commit -m "feat(security): Add search term sanitization for ILIKE queries"
```

---

## 📋 CHECKLIST

- [ ] Archivo `searchSanitization.ts` creado
- [ ] Tests ejecutados (esperado: 40/40 passing)
- [ ] Import agregado en hook
- [ ] 3 ubicaciones actualizadas
- [ ] TypeScript compila sin errores
- [ ] Búsquedas funcionan en navegador
- [ ] Commit creado

---

## 🔗 CONTEXTO PARA RETOMAR

**Branch:** `fix/get-ready-security-critical`
**Último Commit:** `901d5b7` (Eliminate 'any' types)
**Archivo de Tests:** YA EXISTE y está correcto
**Solo Falta:** Crear archivo .ts principal e integrar

---

## ⏭️ SIGUIENTE ISSUE RECOMENDADO

**Issue #4: Fix Memory Leak en Real-time Subscriptions**
- Severidad: 🔴 CRÍTICO
- Esfuerzo: 4 horas
- Complejidad: MEDIA
- Sin problemas de escaping ✅
- Alto impacto en estabilidad

---

*Documentación creada por Claude Code*
*Última actualización: 2025-10-23*
