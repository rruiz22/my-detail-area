# 🚨 HOTFIX: EventBus y ErrorBoundary Errors

**Fecha**: 2025-10-27
**Severidad**: 🔴 Crítica
**Estado**: ✅ **RESUELTO**

---

## 🐛 Errores Detectados

### 1. `orderEvents.subscribe is not a function`
```
TypeError: orderEvents.subscribe is not a function
at useStockManagement.ts:144:37
```

### 2. Invalid hook call en StockErrorFallback
```
Error: Invalid hook call. Hooks can only be called inside of the body of a function component.
at StockErrorFallback (Stock.tsx:12:17)
```

### 3. Rendered more hooks than during the previous render
```
Warning: React has detected a change in the order of Hooks called by StockDashboard.
```

---

## 🔍 Causas

### Error 1: EventBus API Mismatch
El eventBus usa `.on()` y `.off()`, pero el código intentaba usar `.subscribe()`.

### Error 2: ErrorBoundary Fallback Incorrecto
El componente `StockErrorFallback` se estaba pasando directamente como prop en lugar de como función render.

### Error 3: Hot Reload Conflict
React detectó cambio en orden de hooks durante hot reload mientras se editaba el código.

---

## ✅ Soluciones Aplicadas

### Fix 1: Agregar método `.subscribe()` al EventBus

**Archivo**: `src/utils/eventBus.ts`

```typescript
// ✅ ANTES: Solo tenía .on()
on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
  // ...
}

// ✅ DESPUÉS: Ahora retorna función cleanup y tiene alias .subscribe()
on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
  if (!this.listeners.has(event)) {
    this.listeners.set(event, new Set());
  }
  this.listeners.get(event)!.add(handler);

  // Return unsubscribe function
  return () => this.off(event, handler);
}

// Alias para subscribe
subscribe<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
  return this.on(event, handler);
}
```

**Agregar evento `inventoryUpdated`**:
```typescript
type EventMap = {
  // ... otros eventos
  inventoryUpdated: { dealerId: number; vehicleCount: number; removedCount: number };
};
```

**Actualizar uso en useStockManagement**:
```typescript
// ✅ Ahora usa .on() que retorna cleanup function
useEffect(() => {
  const unsubscribe = orderEvents.on('inventoryUpdated', () => {
    logger.dev('📦 EventBus: Inventory updated, refreshing...');
    refreshInventory();
  });

  return unsubscribe; // ✅ Cleanup automático
}, [refreshInventory]);
```

---

### Fix 2: Corregir ErrorBoundary Fallback

**Archivo**: `src/pages/Stock.tsx`

```typescript
// ❌ ANTES: Pasaba componente directamente (causaba invalid hook call)
<ErrorBoundary fallback={StockErrorFallback}>
  <StockDashboard />
</ErrorBoundary>

// ✅ DESPUÉS: Pasa función render
<ErrorBoundary fallback={(reset) => <StockErrorFallback reset={reset} />}>
  <StockDashboard />
</ErrorBoundary>
```

**Por qué funciona**:
- ErrorBoundary espera `fallback` como función render o ReactNode
- Al pasar función, los hooks del componente se ejecutan correctamente
- El parámetro `reset` se pasa correctamente al componente hijo

---

### Fix 3: Orden de Hooks Consistente

**No requiere cambios adicionales** - El error era causado por hot reload durante edición.

**Verificación**:
- Todos los hooks en `useStockManagement` se llaman en orden fijo
- No hay hooks condicionales
- No hay hooks dentro de loops

---

## 🧪 Verificación

### Tests Manuales

1. ✅ **EventBus**: Subir CSV → Verificar que dispara evento
2. ✅ **ErrorBoundary**: Forzar error → Ver fallback correcto
3. ✅ **Hooks Order**: Navegar entre páginas → Sin warnings

### Comandos de Verificación

```bash
# Sin errores de linting
npm run lint

# TypeScript compilation exitosa
npm run type-check
```

---

## 📊 Impacto

| Aspecto | Antes | Después |
|---------|-------|---------|
| EventBus | ❌ No funcionaba | ✅ Funciona |
| Error Handling | ❌ Crash completo | ✅ Fallback gracioso |
| Hooks Order | ⚠️ Inconsistente | ✅ Consistente |
| App Estabilidad | 🔴 Crítica | 🟢 Estable |

---

## 🚀 Deploy

**Acción requerida**: **REFRESH completo del navegador**

```bash
# Usuario debe hacer:
1. Ctrl + Shift + R (hard refresh)
   O
2. F12 → Application → Clear Storage → Reload
```

**Razón**: Hot reload puede dejar estado inconsistente. Un refresh limpio carga los archivos actualizados correctamente.

---

## 📝 Archivos Modificados

1. ✅ `src/utils/eventBus.ts`
   - Método `.on()` ahora retorna cleanup function
   - Agregado método `.subscribe()` como alias
   - Agregado evento `inventoryUpdated` al EventMap

2. ✅ `src/hooks/useStockManagement.ts`
   - Cambiado `.subscribe()` a `.on()` (no breaking change)

3. ✅ `src/pages/Stock.tsx`
   - ErrorBoundary fallback ahora como función render

---

## ✅ Status

**Estado**: 🟢 **RESUELTO Y VERIFICADO**

Todos los archivos corregidos, sin errores de linting, listo para uso.

**Next Action**: Usuario debe hacer hard refresh del navegador para aplicar cambios.
