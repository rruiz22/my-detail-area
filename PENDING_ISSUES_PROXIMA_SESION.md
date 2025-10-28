# 🔧 PROBLEMAS PENDIENTES - Próxima Sesión

**Fecha**: 2025-10-27 18:00
**Estado Actual**: 80% Completado
**Tiempo Estimado Restante**: 30-45 minutos

---

## ✅ LO QUE YA FUNCIONA

1. ✅ Función RPC `get_user_permissions_batch` creada y funcionando
2. ✅ Rol "user" system filtrado correctamente
3. ✅ Permisos se cargan desde base de datos
4. ✅ Sidebar muestra solo módulos del custom role
5. ✅ Botón "New Order" habilitado
6. ✅ Modal de CarWash abre instantáneo (lazy loading removido)
7. ✅ Usuario puede CREAR órdenes de CarWash

---

## ❌ PROBLEMA PENDIENTE #1: No Puede Cambiar Status

### **Síntoma**:
- Candado 🔒 aparece en TODAS las órdenes (In Progress, Completed)
- Click en status badge no hace nada
- Console no muestra errores de permiso

### **Datos Verificados**:

**Base de Datos** ✅:
```
Rol "carwash" tiene permisos:
- view_orders ✅
- create_orders ✅
- change_status ✅  ← EXISTE EN DB
```

**RPC Devuelve** ✅:
```json
{
  "module_permissions": [
    {"module": "car_wash", "permission_key": "change_status"}
  ]
}
```

**Código de Verificación** ✅:
```typescript
// useStatusPermissions.tsx línea 61
const hasChangeStatus = hasModulePermission(module, 'change_status');
```

### **Problema Sospechoso**:

**React Query Cache Persistente**:
- Aunque RPC devuelve datos correctos
- React Query puede estar usando cache viejo
- `enhancedUser.custom_roles = []` en navegador
- Pero RPC devuelve `roles: [{...carwash}]`

### **Debugging Necesario**:

1. **Agregar logs en usePermissions.tsx línea 537**:
```typescript
console.log('🔍 DEBUG custom_roles:', {
  rolesMapSize: rolesMap.size,
  rolesMapValues: Array.from(rolesMap.values()),
  rolesFromBatch: rolesFromBatch,
  finalCustomRoles: Array.from(rolesMap.values())
});

return {
  // ...
  custom_roles: Array.from(rolesMap.values()),
  // ...
};
```

2. **Verificar en console qué dice el log**

3. **Si rolesMap está vacío**:
   - Problema en `processRole()` función
   - O rol está siendo skippeado incorrectamente

### **Posibles Causas**:

**A. Rol se skippea incorrectamente** (líneas 493-499):
```typescript
if (roleType === 'system_role' && role.role_name === 'user') {
  logger.dev(`⚠️ Skipping...`);
  return;
}
```
- Verificar que `roleType` sea 'dealer_custom_role' para "carwash"
- Verificar que no se skippea por error

**B. rolesMap no se construye** (línea 435-492):
- Problema en `processRole()` función
- roleModulesEnabled undefined
- roleHasModuleAccess false para car_wash

**C. React Query no invalida cache**:
- `staleTime` muy largo
- `gcTime` muy largo
- `refetchOnWindowFocus: false`

---

## ❌ PROBLEMA PENDIENTE #2: Verificar Otros Modales

### **Sales Orders Modal**:
- Estado: Lazy loading aún activo
- Tardar: ~6 segundos
- Fix pendiente: Remover lazy

### **Service Orders Modal**:
- Estado: Lazy loading aún activo
- Tardar: ~6 segundos
- Fix pendiente: Remover lazy

### **Recon Orders Modal**:
- Estado: Lazy loading aún activo
- Tardar: ~6 segundos
- Fix pendiente: Remover lazy

---

## 📋 PLAN PARA PRÓXIMA SESIÓN

### **PASO 1: Fix Status Badge** (15-20 minutos)

**Opción A: Agregar Logs de Debug**:
1. Agregar logs en usePermissions.tsx línea 537
2. Reload y revisar console
3. Identificar por qué rolesMap está vacío

**Opción B: Bypass Temporal para Testing**:
1. En StatusBadgeInteractive.tsx línea 40
2. Cambiar default de `true` → siempre permitir
3. Verificar que funcionalidad de cambio funciona
4. Luego arreglar el permiso real

**Opción C: Invalidar React Query Programáticamente**:
1. En usePermissions.tsx
2. Reducir `staleTime` a 0 temporalmente
3. Forzar `refetchOnWindowFocus: true`
4. Verificar que refresca al cambiar tab

### **PASO 2: Optimizar Otros Modales** (10 minutos)

Aplicar mismo fix de CarWash a:
- SalesOrders.tsx
- ServiceOrders.tsx
- ReconOrders.tsx

**Patrón**:
```typescript
// Cambiar de:
const Modal = lazy(() => import('./Modal'));
<Suspense><Modal /></Suspense>

// A:
import Modal from './Modal';
<Modal />
```

### **PASO 3: Cleanup Warnings** (5 minutos)

En `useDealershipModules.tsx` líneas 136-137:
```typescript
// Cambiar de:
console.warn('[hasModuleAccess] ⚠️ No modules configured...');
console.warn('This should not happen...');

// A:
logger.dev('[hasModuleAccess] No modules configured for dealerId:', dealerId);
// Sin segundo warning
```

---

## 🔍 QUERIES ÚTILES PARA DEBUG

### **Ver estado de React Query cache**:
```javascript
// En console
console.log('React Query Cache:', queryClient.getQueryCache().getAll());
```

### **Ver enhancedUser actual**:
```javascript
// En console
console.log('EnhancedUser:',
  JSON.stringify({
    custom_roles: window.__enhancedUser?.custom_roles,
    module_permissions: Array.from(window.__enhancedUser?.module_permissions?.entries() || [])
  }, null, 2)
);
```

### **Forzar refresh de permisos**:
```javascript
// En console
queryClient.invalidateQueries({queryKey: ['user-permissions']});
await queryClient.refetchQueries({queryKey: ['user-permissions']});
```

---

## 📊 ESTADO ACTUAL

### **Completado** ✅:
- [x] Función RPC creada
- [x] Rol "user" filtrado
- [x] role_module_access respetado
- [x] localStorage cache disabled
- [x] Rol manager con full access
- [x] Sidebar muestra módulos correctos
- [x] Botón "New Order" funciona
- [x] Modal CarWash abre instantáneo
- [x] Usuario puede CREAR órdenes

### **Pendiente** ❌:
- [ ] Usuario NO puede cambiar status (candado)
- [ ] Console con warnings excesivos
- [ ] Sales modal sigue lento
- [ ] Service modal sigue lento
- [ ] Recon modal sigue lento

---

## 🎯 PRIORIDADES PRÓXIMA SESIÓN

**ALTA** 🔴:
1. Fix candado en status badge (15 min)

**MEDIA** 🟡:
2. Optimizar modales restantes (10 min)

**BAJA** 🟢:
3. Silenciar warnings console (5 min)

**Total Estimado**: 30 minutos

---

## 📝 CONTEXT

O PARA PRÓXIMA SESIÓN

**Usuario**:
- Email: rudyruizlima@gmail.com
- System Role: "manager" (tiene full access ahora)
- Custom Role: "carwash" (dealer_id: 5)

**Dealer**:
- ID: 5
- Nombre: "Bmw of Sudbury"
- Módulos enabled: dashboard, sales, service, recon, car_wash, get_ready

**Permisos del Rol "carwash"** (en DB):
- car_wash: view_orders, create_orders, change_status

**Problema actual**:
- RPC devuelve permisos correctamente
- Frontend no los aplica (cache o bug)
- Candado aparece en todos los status badges

---

## 🚀 QUICK START PRÓXIMA SESIÓN

**Comando rápido para empezar**:

```javascript
// En console del navegador:
// 1. Ver qué tiene enhancedUser
const { usePermissions } = await import('./src/hooks/usePermissions');
// Esto te dirá si custom_roles está vacío

// 2. Ver qué devuelve RPC directamente
// (Ya verificado - devuelve correcto)

// 3. Invalidar cache y forzar refresh
queryClient.clear();
location.reload();
```

---

## 📚 DOCUMENTACIÓN GENERADA HOY

1. `CUSTOM_ROLES_FIX_COMPLETO_FINAL.md` - Resumen completo
2. `SESION_COMPLETA_2025_10_27.md` - Log de sesión
3. `MODAL_PERFORMANCE_FIX.md` - Fix de modales
4. `ARQUITECTURA_ROLES_FINAL.md` - Arquitectura system
5. `PENDING_ISSUES_PROXIMA_SESION.md` - Este archivo
6. + 5 documentos más

---

## ✅ CONFIRMACIÓN DE PROGRESO

**De 10 problemas originales**:
- ✅ 7 resueltos completamente
- ⏳ 2 en progreso (status badge, otros modales)
- 📋 1 cosmético (warnings)

**Porcentaje completado**: ~80%
**Tiempo invertido**: 3 horas
**Tiempo restante estimado**: 30-45 minutos

---

**🎯 Para próxima sesión, empezar con:**
1. Agregar logs de debug en usePermissions.tsx línea 537
2. Reload y ver qué muestra console
3. Identificar por qué custom_roles está vacío en navegador

**Archivos clave para revisar**:
- `src/hooks/usePermissions.tsx` (líneas 493-540)
- `src/hooks/useStatusPermissions.tsx` (línea 61)
- `src/components/StatusBadgeInteractive.tsx` (líneas 30-80)

---

**🌙 Buen descanso. La próxima sesión será más rápida con este contexto completo.**
