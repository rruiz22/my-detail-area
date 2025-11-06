@echo off
echo ============================================
echo MAX.AUTO AUTO-SYNC - DEPLOYMENT SCRIPT
echo ============================================
echo.

cd /d C:\Users\rudyr\apps\mydetailarea

echo Step 1: Configurando Supabase Secrets...
echo ============================================
echo.

call npx supabase secrets set ENCRYPTION_KEY=caf921b4a3b455f04688bf21f172465ce7a41bc24e0f8824e760099d07f5506f
if %errorlevel% neq 0 (
    echo ERROR: Failed to set ENCRYPTION_KEY
    pause
    exit /b 1
)

call npx supabase secrets set RAILWAY_API_URL=http://localhost:3000
if %errorlevel% neq 0 (
    echo ERROR: Failed to set RAILWAY_API_URL
    pause
    exit /b 1
)

call npx supabase secrets set RAILWAY_API_SECRET=2733deae7a0d4f4246fe770dc7d0699f7c62a927390b5804b7890a1f0dd7de52
if %errorlevel% neq 0 (
    echo ERROR: Failed to set RAILWAY_API_SECRET
    pause
    exit /b 1
)

echo.
echo Secrets configurados exitosamente!
echo.
echo Step 2: Deploying Edge Functions...
echo ============================================
echo.

echo Deploying encrypt-max-auto-credentials...
call npx supabase functions deploy encrypt-max-auto-credentials
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy encrypt-max-auto-credentials
    pause
    exit /b 1
)

echo Deploying trigger-max-auto-sync...
call npx supabase functions deploy trigger-max-auto-sync
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy trigger-max-auto-sync
    pause
    exit /b 1
)

echo Deploying toggle-max-auto-sync...
call npx supabase functions deploy toggle-max-auto-sync
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy toggle-max-auto-sync
    pause
    exit /b 1
)

echo Deploying process-max-inventory-csv...
call npx supabase functions deploy process-max-inventory-csv
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy process-max-inventory-csv
    pause
    exit /b 1
)

echo.
echo ============================================
echo DEPLOYMENT COMPLETADO EXITOSAMENTE!
echo ============================================
echo.
echo Proximos pasos:
echo 1. Instalar dependencias Railway bot: cd ..\mydetailarea-max-sync ^&^& npm install
echo 2. Deploy a Railway: railway up
echo 3. Actualizar RAILWAY_API_URL con URL real de Railway
echo.
pause
