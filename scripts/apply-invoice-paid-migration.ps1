# Apply invoice item paid status migration
# Created: 2024-11-24

Write-Host "Applying migration: add_invoice_item_paid_status..." -ForegroundColor Cyan

$sqlContent = Get-Content -Path "supabase/migrations/20251124000000_add_invoice_item_paid_status.sql" -Raw

# Read Supabase credentials from .env
$envContent = Get-Content -Path ".env"
$projectRef = ($envContent | Select-String "SUPABASE_PROJECT_REF=(.+)").Matches.Groups[1].Value
$apiUrl = "https://$projectRef.supabase.co"

Write-Host "Project: $projectRef" -ForegroundColor Yellow
Write-Host "Executing SQL migration..." -ForegroundColor Yellow

# Get service role key from environment
$serviceRoleKey = ($envContent | Select-String "SUPABASE_SERVICE_ROLE_KEY=(.+)").Matches.Groups[1].Value

if (-not $serviceRoleKey) {
    Write-Host "ERROR: SUPABASE_SERVICE_ROLE_KEY not found in .env" -ForegroundColor Red
    exit 1
}

# Execute SQL via Supabase REST API
$headers = @{
    "apikey" = $serviceRoleKey
    "Authorization" = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sqlContent
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$apiUrl/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body
    Write-Host "✓ Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Migration failed: $($_.Exception.Message)" -ForegroundColor Red

    # Try alternative method using pg_query
    Write-Host "Trying alternative method..." -ForegroundColor Yellow

    # Split SQL into individual statements
    $statements = $sqlContent -split ";" | Where-Object { $_.Trim() -ne "" }

    foreach ($statement in $statements) {
        if ($statement.Trim() -match "^--") { continue }

        Write-Host "Executing: $($statement.Substring(0, [Math]::Min(60, $statement.Length)))..." -ForegroundColor Gray

        # Execute using supabase CLI if available
        $statement | Out-File -FilePath "temp_query.sql" -Encoding UTF8

        try {
            & supabase db execute --file "temp_query.sql" 2>&1
            Write-Host "  ✓ Statement executed" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Statement failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    Remove-Item -Path "temp_query.sql" -ErrorAction SilentlyContinue
}

Write-Host "`nMigration process completed!" -ForegroundColor Cyan
