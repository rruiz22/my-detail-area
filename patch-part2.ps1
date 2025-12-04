# Part 2: Update notifyOrderStatusChange signature and internal call
$ErrorActionPreference = "Stop"

$filePath = "src\services\pushNotificationHelper.ts"
Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw

Write-Host "Patch 4/5: Adding triggeredBy parameter to notifyOrderStatusChange..." -ForegroundColor Yellow
$content = $content.Replace(
    "  async notifyOrderStatusChange(`n    orderId: string,`n    orderNumber: string,`n    newStatus: string,`n    changedBy: string`n  ): Promise<void> {",
    "  async notifyOrderStatusChange(`n    orderId: string,`n    orderNumber: string,`n    newStatus: string,`n    changedBy: string,`n    triggeredBy?: string`n  ): Promise<void> {"
)

Write-Host "Patch 5/5: Passing triggeredBy to notifyOrderFollowers..." -ForegroundColor Yellow
$content = $content.Replace(
    "          notificationLevel: 'all', // Status changes go to all followers`n        }",
    "          notificationLevel: 'all', // Status changes go to all followers`n          triggeredBy, // Exclude user who made the change`n        }"
)

Write-Host "Writing file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "Done! Part 2 complete." -ForegroundColor Green
