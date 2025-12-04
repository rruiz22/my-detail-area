# Final patch: Add enhancedUser.id to the call
$ErrorActionPreference = "Stop"

$filePath = "src\hooks\useStatusPermissions.tsx"
Write-Host "Reading file..." -ForegroundColor Cyan
$content = Get-Content -Path $filePath -Raw

Write-Host "Current call location found, patching..." -ForegroundColor Yellow

# Find and replace the exact call
$old = "userName`r`n          ).catch"
$new = "userName,`r`n            enhancedUser.id  // ✅ Exclude user who made the change`r`n          ).catch"

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Write-Host "Pattern matched! Applying change..." -ForegroundColor Green
} else {
    Write-Host "Pattern not found. Trying alternative..." -ForegroundColor Yellow
    $old2 = "userName`n          ).catch"
    $new2 = "userName,`n            enhancedUser.id  // ✅ Exclude user who made the change`n          ).catch"
    $content = $content.Replace($old2, $new2)
}

Write-Host "Writing file..." -ForegroundColor Yellow
$content | Set-Content -Path $filePath -NoNewline

Write-Host "✅ Final patch complete!" -ForegroundColor Green
