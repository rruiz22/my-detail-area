# Refactor components to use translations

# 1. OperationalReports.tsx
$file1 = "src/components/reports/sections/OperationalReports.tsx"
$content1 = Get-Content $file1 -Raw

$content1 = $content1 -replace '"Operational Performance Summary"', "{t('reports.operational_performance_summary')}"
$content1 = $content1 -replace '"Key operational metrics and efficiency indicators"', "{t('reports.key_operational_metrics')}"

$content1 | Set-Content $file1 -NoNewline

# 2. FinancialReports.tsx
$file2 = "src/components/reports/sections/FinancialReports.tsx"
$content2 = Get-Content $file2 -Raw

$content2 = $content2 -replace '"Financial Performance Overview"', "{t('reports.financial_performance_overview')}"
$content2 = $content2 -replace '"Revenue insights and financial metrics"', "{t('reports.revenue_insights')}"
$content2 = $content2 -replace 'name="This Week"', "name={t('reports.this_week')}"
$content2 = $content2 -replace 'name="Last Week"', "name={t('reports.last_week')}"
$content2 = $content2 -replace 'name="2 Weeks Ago"', "name={t('reports.two_weeks_ago')}"

$content2 | Set-Content $file2 -NoNewline

# 3. InvoicesReport.tsx
$file3 = "src/components/reports/sections/InvoicesReport.tsx"
$content3 = Get-Content $file3 -Raw

$content3 = $content3 -replace '>Invoice Management<', ">{t('reports.invoice_management')}<"
$content3 = $content3 -replace 'title="Add Payment"', "title={t('reports.add_payment')}"
$content3 = $content3 -replace 'title="View Details"', "title={t('reports.view_details')}"
$content3 = $content3 -replace 'title="Delete Invoice"', "title={t('reports.delete_invoice')}"
$content3 = $content3 -replace '"Loading services..."', "t('reports.loading_services')"
$content3 = $content3 -replace '"No services available"', "t('reports.no_services_available')"
$content3 = $content3 -replace '"Add service to exclude..."', "t('reports.add_service_to_exclude')"
$content3 = $content3 -replace '>This Week<', ">{t('reports.this_week')}<"
$content3 = $content3 -replace '>Last Week<', ">{t('reports.last_week')}<"

$content3 | Set-Content $file3 -NoNewline

Write-Host "Components refactored to use translations!" -ForegroundColor Green
Write-Host "Files modified:" -ForegroundColor Yellow
Write-Host "  - $file1" -ForegroundColor Cyan
Write-Host "  - $file2" -ForegroundColor Cyan
Write-Host "  - $file3" -ForegroundColor Cyan
