# Fix: Preserve Firebase Messaging Service Worker for push notifications
$ErrorActionPreference = "Stop"

$filePath = "src\main.tsx"
Write-Host "Reading main.tsx..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw

Write-Host "Applying fix to preserve firebase-messaging-sw.js..." -ForegroundColor Yellow

$old = @"
        // Unregister ALL service workers (including firebase-messaging-sw.js)
        for (const registration of registrations) {
          const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
          await registration.unregister();
          console.log(`  ✅ Unregistered: `${scriptURL}``);
        }
"@

$new = @"
        // Unregister OLD service workers BUT preserve Firebase Messaging SW for push notifications
        for (const registration of registrations) {
          const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;

          // Skip Firebase Messaging service worker (needed for push notifications)
          if (scriptURL && scriptURL.includes('firebase-messaging-sw.js')) {
            console.log(`  ⏭️  Preserving Firebase Messaging SW: `${scriptURL}``);
            continue;
          }

          await registration.unregister();
          console.log(`  ✅ Unregistered: `${scriptURL}``);
        }
"@

$content = $content.Replace($old, $new)

Write-Host "Writing file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "✅ Fix applied! Firebase Messaging SW will be preserved." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Refresh the app in your browser (Ctrl+F5 / Cmd+Shift+R)" -ForegroundColor White
Write-Host "  2. Check DevTools Console for: '⏭️ Preserving Firebase Messaging SW'" -ForegroundColor White
Write-Host "  3. Go to Settings → Notifications → Enable Push Notifications" -ForegroundColor White
Write-Host "  4. Test: bosdetail changes order status → rruiz receives notification" -ForegroundColor White
