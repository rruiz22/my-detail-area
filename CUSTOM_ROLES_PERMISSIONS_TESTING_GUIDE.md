# Guía de Testing: Sistema de Permisos Granulares para Custom Roles

## 📋 Resumen de la Implementación

Se ha implementado un sistema completo de permisos granulares para custom roles que permite:

1. Activar/desactivar módulos por dealership
2. Crear custom roles con permisos específicos
3. Configurar permisos solo para módulos activos del dealer
4. Asignar múltiples roles a usuarios

## 🧪 Plan de Pruebas

### Test 1: Activación de Módulos del Dealer

**Objetivo**: Verificar que los módulos se pueden activar/desactivar correctamente

**Pasos**:
1. Ir a `/admin` y seleccionar un dealer (ej: `/admin/5`)
2. Hacer click en el tab "Modules"
3. Ver que aparecen todos los 15 módulos del sistema:
   - dashboard, sales_orders, service_orders, recon_orders, car_wash
   - stock, get_ready, chat, contacts, productivity
   - reports, settings, users, dealerships, management
4. Activar varios módulos (ej: dashboard, sales_orders, service_orders, stock, get_ready, reports)
5. Desactivar algunos módulos (ej: recon_orders, car_wash)
6. Verificar que los cambios se guardan correctamente

**Resultado Esperado**:
- ✅ Se muestran todos los 15 módulos
- ✅ Se puede activar/desactivar cada módulo
- ✅ Los cambios persisten después de recargar la página

---

### Test 2: Crear Custom Role

**Objetivo**: Verificar que se pueden crear custom roles

**Pasos**:
1. En la misma página del dealer `/admin/5`
2. Hacer click en el tab "Custom Roles"
3. Click en "Create Role"
4. Llenar el formulario:
   - Role Name: `sales_manager`
   - Display Name: `Sales Manager`
   - Description: `Manager de ventas con acceso completo a órdenes de venta`
5. Click en "Create"
6. Verificar que el rol aparece en la lista

**Resultado Esperado**:
- ✅ El modal se abre correctamente
- ✅ Se puede crear el rol
- ✅ El rol aparece en la tabla con contador de usuarios en 0
- ✅ Aparece un mensaje de éxito

---

### Test 3: Configurar Permisos del Custom Role

**Objetivo**: Verificar que solo se muestran módulos activos y se pueden configurar permisos

**Pasos**:
1. En la lista de custom roles, click en "Permissions" del rol creado
2. Verificar que el modal de permisos se abre
3. Confirmar que SOLO aparecen los módulos activados en el Test 1:
   - ✅ dashboard (activo)
   - ✅ sales_orders (activo)
   - ✅ service_orders (activo)
   - ✅ stock (activo)
   - ✅ get_ready (activo)
   - ✅ reports (activo)
   - ❌ recon_orders (NO debe aparecer - está desactivado)
   - ❌ car_wash (NO debe aparecer - está desactivado)
4. Expandir el módulo "sales_orders"
5. Seleccionar nivel de permiso "admin"
6. Expandir "dashboard" y seleccionar "read"
7. Expandir "stock" y seleccionar "write"
8. Expandir "reports" y seleccionar "read"
9. Click en "Save Changes"
10. Cerrar el modal
11. Volver a abrir los permisos del mismo rol
12. Verificar que los permisos se guardaron correctamente

**Resultado Esperado**:
- ✅ Solo aparecen módulos activos del dealer
- ✅ Se pueden expandir/colapsar módulos
- ✅ Se pueden seleccionar diferentes niveles de permiso
- ✅ Los permisos se guardan correctamente
- ✅ Los permisos persisten después de cerrar y reabrir

---

### Test 4: Editar Custom Role

**Objetivo**: Verificar que se pueden editar roles existentes

**Pasos**:
1. En la lista de custom roles, click en el botón de "Edit" (lápiz)
2. Modificar:
   - Display Name: `Sales Manager Senior`
   - Description: `Manager senior de ventas con acceso extendido`
3. Click en "Save"
4. Verificar que los cambios se reflejan en la lista

**Resultado Esperado**:
- ✅ El modal se abre con los datos actuales
- ✅ Se pueden modificar los campos
- ✅ Los cambios se guardan correctamente
- ✅ La tabla se actualiza con los nuevos datos

---

### Test 5: Asignar Custom Role a Usuario

**Objetivo**: Verificar que se pueden asignar roles a usuarios

**Pasos**:
1. Ir al tab "Users" del mismo dealer
2. Seleccionar un usuario de la lista
3. Click en "Manage Roles" o el botón correspondiente
4. En el modal de roles, verificar que aparece el custom role creado
5. Asignar el rol "Sales Manager Senior" al usuario
6. Cerrar el modal
7. Verificar que el usuario ahora muestra el rol asignado
8. Ir de nuevo al tab "Custom Roles"
9. Verificar que el contador de usuarios del rol ahora muestra "1"

**Resultado Esperado**:
- ✅ Los custom roles aparecen en el selector de roles
- ✅ Se puede asignar el rol al usuario
- ✅ El usuario muestra el rol asignado
- ✅ El contador de usuarios se actualiza correctamente

---

### Test 6: Flujo Completo de Múltiples Roles

**Objetivo**: Probar el sistema con múltiples roles y configuraciones

**Pasos**:
1. Crear segundo custom role:
   - Role Name: `service_technician`
   - Display Name: `Service Technician`
2. Configurar permisos del technician:
   - service_orders: write
   - dashboard: read
3. Crear tercer custom role:
   - Role Name: `read_only_viewer`
   - Display Name: `Viewer (Read Only)`
4. Configurar permisos del viewer:
   - dashboard: read
   - sales_orders: read
   - service_orders: read
   - reports: read
5. Verificar que los 3 roles aparecen en la lista
6. Asignar múltiples roles a un usuario
7. Verificar contadores de usuarios

**Resultado Esperado**:
- ✅ Se pueden crear múltiples roles
- ✅ Cada rol tiene configuración independiente
- ✅ Un usuario puede tener múltiples roles
- ✅ Los contadores reflejan correctamente la cantidad de usuarios

---

### Test 7: Agregar Nuevos Módulos al Dealer

**Objetivo**: Verificar que al activar nuevos módulos, aparecen en los permisos

**Pasos**:
1. Ir al tab "Modules"
2. Activar un módulo que estaba desactivado (ej: "car_wash")
3. Ir al tab "Custom Roles"
4. Abrir permisos de cualquier rol
5. Verificar que ahora aparece "car_wash" en la lista de módulos
6. Configurar permisos para el nuevo módulo
7. Guardar
8. Verificar que los permisos se guardaron

**Resultado Esperado**:
- ✅ El nuevo módulo aparece automáticamente en los permisos
- ✅ Se pueden configurar permisos para el nuevo módulo
- ✅ Los permisos existentes se mantienen intactos

---

### Test 8: Eliminar Custom Role

**Objetivo**: Verificar que se pueden eliminar roles (soft delete)

**Pasos**:
1. Crear un rol temporal para eliminar
2. Click en el botón de eliminar (trash)
3. Confirmar la eliminación
4. Verificar que el rol desaparece de la lista
5. Verificar en la base de datos que `is_active = false` (no fue borrado físicamente)

**Resultado Esperado**:
- ✅ Aparece confirmación antes de eliminar
- ✅ El rol desaparece de la lista
- ✅ Es un soft delete (is_active = false)
- ✅ Los usuarios que tenían el rol ya no lo muestran

---

## 🔍 Casos Edge a Verificar

### Edge Case 1: Dealer sin Módulos Activos
**Escenario**: Un dealer nuevo sin módulos activados
**Resultado Esperado**: Al intentar configurar permisos, debe mostrar mensaje "No active modules found for this dealer. Please activate modules in the Modules tab first."

### Edge Case 2: Rol sin Permisos
**Escenario**: Crear un rol pero no asignar ningún permiso
**Resultado Esperado**: El rol se crea correctamente pero no tiene acceso a ningún módulo

### Edge Case 3: Todos los Módulos Seleccionados
**Escenario**: Activar todos los 15 módulos del dealer y dar permisos admin en todos
**Resultado Esperado**: El sistema maneja correctamente los 15 módulos activos

### Edge Case 4: Usuario con Múltiples Roles
**Escenario**: Usuario con 3+ roles diferentes
**Resultado Esperado**: El sistema agrega correctamente los permisos de todos los roles

---

## 📊 Validaciones de Base de Datos

Después de completar los tests, verificar en la base de datos:

```sql
-- 1. Verificar módulos activos del dealer
SELECT * FROM dealership_modules WHERE dealer_id = 5 AND is_enabled = true;

-- 2. Verificar custom roles creados
SELECT * FROM dealer_custom_roles WHERE dealer_id = 5 AND is_active = true;

-- 3. Verificar permisos de un rol específico
SELECT rcr.display_name, rmp.module, rmp.permission_key, rmp.is_active
FROM dealer_custom_roles rcr
JOIN role_module_permissions_new rmp ON rmp.role_id = rcr.id
WHERE rcr.dealer_id = 5 AND rcr.is_active = true
ORDER BY rcr.display_name, rmp.module;

-- 4. Verificar asignaciones de roles a usuarios
SELECT u.email, rcr.display_name
FROM user_custom_role_assignments ucra
JOIN dealer_custom_roles rcr ON rcr.id = ucra.custom_role_id
JOIN auth.users u ON u.id = ucra.user_id
WHERE ucra.dealer_id = 5 AND ucra.is_active = true;
```

---

## ✅ Checklist de Validación Final

- [ ] Todos los 15 módulos aparecen en DealerModules
- [ ] Los módulos se pueden activar/desactivar correctamente
- [ ] Los custom roles se pueden crear/editar/eliminar
- [ ] Solo los módulos activos aparecen en configuración de permisos
- [ ] Los 4 niveles de permiso funcionan (read, write, delete, admin)
- [ ] Los permisos se guardan correctamente en role_module_permissions_new
- [ ] Los roles se pueden asignar a usuarios
- [ ] El contador de usuarios por rol funciona correctamente
- [ ] Los cambios persisten después de recargar la página
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores de linting en el código
- [ ] El sistema funciona con múltiples roles por usuario
- [ ] El soft delete funciona correctamente

---

## 🚀 Comandos Útiles para Testing

```bash
# Verificar errores de linting
npm run lint

# Ejecutar en modo desarrollo
npm run dev

# Ver logs de Supabase (si aplica)
# Revisar en Supabase Dashboard > Logs
```

---

## 📝 Notas Importantes

1. **Módulos vs Permisos**: Los módulos se activan a nivel de dealership, los permisos se configuran a nivel de rol
2. **Jerarquía de Permisos**: none < read < write < delete < admin
3. **Conversión de Permisos**: El sistema convierte automáticamente entre niveles jerárquicos y claves granulares
4. **Soft Delete**: Los roles eliminados se marcan como inactive, no se borran físicamente
5. **Multi-rol**: Los usuarios pueden tener múltiples roles, los permisos se agregan (no se sobrescriben)

---

## 🐛 Problemas Conocidos y Soluciones

### Problema: Modal no se cierra después de guardar
**Solución**: Verificar que los estados de `showModal` y `showPermissionsModal` se actualizan correctamente

### Problema: Los módulos no se filtran correctamente
**Solución**: Verificar que `useDealerActiveModules` está retornando los módulos correctos

### Problema: Los permisos no se guardan
**Solución**: Revisar la consola del navegador para errores de Supabase, verificar políticas RLS

---

## 📞 Contacto y Soporte

Si encuentras algún problema durante las pruebas:
1. Revisar la consola del navegador para errores
2. Verificar los logs de Supabase
3. Consultar este documento para casos edge conocidos
4. Documentar cualquier bug encontrado con pasos para reproducir
