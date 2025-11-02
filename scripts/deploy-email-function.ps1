# =====================================================
# DEPLOY EMAIL FUNCTION TO SUPABASE (PowerShell)
# =====================================================

Write-Host "🚀 Deploying send-invoice-email Edge Function..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseCommand = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCommand) {
    Write-Host "❌ Supabase CLI not found. Please install it:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
Write-Host "📝 Checking Supabase login..." -ForegroundColor Yellow
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase. Please run:" -ForegroundColor Red
    Write-Host "   supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Logged in to Supabase" -ForegroundColor Green
Write-Host ""

# Deploy the function
Write-Host "📤 Deploying function..." -ForegroundColor Yellow
supabase functions deploy send-invoice-email

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Add RESEND_API_KEY to Supabase Dashboard → Edge Functions → Secrets" -ForegroundColor White
    Write-Host "   2. Test the function from the dashboard" -ForegroundColor White
    Write-Host "   3. Check logs: supabase functions logs send-invoice-email" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed. Check the error above." -ForegroundColor Red
    exit 1
}
