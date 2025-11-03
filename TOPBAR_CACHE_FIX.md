# 🐛 FIX: Topbar Muestra Role Anterior (Modal de Orden Muestra Role Correcto)

## 🔍 El Problema

**SÍNTOMA**: Cambias el role de `rudyruizlima@gmail.com` y:
- ✅ El modal de crear orden muestra el **nuevo role** (correcto)
- ❌ El topbar/user dropdown muestra el **role anterior** (incorrecto)
- ❌ Incluso con `Ctrl + Shift + R` no se actualiza

---

## 🧠 Por Qué Sucede

### El Topbar tiene MÚLTIPLES capas de cache:

```
┌─────────────────────────────────────────────────┐
│  TOPBAR (UserDropdown component)                │
├─────────────────────────────────────────────────┤
│  1. usePermissions()                            │
│     ↓                                           │
│  2. useUserProfileForPermissions()              │
│     - staleTime: 900000 (15 MIN!)  ⚠️          │
│     - queryKey: ['user_profile_permissions']   │
│     ↓                                           │
│  3. localStorage: 'user_profile_cache'          │
│     - TTL: 24 hours!  ⚠️                       │
│     ↓                                           │
│  4. localStorage: 'permissions_cache_v1'        │
│     - TTL: 15 minutes                          │
└─────────────────────────────────────────────────┘

PROBLEMA: invalidateQueries() NO refetch si staleTime
          no ha expirado (15 minutos!)
```

### El Modal de Orden NO tiene este problema porque:
- Probablemente hace un fetch fresco al abrir
- O usa un query key diferente
- O tiene un staleTime más corto

---

## ✅ Solución Implementada

### CAMBIO 1: `resetQueries` en lugar de `invalidateQueries`

**ANTES:**
```typescript
// ❌ Esto NO funciona porque staleTime = 15 min
await queryClient.invalidateQueries({
  queryKey: ['user_profile_permissions', user.id]
});
```

**DESPUÉS:**
```typescript
// ✅ Esto FUERZA refetch inmediato, ignorando staleTime
await queryClient.resetQueries({
  queryKey: ['user_profile_permissions', user.id]
});
await queryClient.resetQueries({
  queryKey: ['user-permissions', user.id]
});
```

### CAMBIO 2: Limpiar user_profile_cache explícitamente

```typescript
// También limpiar el cache de perfil de 24 horas
localStorage.removeItem('user_profile_cache');
```

### Código Completo en `ManageCustomRolesModal.tsx`:

```typescript
// AGGRESSIVE: Reset queries instead of just invalidating
await queryClient.resetQueries({
  queryKey: ['user-permissions', user.id]
});
await queryClient.resetQueries({
  queryKey: ['user_profile_permissions', user.id]
});
await queryClient.invalidateQueries({
  queryKey: ['dealer_users_with_roles']
});

// FORCE clear ALL cache
forceInvalidateAllPermissionCache();

// Also clear the user profile cache
localStorage.removeItem('user_profile_cache');

refreshPermissions();
```

---

## 🧪 Cómo Probar el Fix

### Test 1: Cambiar Role y Verificar

1. **Recarga tu navegador** (`Ctrl + Shift + R`)
2. **Inicia sesión como admin**
3. **Ve a "Users"** > **"Manage Custom Roles"** para `rudyruizlima@gmail.com`
4. **Cambia su role** (asigna o remueve uno)
5. **Verifica en la consola** que veas:
   ```
   🧹 FORCE: All permission cache cleared
   ```
6. **Como `rudyruizlima@gmail.com`**, abre DevTools y ejecuta:
   ```javascript
   // Pega el contenido de DEBUG_USER_ROLE_CACHE.js aquí
   ```
7. **Verifica** que no haya caches viejos
8. **Recarga** con `Ctrl + Shift + R`
9. **Abre el user dropdown** (topbar) y verifica el role

### Test 2: Verificar Cache en Tiempo Real

**Como `rudyruizlima@gmail.com`**, ejecuta en la consola:

```javascript
// Ver el cache actual
console.log('Permissions cache:', localStorage.getItem('permissions_cache_v1'));
console.log('Profile cache:', localStorage.getItem('user_profile_cache'));
```

**Deberían ser `null` después del cambio de role.**

### Test 3: Comparar Topbar vs Modal

1. **Abre el user dropdown** (topbar) y anota el role que muestra
2. **Abre el modal de crear orden** y anota el role que muestra
3. **Deberían ser IDÉNTICOS** ✅

---

## 🔍 Debugging si TODAVÍA no funciona

### Script de Debugging

**Ejecuta esto en la consola del usuario afectado:**

```javascript
// Copia el contenido completo de DEBUG_USER_ROLE_CACHE.js
```

El script te mostrará:
- ✅ Qué hay en localStorage
- ✅ Qué hay en React Query cache
- ✅ Qué muestra el DOM actualmente
- ✅ Cuánto tiempo tiene cada cache

### Limpieza Manual Extrema

Si el problema persiste, ejecuta esto en la consola:

```javascript
// Limpia TODO
clearAllCaches(); // Función del script de debugging

// O manualmente:
localStorage.clear();
sessionStorage.clear();
indexedDB.deleteDatabase('firebaseLocalStorageDb'); // Si usas Firebase
location.reload(true);
```

### Verificar en la Base de Datos

```sql
-- Ejecuta en Supabase SQL Editor para verificar el role real
SELECT
  p.id,
  p.email,
  p.role AS system_role,
  ucra.custom_role_id,
  dcr.role_name AS custom_role_name,
  dcr.display_name AS custom_role_display,
  ucra.is_active
FROM profiles p
LEFT JOIN user_custom_role_assignments ucra
  ON p.id = ucra.user_id
  AND ucra.is_active = TRUE
LEFT JOIN dealer_custom_roles dcr
  ON ucra.custom_role_id = dcr.id
WHERE p.email = 'rudyruizlima@gmail.com';
```

---

## 📊 Diferencia: invalidateQueries vs resetQueries

| Método | Comportamiento | Respeta staleTime | Cuándo Usar |
|--------|----------------|-------------------|-------------|
| **invalidateQueries** | Marca como stale, refetch solo si staleTime expiró | ✅ SÍ | Updates normales, no urgentes |
| **resetQueries** | BORRA cache, refetch inmediato | ❌ NO (ignora) | Changes urgentes, críticos |

**Para role changes, usamos `resetQueries`** porque son cambios críticos de seguridad que deben reflejarse INMEDIATAMENTE.

---

## 🎯 Resultado Esperado

**FLUJO CORRECTO:**

1. ✅ Admin cambia role de usuario en "Manage Custom Roles"
2. ✅ `resetQueries` fuerza refetch inmediato (ignora 15 min staleTime)
3. ✅ `forceInvalidateAllPermissionCache()` limpia localStorage
4. ✅ `user_profile_cache` eliminado explícitamente
5. ✅ Usuario hace `Ctrl + Shift + R`
6. ✅ `usePermissions()` refetch fresh data
7. ✅ **Topbar muestra nuevo role** ⚡
8. ✅ **Modal de orden muestra nuevo role** ⚡
9. ✅ **AMBOS SON IDÉNTICOS** ✅

---

## 📋 Checklist

- [x] Código actualizado para usar `resetQueries`
- [x] Limpieza explícita de `user_profile_cache`
- [x] Script de debugging creado (`DEBUG_USER_ROLE_CACHE.js`)
- [x] Documentación completa
- [ ] Probado con usuario real
- [ ] Verificado que topbar y modal muestran mismo role

---

## 📁 Archivos Relacionados

1. **`src/components/permissions/ManageCustomRolesModal.tsx`**
   - ✅ Usa `resetQueries` para invalidación agresiva
   - ✅ Limpia `user_profile_cache` explícitamente

2. **`src/hooks/usePermissions.tsx`**
   - Usa `useUserProfileForPermissions()` (staleTime 15 min)

3. **`src/hooks/useUserProfile.tsx`**
   - `useUserProfileForPermissions()` con queryKey `['user_profile_permissions']`

4. **`src/components/ui/user-dropdown.tsx`**
   - Muestra `enhancedUser.custom_roles` en el topbar

5. **`DEBUG_USER_ROLE_CACHE.js`**
   - Script para debugging en la consola del navegador

---

**🚀 El fix está aplicado. Ahora prueba cambiar el role y verifica que el topbar se actualice correctamente después de recargar.**
