# Face-API.js Models Download Script
# Downloads all required models for facial recognition (detection + landmarks + recognition)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Face-API.js Models Downloader"  -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights"
$files = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

$downloaded = 0
$skipped = 0
$totalSize = 0

Write-Host "Total files: $($files.Count) (~6.2 MB)" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    $filePath = Join-Path $PSScriptRoot $file

    if (-not (Test-Path $filePath)) {
        Write-Host "[$($downloaded + $skipped + 1)/$($files.Count)] Downloading $file..." -ForegroundColor Green

        try {
            Invoke-WebRequest -Uri "$baseUrl/$file" -OutFile $filePath
            $fileSize = (Get-Item $filePath).Length
            $totalSize += $fileSize
            $sizeKB = [math]::Round($fileSize/1KB, 2)
            Write-Host "  Downloaded $sizeKB KB" -ForegroundColor Cyan
            $downloaded++
        }
        catch {
            Write-Host "  ERROR: Failed to download" -ForegroundColor Red
            Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        $fileSize = (Get-Item $filePath).Length
        $totalSize += $fileSize
        Write-Host "[$($downloaded + $skipped + 1)/$($files.Count)] $file (already exists)" -ForegroundColor Gray
        $skipped++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Download Complete!"  -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Downloaded: $downloaded file(s)" -ForegroundColor Cyan
Write-Host "Skipped: $skipped file(s)" -ForegroundColor Cyan
$sizeMB = [math]::Round($totalSize/1MB, 2)
Write-Host "Total size: $sizeMB MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Face recognition models are ready!" -ForegroundColor Yellow
Write-Host ""
