# =====================================================
# APPLY INVOICE ENHANCEMENTS - PowerShell Script
# Created: 2025-11-03
# Description: Apply email history and comments migrations
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Invoice Enhancements Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseInstalled) {
    Write-Host "✓ Supabase CLI found" -ForegroundColor Green
    Write-Host ""
    Write-Host "Applying migrations..." -ForegroundColor Yellow
    Write-Host ""

    # Apply migrations
    supabase db push

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✓ Migrations applied successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "✗ Failed to apply migrations" -ForegroundColor Red
        Write-Host "Please check your Supabase connection and try again." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "⚠ Supabase CLI not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install Supabase CLI first:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "Or apply migrations manually:" -ForegroundColor Yellow
    Write-Host "  1. Go to your Supabase dashboard" -ForegroundColor White
    Write-Host "  2. Navigate to SQL Editor" -ForegroundColor White
    Write-Host "  3. Copy and paste the contents of:" -ForegroundColor White
    Write-Host "     supabase/migrations/20251103000001_create_invoice_comments.sql" -ForegroundColor White
    Write-Host "  4. Run the SQL" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your development server" -ForegroundColor White
Write-Host "  2. Open an invoice modal in /settings > Invoices & Billing" -ForegroundColor White
Write-Host "  3. Scroll to the bottom to see:" -ForegroundColor White
Write-Host "     - Email History Log" -ForegroundColor Cyan
Write-Host "     - Comments & Notes" -ForegroundColor Cyan
Write-Host ""
Write-Host "For more information, see:" -ForegroundColor Yellow
Write-Host "  - INVOICE_ENHANCEMENTS.md" -ForegroundColor White
Write-Host "  - IMPLEMENTATION_SUMMARY.md" -ForegroundColor White
Write-Host ""
