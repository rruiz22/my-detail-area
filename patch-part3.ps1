# Part 3: Update useStatusPermissions.tsx to pass triggeredBy
$ErrorActionPreference = "Stop"

$filePath = "src\hooks\useStatusPermissions.tsx"
Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw

Write-Host "Patch 6/6: Adding enhancedUser.id as triggeredBy parameter..." -ForegroundColor Yellow
$content = $content.Replace(
    "          pushNotificationHelper.notifyOrderStatusChange(`n            orderId,`n            currentOrder.order_number || orderId,`n            newStatus,`n            userName`n          )",
    "          pushNotificationHelper.notifyOrderStatusChange(`n            orderId,`n            currentOrder.order_number || orderId,`n            newStatus,`n            userName,`n            enhancedUser.id  // ✅ Exclude user who made the change`n          )"
)

Write-Host "Writing file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "✅ All patches complete! Push notifications now exclude trigger user." -ForegroundColor Green
