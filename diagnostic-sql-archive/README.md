# 📦 Diagnostic SQL Archive

**Fecha de archivo:** 2025-11-01

Esta carpeta contiene scripts SQL de diagnóstico y troubleshooting que ya fueron utilizados exitosamente para resolver problemas. Se mantienen archivados para referencia futura.

## 🐛 Services Tab Category Bug (RESUELTO)

**Problema:** Al editar un servicio, la categoría/departamento siempre se reseteaba a "CarWash Dept" en lugar de mantener el valor guardado.

**Causa raíz:** La función RPC `get_dealer_services_for_user` no incluía el campo `category_id` en el retorno.

### Archivos relacionados:

1. **`DIAGNOSE_CATEGORY_ID_ISSUE.sql`** (3.7 KB)
   - Script de diagnóstico completo en 6 pasos
   - Verificación de schema, función RPC, y datos
   - Usado para identificar el problema

2. **`CHECK_DEALER_SERVICES_SCHEMA.sql`** (447 bytes)
   - Verificación rápida del schema de `dealer_services`
   - Confirmó que `category_id` existe como UUID NOT NULL

3. **`FIX_CATEGORY_ID_RPC.sql`** (2.0 KB)
   - Primera versión del fix (sin resolver overloading)
   - No funcionó debido a múltiples versiones de la función

4. **`FIX_FUNCTION_OVERLOAD.sql`** (3.7 KB)
   - Versión mejorada que resuelve el overloading
   - Drop de todas las versiones + recreación limpia
   - Este fix funcionó exitosamente

5. **`VERIFY_AND_FIX_RPC.sql`** (3.7 KB)
   - Script combinado de verificación y fix automático
   - Versión alternativa para aplicar el fix

6. **`VERIFY_MIGRATIONS_APPLIED.sql`** (2.5 KB)
   - Script de verificación post-migración
   - Confirma que la función y columnas están correctas

## ✅ Solución Final Aplicada

La solución oficial se implementó en:
- **Migración:** `supabase/migrations/20251101000000_fix_dealer_services_rpc_category_id.sql`
- **Estado:** ✅ Aplicada exitosamente en producción
- **Fecha:** 2025-11-01

### Cambios aplicados:
1. Dropped todas las versiones de `get_dealer_services_for_user`
2. Recreada función con:
   - Parámetro: `p_dealer_id BIGINT` (no INTEGER)
   - Retorno incluye: `category_id TEXT`
3. Permisos otorgados a `authenticated` y `service_role`

## 🧪 Testing

**Verificación manual:**
1. Ve a `/admin` → Selecciona dealership
2. Tab "Services" → Edit un servicio
3. Cambia categoría/departamento
4. Guarda y vuelve a editar
5. ✅ La categoría debe persistir correctamente

## 📚 Lecciones Aprendidas

1. **Function Overloading:** PostgreSQL puede tener múltiples versiones de la misma función con diferentes tipos de parámetros. Esto causa errores "Could not choose best candidate function".

2. **Type Matching:** Los parámetros de la función deben coincidir EXACTAMENTE con el tipo de la columna en la tabla (`BIGINT` vs `INTEGER`).

3. **Supabase Type Generation:** Los tipos generados de Supabase pueden quedar desactualizados después de migraciones manuales. Usar type assertions cuando sea necesario.

4. **Diagnostic Workflow:**
   - Verificar schema primero
   - Confirmar que los datos existen
   - Verificar la función RPC
   - Probar el fix en staging antes de producción

## 🗂️ Archivo de Otros Scripts

Esta carpeta también puede contener otros scripts de diagnóstico de diferentes features. Cada script debe estar documentado aquí cuando se archive.

---

**Nota:** Estos scripts NO deben ejecutarse directamente en producción. Son para referencia y troubleshooting solamente. Las soluciones oficiales están en `supabase/migrations/`.
