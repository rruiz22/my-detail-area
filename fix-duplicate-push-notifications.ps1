# Fix: Remove duplicate push notification call in useStatusPermissions.tsx
$ErrorActionPreference = "Stop"

$filePath = "src\hooks\useStatusPermissions.tsx"
Write-Host "Reading useStatusPermissions.tsx..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw

Write-Host "Removing duplicate push notification call..." -ForegroundColor Yellow

# Remove the first call (lines 138-148) that doesn't have triggeredBy parameter
$old = @"
        } catch (error) {
          console.warn('⚠️ Failed to fetch user profile:', error);
        }

        // Send push notifications to followers (non-blocking)
        pushNotificationHelper
          .notifyOrderStatusChange(
            orderId,
            currentOrder.order_number,
            newStatus,
            userName
          )
          .catch((notifError) => {
            logError('❌ Push notification failed (non-critical):', notifError);
          });

        // Determine module based on order type
"@

$new = @"
        } catch (error) {
          console.warn('⚠️ Failed to fetch user profile:', error);
        }

        // Determine module based on order type
"@

$content = $content.Replace($old, $new)

Write-Host "Writing file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "✅ Duplicate push notification call removed!" -ForegroundColor Green
Write-Host ""
Write-Host "The app will automatically reload. Now only ONE push notification will be sent:" -ForegroundColor Cyan
Write-Host "  - With self-exclusion (triggeredBy parameter)" -ForegroundColor White
Write-Host "  - No more 404 errors from trying to notify users with 0 tokens" -ForegroundColor White
Write-Host ""
Write-Host "Test: bosdetail changes order status → rruiz receives notification" -ForegroundColor Yellow
