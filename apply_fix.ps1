# =====================================================
# DETAIL HUB FIX - AUTOMATIC APPLICATION
# =====================================================

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DETAIL HUB FIX - APLICACIÓN AUTOMÁTICA" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if psql is available
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ERROR: psql no está instalado" -ForegroundColor Red
    Write-Host "Instalar con: scoop install postgresql" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ psql encontrado" -ForegroundColor Green

# Get connection string from user
Write-Host ""
Write-Host "Necesitas la CONNECTION STRING directa de Supabase:" -ForegroundColor Yellow
Write-Host "1. Abre: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/settings/database" -ForegroundColor Cyan
Write-Host "2. Busca 'Connection string' en la sección 'Connection info'" -ForegroundColor Cyan
Write-Host "3. Copia la URL que empieza con 'postgresql://postgres.swfnnrpzpkdypbrzmgnr:...'" -ForegroundColor Cyan
Write-Host ""
$connectionString = Read-Host "Pega la connection string aquí"

if ([string]::IsNullOrWhiteSpace($connectionString)) {
    Write-Host "❌ ERROR: Connection string vacía" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PASO 1: VERIFICANDO ENUM ACTUAL" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check current enum values
$checkResult = psql "$connectionString" -t -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'detail_hub_punch_method'::regtype ORDER BY enumsortorder;" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR al conectar a la base de datos" -ForegroundColor Red
    Write-Host $checkResult -ForegroundColor Red
    exit 1
}

Write-Host "Valores actuales del enum:" -ForegroundColor White
$checkResult | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }

if ($checkResult -match "auto_close") {
    Write-Host ""
    Write-Host "✓ El valor 'auto_close' ya existe en el enum" -ForegroundColor Green
    Write-Host "Saltando al PASO 2..." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "PASO 1: AGREGANDO 'auto_close' AL ENUM" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan

    # Execute STEP 1
    $step1Result = Get-Content "STEP1_ADD_ENUM_ONLY.sql" -Raw | psql "$connectionString" 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR en PASO 1" -ForegroundColor Red
        Write-Host $step1Result -ForegroundColor Red
        exit 1
    }

    Write-Host $step1Result -ForegroundColor White
    Write-Host ""
    Write-Host "✅ PASO 1 COMPLETADO" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "PASO 2: LIMPIANDO DUPLICADOS" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Execute STEP 2
$step2Result = Get-Content "STEP2_CLEANUP_DUPLICATES.sql" -Raw | psql "$connectionString" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR en PASO 2" -ForegroundColor Red
    Write-Host $step2Result -ForegroundColor Red
    exit 1
}

Write-Host $step2Result -ForegroundColor White
Write-Host ""
Write-Host "✅ PASO 2 COMPLETADO" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN FINAL" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check for remaining duplicates
$duplicateCheck = psql "$connectionString" -t -c "SELECT COUNT(*) FROM (SELECT employee_id, COUNT(*) as entry_count FROM detail_hub_time_entries WHERE status = 'active' AND clock_out IS NULL GROUP BY employee_id HAVING COUNT(*) > 1) duplicates;" 2>&1

Write-Host "Duplicados restantes: $($duplicateCheck.Trim())" -ForegroundColor White

if ($duplicateCheck.Trim() -eq "0") {
    Write-Host "✅ No hay duplicados - Base de datos limpia" -ForegroundColor Green
} else {
    Write-Host "⚠️  Aún hay duplicados - Revisar manualmente" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ FIX APLICADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Recargar la aplicación (Ctrl+Shift+R)" -ForegroundColor White
Write-Host "2. Navegar a Detail Hub > Overview" -ForegroundColor White
Write-Host "3. Verificar que no hay warnings de 'duplicate keys'" -ForegroundColor White
Write-Host "4. Verificar que cada empleado aparece solo UNA vez" -ForegroundColor White
Write-Host ""
