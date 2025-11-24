# Apply Detail Hub Hotfix via Supabase API
$ErrorActionPreference = "Stop"

Write-Host "🔧 Aplicando hotfix de Detail Hub..." -ForegroundColor Cyan

# Load environment variables
$env:SUPABASE_URL = "https://swfnnrpzpkdypbrzmgnr.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE"

# Read SQL file
$sqlContent = Get-Content ".\HOTFIX_DETAIL_HUB_VIEWS.sql" -Raw

# Prepare API call
$headers = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$body = @{
    query = $sqlContent
} | ConvertTo-Json

$url = "$($env:SUPABASE_URL)/rest/v1/rpc/exec_sql"

try {
    Write-Host "📡 Conectando a Supabase..." -ForegroundColor Yellow

    # Try direct SQL execution via PostgREST
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body -ErrorAction Stop

    Write-Host "✅ Hotfix aplicado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Estructuras creadas:" -ForegroundColor Cyan
    Write-Host "  ✓ Tabla: detail_hub_time_entries" -ForegroundColor Green
    Write-Host "  ✓ Vista: detail_hub_currently_working" -ForegroundColor Green
    Write-Host "  ✓ Función: get_live_dashboard_stats" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Recarga tu aplicación para que los cambios surtan efecto." -ForegroundColor Yellow

} catch {
    Write-Host "❌ Error al aplicar hotfix:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternativa: Aplicar el SQL manualmente en Supabase Dashboard" -ForegroundColor Yellow
    Write-Host "   1. Abre https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql" -ForegroundColor White
    Write-Host "   2. Copia el contenido de HOTFIX_DETAIL_HUB_VIEWS.sql" -ForegroundColor White
    Write-Host "   3. Pégalo en el editor SQL y ejecuta" -ForegroundColor White
    exit 1
}
