# 🛡️ Sistema de Permisos - Arquitectura Enterprise

**Fecha de implementación:** 2025-10-21
**Versión:** 2.0 (Sistema Granular con Module Toggles)
**Estado:** ✅ Producción

---

## 📋 TABLA DE CONTENIDOS

1. [Arquitectura General](#arquitectura-general)
2. [Tres Capas de Seguridad](#tres-capas-de-seguridad)
3. [Tablas de Base de Datos](#tablas-de-base-de-datos)
4. [Funciones RPC](#funciones-rpc)
5. [Hooks y Componentes](#hooks-y-componentes)
6. [Flujos de Usuario](#flujos-de-usuario)
7. [Sistema Legacy](#sistema-legacy)
8. [Troubleshooting](#troubleshooting)

---

## 🏗️ ARQUITECTURA GENERAL

### **Modelo de 3 Capas de Verificación**

```
┌─────────────────────────────────────────────────────────────┐
│ CAPA 1: DEALERSHIP MODULES                                  │
│ ¿El dealership tiene este módulo contratado/activo?         │
│                                                              │
│ Tabla: dealership_modules                                   │
│ Controlado por: System Admin                                │
│ Default: FALSE (nuevos dealers)                             │
│ UI: /admin/:id → Tab "Modules"                              │
└─────────────────────────────────────────────────────────────┘
                          ↓ SI
┌─────────────────────────────────────────────────────────────┐
│ CAPA 2: ROLE MODULE ACCESS (Toggle)                         │
│ ¿Este custom role tiene permiso de acceder al módulo?       │
│                                                              │
│ Tabla: role_module_access                                   │
│ Controlado por: Dealer Admin                                │
│ Default: TRUE (backwards compatible)                        │
│ UI: Edit Role → Tab "Permissions" → Toggle por módulo       │
└─────────────────────────────────────────────────────────────┘
                          ↓ SI
┌─────────────────────────────────────────────────────────────┐
│ CAPA 3: GRANULAR PERMISSIONS                                │
│ ¿Qué acciones específicas puede hacer el usuario?           │
│                                                              │
│ Tabla: role_module_permissions_new                          │
│ Controlado por: Dealer Admin                                │
│ Permisos: view_orders, create_orders, edit_orders, etc.     │
│ UI: Edit Role → Tab "Permissions" → Checkboxes             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 TRES CAPAS DE SEGURIDAD

### **Capa 1: Dealership Modules**

**Propósito:** Controlar qué módulos están disponibles para un dealership específico

**Tabla:** `dealership_modules`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `dealer_id` | BIGINT | ID del dealership |
| `module` | app_module (ENUM) | Módulo (sales_orders, etc.) |
| `is_enabled` | BOOLEAN | ¿Módulo activo? **Default: FALSE** |
| `enabled_by` | UUID | Quién lo habilitó |
| `enabled_at` | TIMESTAMPTZ | Cuándo se habilitó |
| `disabled_at` | TIMESTAMPTZ | Cuándo se deshabilitó |

**Constraint:** UNIQUE(dealer_id, module)

**Ejemplo:**
```sql
-- Dealership #5 solo tiene acceso a Sales y Service
dealer_id | module        | is_enabled
----------|---------------|------------
5         | sales_orders  | true
5         | service_orders| true
5         | recon_orders  | false
5         | car_wash      | false
```

---

### **Capa 2: Role Module Access (Toggle)**

**Propósito:** Control a nivel de custom role - habilitar/deshabilitar módulos completos

**Tabla:** `role_module_access` (NUEVA - 2025-10-21)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `role_id` | UUID | ID del custom role |
| `module` | app_module (ENUM) | Módulo |
| `is_enabled` | BOOLEAN | Toggle ON/OFF **Default: TRUE** |
| `created_at` | TIMESTAMPTZ | Cuándo se creó |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**Constraint:** UNIQUE(role_id, module)

**Comportamiento Especial:**
- ✅ Si toggle OFF: Permisos se GUARDAN pero NO se aplican
- ✅ Si toggle ON nuevamente: Permisos guardados se reactivan
- ✅ Permite configurar permisos por adelantado sin activarlos

**Ejemplo:**
```sql
-- Role "Vendedor Junior" tiene Sales activo pero Recon desactivado
role_id | module        | is_enabled
--------|---------------|------------
uuid-1  | sales_orders  | true   → Permisos activos
uuid-1  | recon_orders  | false  → Permisos guardados pero inactivos
```

---

### **Capa 3: Granular Permissions**

**Propósito:** Control fino de acciones específicas dentro de cada módulo

**Tablas:**
- `module_permissions` (Catálogo de permisos disponibles)
- `role_module_permissions_new` (Asignación role → permission)

**Permisos Disponibles por Módulo:**

#### Sales Orders:
- `view_orders` - Ver órdenes de venta
- `create_orders` - Crear órdenes nuevas
- `edit_orders` - Modificar órdenes
- `delete_orders` - Eliminar órdenes
- `change_status` - Cambiar estado
- `view_pricing` - Ver precios
- `export_data` - Exportar datos

#### Service Orders:
- `view_orders`, `create_orders`, `edit_orders`, `delete_orders`
- `assign_technician` - Asignar técnico
- `view_labor_rates` - Ver tarifas

*(Y así para cada módulo...)*

**Prerequisitos:**
- `edit_orders` requiere `view_orders`
- `delete_orders` requiere `view_orders` + `edit_orders`

---

## 🗄️ TABLAS DE BASE DE DATOS

### **Nuevas Tablas (Sistema Granular v2.0)**

#### **1. role_module_access**
```sql
CREATE TABLE role_module_access (
  id UUID PRIMARY KEY,
  role_id UUID REFERENCES dealer_custom_roles(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, module)
);
```

**Índices:**
- `idx_role_module_access_role_id` → Lookup por role
- `idx_role_module_access_enabled` → Filtro por enabled
- `idx_role_module_access_module` → Lookup por module

**RLS Policies:**
1. System admins: Full access
2. Dealer admins: Access to their dealership's roles
3. Users: Read their own role's settings

---

### **Tablas Existentes (Sistema Granular v1.0)**

#### **2. dealer_custom_roles**
```sql
- id (UUID)
- dealer_id (BIGINT)
- role_name (TEXT) - Identificador único
- display_name (TEXT) - Nombre visible
- description (TEXT)
- is_active (BOOLEAN)
```

#### **3. module_permissions**
```sql
- id (UUID)
- module (TEXT) - sales_orders, service_orders, etc.
- permission_key (TEXT) - view_orders, create_orders, etc.
- display_name (TEXT)
- description (TEXT)
- is_active (BOOLEAN)
```

#### **4. role_module_permissions_new**
```sql
- id (UUID)
- role_id (UUID) REFERENCES dealer_custom_roles
- permission_id (UUID) REFERENCES module_permissions
- granted_at (TIMESTAMPTZ)
- granted_by (UUID)
```

#### **5. user_custom_role_assignments**
```sql
- user_id (UUID)
- dealer_id (BIGINT)
- custom_role_id (UUID) REFERENCES dealer_custom_roles
- is_active (BOOLEAN)
```

---

## 🔧 FUNCIONES RPC

### **1. get_role_module_access(p_role_id UUID)**

**Propósito:** Obtener estado de todos los toggles de módulos para un role

**Returns:**
```typescript
Array<{
  module: AppModule,
  is_enabled: boolean,
  created_at: string,
  updated_at: string
}>
```

**Seguridad:**
- System admins: Acceso total
- Dealer admins: Solo sus dealerships
- Users: Solo sus propios roles (read-only)

**Comportamiento:**
- Si no hay registros → Retorna todos los módulos como `true` (backwards compatible)

---

### **2. toggle_role_module_access(p_role_id UUID, p_module TEXT, p_is_enabled BOOLEAN)**

**Propósito:** Activar/desactivar un módulo para un role específico

**Returns:** `boolean` (success/failure)

**Ejemplo:**
```typescript
await supabase.rpc('toggle_role_module_access', {
  p_role_id: 'uuid-del-role',
  p_module: 'sales_orders',
  p_is_enabled: false
});
```

**Validaciones:**
- Role debe existir y estar activo
- Module debe ser un valor válido del ENUM app_module
- Usuario debe tener permisos (admin/manager)

---

### **3. bulk_set_role_module_access(p_role_id UUID, p_modules_access JSONB)**

**Propósito:** Configurar múltiples toggles de módulos a la vez

**Formato JSONB:**
```json
[
  {"module": "sales_orders", "is_enabled": true},
  {"module": "service_orders", "is_enabled": false},
  {"module": "recon_orders", "is_enabled": true}
]
```

**Uso:** Optimización para formularios que configuran múltiples módulos

---

## ⚛️ HOOKS Y COMPONENTES

### **Hook: useRoleModuleAccess(roleId)**

**Ubicación:** `src/hooks/useRoleModuleAccess.tsx`

**API:**
```typescript
const {
  moduleAccess,              // Map<AppModule, boolean>
  loading,                   // boolean
  error,                     // string | null
  refreshAccess,             // () => Promise<void>
  toggleModuleAccess,        // (module, isEnabled) => Promise<boolean>
  bulkSetModuleAccess,       // (modules[]) => Promise<boolean>
  hasRoleModuleAccess        // (module) => boolean
} = useRoleModuleAccess(roleId);
```

**Ejemplo de uso:**
```typescript
// En GranularPermissionManager
const roleCanAccessSales = hasRoleModuleAccess('sales_orders');

// Toggle module
await toggleModuleAccess('sales_orders', false);
```

---

### **Hook: usePermissions() - ACTUALIZADO**

**Ubicación:** `src/hooks/usePermissions.tsx`

**Cambios v2.0:**
- ✅ Carga `role_module_access` para todos los roles del usuario
- ✅ Filtra permisos de módulos basándose en toggles
- ✅ Triple verificación automática
- ⚠️ Sistema legacy mantenido (@deprecated)

**API Actualizada:**
```typescript
const {
  hasModulePermission,       // (module, permission) => boolean [NUEVO SISTEMA]
  hasPermission,             // (module, level) => boolean [LEGACY - @deprecated]
  hasSystemPermission,       // (permission) => boolean
  canEditOrder,              // (order) => boolean
  canDeleteOrder,            // (order) => boolean
  getAllowedOrderTypes,      // () => OrderType[]
  enhancedUser,              // EnhancedUserGranular
  loading                    // boolean
} = usePermissions();
```

**Flujo Interno:**
```typescript
fetchGranularRolePermissions() {
  // 1. Fetch user's custom roles
  // 2. Fetch role_module_access (NEW)
  // 3. Fetch role_module_permissions_new
  // 4. Filter permissions by module toggles
  // 5. Aggregate from all roles (OR logic)
}
```

---

### **Componente: GranularPermissionManager**

**Ubicación:** `src/components/permissions/GranularPermissionManager.tsx`

**Nuevas Funcionalidades v2.0:**

#### **Toggle por Módulo:**
```tsx
<div className="flex items-center justify-between">
  <Label>Enable {module} for this role</Label>
  <Switch
    checked={hasRoleModuleAccess(module)}
    onCheckedChange={(checked) => handleToggleModuleAccess(module, checked)}
  />
</div>
```

#### **Alert de Permisos Inactivos:**
```tsx
{!roleHasModuleAccess && checkedCount > 0 && (
  <Alert>
    This module has {checkedCount} saved permission(s)
    but access is currently disabled.
  </Alert>
)}
```

#### **Deshabilitación Visual:**
```tsx
<div className={`grid gap-3 ${
  roleHasModuleAccess ? '' : 'opacity-40 pointer-events-none'
}`}>
  {/* Checkboxes de permisos */}
</div>
```

---

## 📊 FLUJOS DE USUARIO

### **Flujo 1: Crear Nuevo Dealership**

```
1. System Admin crea dealership
   ↓
2. Trigger: initialize_modules_on_dealership_creation()
   ↓
3. Se crean 10 módulos core con is_enabled=FALSE
   ↓
4. System Admin va a /admin/:id → Tab "Modules"
   ↓
5. Habilita módulos necesarios (ej: Sales, Service)
   ✅ Dealership listo para usar
```

**Módulos Core Creados (DESACTIVADOS):**
- dashboard, sales_orders, service_orders, recon_orders, car_wash
- stock, contacts, reports, users, settings

---

### **Flujo 2: Crear Custom Role**

```
1. Dealer Admin: Create Custom Role
   ↓
2. Formulario básico:
   - Role Name: "lot_guy"
   - Display Name: "Lot Guy"
   - Description: "Gestiona inventario en el lote"
   ↓
3. Click "Create" → Role creado
   ↓
4. Trigger: auto_populate_role_module_access()
   ↓
5. Se crean 15 registros en role_module_access con is_enabled=TRUE
   ↓
6. Mensaje: "Configure permissions in Edit Role"
   ↓
7. Admin clickea "Edit" → Tab "Permissions"
   ✅ Configura toggles y permisos granulares
```

---

### **Flujo 3: Configurar Permisos de Role**

```
Admin en: Edit Role → Tab "Permissions"

Por cada módulo que el DEALER tiene activo:

  ┌─────────────────────────────────────┐
  │ 📊 Sales Orders          [Toggle]   │
  ├─────────────────────────────────────┤
  │                                     │
  │ Si Toggle ON:                       │
  │   ☑ View orders                     │
  │   ☑ Create orders                   │
  │   ☐ Edit orders                     │
  │   ☐ Delete orders                   │
  │   ☐ View pricing                    │
  │                                     │
  │ Si Toggle OFF:                      │
  │   [ALERT] 2 permissions saved       │
  │   ☑ View orders (disabled)          │
  │   ☑ Create orders (disabled)        │
  │                                     │
  └─────────────────────────────────────┘

Click "Save Changes" → Se guardan:
1. Module toggles → role_module_access
2. Permissions → role_module_permissions_new
```

---

### **Flujo 4: Verificación de Acceso de Usuario**

**Usuario intenta acceder a /sales (Sales Orders)**

```typescript
PermissionGuard checks:

1️⃣ ¿Dealership tiene sales_orders habilitado?
   SELECT * FROM dealership_modules
   WHERE dealer_id = 5 AND module = 'sales_orders' AND is_enabled = true
   ✅ YES

2️⃣ ¿Role del usuario tiene sales_orders habilitado? (Toggle)
   SELECT * FROM role_module_access
   WHERE role_id IN (user_roles) AND module = 'sales_orders' AND is_enabled = true
   ✅ YES

3️⃣ ¿Usuario tiene permiso view_orders en sales_orders?
   SELECT * FROM role_module_permissions_new
   WHERE role_id IN (user_roles) AND permission_id = (view_orders)
   ✅ YES

→ ACCESO CONCEDIDO ✅
```

**Si falla en CUALQUIER capa → ACCESO DENEGADO**

---

## 🔄 SISTEMA LEGACY (@deprecated)

### **Mantenido por Compatibilidad (Opción B)**

#### **Tabla Legacy:**
- `dealer_role_permissions` - ⚠️ DEPRECATED (mantener por ahora)

#### **Función Legacy:**
```typescript
// usePermissions.tsx
hasPermission(module: AppModule, level: PermissionLevel): boolean
// Niveles: 'none' | 'view' | 'edit' | 'delete' | 'admin'
```

#### **Archivos que usan Legacy:**
10 archivos aún usan `hasPermission()`:
- AppSidebar.tsx
- Dashboard.tsx
- UnifiedOrderDetailModal.tsx
- useContextualActions.ts
- useStatusPermissions.tsx
- ServicesDisplay.tsx
- DepartmentOverview.tsx
- EnhancedOrderDetailLayout.tsx
- usePermissions.granular.test.ts
- PermissionGuard.tsx

**Plan de Migración Futura:**
- Migrar gradualmente cada archivo al nuevo sistema
- Reemplazar `hasPermission` con `hasModulePermission`
- Eventualmente eliminar tabla legacy

---

## 🧪 TESTING

### **Test Case 1: Toggle de Módulo Completo**

**Setup:**
```sql
-- Dealer 5 tiene Sales activo
-- Role "Vendedor" tiene permisos en Sales
```

**Test:**
```typescript
1. Edit Role "Vendedor" → Tab Permissions
2. Sales Orders toggle: ON → OFF
3. Save
4. Usuario con role "Vendedor" intenta acceder /sales

ESPERADO: ❌ Access Denied
RAZÓN: role_module_access.is_enabled = false
```

---

### **Test Case 2: Permisos Guardados Inactivos**

**Setup:**
```sql
-- Role tiene Sales toggle OFF
-- Role tiene 3 permisos en Sales (guardados en DB)
```

**Test:**
```typescript
1. Edit Role → Tab Permissions
2. Verificar Sales Orders card

ESPERADO:
- Toggle: OFF
- Alert: "3 permissions saved but not active"
- Checkboxes: Visibles pero disabled
- Permisos: ☑ view ☑ create ☐ edit

3. Toggle ON
ESPERADO:
- Checkboxes: Enabled
- Permisos guardados se reactivan
```

---

### **Test Case 3: Nuevo Dealership**

**Test:**
```typescript
1. System Admin crea dealership "Test Motors"
2. Verificar /admin/:new_id → Tab Modules

ESPERADO:
- ❌ Todos los módulos: DESACTIVADOS (default)
- Badge: "Disabled" en todos

3. Habilitar Sales Orders
4. Crear Custom Role
5. Edit Role → Tab Permissions

ESPERADO:
- Solo aparece Sales Orders (otros filtrados)
- Toggle de Sales: ON por defecto
```

---

## 🐛 TROUBLESHOOTING

### **Problema: Badges muestran "common.enabled" en lugar de texto**

**Causa:** Cache del navegador

**Solución:**
```
1. Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. O abrir en modo incógnito
3. Verificar versión i18n: TRANSLATION_VERSION = '1.1.0'
```

---

### **Problema: Usuario no puede acceder a módulo**

**Debug Checklist:**
```typescript
// 1. Verificar Dealership Module
SELECT * FROM dealership_modules
WHERE dealer_id = X AND module = 'sales_orders';
→ is_enabled debe ser TRUE

// 2. Verificar Role Module Access
SELECT * FROM role_module_access
WHERE role_id = Y AND module = 'sales_orders';
→ is_enabled debe ser TRUE

// 3. Verificar Permissions
SELECT mp.permission_key
FROM role_module_permissions_new rmp
JOIN module_permissions mp ON mp.id = rmp.permission_id
WHERE rmp.role_id = Y AND mp.module = 'sales_orders';
→ Debe tener al menos view_orders
```

---

### **Problema: Role nuevo no tiene module access**

**Causa:** Trigger no se ejecutó

**Solución:**
```sql
-- Poblar manualmente
INSERT INTO role_module_access (role_id, module, is_enabled)
SELECT
  'role-uuid',
  m.module_value::app_module,
  true
FROM (SELECT unnest(enum_range(NULL::app_module))::text as module_value) m
ON CONFLICT (role_id, module) DO NOTHING;
```

---

## 📝 NOTAS IMPORTANTES

### **Defaults por Tipo de Entidad**

| Entidad | Default | Razón |
|---------|---------|-------|
| **Dealership Module** | `is_enabled=FALSE` | Seguridad - activación explícita |
| **Role Module Access** | `is_enabled=TRUE` | Compatibilidad - no bloquear roles existentes |
| **Module Permission** | No default | Admin selecciona manualmente |

### **Comportamiento de Permisos Guardados**

**Pregunta:** ¿Qué pasa con los permisos cuando toggle OFF?

**Respuesta:**
- ✅ Los permisos SE MANTIENEN en `role_module_permissions_new`
- ✅ Pero NO se cargan en `enhancedUser.module_permissions`
- ✅ Al activar toggle nuevamente, permisos se reactivan automáticamente
- ✅ No se pierden datos

**Ventaja:** Permite configurar permisos por adelantado

---

## 🔗 REFERENCIAS

### **Archivos Clave:**

**Backend:**
- `supabase/migrations/20251021215327_create_role_module_access_table.sql`
- `supabase/migrations/20251021215523_add_role_module_access_rpc_functions.sql`
- `supabase/migrations/20251021220619_auto_populate_role_module_access_on_role_creation.sql`
- `supabase/migrations/20251021221150_change_dealership_modules_default_to_disabled.sql`

**Frontend:**
- `src/hooks/useRoleModuleAccess.tsx`
- `src/hooks/usePermissions.tsx`
- `src/components/permissions/GranularPermissionManager.tsx`
- `src/components/permissions/PermissionGuard.tsx`
- `src/components/dealer/CreateRoleModal.tsx`
- `src/components/dealer/DealerRoles.tsx`

**Configuración:**
- `src/lib/i18n.ts` (TRANSLATION_VERSION = '1.1.0')

---

**Última actualización:** 2025-10-21
**Versión del sistema:** 2.0 (Granular + Module Toggles)
**Estado:** ✅ Producción Ready
