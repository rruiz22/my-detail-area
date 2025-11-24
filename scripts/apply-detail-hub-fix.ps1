# =====================================================
# APLICAR FIX DE DETAIL HUB EN 2 PASOS
# =====================================================
# Este script ejecuta ambos pasos automáticamente
# =====================================================

$ErrorActionPreference = "Stop"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  DETAIL HUB FIX - APLICACIÓN AUTOMÁTICA" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Cargar variables de entorno
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$SUPABASE_URL = $env:VITE_SUPABASE_URL
$SUPABASE_SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_KEY) {
    Write-Host "❌ Error: VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontrado en .env" -ForegroundColor Red
    exit 1
}

$PROJECT_REF = $SUPABASE_URL -replace 'https://([^.]+)\.supabase\.co.*', '$1'
Write-Host "📦 Project Ref: $PROJECT_REF" -ForegroundColor Yellow

# Función para ejecutar SQL
function Invoke-SupabaseSql {
    param (
        [string]$SqlFile,
        [string]$StepName
    )

    Write-Host "`n🔄 Ejecutando: $StepName" -ForegroundColor Yellow
    Write-Host "   Archivo: $SqlFile" -ForegroundColor Gray

    $sql = Get-Content $SqlFile -Raw

    $body = @{
        query = $sql
    } | ConvertTo-Json

    $headers = @{
        "apikey" = $SUPABASE_SERVICE_KEY
        "Authorization" = "Bearer $SUPABASE_SERVICE_KEY"
        "Content-Type" = "application/json"
    }

    try {
        $response = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "✅ $StepName completado exitosamente" -ForegroundColor Green
        return $true
    }
    catch {
        # Intentar con el endpoint de SQL directo
        try {
            $headers["Prefer"] = "return=representation"
            $sqlEncoded = [System.Web.HttpUtility]::UrlEncode($sql)

            Write-Host "   Intentando método alternativo..." -ForegroundColor Gray

            # Usar psql a través de Supabase CLI
            $env:PGPASSWORD = $SUPABASE_SERVICE_KEY
            $sql | supabase db execute --linked --stdin 2>&1 | Tee-Object -Variable output

            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ $StepName completado exitosamente" -ForegroundColor Green
                return $true
            }
            else {
                Write-Host "❌ Error en $StepName" -ForegroundColor Red
                Write-Host $output -ForegroundColor Red
                return $false
            }
        }
        catch {
            Write-Host "❌ Error en $StepName : $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
    }
}

# PASO 1: Agregar enum
Write-Host "`n═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " PASO 1: AGREGAR 'auto_close' AL ENUM" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

$step1Success = Invoke-SupabaseSql -SqlFile "STEP1_ADD_ENUM_ONLY.sql" -StepName "Agregar auto_close al enum"

if (-not $step1Success) {
    Write-Host "`n❌ PASO 1 falló. No se puede continuar." -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 2

# PASO 2: Limpiar duplicados
Write-Host "`n═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " PASO 2: LIMPIAR DUPLICADOS Y ACTUALIZAR" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

$step2Success = Invoke-SupabaseSql -SqlFile "STEP2_CLEANUP_DUPLICATES.sql" -StepName "Limpiar duplicados"

if (-not $step2Success) {
    Write-Host "`n❌ PASO 2 falló." -ForegroundColor Red
    exit 1
}

# Resumen final
Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  ✅ FIX APLICADO EXITOSAMENTE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "`nPróximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Recarga la aplicación (Ctrl+R)" -ForegroundColor White
Write-Host "  2. Verifica que NO haya warnings de 'duplicate keys'" -ForegroundColor White
Write-Host "  3. Confirma que cada empleado aparece solo UNA vez`n" -ForegroundColor White
