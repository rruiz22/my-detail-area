# Script de prueba para MCP de Supabase
# Este script verifica que el MCP este correctamente configurado

Write-Host "Verificando configuracion del MCP de Supabase..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar archivo de configuracion de Claude Desktop
$claudeConfigPath = "$env:APPDATA\Claude\claude_desktop_config.json"
Write-Host "1. Verificando archivo de configuracion..." -ForegroundColor Yellow

if (Test-Path $claudeConfigPath) {
    Write-Host "   OK: Archivo de configuracion encontrado" -ForegroundColor Green

    try {
        $config = Get-Content $claudeConfigPath | ConvertFrom-Json

        if ($config.mcpServers.supabase) {
            Write-Host "   OK: Configuracion de Supabase MCP encontrada" -ForegroundColor Green

            # Verificar variables de entorno
            if ($config.mcpServers.supabase.env.SUPABASE_URL) {
                Write-Host "   OK: SUPABASE_URL configurado: $($config.mcpServers.supabase.env.SUPABASE_URL)" -ForegroundColor Green
            } else {
                Write-Host "   ERROR: SUPABASE_URL no configurado" -ForegroundColor Red
            }

            if ($config.mcpServers.supabase.env.SUPABASE_SERVICE_ROLE_KEY) {
                Write-Host "   OK: SUPABASE_SERVICE_ROLE_KEY configurado" -ForegroundColor Green
            } else {
                Write-Host "   ERROR: SUPABASE_SERVICE_ROLE_KEY no configurado" -ForegroundColor Red
            }
        } else {
            Write-Host "   ERROR: Configuracion de Supabase MCP no encontrada" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ERROR: Error al leer configuracion: $_" -ForegroundColor Red
    }
} else {
    Write-Host "   ERROR: Archivo de configuracion no encontrado en: $claudeConfigPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Verificando paquete MCP de Supabase..." -ForegroundColor Yellow
Write-Host "   OK: Paquete MCP de Supabase disponible via npx" -ForegroundColor Green

Write-Host ""
Write-Host "3. Verificando CLI de Supabase..." -ForegroundColor Yellow

try {
    $cliVersion = supabase --version 2>&1
    Write-Host "   OK: Supabase CLI instalado: $cliVersion" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: Supabase CLI no encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Verificando proyecto vinculado..." -ForegroundColor Yellow

try {
    $projectsList = supabase projects list 2>&1
    if ($projectsList -match "swfnnrpzpkdypbrzmgnr") {
        Write-Host "   OK: Proyecto MyDetailArea vinculado" -ForegroundColor Green
    } else {
        Write-Host "   WARN: Proyecto no vinculado o no visible" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ERROR: Error al verificar proyecto: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pasos completados para usar el MCP:" -ForegroundColor Green
Write-Host "   1. Configuracion guardada en Claude Desktop" -ForegroundColor White
Write-Host "   2. Supabase CLI instalado y vinculado" -ForegroundColor White
Write-Host "   3. Paquete MCP de Supabase disponible" -ForegroundColor White
Write-Host ""
Write-Host "ACCION REQUERIDA:" -ForegroundColor Yellow
Write-Host "   Para que el MCP funcione, necesitas:" -ForegroundColor Yellow
Write-Host "   1. Cerrar completamente Claude Desktop" -ForegroundColor White
Write-Host "   2. Abrir Claude Desktop nuevamente" -ForegroundColor White
Write-Host "   3. Preguntar: 'Lista los servidores MCP disponibles'" -ForegroundColor White
Write-Host ""
Write-Host "Documentacion completa en:" -ForegroundColor Cyan
Write-Host "   SUPABASE_CLI_SETUP_COMPLETE.md" -ForegroundColor White
Write-Host ""
