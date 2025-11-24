# Migration Backup Script - Version 2
# Mueve migraciones solo locales a carpeta de backup

Write-Host ""
Write-Host "=== Migration Backup Script ===" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Verificar directorio
if (-not (Test-Path "supabase\migrations")) {
    Write-Host "[ERROR] No se encuentra supabase\migrations" -ForegroundColor Red
    exit 1
}

# Crear backup
$backupDir = "supabase\migrations_backup_2025-11-24"
Write-Host "Creando directorio de backup: $backupDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Obtener migraciones
Write-Host ""
Write-Host "Obteniendo lista de migraciones..." -ForegroundColor Cyan
$output = supabase migration list --linked 2>&1 | Out-String
$output | Out-File "migration_list_before_backup.txt" -Encoding UTF8

# Parsear solo locales
$lines = $output -split "`n"
$localOnly = @()

foreach ($line in $lines) {
    if ($line -match '^\s+(\d{14})\s+\|\s+\|\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})') {
        $localOnly += @{
            Timestamp = $Matches[1]
            Date = $Matches[2]
        }
    }
}

Write-Host ""
Write-Host "Migraciones solo locales: $($localOnly.Count)" -ForegroundColor Yellow

if ($localOnly.Count -eq 0) {
    Write-Host ""
    Write-Host "[OK] No hay migraciones para respaldar" -ForegroundColor Green
    exit 0
}

# Guardar lista
$localOnly | ForEach-Object { $_.Timestamp } | Out-File "local_only_migrations_list.txt" -Encoding UTF8

# Confirmar
Write-Host ""
Write-Host "[ATENCION] Se moveran $($localOnly.Count) archivos" -ForegroundColor Yellow
$confirmation = Read-Host "Continuar? (S/N)"

if ($confirmation -ne 'S' -and $confirmation -ne 's') {
    Write-Host ""
    Write-Host "[CANCELADO]" -ForegroundColor Red
    exit 0
}

# Mover archivos
Write-Host ""
Write-Host "Moviendo archivos..." -ForegroundColor Cyan
$movedCount = 0

foreach ($migration in $localOnly) {
    $timestamp = $migration.Timestamp
    $pattern = "supabase\migrations\${timestamp}_*.sql"
    $files = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    
    if ($files) {
        foreach ($file in $files) {
            Move-Item -Path $file.FullName -Destination $backupDir -Force
            Write-Host "  [OK] $($file.Name)" -ForegroundColor Green
            $movedCount++
        }
    }
}

# Resumen
Write-Host ""
Write-Host "=== Resumen ===" -ForegroundColor Cyan
Write-Host "Archivos movidos: $movedCount" -ForegroundColor Green
Write-Host "Backup en: $backupDir" -ForegroundColor Gray

# Verificar despues
$outputAfter = supabase migration list --linked 2>&1 | Out-String
$outputAfter | Out-File "migration_list_after_backup.txt" -Encoding UTF8

# Crear README
@"
# Migraciones Locales - Backup
Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Archivos: $movedCount

Estas migraciones existian solo localmente y se movieron a backup.
El remoto es la fuente de verdad.

Ver: MIGRATION_SYNC_STRATEGY.md
"@ | Out-File "$backupDir\README.md" -Encoding UTF8

Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Verificar: supabase migration list --linked" -ForegroundColor Gray
Write-Host "  2. Commit: git add supabase/" -ForegroundColor Gray
Write-Host ""
Write-Host "[OK] Backup completado" -ForegroundColor Green
Write-Host ""
