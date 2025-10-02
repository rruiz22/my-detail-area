# 📋 Guía: Ejecutar Migración de Invitaciones

## ⚡ Opción 1: Supabase Dashboard (RECOMENDADO - Más Fácil)

### Pasos:

1. **Ir al SQL Editor de Supabase:**
   - URL: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new

2. **Copiar el contenido del archivo:**
   ```
   supabase/migrations/20251002135038_create_dealer_invitation_functions.sql
   ```

3. **Pegar en el SQL Editor**

4. **Ejecutar** (botón "Run" o Ctrl+Enter)

5. **Verificar éxito:**
   - Deberías ver: "Success. No rows returned"
   - O mensajes de GRANT/COMMENT ejecutados

---

## ⚡ Opción 2: Supabase CLI (Requiere Login)

```bash
# 1. Autenticarse con Supabase
npx supabase login

# 2. Vincular proyecto (si no está vinculado)
npx supabase link --project-ref swfnnrpzpkdypbrzmgnr

# 3. Ejecutar migraciones pendientes
npx supabase db push
```

---

## ⚡ Opción 3: MCP de Supabase (Si está configurado)

Si tienes el MCP server de Supabase configurado en Claude Desktop:

```typescript
// Usar el MCP tool para ejecutar SQL
// (Esto depende de cómo esté configurado tu MCP)
```

---

## ✅ Verificación Post-Migración

Después de ejecutar la migración, verifica que las funciones se crearon correctamente:

### Ejecutar en SQL Editor:

```sql
-- Verificar que las 3 funciones existen
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_dealer_invitation',
    'accept_dealer_invitation',
    'verify_invitation_token'
  )
ORDER BY routine_name;
```

**Resultado esperado:** 3 filas mostrando las funciones

---

## 🎯 Funciones Creadas

### 1. `create_dealer_invitation(p_dealer_id, p_email, p_role_name)`
- **Propósito:** Crear nueva invitación con token seguro
- **Permisos:** `authenticated`
- **Retorna:** JSON con detalles de invitación

### 2. `accept_dealer_invitation(token_input)`
- **Propósito:** Aceptar invitación y crear membership
- **Permisos:** `authenticated`
- **Retorna:** VOID (actualiza tablas)

### 3. `verify_invitation_token(token_input)`
- **Propósito:** Verificar token sin autenticación
- **Permisos:** `anon`, `authenticated` (público)
- **Retorna:** JSON con validación y detalles

---

## 🐛 Solución de Problemas

### Error: "relation dealer_invitations does not exist"
**Causa:** La tabla no existe en la base de datos
**Solución:** Verificar en Supabase Dashboard → Table Editor que existe la tabla `dealer_invitations`

### Error: "permission denied for schema public"
**Causa:** Permisos insuficientes
**Solución:** Ejecutar desde Supabase Dashboard (tiene permisos de superuser)

### Error: "function already exists"
**Causa:** Funciones ya creadas previamente
**Solución:** ✅ Esto es OK - el script usa `CREATE OR REPLACE` (seguro ejecutar múltiples veces)

---

## 📊 Después de la Migración

Una vez ejecutada la migración, el sistema de invitaciones estará completamente funcional:

1. ✅ Modal de invitación mostrará los 7 roles correctos
2. ✅ Página de aceptación reconocerá todos los roles
3. ✅ Funciones RPC disponibles para crear/aceptar invitaciones
4. ✅ Traducciones EN/ES/PT-BR completas

---

## 🔗 Enlaces Útiles

- **Proyecto Supabase:** https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
- **SQL Editor:** https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql
- **Table Editor:** https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/editor
- **Functions:** https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/database/functions

---

**Fecha:** 2025-10-02
**Migración:** `20251002135038_create_dealer_invitation_functions.sql`
