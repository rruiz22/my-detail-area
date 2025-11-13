# Fix query limits in multiple files

# 1. useReportsData.tsx
$file1 = "src/hooks/useReportsData.tsx"
$content1 = Get-Content $file1 -Raw

# Add import
$content1 = $content1 -replace "import \{ CACHE_TIMES, GC_TIMES \} from '@/constants/cacheConfig';", "import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';`nimport { QUERY_LIMITS } from '@/constants/queryLimits';"

# Replace limit
$content1 = $content1 -replace "await query.limit\(10000\);", "await query.limit(QUERY_LIMITS.EXTENDED); // Extended limit for reports - TODO: Implement pagination"

$content1 | Set-Content $file1 -NoNewline

# 2. InvoicesReport.tsx
$file2 = "src/components/reports/sections/InvoicesReport.tsx"
$content2 = Get-Content $file2 -Raw

# Add import after other imports (find last import line)
$content2 = $content2 -replace "(import \{ useTranslation \} from 'react-i18next';)", "`$1`nimport { QUERY_LIMITS } from '@/constants/queryLimits';"

# Replace limit
$content2 = $content2 -replace ".limit\(1000\); // Increased limit since we filter client-side", ".limit(QUERY_LIMITS.STANDARD); // Standard limit - TODO: Implement server-side filtering or pagination"

$content2 | Set-Content $file2 -NoNewline

# 3. CreateInvoiceDialog.tsx
$file3 = "src/components/reports/invoices/CreateInvoiceDialog.tsx"
$content3 = Get-Content $file3 -Raw

# Add import after other imports
$content3 = $content3 -replace "(import \{ useTranslation \} from 'react-i18next';)", "`$1`nimport { QUERY_LIMITS } from '@/constants/queryLimits';"

# Replace limit
$content3 = $content3 -replace ".limit\(1000\); // Increased limit since we filter client-side", ".limit(QUERY_LIMITS.STANDARD); // Standard limit - TODO: Implement server-side filtering or pagination"

$content3 | Set-Content $file3 -NoNewline

Write-Host "Query limits updated successfully!" -ForegroundColor Green
Write-Host "Files modified:" -ForegroundColor Yellow
Write-Host "  - $file1" -ForegroundColor Cyan
Write-Host "  - $file2" -ForegroundColor Cyan
Write-Host "  - $file3" -ForegroundColor Cyan
