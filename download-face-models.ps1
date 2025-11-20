# Script para descargar modelos de face-api.js correctamente desde vladmandic fork
# Los archivos .shard están en Git LFS, así que necesitamos descargarlos correctamente

Write-Host "====================================="  -ForegroundColor Cyan
Write-Host "Face API Models Downloader" -ForegroundColor Cyan
Write-Host "Source: vladmandic/face-api" -ForegroundColor Cyan
Write-Host "====================================="  -ForegroundColor Cyan
Write-Host ""

$modelsDir = "public\models"
$tempDir = "temp_face_models"

# Crear directorio temporal
Write-Host "[1/4] Creando directorio temporal..." -ForegroundColor Yellow
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Clonar solo la carpeta de modelos usando sparse checkout
Write-Host "[2/4] Clonando modelos desde vladmandic/face-api..." -ForegroundColor Yellow
Set-Location $tempDir

git init | Out-Null
git remote add origin https://github.com/vladmandic/face-api.git
git config core.sparseCheckout true
Set-Content -Path ".git/info/sparse-checkout" -Value "model/*"

Write-Host "    Descargando archivos (esto puede tomar 1-2 minutos)..." -ForegroundColor Gray
git pull --depth=1 origin master 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✓ Repositorio clonado exitosamente" -ForegroundColor Green
} else {
    Write-Host "    ✗ Error clonando repositorio" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

# Copiar archivos necesarios
Write-Host "[3/4] Copiando modelos a public/models/..." -ForegroundColor Yellow

$requiredFiles = @(
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

$copied = 0
$failed = 0

foreach ($file in $requiredFiles) {
    $source = Join-Path $tempDir "model\$file"
    $dest = Join-Path $modelsDir $file

    if (Test-Path $source) {
        Copy-Item -Path $source -Destination $dest -Force
        $size = (Get-Item $dest).Length
        $sizeKB = [math]::Round($size / 1KB, 2)
        Write-Host "    ✓ $file ($sizeKB KB)" -ForegroundColor Green
        $copied++
    } else {
        Write-Host "    ✗ $file (no encontrado)" -ForegroundColor Red
        $failed++
    }
}

# Limpiar directorio temporal
Write-Host "[4/4] Limpiando archivos temporales..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $tempDir

# Resumen
Write-Host ""
Write-Host "====================================="  -ForegroundColor Cyan
Write-Host "Resumen:" -ForegroundColor Cyan
Write-Host "  Archivos copiados: $copied / $($requiredFiles.Count)" -ForegroundColor $(if ($copied -eq $requiredFiles.Count) { "Green" } else { "Yellow" })
Write-Host "  Archivos fallidos: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "====================================="  -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "✓ Todos los modelos se descargaron exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Siguiente paso:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host "  # Luego probar face recognition en Time Clock" -ForegroundColor Gray
    exit 0
} else {
    Write-Host ""
    Write-Host "✗ Algunos modelos fallaron al descargar" -ForegroundColor Red
    Write-Host "  Revisa tu conexión a internet e intenta nuevamente" -ForegroundColor Yellow
    exit 1
}
