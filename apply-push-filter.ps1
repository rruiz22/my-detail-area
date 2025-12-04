# Script to add triggeredBy filter to pushNotificationHelper.ts

$filePath = "C:\Users\rudyr\apps\mydetailarea\src\services\pushNotificationHelper.ts"
$content = Get-Content $filePath -Raw

# Change 1: Add triggeredBy to options interface
$content = $content -replace `
    "notificationLevel\?: 'all' \| 'important';`n    }", `
    "notificationLevel?: 'all' | 'important';`n      triggeredBy?: string;`n    }"

# Change 2: Add triggeredBy to console.log
$content = $content -replace `
    "notificationLevel: options\?\.notificationLevel,`n      \}\);", `
    "notificationLevel: options?.notificationLevel,`n        triggeredBy: options?.triggeredBy,`n      });"

# Change 3: Add filter for triggeredBy after notification level filter
$content = $content -replace `
    "if \(options\?\.notificationLevel\) \{`n        query = query\.eq\('notification_level', options\.notificationLevel\);`n      \}`n`n      const \{ data: followers", `
    "if (options?.notificationLevel) {`n        query = query.eq('notification_level', options.notificationLevel);`n      }`n`n      // Filter out the user who triggered the change (self-exclusion)`n      if (options?.triggeredBy) {`n        query = query.neq('user_id', options.triggeredBy);`n        console.log('````[PushNotificationHelper]```` Excluding trigger user from notifications: $' + '{options.triggeredBy}');`n      }`n`n      const { data: followers"

$content | Set-Content $filePath -NoNewline

Write-Host "✅ Changes applied to pushNotificationHelper.ts"
