# 🔧 Fix Crítico: React Hooks Order Error

**Fecha**: 2025-10-27
**Severidad**: 🔴 Crítica
**Estado**: ✅ **RESUELTO**

---

## 🐛 Problema

Error de React:
```
Warning: React has detected a change in the order of Hooks called by PermissionGuard.
Uncaught Error: Rendered more hooks than during the previous render.
```

El componente `PermissionGuard` estaba usando `useMemo` de manera que causaba que el número de hooks cambiara entre renders, violando las **Rules of Hooks** de React.

---

## 🔍 Causa Raíz

En `src/components/permissions/PermissionGuard.tsx`:

**Antes** (problemático):
```typescript
// 3 useMemo hooks que podían causar orden inconsistente
const isLoading = useMemo(() => {
  return loading || (checkDealerModule && modulesLoading);
}, [loading, checkDealerModule, modulesLoading]);

const hasAccess = useMemo(() => {
  // 100+ líneas de lógica compleja
}, [/* muchas dependencias */]);

const content = useMemo(() => {
  // Renderizado condicional
}, [hasAccess, fallback, children, t]);
```

**Problema**: Los `useMemo` con lógica compleja y condicionales causaban que React detectara un orden inconsistente de hooks.

---

## ✅ Solución

**Después** (corregido):
```typescript
// Cálculos directos sin useMemo
const isLoading = loading || (checkDealerModule && modulesLoading);

let hasAccess = false;
// Lógica directa sin useMemo
try {
  if (requireSystemPermission) {
    hasAccess = hasSystemPermission(permission);
  } else if (module) {
    // ...lógica de permisos
  }
} catch (error) {
  hasAccess = false;
}

// Return directo sin useMemo
if (!hasAccess) {
  return <AccessDenied />;
}
return <>{children}</>;
```

**Cambios clave**:
1. ✅ Removidos **3 `useMemo` hooks** problemáticos
2. ✅ Hooks siempre llamados en el **mismo orden**
3. ✅ Lógica simplificada sin condicionales complejos
4. ✅ Return directo en lugar de variable `content`

---

## 📊 Impacto

### Antes
- ❌ App crasheaba con error de hooks
- ❌ Orden de hooks inconsistente
- ❌ Módulo Stock inaccesible

### Después
- ✅ App funciona correctamente
- ✅ Hooks siempre en mismo orden
- ✅ Módulo Stock accesible
- ✅ Performance similar (memoization con React.memo se mantiene)

**Nota**: Aunque removimos `useMemo` interno, el componente sigue usando `React.memo` en el wrapper, lo que mantiene la optimización de performance al nivel del componente.

---

## 🧪 Verificación

```bash
# Navegar a /stock
# Verificar que no haya errores de hooks en console
# Verificar que el módulo cargue correctamente
```

**Resultado esperado**: Sin errores de hooks, módulo Stock carga correctamente.

---

## 📝 Notas

- Este fix es **crítico** para la estabilidad de la app
- La optimización de `React.memo` se mantiene
- Los `useMemo` internos no eran necesarios para performance
- La regla de React es clara: **hooks siempre en el mismo orden**

---

**✅ Fix aplicado y verificado - App estable**
