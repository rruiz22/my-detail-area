# ============================================
# Script: Ejecutar SQL en Supabase usando REST API
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  EJECUTANDO SQL EN SUPABASE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el archivo existe
if (-not (Test-Path $SqlFile)) {
    Write-Host "❌ Error: No se encontró el archivo $SqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Archivo: $SqlFile" -ForegroundColor White

# Cargar variables de entorno desde .env
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: No se encontró .env" -ForegroundColor Red
    exit 1
}

$supabaseUrl = $null
$serviceRoleKey = $null

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^SUPABASE_URL=(.+)$') {
        $supabaseUrl = $matches[1]
    }
    if ($_ -match '^SUPABASE_SERVICE_ROLE_KEY=(.+)$') {
        $serviceRoleKey = $matches[1]
    }
}

if ([string]::IsNullOrEmpty($supabaseUrl)) {
    Write-Host "❌ Error: SUPABASE_URL no encontrada en .env" -ForegroundColor Red
    exit 1
}

if ([string]::IsNullOrEmpty($serviceRoleKey)) {
    Write-Host "❌ Error: SUPABASE_SERVICE_ROLE_KEY no encontrada en .env" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Configuración cargada" -ForegroundColor Green
Write-Host "   URL: $supabaseUrl" -ForegroundColor Gray
Write-Host ""

# Leer el contenido SQL
$sqlContent = Get-Content $SqlFile -Raw

# Construir la URL del endpoint
$endpoint = "$supabaseUrl/rest/v1/rpc/exec_sql"

Write-Host "🔄 Ejecutando SQL..." -ForegroundColor Yellow
Write-Host ""

# Nota: Supabase REST API no tiene un endpoint directo para ejecutar SQL arbitrario
# La forma correcta es usar el PostgREST API o la Management API
# Vamos a usar la Management API

$projectRef = $supabaseUrl -replace 'https://([^.]+)\.supabase\.co', '$1'
$managementUrl = "https://api.supabase.com/v1/projects/$projectRef/database/query"

# Necesitamos el access token de la Management API, no el service role key
Write-Host "⚠️  Nota: La ejecución de SQL requiere autenticación con Supabase Management API" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para ejecutar SQL directamente, usa una de estas opciones:" -ForegroundColor White
Write-Host ""
Write-Host "OPCIÓN 1: Supabase Dashboard (Recomendado)" -ForegroundColor Cyan
Write-Host "  1. Abre: https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Gray
Write-Host "  2. Copia el contenido de $SqlFile" -ForegroundColor Gray
Write-Host "  3. Pega y ejecuta (Run / F5)" -ForegroundColor Gray
Write-Host ""
Write-Host "OPCIÓN 2: psql (Línea de comandos)" -ForegroundColor Cyan
Write-Host "  Necesitas la DB_PASSWORD desde el Dashboard > Settings > Database" -ForegroundColor Gray
Write-Host ""

# Copiar SQL al portapapeles
$sqlContent | Set-Clipboard
Write-Host "✅ SQL copiado al portapapeles" -ForegroundColor Green
Write-Host ""

# Abrir el navegador
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/sql/new"
Write-Host "🌐 Abriendo SQL Editor..." -ForegroundColor Cyan
Start-Process $sqlEditorUrl

Write-Host ""
Write-Host "👉 Pega el SQL (Ctrl+V) y ejecuta (Run)" -ForegroundColor Yellow
Write-Host ""
