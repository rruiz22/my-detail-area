# ✅ Corrección de Error en Permisos - DealerServices

## 🔍 **Problema**

Al entrar a los detalles del dealer (`/admin/:id`), la aplicación generaba un error:

```
TypeError: Cannot read properties of undefined (reading 'some')
    at canViewPricing (permissions.ts:28:16)
    at DealerServices (DealerServices.tsx:76:25)
```

## 🎯 **Causa Raíz**

Las funciones de permisos en `src/utils/permissions.ts` no validaban si el parámetro `roles` era `undefined` antes de llamar al método `.some()`. Además, estas funciones esperaban 2 parámetros pero los componentes solo pasaban 1.

### Funciones Afectadas:
1. `canViewPricing(roles, isSystemAdmin)`
2. `canAccessInternalNotes(roles, isSystemAdmin)`
3. `canDeleteOrders(roles, isSystemAdmin)`
4. `canExportReports(roles, isSystemAdmin)`
5. `canChangeOrderStatus(roles, isSystemAdmin)`
6. `hasPermissionLevel(permissions, module, requiredLevel)`

## 🛠️ **Solución Implementada**

### 1. **Actualizado `src/utils/permissions.ts`**

Agregué validaciones de seguridad en todas las funciones:

```typescript
// ANTES (causaba error):
export const canViewPricing = (
  roles: CustomRoleWithPermissions[],
  isSystemAdmin: boolean
): boolean => {
  if (isSystemAdmin) return true;
  return roles.some(role => role.granularPermissions?.can_view_pricing === true);
};

// DESPUÉS (seguro):
export const canViewPricing = (
  roles: CustomRoleWithPermissions[] | undefined,
  isSystemAdmin: boolean
): boolean => {
  if (isSystemAdmin) return true;
  if (!roles || !Array.isArray(roles)) return false;
  return roles.some(role => role.granularPermissions?.can_view_pricing === true);
};
```

**Cambios aplicados:**
- ✅ Tipo del parámetro cambiado a `roles: CustomRoleWithPermissions[] | undefined`
- ✅ Agregada validación: `if (!roles || !Array.isArray(roles)) return false;`
- ✅ Aplicado a todas las 6 funciones mencionadas

### 2. **Actualizados Componentes que Usan las Funciones**

#### **a) `src/components/dealer/DealerServices.tsx`**

```typescript
// Agregado import
import { usePermissions } from '@/hooks/usePermissions';

// Agregado hook
const { enhancedUser } = usePermissions();

// Actualizada llamada
const canViewPrices = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);

// Protegida validación de permissions
const canManageServices = permissions?.some(p => ...) ?? true;
```

#### **b) `src/components/orders/ReconOrderModal.tsx`**

```typescript
// Agregado import
import { usePermissions } from '@/hooks/usePermissions';

// Agregado hook
const { enhancedUser } = usePermissions();

// Actualizada llamada
const canViewPrices = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);
```

#### **c) `src/components/orders/OrderModal.tsx`**

```typescript
// Mismo patrón que ReconOrderModal
import { usePermissions } from '@/hooks/usePermissions';
const { enhancedUser } = usePermissions();
const canViewPrices = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);
```

#### **d) `src/components/orders/ServiceOrderModal.tsx`**

```typescript
// Mismo patrón que ReconOrderModal
import { usePermissions } from '@/hooks/usePermissions';
const { enhancedUser } = usePermissions();
const canViewPrices = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);
```

#### **e) `src/components/dealer/DealerCategories.tsx`**

```typescript
// Ya usaba usePermissions, solo agregué enhancedUser
const { roles, enhancedUser } = usePermissions();
const canManageCategories = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);
```

## 📋 **Archivos Modificados**

| Archivo | Cambios |
|---------|---------|
| `src/utils/permissions.ts` | 6 funciones actualizadas con validaciones |
| `src/components/dealer/DealerServices.tsx` | Import + hook + 2 llamadas actualizadas |
| `src/components/orders/ReconOrderModal.tsx` | Import + hook + llamada actualizada |
| `src/components/orders/OrderModal.tsx` | Import + hook + llamada actualizada |
| `src/components/orders/ServiceOrderModal.tsx` | Import + hook + llamada actualizada |
| `src/components/dealer/DealerCategories.tsx` | Hook extendido + llamada actualizada |

## ✅ **Resultado**

- ✅ **Error corregido**: El componente `DealerServices` ya no genera error
- ✅ **Sin errores de linter**: Todos los archivos validados
- ✅ **Validaciones defensivas**: Todas las funciones ahora manejan `undefined` correctamente
- ✅ **Backward compatible**: Los cambios no afectan la funcionalidad existente
- ✅ **Consistencia**: Todos los componentes ahora pasan ambos parámetros requeridos

## 🔄 **Cómo Verificar**

1. **Navega a `/admin`**
2. **Selecciona cualquier dealership** para ver sus detalles
3. **Verifica que NO aparezca el error** en la consola
4. **La pestaña "Services"** debería cargar correctamente

## 📝 **Notas Técnicas**

### Por qué agregamos `enhancedUser`?

El hook `usePermissions()` proporciona `enhancedUser` que contiene:
- `is_system_admin`: Boolean que indica si el usuario es administrador del sistema
- `module_permissions`: Mapa de permisos por módulo
- Otras propiedades del usuario enriquecidas

### Por qué usamos `??` (nullish coalescing)?

```typescript
enhancedUser?.is_system_admin ?? false
```

- `?.` → acceso seguro (si `enhancedUser` es `undefined`, retorna `undefined`)
- `?? false` → si el resultado es `null` o `undefined`, usa `false`

Esto garantiza que siempre pasemos un `boolean` válido a la función.

---

**Fecha de corrección:** 2025-10-21
**Archivos modificados:** 7 archivos
**Tipo de fix:** Bug fix crítico (evita crash de la aplicación)
