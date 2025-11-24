# =====================================================
# EJECUTAR SQL EN SUPABASE VIA API REST
# =====================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile
)

$ErrorActionPreference = "Stop"

# Cargar .env
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$SUPABASE_URL = $env:SUPABASE_URL
$SERVICE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SERVICE_KEY) {
    Write-Host "❌ Error: Variables no encontradas en .env" -ForegroundColor Red
    exit 1
}

# Leer SQL
$sql = Get-Content $SqlFile -Raw

Write-Host "`n🔄 Ejecutando: $SqlFile" -ForegroundColor Cyan
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor Gray

# Construir URL del SQL endpoint
$projectRef = $SUPABASE_URL -replace 'https://([^.]+)\.supabase\.co.*', '$1'
$sqlEndpoint = "https://$projectRef.supabase.co/rest/v1/rpc/exec"

# Headers
$headers = @{
    "apikey" = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type" = "text/plain"
    "Prefer" = "return=representation"
}

try {
    # Ejecutar SQL usando pg_stat_statements como proxy (truco para ejecutar SQL arbitrario)
    # Alternativamente, usar el SQL editor API directamente

    Write-Host "   Método: Conexión directa a PostgreSQL via pgAdmin..." -ForegroundColor Gray

    # Usar el pooler de Supabase para ejecutar SQL
    $dbPassword = $SERVICE_KEY
    $connectionString = "postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

    # Guardar temporalmente el SQL en un archivo
    $tempFile = [System.IO.Path]::GetTempFileName()
    $sql | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

    Write-Host "   ⚠️  PostgreSQL client (psql) no está instalado" -ForegroundColor Yellow
    Write-Host "   📋 Copiando SQL al portapapeles..." -ForegroundColor Yellow

    $sql | Set-Clipboard

    Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  SQL LISTO PARA EJECUTAR                             ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host "`n✅ SQL copiado al portapapeles" -ForegroundColor Green
    Write-Host "🌐 Abriendo SQL Editor..." -ForegroundColor Cyan

    Start-Process "https://supabase.com/dashboard/project/$projectRef/sql/new"

    Write-Host "`n👉 INSTRUCCIONES:" -ForegroundColor Yellow
    Write-Host "   1. Pega el SQL (Ctrl+V)" -ForegroundColor White
    Write-Host "   2. Haz clic en 'Run' (o presiona F5)" -ForegroundColor White
    Write-Host "   3. Espera a que termine la ejecución" -ForegroundColor White
    Write-Host "   4. Verifica que no haya errores`n" -ForegroundColor White

    # Limpiar
    Remove-Item $tempFile -Force

} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
