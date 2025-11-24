# Estrategia de Sincronización de Migraciones

**Fecha**: 2025-11-24 13:25
**Problema**: 377 migraciones solo locales, 867 solo remotas

---

## 🎯 Análisis del Problema

### Estado Actual
- **377 migraciones** existen solo en `supabase/migrations/` local
- **867 migraciones** fueron aplicadas directamente en producción
- Las migraciones locales no se pueden aplicar porque probablemente contienen cambios ya aplicados manualmente

### Causa Raíz
- Desarrollo paralelo entre múltiples desarrolladores
- Migraciones aplicadas directamente en producción via SQL Editor
- Falta de sincronización entre `supabase db push` y aplicaciones manuales

---

## ✅ Estrategia Recomendada: "Remote as Source of Truth"

### Enfoque
**NO intentar aplicar las 377 migraciones locales al remoto.**

En su lugar:
1. **Preservar** las migraciones locales como historial (mover a carpeta de backup)
2. **Usar el remoto** como fuente de verdad actual
3. **Crear nuevas migraciones** a partir de ahora usando `supabase migration new`
4. **Documentar** el estado actual para referencia futura

### Por Qué Este Enfoque

✅ **Seguro**: No arriesga la base de datos de producción
✅ **Práctico**: No requiere revisar 377 archivos SQL uno por uno
✅ **Realista**: El remoto ya tiene el estado correcto funcionando
✅ **Documentado**: Mantiene historial para referencia

---

## 📋 Plan de Acción

### Fase 1: Backup y Organización (HOY)

```bash
# 1. Crear carpeta de backup
mkdir supabase/migrations_backup_2025-11-24

# 2. Identificar migraciones solo locales
supabase migration list --linked | findstr /R "^\s+\d{14}\s+\|?\s+\|" > local_only_migrations.txt

# 3. Mover migraciones locales a backup (preservar)
# (Se hará con script PowerShell)

# 4. Mantener solo las migraciones sincronizadas o que necesiten aplicarse
```

### Fase 2: Sincronización Limpia

```bash
# 1. Verificar estado
supabase migration list --linked

# 2. Solo deberían quedar migraciones sincronizadas o nuevas
# No más migraciones "solo locales" antiguas

# 3. Listo para crear nuevas migraciones
supabase migration new nueva_funcionalidad
```

### Fase 3: Workflow Futuro

```bash
# De ahora en adelante, SIEMPRE:
1. supabase migration new nombre_cambio
2. Editar el archivo SQL generado
3. supabase db push
4. Verificar: supabase migration list --linked
```

---

## 🔧 Script de Migración

### Identificar Migraciones Solo Locales

```powershell
# migration_backup.ps1
$output = supabase migration list --linked 2>&1 | Out-String
$lines = $output -split "`n"

$localOnly = @()
foreach ($line in $lines) {
    # Patrón: timestamp | espacio | fecha (solo local)
    if ($line -match '^\s+(\d{14})\s+\|\s+\|\s+') {
        $timestamp = $Matches[1]
        $localOnly += $timestamp
    }
}

# Guardar lista
$localOnly | Out-File "local_only_migrations_list.txt"
Write-Host "Encontradas $($localOnly.Count) migraciones solo locales"

# Crear backup directory
$backupDir = "supabase\migrations_backup_2025-11-24"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Mover archivos
foreach ($timestamp in $localOnly) {
    $files = Get-ChildItem "supabase\migrations\${timestamp}_*.sql" -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Move-Item $file.FullName $backupDir -Force
        Write-Host "Movido: $($file.Name)"
    }
}

Write-Host "`n✅ Backup completado en: $backupDir"
Write-Host "Total archivos movidos: $($localOnly.Count)"
```

---

## ⚠️ Archivos a Mantener

### NO Mover a Backup

Estos archivos deben quedarse en `supabase/migrations/`:

1. **Migraciones sincronizadas** (aparecen en ambas columnas)
2. **Última migración de hoy**: `20251124171040_apply_detail_hub_cleanup_duplicates.sql`
3. **Archivos de documentación** (`.md` files - ya ignorados por CLI)

### Archivos a Mover

- Solo migraciones con timestamp que aparecen **únicamente en la columna Local**
- Fechas antiguas (antes de sept 2025) que nunca se aplicaron

---

## 📊 Resultado Esperado

### Antes
```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20241201000001 |                | 2024-12-01 00:00:01  ← Solo local (mover)
   20250123000000 |                | 2025-01-23 00:00:00  ← Solo local (mover)
                  | 20250906081045 | 2025-09-06 08:10:45  ← Solo remoto (OK)
   20251124171040 | 20251124171040 | 2025-11-24 17:10:40  ← Sincronizado (mantener)
```

### Después
```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
                  | 20250906081045 | 2025-09-06 08:10:45  ← Solo remoto
                  | 20250906081250 | 2025-09-06 08:12:50  ← Solo remoto
   20251124171040 | 20251124171040 | 2025-11-24 17:10:40  ← Sincronizado
```

---

## 🚀 Próximos Pasos

### Para Implementar (Ejecutar Script)

```bash
# 1. Ejecutar script de backup
powershell -ExecutionPolicy Bypass -File migration_backup.ps1

# 2. Verificar resultado
supabase migration list --linked

# 3. Confirmar que solo quedan migraciones sincronizadas
# Debería haber ~0 migraciones "solo locales" (excepto las más recientes)

# 4. Commit cambios
git add supabase/migrations/
git add supabase/migrations_backup_2025-11-24/
git commit -m "chore: organize migrations - move local-only to backup"
```

### Validación Post-Sync

```bash
# Verificar que no hay errores
supabase migration list --linked

# Crear una nueva migración de prueba
supabase migration new test_new_migration

# Verificar que se crea correctamente
ls supabase/migrations/ | tail -n 1

# Limpiar migración de prueba
rm supabase/migrations/*test_new_migration.sql
```

---

## 📚 Documentación Relacionada

- **Guía CLI**: `SUPABASE_CLI_REMOTE_ONLY.md`
- **Setup Completo**: `SUPABASE_CLI_SETUP_COMPLETE_2025-11-24.md`
- **CLAUDE.md**: Sección "Supabase CLI Configuration"

---

## ⚡ Alternativa (Si Quieres Aplicar Todo)

**⚠️ NO RECOMENDADO** - Solo si realmente necesitas las migraciones locales:

1. Revisar **manualmente** cada uno de los 377 archivos
2. Determinar cuáles ya están aplicados en producción
3. Eliminar/modificar los duplicados
4. Aplicar solo los cambios realmente nuevos con `supabase db push`
5. Resolver conflictos manualmente

**Tiempo estimado**: 20-40 horas de trabajo
**Riesgo**: Alto (puede romper producción)

---

## ✨ Conclusión

**Recomendación**: Ejecutar el script de backup y seguir adelante con el remoto como fuente de verdad.

Las migraciones locales se preservan en `migrations_backup_2025-11-24/` para referencia histórica, pero no se aplicarán al remoto.

De ahora en adelante, todo nuevo cambio se hace con:
1. `supabase migration new nombre`
2. `supabase db push`
3. Verificar con `supabase migration list --linked`

---

**Preparado por**: GitHub Copilot
**Fecha**: 2025-11-24 13:25
**Estado**: Listo para ejecutar
