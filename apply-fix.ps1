# Detail Hub Fix - Simplified Launcher
# Opens Supabase SQL Editor with content ready to paste

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("step1", "step2", "verify")]
    [string]$Action = "menu"
)

$PROJECT_REF = "swfnnrpzpkdypbrzmgnr"
$SQL_EDITOR_URL = "https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"

function Show-Menu {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host "DETAIL HUB - FIX CRITICO" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Seleccionar accion:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1 - PASO 1: Agregar enum auto_close (PRIMERO)" -ForegroundColor White
    Write-Host "  2 - PASO 2: Limpiar duplicados (DESPUES)" -ForegroundColor White
    Write-Host "  3 - Verificaciones" -ForegroundColor White
    Write-Host "  4 - Abrir guia completa" -ForegroundColor White
    Write-Host "  0 - Salir" -ForegroundColor Gray
    Write-Host ""

    $choice = Read-Host "Opcion"

    switch ($choice) {
        "1" { Execute-Step1 }
        "2" { Execute-Step2 }
        "3" { Show-Verifications }
        "4" { Start-Process "EXECUTION_GUIDE.md" }
        "0" { exit 0 }
        default {
            Write-Host "Opcion invalida" -ForegroundColor Red
            Show-Menu
        }
    }
}

function Execute-Step1 {
    Write-Host ""
    Write-Host "PASO 1: Agregar enum auto_close" -ForegroundColor Yellow
    Write-Host "=================================" -ForegroundColor Yellow
    Write-Host ""

    $content = Get-Content "STEP1_ADD_ENUM_ONLY.sql" -Raw
    Set-Clipboard -Value $content

    Write-Host "[OK] Contenido copiado al clipboard" -ForegroundColor Green
    Write-Host ""
    Write-Host "Instrucciones:" -ForegroundColor Cyan
    Write-Host "  1. Pegar en SQL Editor (Ctrl+V)" -ForegroundColor White
    Write-Host "  2. Ejecutar (Ctrl+Enter)" -ForegroundColor White
    Write-Host "  3. Verificar 5 valores en resultado" -ForegroundColor White
    Write-Host ""

    Start-Process $SQL_EDITOR_URL
    Write-Host "SQL Editor abierto en navegador" -ForegroundColor Cyan
    Write-Host ""
}

function Execute-Step2 {
    Write-Host ""
    Write-Host "PASO 2: Limpiar duplicados" -ForegroundColor Yellow
    Write-Host "===========================" -ForegroundColor Yellow
    Write-Host ""

    $confirmed = Read-Host "PASO 1 completado? (s/n)"

    if ($confirmed -ne "s") {
        Write-Host "[ERROR] Ejecutar PASO 1 primero" -ForegroundColor Red
        return
    }

    $content = Get-Content "STEP2_CLEANUP_DUPLICATES.sql" -Raw
    Set-Clipboard -Value $content

    Write-Host "[OK] Contenido copiado al clipboard" -ForegroundColor Green
    Write-Host ""
    Write-Host "Instrucciones:" -ForegroundColor Cyan
    Write-Host "  1. Pegar en SQL Editor (Ctrl+V)" -ForegroundColor White
    Write-Host "  2. Ejecutar (Ctrl+Enter)" -ForegroundColor White
    Write-Host "  3. Buscar mensaje de exito en resultado" -ForegroundColor White
    Write-Host ""

    Start-Process $SQL_EDITOR_URL
    Write-Host "SQL Editor abierto en navegador" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Verifications {
    Write-Host ""
    Write-Host "VERIFICACIONES" -ForegroundColor Cyan
    Write-Host "==============" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1 - Verificar enum" -ForegroundColor White
    Write-Host "  2 - Contar duplicados" -ForegroundColor White
    Write-Host "  3 - Verificar objetos" -ForegroundColor White
    Write-Host "  4 - Todas las verificaciones" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "Opcion"

    $content = switch ($choice) {
        "1" { Get-Content "verify_enum.sql" -Raw }
        "2" { Get-Content "verify_duplicates.sql" -Raw }
        "3" { Get-Content "verify_objects.sql" -Raw }
        "4" {
@"
-- VERIFICACION 1: Estado del enum
$(Get-Content "verify_enum.sql" -Raw)

-- VERIFICACION 2: Contar duplicados
$(Get-Content "verify_duplicates.sql" -Raw)

-- VERIFICACION 3: Verificar objetos
$(Get-Content "verify_objects.sql" -Raw)
"@
        }
        default {
            Write-Host "Opcion invalida" -ForegroundColor Red
            return
        }
    }

    Set-Clipboard -Value $content
    Write-Host "[OK] Query copiada al clipboard" -ForegroundColor Green
    Write-Host ""

    Start-Process $SQL_EDITOR_URL
    Write-Host "SQL Editor abierto en navegador" -ForegroundColor Cyan
    Write-Host ""
}

# Main execution
switch ($Action) {
    "step1" { Execute-Step1 }
    "step2" { Execute-Step2 }
    "verify" { Show-Verifications }
    default { Show-Menu }
}
