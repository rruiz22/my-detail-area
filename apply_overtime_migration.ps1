# PowerShell script to apply overtime migration to Supabase
$ErrorActionPreference = "Stop"

Write-Host "Reading SQL migration file..." -ForegroundColor Cyan
$sql = Get-Content "supabase\migrations\20251125145626_overtime_weekly_calculation_CORRECTED.sql" -Raw

Write-Host "Connecting to Supabase..." -ForegroundColor Cyan
$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE"

$headers = @{
    "apikey" = $apiKey
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

$body = @{
    "query" = $sql
} | ConvertTo-Json

Write-Host "Executing migration..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod `
        -Uri "https://swfnnrpzpkdypbrzmgnr.supabase.co/rest/v1/rpc/exec_sql" `
        -Method POST `
        -Headers $headers `
        -Body $body

    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "❌ Error applying migration:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.Exception.Response -ForegroundColor Red
}
