# Simple PowerShell script to patch pushNotificationHelper.ts
$ErrorActionPreference = "Stop"

$filePath = "src\services\pushNotificationHelper.ts"
Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw

Write-Host "Applying patch 1/3: Add triggeredBy to interface..." -ForegroundColor Yellow
$content = $content.Replace(
    "      notificationLevel?: 'all' | 'important';`n    }",
    "      notificationLevel?: 'all' | 'important';`n      triggeredBy?: string;`n    }"
)

Write-Host "Applying patch 2/3: Add triggeredBy to console.log..." -ForegroundColor Yellow
$content = $content.Replace(
    "        notificationLevel: options?.notificationLevel,`n      });",
    "        notificationLevel: options?.notificationLevel,`n        triggeredBy: options?.triggeredBy,`n      });"
)

Write-Host "Applying patch 3/3: Add self-exclusion filter..." -ForegroundColor Yellow
$content = $content.Replace(
    "      // Filter by notification level if specified`n      if (options?.notificationLevel) {`n        query = query.eq('notification_level', options.notificationLevel);`n      }",
    "      // Filter by notification level if specified`n      if (options?.notificationLevel) {`n        query = query.eq('notification_level', options.notificationLevel);`n      }`n`n      // Filter out the user who triggered the change (self-exclusion)`n      if (options?.triggeredBy) {`n        query = query.neq('user_id', options.triggeredBy);`n        console.log('````[PushNotificationHelper]```` Excluding trigger user: ' + options.triggeredBy);`n      }"
)

Write-Host "Writing file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "Done!" -ForegroundColor Green
