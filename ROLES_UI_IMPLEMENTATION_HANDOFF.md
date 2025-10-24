# 🎯 ROLES UI IMPLEMENTATION - Handoff para Próxima Sesión

**Fecha:** 2025-10-23
**Sesión Anterior:** Simplificación del sistema de roles + UI parcial
**Estado:** 60% completado - Quedan 3 componentes UI
**Próximo:** Crear DealerCustomRolesManager + Tab + Testing

---

## ✅ LO QUE YA ESTÁ COMPLETADO

### **Base de Datos (100%)**
- ✅ System roles creados (user, manager, system_admin)
- ✅ Permisos configurados: user(6), manager(128), system_admin(128)
- ✅ ENUM app_module tiene 16 módulos (incluye 'contacts')
- ✅ Campos legacy marcados DEPRECATED
- ✅ 8 backups de seguridad creados
- ✅ dealership_modules tabla existe y funcional

### **Código Frontend (80%)**
- ✅ AdvancedPermissionManager.tsx con 16/16 módulos
- ✅ useDealerActiveModules.ts existe y funciona
- ✅ AdvancedPermissionManager acepta dealerId y filtra módulos
- ✅ ManageCustomRolesModal.tsx existe (para asignar roles)
- ✅ Hook usePermissions carga roles desde 2 fuentes

---

## ❌ LO QUE FALTA (3 componentes)

### **1. DealerCustomRolesManager.tsx** 🔴 CRÍTICO

**Ubicación:** `src/components/permissions/DealerCustomRolesManager.tsx`

**Propósito:**
- Componente principal para CRUD de dealer custom roles
- Mostrar lista de roles existentes del dealer
- Crear nuevo role con wizard
- Editar role existente
- Eliminar role (con validación si hay usuarios asignados)
- Configurar permisos usando AdvancedPermissionManager

**Props:**
```typescript
interface DealerCustomRolesManagerProps {
  dealerId: number;
  onRoleCreated?: (roleId: string) => void;
  onRoleUpdated?: (roleId: string) => void;
  onRoleDeleted?: (roleId: string) => void;
}
```

**Estructura del Componente:**

```tsx
export const DealerCustomRolesManager: React.FC<DealerCustomRolesManagerProps> = ({
  dealerId,
  onRoleCreated,
  onRoleUpdated,
  onRoleDeleted
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [roles, setRoles] = useState<DealerCustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<DealerCustomRole | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch roles for dealer
  const fetchDealerRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('dealer_custom_roles')
      .select(`
        id,
        role_name,
        display_name,
        description,
        is_active,
        created_at,
        (SELECT COUNT(*) FROM dealer_memberships dm WHERE dm.custom_role_id = dealer_custom_roles.id) as users_count
      `)
      .eq('dealer_id', dealerId)
      .is('dealer_id', 'not', null) // Only dealer-specific roles
      .order('role_name');

    if (!error) setRoles(data || []);
  }, [dealerId]);

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('roles.custom_roles_title')}</h2>
          <p className="text-muted-foreground">{t('roles.custom_roles_description')}</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('roles.create_role')}
        </Button>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map(role => (
          <RoleCard
            key={role.id}
            role={role}
            onEdit={() => handleEditRole(role)}
            onDelete={() => handleDeleteRole(role)}
            onConfigurePermissions={() => handleConfigurePermissions(role)}
          />
        ))}
      </div>

      {/* Create Role Modal */}
      <CreateRoleModal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        dealerId={dealerId}
        onRoleCreated={(roleId) => {
          fetchDealerRoles();
          onRoleCreated?.(roleId);
          setIsCreating(false);
        }}
      />

      {/* Edit Role Modal */}
      <EditRoleModal
        open={isEditing}
        role={selectedRole}
        onClose={() => setIsEditing(false)}
        onRoleUpdated={(roleId) => {
          fetchDealerRoles();
          onRoleUpdated?.(roleId);
          setIsEditing(false);
        }}
      />

      {/* Configure Permissions Modal */}
      <Dialog open={configuringPermissions} onOpenChange={setConfiguringPermissions}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t('roles.configure_permissions')}: {selectedRole?.display_name}</DialogTitle>
          </DialogHeader>
          <AdvancedPermissionManager
            customRoleId={selectedRole?.id}
            dealerId={dealerId}
            onPermissionsChange={(permissions) => {
              // Handle permissions change
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

**Sub-componentes necesarios:**

1. **RoleCard** - Card para mostrar cada role con:
   - Display name + description
   - Badge con conteo de usuarios asignados
   - Botones: Edit, Configure Permissions, Delete

2. **CreateRoleModal** - Modal para crear nuevo role:
   - Input: role_name (slug, único)
   - Input: display_name
   - Textarea: description
   - Botón: Create → Abre AdvancedPermissionManager

3. **EditRoleModal** - Modal para editar role:
   - Similar a CreateRoleModal
   - Campos pre-poblados
   - Validación de nombre único

**Queries SQL de Referencia:**

```sql
-- Crear role
INSERT INTO dealer_custom_roles (
  id, dealer_id, role_name, display_name, description, is_active
) VALUES (
  gen_random_uuid(),
  :dealer_id,
  :role_name,
  :display_name,
  :description,
  true
);

-- Editar role
UPDATE dealer_custom_roles
SET
  display_name = :display_name,
  description = :description,
  updated_at = NOW()
WHERE id = :role_id AND dealer_id = :dealer_id;

-- Eliminar role (solo si no tiene usuarios)
DELETE FROM dealer_custom_roles
WHERE id = :role_id
  AND dealer_id = :dealer_id
  AND NOT EXISTS (
    SELECT 1 FROM dealer_memberships
    WHERE custom_role_id = :role_id
  );

-- Contar usuarios con este role
SELECT COUNT(*) FROM dealer_memberships
WHERE custom_role_id = :role_id;
```

---

### **2. Tab de Roles en Admin Dealer** 🟡 MEDIO

**Ubicación:** `src/pages/DealerDetails.tsx` (o similar)

**Cambios Necesarios:**

1. **Agregar tab "Roles" al Tabs component**

```tsx
<Tabs defaultValue="overview" className="space-y-4">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="users">Users</TabsTrigger>
    <TabsTrigger value="modules">Modules</TabsTrigger>
    <TabsTrigger value="roles">Roles</TabsTrigger>  {/* ← NUEVO */}
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  {/* ... otros tabs ... */}

  <TabsContent value="roles">
    <DealerCustomRolesManager
      dealerId={dealerId}
      onRoleCreated={() => toast.success('Role created')}
      onRoleUpdated={() => toast.success('Role updated')}
      onRoleDeleted={() => toast.success('Role deleted')}
    />
  </TabsContent>
</Tabs>
```

2. **Agregar traducción del tab**

```json
// en.json
"admin": {
  "tabs": {
    "roles": "Custom Roles"
  }
}
```

**Archivo a Modificar:**
- Buscar página de admin dealer (probablemente en `src/pages/admin/` o similar)
- Agregar import de DealerCustomRolesManager
- Agregar TabsTrigger y TabsContent

---

### **3. Testing Completo** 🟢 BAJO

**Checklist de Testing:**

**Flujo Completo:**
```
1. Login como dealer admin
   ↓
2. Ir a Admin → Dealerships → {dealer_id}
   ↓
3. Click en tab "Roles"
   ↓
4. Ver lista de custom roles existentes
   ↓
5. Click "Create Role"
   ↓
6. Ingresar: role_name="test_role", display_name="Test Role"
   ↓
7. Click "Configure Permissions"
   ↓
8. Habilitar módulo "Sales Orders" con permisos: read, write
   ↓
9. Guardar role
   ↓
10. Ir a Users → Seleccionar usuario
   ↓
11. Asignar role "test_role" al usuario
   ↓
12. Login como ese usuario
   ↓
13. Verificar:
    - ✅ Puede ver Sales Orders
    - ✅ Puede crear/editar Sales Orders
    - ❌ NO puede eliminar Sales Orders
    - ❌ NO puede acceder a módulos deshabilitados
```

**Testing de Restricciones:**

```typescript
// Usuario con role que NO tiene permission 'delete'
// Debería:
- ✅ Ver botón "Delete" como disabled
- ✅ Mostrar tooltip "No permission"
- ❌ NO permitir delete vía API (backend validation)
```

---

## 🗄️ INFORMACIÓN DE BASE DE DATOS

### **Tablas Relevantes:**

```sql
-- dealer_custom_roles (Roles custom por dealer)
id                  UUID PK
dealer_id           BIGINT (NULL=system, NOT NULL=dealer)
role_name           TEXT UNIQUE
display_name        TEXT
description         TEXT
permissions         JSONB (DEPRECATED)
is_active           BOOLEAN

-- dealer_memberships (Usuarios ↔ Dealers ↔ Roles)
id                  UUID PK
user_id             UUID FK → profiles.id
dealer_id           BIGINT FK → dealerships.id
role                TEXT (DEPRECATED)
custom_role_id      UUID FK → dealer_custom_roles.id
is_active           BOOLEAN

-- role_module_permissions_new (Permisos granulares)
id                  UUID PK
role_id             UUID FK → dealer_custom_roles.id
permission_id       UUID FK → module_permissions.id

-- role_module_access (Módulos habilitados)
role_id             UUID FK → dealer_custom_roles.id
module              ENUM app_module
is_enabled          BOOLEAN

-- dealership_modules (Módulos activos por dealer)
id                  UUID PK
dealer_id           BIGINT FK → dealerships.id
module              ENUM app_module
is_enabled          BOOLEAN
```

### **RPC Functions:**

```sql
-- get_dealership_modules(p_dealer_id BIGINT)
-- Retorna módulos activos para un dealer específico
```

---

## 📚 CÓDIGO DE REFERENCIA

### **Ejemplo: RoleCard Component**

```tsx
interface RoleCardProps {
  role: DealerCustomRole;
  onEdit: () => void;
  onDelete: () => void;
  onConfigurePermissions: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
  role,
  onEdit,
  onDelete,
  onConfigurePermissions
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{role.display_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{role.description}</p>
          </div>
          <Badge variant={role.is_active ? "default" : "secondary"}>
            {role.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{role.users_count || 0} users assigned</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onConfigurePermissions}>
              <Shield className="h-4 w-4 mr-1" />
              Permissions
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={(role.users_count || 0) > 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### **Ejemplo: CreateRoleModal**

```tsx
interface CreateRoleModalProps {
  open: boolean;
  onClose: () => void;
  dealerId: number;
  onRoleCreated: (roleId: string) => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  open,
  onClose,
  dealerId,
  onRoleCreated
}) => {
  const [roleName, setRoleName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);

    const { data, error } = await supabase
      .from('dealer_custom_roles')
      .insert({
        dealer_id: dealerId,
        role_name: roleName.toLowerCase().replace(/\s+/g, '_'),
        display_name: displayName,
        description: description || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      toast.error('Error creating role');
      setCreating(false);
      return;
    }

    toast.success('Role created successfully');
    onRoleCreated(data.id);
    setCreating(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Custom Role</DialogTitle>
          <DialogDescription>
            Create a custom role for your dealership with specific permissions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Role Name (slug)</Label>
            <Input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="sales_manager"
            />
          </div>

          <div>
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Sales Manager"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Manages sales operations..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!roleName || !displayName || creating}
          >
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

---

## 🔍 INFORMACIÓN CRÍTICA DESCUBIERTA

### **Limitaciones Técnicas de PostgreSQL:**

1. **profiles.role NO puede convertirse a ENUM**
   - Razón: 50+ RLS policies dependen de ella
   - Solución: Mantener como TEXT
   - Validación: Usar CHECK constraint en TypeScript

2. **profiles.dealership_id NO puede eliminarse**
   - Razón: 18+ RLS policies dependen de ella
   - Solución: Marcada como DEPRECATED, ignorar en código nuevo
   - Usar: dealer_memberships para todas las operaciones

**Importante:** Estos son límites técnicos de PostgreSQL, NO errores de implementación.

---

## 🎯 ARQUITECTURA FINAL (Acordada)

```
CAPA 1: System Roles (profiles.role - TEXT)
├─ system_admin → Full access automático
├─ manager      → 128 permissions via dealer_custom_roles
├─ user         → 6 permissions via dealer_custom_roles
└─ viewer       → Basic access

CAPA 2: Dealer Custom Roles (dealer_custom_roles)
├─ dealer_id NOT NULL → Roles configurables
├─ Configurados desde UI (/admin/dealerships/{id}/roles)
├─ Permisos vía role_module_permissions_new
└─ Asignados vía dealer_memberships.custom_role_id

Permisos Finales = System Role + Dealer Custom Role (OR logic)
```

---

## 📋 PLAN DE IMPLEMENTACIÓN PARA PRÓXIMA SESIÓN

### **Orden Recomendado:**

**Paso 1: Crear DealerCustomRolesManager.tsx (30 min)**
1. Crear archivo base con estructura
2. Implementar fetchDealerRoles()
3. Crear RoleCard component
4. Crear CreateRoleModal
5. Crear EditRoleModal
6. Implementar handleDelete con validación
7. Testing del componente

**Paso 2: Integrar tab de Roles (15 min)**
1. Buscar página de admin dealer
2. Agregar import de DealerCustomRolesManager
3. Agregar tab "Roles" al Tabs
4. Agregar traducciones
5. Testing de navegación

**Paso 3: Testing Completo (20 min)**
1. Crear rol de prueba
2. Configurar permisos
3. Asignar a usuario
4. Login con usuario
5. Verificar restricciones funcionan
6. Verificar badges, tooltips, disabled states

**Tiempo Total:** ~65 minutos

---

## 🐛 BUGS CONOCIDOS A REVISAR

De la imagen que mostraste, había un error:
```
ERROR: 42804: column "module" is of type app_module but expression is of type text
```

**Si aparece este error:**
- Usar cast: `'module_name'::app_module`
- Ya está corregido en las migraciones que ejecutamos
- Pero puede aparecer en código frontend si no usa el tipo correcto

---

## 📊 ESTADO DE PERMISOS ACTUAL

**System Roles:**
```
user:         6 permisos  (view en 9 módulos básicos)
manager:      128 permisos (todos los permisos disponibles)
system_admin: 128 permisos (todos los permisos disponibles)
```

**Dealer Roles (dealer_id=5):**
```
used_car_manager:    ? permisos (revisar en próxima sesión)
sales_manager:       ? permisos
service_advisor:     ? permisos
detail_manager:      ? permisos
(otros 7 roles...)
```

---

## 🔧 COMANDOS ÚTILES

```bash
# Iniciar servidor
npm run dev

# Verificar TypeScript
npx tsc --noEmit --skipLibCheck

# Ver migraciones aplicadas
npx supabase migration list

# Acceder a base de datos
# URL: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql
```

---

## 📝 TRADUCCIONES A AGREGAR

```json
// en.json
"roles": {
  "custom_roles_title": "Custom Roles",
  "custom_roles_description": "Manage dealer-specific roles and permissions",
  "create_role": "Create Role",
  "edit_role": "Edit Role",
  "delete_role": "Delete Role",
  "configure_permissions": "Configure Permissions",
  "role_name": "Role Name",
  "display_name": "Display Name",
  "description": "Description",
  "users_assigned": "users assigned",
  "cannot_delete_role_with_users": "Cannot delete role with assigned users",
  "role_created_successfully": "Role created successfully",
  "role_updated_successfully": "Role updated successfully",
  "role_deleted_successfully": "Role deleted successfully"
}

// es.json
"roles": {
  "custom_roles_title": "Roles Personalizados",
  "custom_roles_description": "Gestionar roles y permisos específicos del concesionario",
  "create_role": "Crear Rol",
  ...
}

// pt-BR.json
"roles": {
  "custom_roles_title": "Funções Personalizadas",
  "custom_roles_description": "Gerenciar funções e permissões específicas da concessionária",
  "create_role": "Criar Função",
  ...
}
```

---

## ✅ ARCHIVOS A CREAR EN PRÓXIMA SESIÓN

1. `src/components/permissions/DealerCustomRolesManager.tsx` (~300 líneas)
2. `src/components/permissions/RoleCard.tsx` (~80 líneas)
3. `src/components/permissions/CreateRoleModal.tsx` (~150 líneas)
4. `src/components/permissions/EditRoleModal.tsx` (~150 líneas)
5. Modificar página de admin dealer para agregar tab

**Total:** ~680 líneas de código + traducciones

---

## 🎓 RESUMEN EJECUTIVO

**Lo que se completó HOY:**
- ✅ Get Ready work items: 100%
- ✅ Stock búsqueda global: 100%
- ✅ System roles simplificación: 80%
- ✅ UI de permisos: 60%

**Lo que falta:**
- ❌ 3 componentes UI (DealerCustomRolesManager + modales)
- ❌ Integración de tab
- ❌ Testing completo

**Tiempo estimado:** 1-2 horas más

**Estado general:** ✅ Base sólida, listo para UI final

---

**Documento creado por:** Claude Code
**Fecha:** 2025-10-23
**Próxima sesión:** Implementar 3 componentes UI + testing
**Prioridad:** MEDIO (sistema funciona, UI falta para configuración)

---

# 🚀 QUICK START PARA PRÓXIMA SESIÓN

1. Leer este documento completo
2. Crear DealerCustomRolesManager.tsx usando el template arriba
3. Buscar página de admin dealer: `grep -r "admin.*dealer" src/pages/`
4. Agregar tab de Roles
5. Testing completo con checklist

¡Todo listo para continuar! 🎉
