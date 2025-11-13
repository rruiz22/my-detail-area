# 🔒 CRITICAL SECURITY FIX v1.3.17 - Instrucciones de Verificación

## ✅ Cambios Aplicados

### 1. **Migración de Base de Datos** ✅
- **Archivo**: `supabase/migrations/20251113000000_fix_permissions_rpc_security_bug.sql`
- **Estado**: APLICADA exitosamente via MCP Supabase
- **Cambio**: Función RPC `get_user_permissions_batch` ahora verifica permisos a través de `role_module_permissions_new`

### 2. **Corrección de Código Frontend** ✅
- **Archivo**: `src/hooks/usePermissions.tsx` (líneas 491-509)
- **Cambio**: Query de fallback ahora consulta `role_module_permissions_new` en lugar de `module_permissions`
- **Estado**: CORREGIDO

### 3. **Versión Actualizada** ✅
- **Versión anterior**: 1.3.16
- **Versión nueva**: 1.3.17
- **Archivo**: `package.json`

---

## 🚨 PASOS CRÍTICOS PARA VERIFICAR EL FIX

### Paso 1: Limpiar Cache del Navegador (OBLIGATORIO)

El sistema almacena permisos en cache por 30 minutos. Debes limpiar el cache para que los nuevos permisos se carguen correctamente.

**Opción A: Desde la Consola del Navegador (Recomendado)**

1. Abre la aplicación en el navegador
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Console**
4. Ejecuta estos comandos:

```javascript
// Limpiar localStorage
localStorage.clear();

// Limpiar sessionStorage
sessionStorage.clear();

// Verificar que se limpiaron
console.log('localStorage:', localStorage.length); // Debe mostrar: 0
console.log('sessionStorage:', sessionStorage.length); // Debe mostrar: 0

// Recargar página
location.reload();
```

**Opción B: Manual**

1. Presiona `Ctrl + Shift + Delete` (Windows) o `Cmd + Shift + Delete` (Mac)
2. Selecciona:
   - ✅ Cookies y otros datos de sitios
   - ✅ Archivos e imágenes en caché
3. Rango de tiempo: **Última hora**
4. Haz clic en "Borrar datos"
5. Presiona `Ctrl + Shift + R` para hard refresh

---

### Paso 2: Verificar Permisos de Sales Advisor

**A. Verificación en Base de Datos (SQL)**

Ejecuta esta query en Supabase para confirmar que Sales Advisor NO tiene `delete_orders`:

```sql
SELECT
  dcr.role_name,
  dcr.display_name,
  mp.module,
  mp.permission_key,
  mp.display_name as permission_name
FROM dealer_custom_roles dcr
INNER JOIN role_module_permissions_new rmp ON rmp.role_id = dcr.id
INNER JOIN module_permissions mp ON mp.id = rmp.permission_id
WHERE dcr.role_name = 'sales_advisor'
  AND dcr.is_active = true
  AND mp.is_active = true
  AND mp.module = 'sales_orders'
ORDER BY mp.permission_key;
```

**✅ Resultado Esperado**: NO debe aparecer `delete_orders` en la lista.

**Permisos que SÍ debe tener Sales Advisor en sales_orders:**
- ✅ `view_orders` - Ver órdenes de venta
- ✅ `create_orders` - Crear órdenes de venta
- ✅ `edit_orders` - Editar órdenes de venta
- ✅ `view_customer_info` - Ver información del cliente
- ✅ `edit_customer_info` - Editar información del cliente
- ❌ `delete_orders` - **NO DEBE APARECER**

---

**B. Verificación en la Interfaz (UI)**

1. **Login como Sales Advisor**:
   - Email: `alice@lima.llc` (o el usuario que tenga role Sales Advisor)
   - Navega a: **Sales Orders**

2. **Verificar que NO aparecen botones de eliminar**:
   - ❌ En la tabla de órdenes: columna "Actions" NO debe tener ícono de basura 🗑️
   - ❌ En el modal de detalle: NO debe haber botón "Delete Order"
   - ✅ Otros botones (Edit, View) SÍ deben aparecer

3. **Verificar consola del navegador**:
   - Abre DevTools (F12) → Console
   - Busca el log: `"[hasModuleAccess] ✅ Role sales_advisor has access to sales_orders"`
   - Busca: `"[hasModulePermission] ❌ Role sales_advisor does NOT have permission delete_orders on sales_orders"`

---

### Paso 3: Verificar Configuración de Roles en UI

1. **Login como Admin**:
   - Email: `rruiz@lima.llc` (system_admin)

2. **Ir a Management → Users**:
   - Click en "Manage Roles"
   - Selecciona el role "Sales Advisor"

3. **Verificar checkboxes en Sales Orders**:
   - ✅ View sales orders - CHECKED
   - ✅ Create sales orders - CHECKED
   - ✅ Edit sales orders - CHECKED
   - ✅ View customer information - CHECKED
   - ✅ Edit customer information - CHECKED
   - ❌ **Delete sales orders - UNCHECKED** ← Este debe estar DESMARCADO

---

## 🔍 Testing Checklist

Completa esta lista para confirmar que el fix funciona:

### Database Layer
- [ ] Ejecuté la query SQL y confirmé que Sales Advisor NO tiene `delete_orders`
- [ ] Verifiqué que otros permisos (view, create, edit) SÍ están presentes

### Frontend Layer
- [ ] Limpié localStorage y sessionStorage
- [ ] Hice hard refresh (Ctrl+Shift+R)
- [ ] Verifiqué que la versión es 1.3.17 (check en consola o package.json)

### User Experience (Sales Advisor)
- [ ] Login como Sales Advisor exitoso
- [ ] Los botones de eliminar NO son visibles en la tabla de órdenes
- [ ] Los botones de eliminar NO son visibles en el modal de detalle
- [ ] Puedo ver, crear y editar órdenes (otros permisos funcionan)

### User Experience (Admin)
- [ ] Login como System Admin exitoso
- [ ] Los botones de eliminar SÍ son visibles (admin tiene todos los permisos)
- [ ] Configuración de roles muestra checkboxes correctamente

---

## 🐛 Troubleshooting

### Problema: Aún veo botones de eliminar después de limpiar cache

**Solución**:
1. Verifica que limpiaste AMBOS: localStorage Y sessionStorage
2. Cierra completamente el navegador y vuelve a abrirlo
3. Verifica la versión de la app (debe ser 1.3.17)
4. Revisa la consola del navegador para ver logs de permisos

### Problema: No puedo acceder a ninguna funcionalidad

**Solución**:
1. Verifica que la migración se aplicó correctamente
2. Ejecuta esta query para ver si tienes permisos:
```sql
SELECT * FROM get_user_permissions_batch('YOUR_USER_ID'::uuid);
```
3. Si no retorna datos, verifica las tablas:
   - `dealer_memberships` - ¿Tienes membership activa?
   - `role_module_access` - ¿Tu role tiene módulos habilitados?
   - `role_module_permissions_new` - ¿Tu role tiene permisos asignados?

### Problema: Error en consola "RPC function not found"

**Solución**:
1. Verifica que la migración se aplicó:
```sql
SELECT proname FROM pg_proc WHERE proname = 'get_user_permissions_batch';
```
2. Si no existe, aplica manualmente la migración desde Supabase Dashboard

---

## 📊 Verificación Técnica (Para Desarrolladores)

### Test the RPC Function Directly

```sql
-- Replace with actual user UUID
SELECT * FROM get_user_permissions_batch('UUID_AQUI');
```

**Expected structure**:
```json
{
  "roles": [...],
  "system_permissions": [...],
  "module_permissions": [
    {
      "role_id": "...",
      "module": "sales_orders",
      "permission_key": "view_orders"
    },
    {
      "role_id": "...",
      "module": "sales_orders",
      "permission_key": "create_orders"
    }
    // ❌ delete_orders should NOT be here for Sales Advisor
  ],
  "module_access": [...],
  "allowed_modules": [...]
}
```

### Check Frontend Permission Loading

Open DevTools Console and watch for these logs:

```
✅ [hasModuleAccess] Role sales_advisor has access to sales_orders
✅ [hasModulePermission] Role sales_advisor has permission view_orders on sales_orders
✅ [hasModulePermission] Role sales_advisor has permission create_orders on sales_orders
❌ [hasModulePermission] Role sales_advisor does NOT have permission delete_orders on sales_orders
```

---

## ✅ Confirmación Final

Una vez completados todos los pasos:

1. **Sales Advisor NO puede eliminar órdenes** ✅
2. **Admin SÍ puede eliminar órdenes** ✅
3. **Configuración de roles en UI refleja permisos reales** ✅
4. **No hay errores en consola del navegador** ✅

---

## 📝 Notas Adicionales

- **Modelo de Seguridad**: Sistema cambió de **fail-open** (inseguro) a **fail-closed** (seguro)
- **Impacto**: Solo afecta a usuarios con permisos incorrectamente otorgados (bug fix)
- **Breaking Changes**: Ninguno - solo corrige comportamiento no intencional
- **Compatibilidad**: Compatible con todas las versiones anteriores de custom roles

---

## 🆘 Soporte

Si encuentras problemas después de seguir estos pasos:

1. Revisa los logs de la consola del navegador (F12 → Console)
2. Ejecuta las queries SQL de verificación
3. Captura pantallas del problema
4. Documenta los pasos para reproducir el problema

---

**Versión del Documento**: 1.0
**Fecha**: 2025-11-13
**Aplicado a**: MyDetailArea v1.3.17
