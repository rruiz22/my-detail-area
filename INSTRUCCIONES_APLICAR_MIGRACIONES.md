# 🚀 Instrucciones para Aplicar las Migraciones de Permisos Granulares

## Opción 1: Desde la Consola Web de Supabase (RECOMENDADO)

### Paso 1: Accede a tu proyecto Supabase
1. Ve a https://app.supabase.com/
2. Selecciona tu proyecto

### Paso 2: Abre el SQL Editor
1. En el menú lateral, haz clic en **SQL Editor**
2. Haz clic en **"New query"**

### Paso 3: Aplica cada migración (EN ORDEN)

#### Migración 1: Crear Tablas
1. Abre el archivo: `supabase/migrations/20251021000001_create_granular_permissions_system.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor
4. Haz clic en **RUN**
5. Verifica que diga "Success" y veas el mensaje: "✅ Granular permissions schema created successfully"

#### Migración 2: Poblar Permisos
1. Abre el archivo: `supabase/migrations/20251021000002_seed_granular_permissions.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor
4. Haz clic en **RUN**
5. Verifica que diga "Success" y veas: "✅ Granular permissions seeded successfully"

#### Migración 3: Agregar RLS
1. Abre el archivo: `supabase/migrations/20251021000003_add_rls_to_permissions.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor
4. Haz clic en **RUN**
5. Verifica que diga "Success" y veas: "✅ RLS policies and audit triggers created"

#### Migración 4: Migrar Datos Existentes
1. Abre el archivo: `supabase/migrations/20251021000004_migrate_existing_permissions.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor
4. Haz clic en **RUN**
5. Verifica el reporte de migración

### Paso 4: Verificar que todo funcionó

Ejecuta esta query en el SQL Editor:

```sql
-- Verificar conteos
SELECT
  (SELECT COUNT(*) FROM system_permissions) as system_perms,
  (SELECT COUNT(*) FROM module_permissions) as module_perms,
  (SELECT COUNT(*) FROM role_system_permissions) as role_system_assigns,
  (SELECT COUNT(*) FROM role_module_permissions_new) as role_module_assigns;
```

**Resultados esperados:**
- `system_perms`: 8
- `module_perms`: 99
- Los assigns dependen de tus roles existentes

### Paso 5: Ver estado de migración

```sql
SELECT * FROM v_permission_migration_status;
```

Deberías ver todos tus roles con el status `migrated`.

---

## Opción 2: Usando el CLI (Si configuraste el token)

### Configurar el token de acceso:

```bash
npx supabase link --project-ref your-project-ref
```

### Luego aplicar:

```bash
npx supabase db push
```

---

## ✅ Confirmación de Éxito

Sabrás que las migraciones se aplicaron correctamente cuando:

1. ✅ Todas las queries se ejecutan sin errores
2. ✅ Ves 8 permisos de sistema
3. ✅ Ves 99 permisos de módulo
4. ✅ La vista `v_permission_migration_status` muestra roles migrados
5. ✅ No hay errores en la consola

---

## 🆘 Si algo sale mal

### Rollback
El sistema antiguo (`dealer_role_permissions`) se mantiene intacto. Si necesitas rollback, simplemente:
- El código sigue funcionando con el sistema antiguo
- No necesitas hacer nada, el nuevo sistema se ignora si está vacío

### Errores Comunes

**Error: "relation does not exist"**
- Verifica que aplicaste las migraciones en orden
- Asegúrate de ejecutar la migración 1 primero

**Error: "permission denied"**
- Verifica que tu usuario tenga permisos de administrador en Supabase

**No se ven los permisos**
- Verifica que las queries de verificación devuelven datos
- Revisa la tabla `system_permissions` y `module_permissions`

---

## 📝 Próximos Pasos

Una vez aplicadas las migraciones:

1. ✅ Prueba el login - debería funcionar igual
2. ✅ Ve a la UI de gestión de roles
3. ✅ Integra el componente `GranularPermissionManager`
4. ✅ Completa las traducciones
5. ✅ Prueba asignar permisos granulares

---

**¿Necesitas ayuda?** Consulta los archivos:
- `GRANULAR_PERMISSIONS_IMPLEMENTATION_COMPLETE.md` - Documentación completa
- `GRANULAR_PERMISSIONS_IMPLEMENTATION_PROGRESS.md` - Estado del proyecto
