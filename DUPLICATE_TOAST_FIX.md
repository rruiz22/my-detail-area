# ✅ Corrección de Toasts Duplicados - Custom Roles

## 🔍 **Problema Reportado**

Al guardar o actualizar los custom roles en la página de detalles del dealer (`/admin/:id`), aparecían **2 notificaciones toast** duplicadas:
1. "Permissions saved successfully"
2. "Permissions updated successfully"

## 🎯 **Causa Raíz**

Había una **cadena de llamadas** que generaba toasts duplicados:

```typescript
// 1. GranularPermissionManager.tsx (línea 310-313)
toast({
  title: t('common.success'),
  description: 'Permissions saved successfully'
});
onSave?.(); // Llama al callback

// 2. EditRoleModal.tsx (línea 99-105)
const handlePermissionsSaved = () => {
  toast({
    title: t('common.success'),
    description: 'Permissions updated successfully' // ❌ Toast duplicado
  });
  onRoleUpdated();
};

// 3. EditRoleModal.tsx (línea 174-178)
<GranularPermissionManager
  roleId={role.id}
  roleName={role.display_name}
  onSave={handlePermissionsSaved} // Pasa el callback que muestra otro toast
/>
```

## 🛠️ **Solución Aplicada**

Eliminé el toast duplicado de `EditRoleModal.tsx`, dejando solo el toast del componente `GranularPermissionManager`:

### **Archivo Modificado: `src/components/dealer/EditRoleModal.tsx`**

```typescript
// ANTES:
const handlePermissionsSaved = () => {
  toast({
    title: t('common.success'),
    description: 'Permissions updated successfully'  // ❌ Duplicado
  });
  onRoleUpdated();
};

// DESPUÉS:
const handlePermissionsSaved = () => {
  // Toast already shown by GranularPermissionManager
  onRoleUpdated();
};
```

## ✅ **Resultado**

Ahora cuando se guardan los permisos de un custom role:

1. ✅ Se muestra **UN SOLO toast**: "Permissions saved successfully"
2. ✅ Se ejecuta `onRoleUpdated()` para refrescar la lista
3. ✅ No hay notificaciones duplicadas

## 📋 **Flujo Correcto**

```
Usuario guarda permisos
    ↓
GranularPermissionManager.savePermissions()
    ↓
Guarda en base de datos
    ↓
Muestra toast: "Permissions saved successfully" ✅
    ↓
Llama a onSave() → handlePermissionsSaved()
    ↓
Ejecuta onRoleUpdated() (sin toast adicional) ✅
    ↓
Refresca la lista de roles
```

## 🔍 **Verificación**

Para verificar que el problema está resuelto:

1. **Navega a** `/admin/:id` (detalles de un dealer)
2. **Selecciona** un custom role para editar
3. **Cambia** algunos permisos en la tab "Permissions"
4. **Haz clic** en "Save Permissions"
5. **Verifica** que aparece **solo 1 toast**

## 📚 **Archivos Modificados**

| Archivo | Cambio |
|---------|--------|
| `src/components/dealer/EditRoleModal.tsx` | Removido toast duplicado de `handlePermissionsSaved` |

---

**Fecha de corrección:** 2025-10-21
**Tipo de fix:** UX improvement - eliminación de notificaciones duplicadas
