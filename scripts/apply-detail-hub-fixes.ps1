# ============================================
# Script: Aplicar Migraciones de Detail Hub
# ============================================
# Este script ejecuta las migraciones SQL necesarias
# para corregir duplicados y crear vistas faltantes
# ============================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DETAIL HUB - APLICAR MIGRACIONES SQL" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que los archivos SQL existen
$duplicateFixFile = "FIX_DUPLICATE_TIME_ENTRIES.sql"
$viewsFixFile = "HOTFIX_DETAIL_HUB_VIEWS.sql"

if (-not (Test-Path $duplicateFixFile)) {
    Write-Host "❌ Error: No se encontró $duplicateFixFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $viewsFixFile)) {
    Write-Host "❌ Error: No se encontró $viewsFixFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Archivos SQL encontrados" -ForegroundColor Green
Write-Host ""

# Obtener el project ref desde supabase/config.toml
$configFile = "supabase\config.toml"
$projectRef = "swfnnrpzpkdypbrzmgnr"  # Default

if (Test-Path $configFile) {
    $projectRefLine = Get-Content $configFile | Select-String 'project_id\s*=\s*"([^"]+)"'
    if ($projectRefLine) {
        $projectRef = $projectRefLine.Matches.Groups[1].Value
        Write-Host "📋 Project ID detectado: $projectRef" -ForegroundColor Cyan
    }
}

# URL del SQL Editor
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PASO 1: LIMPIAR DUPLICADOS" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "El script va a:" -ForegroundColor White
Write-Host "  • Encontrar empleados con múltiples clock-ins activos" -ForegroundColor Gray
Write-Host "  • Mantener el registro más reciente" -ForegroundColor Gray
Write-Host "  • Auto-cerrar registros antiguos" -ForegroundColor Gray
Write-Host ""

# Copiar SQL al portapapeles (Paso 1)
Get-Content $duplicateFixFile | Set-Clipboard
Write-Host "✅ SQL copiado al portapapeles" -ForegroundColor Green
Write-Host ""
Write-Host "Abriendo SQL Editor en tu navegador..." -ForegroundColor Cyan
Start-Process $sqlEditorUrl
Write-Host ""
Write-Host "👉 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "   1. Pega el SQL en el editor (Ctrl+V)" -ForegroundColor White
Write-Host "   2. Haz clic en 'Run' (o F5)" -ForegroundColor White
Write-Host "   3. Verifica que aparezca '✅ DUPLICATE CLEANUP COMPLETE'" -ForegroundColor White
Write-Host ""

# Esperar confirmación del usuario
Write-Host "Presiona cualquier tecla cuando hayas ejecutado el Paso 1..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PASO 2: ACTUALIZAR VISTA Y FUNCIÓN" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "El script va a:" -ForegroundColor White
Write-Host "  • Crear vista 'detail_hub_currently_working' con DISTINCT ON" -ForegroundColor Gray
Write-Host "  • Crear función 'get_live_dashboard_stats'" -ForegroundColor Gray
Write-Host "  • Prevenir duplicados futuros" -ForegroundColor Gray
Write-Host ""

# Copiar SQL al portapapeles (Paso 2)
Get-Content $viewsFixFile | Set-Clipboard
Write-Host "✅ SQL copiado al portapapeles" -ForegroundColor Green
Write-Host ""
Write-Host "👉 INSTRUCCIONES:" -ForegroundColor Yellow
Write-Host "   1. En el mismo SQL Editor, borra el contenido" -ForegroundColor White
Write-Host "   2. Pega el nuevo SQL (Ctrl+V)" -ForegroundColor White
Write-Host "   3. Haz clic en 'Run' (o F5)" -ForegroundColor White
Write-Host "   4. Verifica '✅ All Detail Hub structures created successfully!'" -ForegroundColor White
Write-Host ""

# Esperar confirmación del usuario
Write-Host "Presiona cualquier tecla cuando hayas ejecutado el Paso 2..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ✅ MIGRACIONES COMPLETADAS" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Recarga tu aplicación (Ctrl+R en el navegador)" -ForegroundColor White
Write-Host "  2. Verifica que NO aparezca warning 'duplicate keys'" -ForegroundColor White
Write-Host "  3. Confirma que cada empleado aparece solo UNA vez" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Todo listo!" -ForegroundColor Green
Write-Host ""
