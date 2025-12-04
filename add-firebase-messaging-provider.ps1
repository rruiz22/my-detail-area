# Add FirebaseMessagingProvider to App.tsx
$ErrorActionPreference = "Stop"

$filePath = "src\App.tsx"
Write-Host "Reading App.tsx..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw

Write-Host "Step 1/2: Adding import statement..." -ForegroundColor Yellow
$content = $content.Replace(
    "import { UpdateBanner } from `"@/components/version/UpdateBanner`";`r`nimport { AuthProvider } from `"@/contexts/AuthContext`";",
    "import { UpdateBanner } from `"@/components/version/UpdateBanner`";`r`nimport { FirebaseMessagingProvider } from `"@/components/FirebaseMessagingProvider`";`r`nimport { AuthProvider } from `"@/contexts/AuthContext`";"
)

Write-Host "Step 2/2: Wrapping app with FirebaseMessagingProvider..." -ForegroundColor Yellow
$content = $content.Replace(
    "      <AuthProvider>`r`n        {/* ✅ DealershipProvider MUST come after AuthProvider (needs user.id) */}`r`n        <DealershipProvider>",
    "      <AuthProvider>`r`n        {/* ✅ FirebaseMessagingProvider MUST come after AuthProvider (needs user.id) */}`r`n        <FirebaseMessagingProvider>`r`n          {/* ✅ DealershipProvider MUST come after AuthProvider (needs user.id) */}`r`n          <DealershipProvider>"
)

# Close the provider at the end
$content = $content.Replace(
    "        </DealershipProvider>`r`n      </AuthProvider>",
    "          </DealershipProvider>`r`n        </FirebaseMessagingProvider>`r`n      </AuthProvider>"
)

Write-Host "Writing file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "✅ FirebaseMessagingProvider added successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "The app will automatically reload. Check the browser console for:" -ForegroundColor Cyan
Write-Host "  - '[FCM] Foreground message received:' when notifications arrive" -ForegroundColor White
Write-Host "  - Toast notifications when app is in foreground" -ForegroundColor White
Write-Host "  - Native OS notifications when app is in background" -ForegroundColor White
