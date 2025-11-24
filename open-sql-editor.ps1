# =====================================================
# OPEN SQL EDITOR - Detail Hub Fix
# =====================================================
# Propósito: Abrir SQL Editor de Supabase y preparar clipboard
# =====================================================

$PROJECT_REF = "swfnnrpzpkdypbrzmgnr"
$SQL_EDITOR_URL = "https://supabase.com/dashboard/project/$PROJECT_REF/sql/new"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "DETAIL HUB - APLICACIÓN DE FIX CRÍTICO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que los archivos existen
$step1Exists = Test-Path "STEP1_ADD_ENUM_ONLY.sql"
$step2Exists = Test-Path "STEP2_CLEANUP_DUPLICATES.sql"
$guideExists = Test-Path "EXECUTION_GUIDE.md"

if (-not $step1Exists -or -not $step2Exists) {
    Write-Host "[ERROR] Archivos SQL no encontrados" -ForegroundColor Red
    Write-Host ""
    Write-Host "Archivos requeridos:" -ForegroundColor Yellow
    Write-Host "  - STEP1_ADD_ENUM_ONLY.sql: " -NoNewline
    if ($step1Exists) { Write-Host "[OK] Existe" -ForegroundColor Green } else { Write-Host "[X] Faltante" -ForegroundColor Red }
    Write-Host "  - STEP2_CLEANUP_DUPLICATES.sql: " -NoNewline
    if ($step2Exists) { Write-Host "[OK] Existe" -ForegroundColor Green } else { Write-Host "[X] Faltante" -ForegroundColor Red }
    Write-Host ""
    exit 1
}

Write-Host "[OK] Archivos SQL encontrados" -ForegroundColor Green
Write-Host ""

# Mostrar guía de ejecución
if ($guideExists) {
    Write-Host "[INFO] Guia de ejecucion disponible:" -ForegroundColor Cyan
    Write-Host "   EXECUTION_GUIDE.md" -ForegroundColor White
    Write-Host ""
}

# Preguntar qué paso ejecutar
Write-Host "Que paso deseas ejecutar?" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [1] PASO 1: Agregar enum 'auto_close' (EJECUTAR PRIMERO)" -ForegroundColor White
Write-Host "  [2] PASO 2: Limpiar duplicados y crear objetos (EJECUTAR DESPUÉS)" -ForegroundColor White
Write-Host "  [3] Verificaciones (queries de diagnóstico)" -ForegroundColor White
Write-Host "  [4] Abrir guía completa (EXECUTION_GUIDE.md)" -ForegroundColor White
Write-Host "  [0] Cancelar" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Seleccionar opción"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Yellow
        Write-Host "PASO 1: AGREGAR ENUM 'AUTO_CLOSE'" -ForegroundColor Yellow
        Write-Host "=========================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Red
        Write-Host "   - Este comando NO puede estar en transacción" -ForegroundColor Yellow
        Write-Host "   - Ejecutar TODO el contenido del archivo" -ForegroundColor Yellow
        Write-Host "   - Verificar que aparezcan 5 valores del enum" -ForegroundColor Yellow
        Write-Host ""

        # Copiar contenido al clipboard
        $content = Get-Content "STEP1_ADD_ENUM_ONLY.sql" -Raw
        Set-Clipboard -Value $content

        Write-Host "✓ Contenido de STEP1 copiado al clipboard" -ForegroundColor Green
        Write-Host ""
        Write-Host "Siguiente acción:" -ForegroundColor Cyan
        Write-Host "  1. Pegar en SQL Editor (Ctrl+V)" -ForegroundColor White
        Write-Host "  2. Ejecutar (Ctrl+Enter o botón 'Run')" -ForegroundColor White
        Write-Host "  3. Verificar resultado muestra 5 valores" -ForegroundColor White
        Write-Host ""

        # Abrir navegador
        Write-Host "Abriendo SQL Editor..." -ForegroundColor Cyan
        Start-Process $SQL_EDITOR_URL
    }

    "2" {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Yellow
        Write-Host "PASO 2: LIMPIAR DUPLICADOS" -ForegroundColor Yellow
        Write-Host "=========================================" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "⚠️  REQUISITO:" -ForegroundColor Red
        Write-Host "   - PASO 1 debe estar completado PRIMERO" -ForegroundColor Yellow
        Write-Host "   - Enum 'auto_close' debe existir" -ForegroundColor Yellow
        Write-Host ""

        $confirmed = Read-Host "¿PASO 1 completado exitosamente? (s/n)"

        if ($confirmed -ne "s" -and $confirmed -ne "S") {
            Write-Host ""
            Write-Host "❌ Abortado - Ejecutar PASO 1 primero" -ForegroundColor Red
            Write-Host ""
            exit 1
        }

        # Copiar contenido al clipboard
        $content = Get-Content "STEP2_CLEANUP_DUPLICATES.sql" -Raw
        Set-Clipboard -Value $content

        Write-Host ""
        Write-Host "✓ Contenido de STEP2 copiado al clipboard" -ForegroundColor Green
        Write-Host ""
        Write-Host "Siguiente acción:" -ForegroundColor Cyan
        Write-Host "  1. Pegar en SQL Editor (Ctrl+V)" -ForegroundColor White
        Write-Host "  2. Ejecutar (Ctrl+Enter o botón 'Run')" -ForegroundColor White
        Write-Host "  3. Verificar mensajes de éxito" -ForegroundColor White
        Write-Host "  4. Buscar: '✅ ALL FIXES APPLIED SUCCESSFULLY!'" -ForegroundColor White
        Write-Host ""

        # Abrir navegador
        Write-Host "Abriendo SQL Editor..." -ForegroundColor Cyan
        Start-Process $SQL_EDITOR_URL
    }

    "3" {
        Write-Host ""
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host "VERIFICACIONES" -ForegroundColor Cyan
        Write-Host "=========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Seleccionar verificación:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  [1] Verificar estado del enum" -ForegroundColor White
        Write-Host "  [2] Contar duplicados" -ForegroundColor White
        Write-Host "  [3] Verificar objetos (vista y función)" -ForegroundColor White
        Write-Host "  [4] Ver todas las verificaciones" -ForegroundColor White
        Write-Host ""

        $verifyChoice = Read-Host "Seleccionar opción"

        switch ($verifyChoice) {
            "1" {
                $content = Get-Content "verify_enum.sql" -Raw
                Set-Clipboard -Value $content
                Write-Host ""
                Write-Host "✓ Query de verificación de enum copiada al clipboard" -ForegroundColor Green
            }
            "2" {
                $content = Get-Content "verify_duplicates.sql" -Raw
                Set-Clipboard -Value $content
                Write-Host ""
                Write-Host "✓ Query de verificación de duplicados copiada al clipboard" -ForegroundColor Green
            }
            "3" {
                $content = Get-Content "verify_objects.sql" -Raw
                Set-Clipboard -Value $content
                Write-Host ""
                Write-Host "✓ Query de verificación de objetos copiada al clipboard" -ForegroundColor Green
            }
            "4" {
                $content = @"
-- =====================================================
-- VERIFICACIÓN 1: Estado del enum
-- =====================================================
$(Get-Content "verify_enum.sql" -Raw)

-- =====================================================
-- VERIFICACIÓN 2: Contar duplicados
-- =====================================================
$(Get-Content "verify_duplicates.sql" -Raw)

-- =====================================================
-- VERIFICACIÓN 3: Verificar objetos
-- =====================================================
$(Get-Content "verify_objects.sql" -Raw)
"@
                Set-Clipboard -Value $content
                Write-Host ""
                Write-Host "✓ Todas las queries de verificación copiadas al clipboard" -ForegroundColor Green
            }
            default {
                Write-Host ""
                Write-Host "❌ Opción inválida" -ForegroundColor Red
                exit 1
            }
        }

        Write-Host ""
        Write-Host "Abriendo SQL Editor..." -ForegroundColor Cyan
        Start-Process $SQL_EDITOR_URL
    }

    "4" {
        Write-Host ""
        Write-Host "Abriendo EXECUTION_GUIDE.md..." -ForegroundColor Cyan
        Start-Process "EXECUTION_GUIDE.md"
    }

    "0" {
        Write-Host ""
        Write-Host "Operación cancelada" -ForegroundColor Gray
        Write-Host ""
        exit 0
    }

    default {
        Write-Host ""
        Write-Host "❌ Opción inválida" -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "LISTO" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Consultar guía completa: EXECUTION_GUIDE.md" -ForegroundColor White
Write-Host "🔄 Queries de rollback: ROLLBACK_QUERIES.sql" -ForegroundColor White
Write-Host ""
