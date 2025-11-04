# 🔐 GUÍA DEFINITIVA: Creación de Usuarios Supermanager

**Última actualización:** 2025-11-03
**Autor:** Sistema MyDetailArea
**Status:** ✅ PRODUCTION-READY

---

## 📋 OVERVIEW

Los **Supermanagers** son usuarios con **acceso elevado a todos los dealerships** pero **sin permisos de configuración de plataforma**. Tienen acceso operativo completo pero no pueden modificar configuraciones globales del sistema.

### Comparación de Roles

| Capacidad | system_admin | supermanager | dealer_admin | dealer_user |
|-----------|-------------|--------------|--------------|-------------|
| **Dealerships con acceso** | TODOS ✅ | TODOS ✅ | 1 | 1 |
| **Módulos operativos** | TODOS ✅ | TODOS ✅ | Configurables | Configurables |
| **Platform settings** | ✅ | ❌ | ❌ | ❌ |
| **Crear/modificar dealerships** | ✅ | ❌ | ❌ | ❌ |
| **Crear system users** | ✅ | ❌ | ❌ | ❌ |
| **Manage all settings** | ✅ | ❌ | ❌ | ❌ |

---

## ⚡ MÉTODO 1: Via Admin UI (RECOMENDADO)

### Proceso Paso a Paso

1. **Login como system_admin**
   - Usar cuenta con `role = 'system_admin'`
   - Ejemplo: `rruiz@lima.llc`

2. **Navegar a System Users**
   - Ir a: **Admin → System Users Management**
   - O navegar directamente a: `/admin/system-users`

3. **Click "Add System User"**
   - Modal abrirá: CreateSystemUserModal

4. **Completar formulario:**
   ```
   Email:              usuario@ejemplo.com
   First Name:         Nombre
   Last Name:          Apellido
   Role:               Supermanager  ← SELECCIONAR ESTE
   Primary Dealership: (Dejar vacío)  ← IMPORTANTE: No seleccionar
   Send Welcome Email: ✅ (Opcional)
   ```

5. **Click "Create User"**

6. **✅ AUTOMÁTICO - El sistema hace:**
   - Crea usuario en `auth.users` con email confirmado
   - Actualiza `profiles` con `role = 'supermanager'`
   - **Crea dealer_memberships para TODOS los dealerships** 🔥
   - Inicializa permisos via trigger de base de datos
   - Envía email de bienvenida (si seleccionado)

---

## 🔧 MÉTODO 2: Via Edge Function (Programático)

### Para integraciones o scripts

```typescript
const response = await supabase.functions.invoke('create-system-user', {
  body: {
    email: 'usuario@ejemplo.com',
    firstName: 'Nombre',
    lastName: 'Apellido',
    role: 'supermanager',
    primaryDealershipId: null,  // ← IMPORTANTE: null para acceso global
    sendWelcomeEmail: true
  }
})

if (response.error) {
  console.error('Failed to create supermanager:', response.error)
} else {
  console.log('✅ Supermanager created:', response.data)
}
```

---

## 📊 VERIFICACIÓN POST-CREACIÓN

### ✅ Checklist Obligatorio

Ejecutar estas queries en Supabase Dashboard → SQL Editor:

#### **1. Verificar Perfil Creado**
```sql
SELECT
  id,
  email,
  role,
  first_name,
  last_name,
  dealership_id,
  created_at
FROM profiles
WHERE email = 'usuario@ejemplo.com';
```

**Resultado esperado:**
```
role: "supermanager"  ✅
dealership_id: null o número (ambos OK)
```

---

#### **2. Verificar Dealer Memberships**
```sql
SELECT
  dm.dealer_id,
  d.name as dealer_name,
  dm.is_active,
  dcr.role_name as assigned_role
FROM dealer_memberships dm
JOIN dealerships d ON dm.dealer_id = d.id
LEFT JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
WHERE dm.user_id = (SELECT id FROM profiles WHERE email = 'usuario@ejemplo.com')
ORDER BY d.name;
```

**Resultado esperado:**
```
Debe mostrar: TODOS los dealerships activos (minimum 1)
is_active: true para todos
assigned_role: puede ser NULL (OK para supermanagers) o un custom_role
```

**🔥 CRÍTICO:** Si esta query retorna 0 rows → **EL USUARIO NO TIENE ACCESO**

---

#### **3. Verificar Permisos Efectivos**
```sql
SELECT get_user_permissions_batch(
  (SELECT id FROM profiles WHERE email = 'usuario@ejemplo.com')::uuid
) as permissions;
```

**Resultado esperado:**
```json
{
  "roles": [...],  // Al menos 1 custom_role
  "module_access": [...],  // Al menos algunos módulos enabled
  "module_permissions": [...],  // Permisos específicos
  "system_permissions": [...]  // System-level permissions
}
```

**🔥 CRÍTICO:** Si todos los arrays están vacíos → **EL USUARIO NO TIENE PERMISOS**

---

#### **4. Test Login en UI**
```bash
1. Abrir: http://localhost:8080 (dev) o URL de producción
2. Login con: usuario@ejemplo.com
3. Verificar sidebar muestra:
   ✅ Dashboard
   ✅ Sales Orders
   ✅ Service Orders
   ✅ Recon Orders
   ✅ Car Wash
   ✅ Get Ready
   ✅ Stock
   ✅ Detail Hub
   ✅ Productivity
   ✅ Team Chat
   ✅ Contacts
   ✅ VIN Scanner
   ✅ Administration
   ✅ Reports
   ✅ Settings
   ✅ Profile
   ❌ Announcements (solo system_admin)
   ❌ Landing Page (solo system_admin)

4. Test funcionalidad:
   - Crear una orden de Sales
   - Editar una orden de Service
   - Acceder a Get Ready dashboard
   - Verificar permisos de edición/eliminación
```

---

## 🚨 TROUBLESHOOTING

### Problema 1: "Access Denied" al login

**Síntoma:** Usuario loggea pero ve sidebar vacío o "Access Denied"

**Diagnóstico:**
```sql
-- Check 1: ¿Tiene dealer_memberships?
SELECT COUNT(*)
FROM dealer_memberships
WHERE user_id = (SELECT id FROM profiles WHERE email = 'usuario@ejemplo.com')
  AND is_active = true;
```

**Solución si COUNT = 0:**
```sql
-- Ejecutar RPC de inicialización
SELECT initialize_supermanager_access(
  (SELECT id FROM profiles WHERE email = 'usuario@ejemplo.com')::uuid
);
```

---

### Problema 2: "No order types available"

**Síntoma:** Usuario no ve Sales/Service/Recon/CarWash en sidebar

**Diagnóstico:**
```sql
-- Verificar role está correcto
SELECT role FROM profiles WHERE email = 'usuario@ejemplo.com';
-- Debe ser: 'supermanager' (no 'manager', no 'admin')
```

**Solución:**
```sql
UPDATE profiles
SET role = 'supermanager'
WHERE email = 'usuario@ejemplo.com';
```

---

### Problema 3: RPC retorna permisos vacíos

**Síntoma:** `get_user_permissions_batch` retorna arrays vacíos

**Diagnóstico:**
```sql
-- Check memberships Y custom_roles
SELECT
  dm.*,
  dcr.role_name
FROM dealer_memberships dm
LEFT JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
WHERE dm.user_id = (SELECT id FROM profiles WHERE email = 'usuario@ejemplo.com');
```

**Solución:**
```sql
-- Asignar custom_role con más permisos (ejemplo: detail_manager)
UPDATE dealer_memberships dm
SET
  custom_role_id = (
    SELECT dcr.id
    FROM dealer_custom_roles dcr
    WHERE dcr.dealer_id = dm.dealer_id
      AND dcr.role_name = 'detail_manager'
    LIMIT 1
  ),
  updated_at = NOW()
WHERE dm.user_id = (SELECT id FROM profiles WHERE email = 'usuario@ejemplo.com')
  AND dm.custom_role_id IS NULL;
```

---

## 🛠️ RECOVERY SCRIPT

Si un supermanager fue creado incorrectamente y no tiene acceso, ejecutar:

```sql
-- Script de recuperación completa para supermanagers
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'usuario@ejemplo.com';  -- ← CAMBIAR POR EMAIL DEL USUARIO
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM profiles WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', v_email;
  END IF;

  -- 1. Verificar/Actualizar role
  UPDATE profiles
  SET role = 'supermanager'
  WHERE id = v_user_id;

  -- 2. Crear dealer_memberships para TODOS los dealerships
  INSERT INTO dealer_memberships (user_id, dealer_id, is_active, custom_role_id, created_at, updated_at)
  SELECT
    v_user_id,
    d.id,
    true,
    NULL,  -- Supermanagers bypass via código
    NOW(),
    NOW()
  FROM dealerships d
  WHERE d.deleted_at IS NULL
  ON CONFLICT (user_id, dealer_id) DO UPDATE
  SET
    is_active = true,
    updated_at = NOW();

  -- 3. Para dealership principal (dealer 5), asignar custom_role con permisos
  UPDATE dealer_memberships dm
  SET
    custom_role_id = (
      SELECT id FROM dealer_custom_roles
      WHERE dealer_id = 5 AND role_name = 'detail_manager'
      LIMIT 1
    ),
    updated_at = NOW()
  WHERE dm.user_id = v_user_id
    AND dm.dealer_id = 5;

  RAISE NOTICE 'Recovery completed for user: %', v_email;
END $$;

-- Verificar recovery exitoso
SELECT
  p.email,
  p.role,
  COUNT(dm.id) as memberships_count,
  (SELECT COUNT(*) FROM dealerships WHERE deleted_at IS NULL) as expected_count
FROM profiles p
LEFT JOIN dealer_memberships dm ON p.id = dm.user_id AND dm.is_active = true
WHERE p.email = 'usuario@ejemplo.com'  -- ← CAMBIAR
GROUP BY p.email, p.role;
```

---

## 🏗️ ARQUITECTURA DE PERMISOS

### Cómo Funciona el Sistema

```
Supermanager Login
├─ Frontend: useAuth carga usuario
├─ Frontend: usePermissions llama get_user_permissions_batch RPC
├─ Backend RPC: Query permisos desde dealer_memberships + custom_roles
├─ Backend RPC: Retorna permisos agregados
├─ Frontend: Crea enhancedUser object con permisos
├─ Frontend: Componentes verifican permisos
│
├─ AppSidebar.tsx (Línea 144):
│   if (isSupermanager) → BYPASS ✅ (muestra todos los items operativos)
│
├─ usePermissions.tsx (Línea 658-677):
│   if (enhancedUser.is_supermanager && allowedModules.includes(module)) → return true ✅
│
├─ useDealershipModules.tsx (Línea 34):
│   if (isSupermanager) → return ALL modules enabled ✅
│
└─ PermissionGuard components:
    hasPermission() checks → bypass funciona ✅
```

### Bypass Layers

**Layer 1: Database**
- Trigger auto-crea dealer_memberships para TODOS los dealerships

**Layer 2: Edge Function**
- create-system-user crea memberships globales automáticamente

**Layer 3: Frontend Hooks**
- usePermissions: hasModulePermission bypass para módulos operativos
- getAllowedOrderTypes: retorna TODOS los order types
- useDealershipModules: habilita TODOS los módulos

**Layer 4: UI Components**
- AppSidebar: filters tienen bypass isSupermanager
- PermissionGuard: hasPermission checks tienen bypass

---

## 📚 REFERENCIAS

### Archivos Críticos

| Archivo | Propósito | Líneas Clave |
|---------|-----------|-------------|
| `supabase/functions/create-system-user/index.ts` | Edge Function creación | 147-193 |
| `supabase/migrations/.../handle_new_user.sql` | Trigger auto-memberships | Función completa |
| `src/hooks/usePermissions.tsx` | Lógica de permisos | 658-677, 805-817 |
| `src/hooks/useDealershipModules.tsx` | Módulos habilitados | 34-52 |
| `src/components/AppSidebar.tsx` | Filtrado de menú | 142-151, 186-187, 231-232 |

### SQL Helper Functions

```sql
-- Ver todos los supermanagers en el sistema
SELECT
  p.id,
  p.email,
  p.role,
  p.first_name,
  p.last_name,
  COUNT(dm.id) as memberships_count
FROM profiles p
LEFT JOIN dealer_memberships dm ON p.id = dm.user_id AND dm.is_active = true
WHERE p.role = 'supermanager'
GROUP BY p.id, p.email, p.role, p.first_name, p.last_name
ORDER BY p.created_at DESC;

-- Auditoría: Supermanagers sin memberships (PROBLEMA)
SELECT
  p.email,
  p.created_at,
  'NO DEALER MEMBERSHIPS' as issue
FROM profiles p
WHERE p.role = 'supermanager'
  AND NOT EXISTS (
    SELECT 1 FROM dealer_memberships dm
    WHERE dm.user_id = p.id AND dm.is_active = true
  );

-- Fix rápido para supermanager sin memberships
SELECT initialize_supermanager_access('USER_ID_AQUI'::uuid);
```

---

## ⚠️ ERRORES COMUNES

### ❌ Error 1: Seleccionar Primary Dealership
```
INCORRECTO:
  Role: Supermanager
  Primary Dealership: Bmw of Sudbury  ← NO!

CORRECTO:
  Role: Supermanager
  Primary Dealership: (vacío)  ← Dejar en blanco para acceso global
```

**Consecuencia:** Solo crea membership para 1 dealership en lugar de TODOS.

---

### ❌ Error 2: Crear con Supabase Auth UI directamente
```
INCORRECTO:
  Supabase Dashboard → Authentication → Add user → Create

CORRECTO:
  Usar Edge Function create-system-user o Admin UI
```

**Consecuencia:** NO ejecuta lógica de inicialización, usuario queda sin permisos.

---

### ❌ Error 3: UPDATE profiles manual sin dealer_memberships
```sql
-- ❌ INCORRECTO (método viejo)
UPDATE profiles
SET role = 'supermanager'
WHERE email = 'usuario@ejemplo.com';
-- NO HACER ESTO - Falta inicialización

-- ✅ CORRECTO
-- Usar Edge Function O ejecutar recovery script completo
```

---

## 🎯 CASOS DE USO

### Caso 1: Nuevo Supermanager desde Cero
**Usar:** Método 1 (Admin UI) o Método 2 (Edge Function)

### Caso 2: Promover Usuario Existente a Supermanager
```sql
-- 1. Actualizar role
UPDATE profiles
SET role = 'supermanager'
WHERE email = 'usuario@ejemplo.com';

-- 2. Ejecutar inicialización
SELECT initialize_supermanager_access(
  (SELECT id FROM profiles WHERE email = 'usuario@ejemplo.com')::uuid
);

-- 3. Verificar memberships creados
-- (Ver query de verificación arriba)
```

### Caso 3: Recuperar Supermanager Sin Permisos (como paulk)
**Usar:** Recovery Script (ver sección anterior)

---

## 🔐 SEGURIDAD

### Principios de Diseño

1. **Defense-in-Depth:** Múltiples capas de bypass (DB + Code)
2. **Fail-Safe:** Si falla creación de memberships, rollback completo (auth user deleted)
3. **Auditable:** Todos los cambios tienen created_at/updated_at
4. **Granular:** Supermanagers tienen acceso operativo pero NO platform settings

### Permisos que Supermanager NO Tiene

```typescript
// src/hooks/usePermissions.tsx:620-627
const restrictedPermissions = ['manage_all_settings'];

if (enhancedUser.is_supermanager && restrictedPermissions.includes(permission)) {
  return false;  // ❌ DENEGADO
}
```

Supermanagers NO pueden:
- ❌ Modificar configuración de plataforma
- ❌ Crear/modificar dealerships
- ❌ Crear otros system_admin users
- ❌ Acceder a landing page builder
- ❌ Ver logs de auditoría de sistema (solo de sus dealerships)

---

## 📝 CHANGELOG

### v1.0.0 (2025-11-03) - Enterprise-Grade Implementation

**Database:**
- ✅ Trigger `handle_new_user` actualizado para auto-crear memberships
- ✅ RPC `initialize_supermanager_access` creado para recovery manual

**Edge Functions:**
- ✅ `create-system-user` fix para crear memberships globales
- ✅ Rollback automático si falla creación de memberships

**Frontend:**
- ✅ AppSidebar bypass en coreNavItems, toolsNavItems, managementNavItems
- ✅ useDealershipModules bypass activado siempre (sin condición dealerId)
- ✅ usePermissions bypass ya existía, verificado funcionando

**Documentation:**
- ✅ Esta guía creada con proceso completo
- ✅ Troubleshooting section agregada
- ✅ Recovery scripts documentados

---

## 📞 SOPORTE

### Si encuentras problemas:

1. **Verificar con queries de diagnóstico** (sección Verificación)
2. **Ejecutar recovery script** si es necesario
3. **Consultar logs del Edge Function** en Supabase Dashboard → Edge Functions → create-system-user → Logs
4. **Revisar console del navegador** para errores de frontend

### Contacto
- **Developer:** Check `CLAUDE.md` para instrucciones de desarrollo
- **Database:** Supabase Dashboard → SQL Editor para queries
- **Logs:** Supabase Dashboard → Edge Functions → Logs

---

**✅ GUÍA COMPLETA - VALIDADA EN PRODUCCIÓN**
