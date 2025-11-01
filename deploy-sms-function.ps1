# Deploy send-order-sms-notification Edge Function
# Uso: .\deploy-sms-function.ps1 -Token "sbp_tu_token_aqui"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,

    [Parameter(Mandatory=$false)]
    [string]$TwilioAccountSid,

    [Parameter(Mandatory=$false)]
    [string]$TwilioAuthToken,

    [Parameter(Mandatory=$false)]
    [string]$TwilioPhoneNumber
)

$ErrorActionPreference = "Stop"
$ProjectRef = "swfnnrpzpkdypbrzmgnr"

Write-Host "🚀 Desplegando send-order-sms-notification Edge Function..." -ForegroundColor Cyan
Write-Host ""

# Configurar token temporalmente
$env:SUPABASE_ACCESS_TOKEN = $Token

try {
    # 1. Deploy de la función
    Write-Host "📦 Paso 1: Desplegando función..." -ForegroundColor Yellow
    npx supabase functions deploy send-order-sms-notification `
        --project-ref $ProjectRef `
        --no-verify-jwt

    if ($LASTEXITCODE -ne 0) {
        throw "Error al desplegar la función"
    }

    Write-Host "✅ Función desplegada exitosamente!" -ForegroundColor Green
    Write-Host ""

    # 2. Configurar secrets de Twilio (si se proporcionaron)
    if ($TwilioAccountSid -and $TwilioAuthToken -and $TwilioPhoneNumber) {
        Write-Host "🔐 Paso 2: Configurando secrets de Twilio..." -ForegroundColor Yellow

        npx supabase secrets set `
            TWILIO_ACCOUNT_SID="$TwilioAccountSid" `
            TWILIO_AUTH_TOKEN="$TwilioAuthToken" `
            TWILIO_PHONE_NUMBER="$TwilioPhoneNumber" `
            --project-ref $ProjectRef

        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠️ Advertencia: Error al configurar secrets" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Secrets configurados!" -ForegroundColor Green
        }
    } else {
        Write-Host "⏭️ Paso 2: Saltando configuración de secrets (no proporcionados)" -ForegroundColor Gray
        Write-Host "   Puedes configurarlos después desde:" -ForegroundColor Gray
        Write-Host "   Dashboard → Project Settings → Edge Functions → Manage secrets" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "✨ ¡Deploy completado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Información de la función:" -ForegroundColor Cyan
    Write-Host "   • Nombre: send-order-sms-notification" -ForegroundColor White
    Write-Host "   • Project: MyDetailArea ($ProjectRef)" -ForegroundColor White
    Write-Host "   • Endpoint: https://$ProjectRef.supabase.co/functions/v1/send-order-sms-notification" -ForegroundColor White
    Write-Host ""
    Write-Host "📚 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Verifica que los secrets estén configurados" -ForegroundColor White
    Write-Host "   2. Prueba la función desde el frontend" -ForegroundColor White
    Write-Host "   3. Revisa logs: npx supabase functions logs send-order-sms-notification" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "❌ Error durante el deploy: $_" -ForegroundColor Red
    exit 1
} finally {
    # Limpiar token
    Remove-Item Env:\SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
}
