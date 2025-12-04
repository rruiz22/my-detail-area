# PowerShell script to patch pushNotificationHelper.ts with triggeredBy support
# This script makes all 4 changes atomically

$ErrorActionPreference = "Stop"

Write-Host "🔧 Patching pushNotificationHelper.ts..." -ForegroundColor Cyan

$filePath = "C:\Users\rudyr\apps\mydetailarea\src\services\pushNotificationHelper.ts"

# Read the entire file
$content = Get-Content -Path $filePath -Raw

Write-Host "📖 File read successfully ($(($content.Length)) bytes)" -ForegroundColor Green

# Change 1: Add triggeredBy to options interface (line ~215)
Write-Host "🔨 Change 1: Adding triggeredBy to options interface..." -ForegroundColor Yellow
$oldPattern1 = "notificationLevel\?: 'all' \| 'important';\r?\n    \}"
$newPattern1 = "notificationLevel?: 'all' | 'important';`r`n      triggeredBy?: string;`r`n    }"
$content = $content -replace $oldPattern1, $newPattern1

# Change 2: Add triggeredBy to console.log (line ~222)
Write-Host "🔨 Change 2: Adding triggeredBy to console.log..." -ForegroundColor Yellow
$oldPattern2 = "notificationLevel: options\?\.notificationLevel,\r?\n      \}\);"
$newPattern2 = "notificationLevel: options?.notificationLevel,`r`n        triggeredBy: options?.triggeredBy,`r`n      });"
$content = $content -replace $oldPattern2, $newPattern2

# Change 3: Add self-exclusion filter (line ~237)
Write-Host "🔨 Change 3: Adding self-exclusion filter..." -ForegroundColor Yellow
$oldPattern3 = "(\s+)// Filter by notification level if specified\r?\n(\s+)if \(options\?\.notificationLevel\) \{\r?\n(\s+)query = query\.eq\('notification_level', options\.notificationLevel\);\r?\n(\s+)\}\r?\n\r?\n(\s+)const \{ data: followers"
$newPattern3 = "`$1// Filter by notification level if specified`r`n`$2if (options?.notificationLevel) {`r`n`$3query = query.eq('notification_level', options.notificationLevel);`r`n`$4}`r`n`r`n`$1// Filter out the user who triggered the change (self-exclusion)`r`n`$2if (options?.triggeredBy) {`r`n`$3query = query.neq('user_id', options.triggeredBy);`r`n`$3console.log('```[PushNotificationHelper]``` Excluding trigger user from notifications: ' + options.triggeredBy);`r`n`$4}`r`n`r`n`$5const { data: followers"
$content = $content -replace $oldPattern3, $newPattern3

# Write back to file
Write-Host "💾 Writing changes back to file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "✅ Successfully patched pushNotificationHelper.ts!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Update notifyOrderStatusChange method signature to accept triggeredBy" -ForegroundColor White
Write-Host "2. Pass triggeredBy in the internal call to notifyOrderFollowers" -ForegroundColor White
Write-Host "3. Update useStatusPermissions.tsx to pass enhancedUser.id" -ForegroundColor White
