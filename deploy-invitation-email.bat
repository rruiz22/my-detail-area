@echo off
REM Deployment script for send-invitation-email Edge Function with SendGrid
REM This script deploys the function to Supabase

echo ================================================
echo   Deploying send-invitation-email to Supabase
echo ================================================
echo.

echo Step 1: Verifying Supabase CLI...
where npx >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npx not found. Please install Node.js
    exit /b 1
)

echo Step 2: Deploying Edge Function...
echo.
npx supabase functions deploy send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================
    echo   Deployment Successful!
    echo ================================================
    echo.
    echo Next Steps:
    echo 1. Verify secrets are configured:
    echo    - SENDGRID_API_KEY
    echo    - EMAIL_FROM_ADDRESS
    echo    - EMAIL_FROM_NAME
    echo.
    echo 2. Test the function by sending an invitation
    echo.
    echo 3. Monitor logs with:
    echo    npx supabase functions logs send-invitation-email --project-ref swfnnrpzpkdypbrzmgnr --tail
    echo.
) else (
    echo.
    echo ================================================
    echo   Deployment Failed!
    echo ================================================
    echo.
    echo Common Issues:
    echo 1. Docker not running - Start Docker Desktop
    echo 2. Access token not configured - Check .supabase/config.toml
    echo 3. Network issues - Check internet connection
    echo.
    echo See DEPLOY_INVITATION_EMAIL_SENDGRID.md for troubleshooting
    echo.
)

pause
