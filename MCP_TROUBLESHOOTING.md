# MCP Troubleshooting - Claude Code Access Issue

**Fecha:** 2025-11-24
**Problema:** Claude Code no puede acceder al servidor MCP de Supabase

## Diagnóstico Realizado

### 1. Configuración MCP Actual ✅
- **Ubicación:** `.claude/mcp.json` (raíz del proyecto)
- **Estado:** Correctamente configurado con rutas actualizadas a nvm4w
- **Comando:** `C:\nvm4w\nodejs\npx.cmd`
- **Servidor:** `@supabase/mcp-server-supabase@latest`

### 2. Prueba de Servidor MCP ✅
```bash
npx -y @supabase/mcp-server-supabase@latest \
  --project-ref=swfnnrpzpkdypbrzmgnr \
  --access-token=<service_role_key>
```
**Resultado:** El servidor inicia correctamente (warnings de npm son normales)

### 3. Extensión Instalada ✅
- **Extensión:** `anthropic.claude-code`
- **Estado:** Instalada y activa

## Posibles Causas del Problema

### A. Ubicación del Archivo MCP
Claude Code puede buscar el archivo de configuración MCP en diferentes ubicaciones:

1. **Proyecto (actual):** `.claude/mcp.json` ✅
2. **Usuario global:** `%APPDATA%\Claude\mcp.json` ❓
3. **VSCode settings:** `.vscode/settings.json` con configuración MCP ❓

### B. Extensión Claude Code vs Claude Desktop
- **Claude Desktop:** Usa `%APPDATA%\Claude\claude_desktop_config.json`
- **Claude Code (extensión VSCode):** Debe usar `.claude/mcp.json` del proyecto

### C. Permisos y Bash Access
El archivo `.claude/settings.local.json` tiene permisos configurados:
```json
{
  "allowedCommands": [
    "Bash(npx:*)",
    "Bash(node:*)",
    // ...
  ]
}
```

## Soluciones a Intentar

### Solución 1: Reiniciar VSCode
```bash
# Cerrar completamente VSCode y volver a abrir
code --reuse-window .
```

### Solución 2: Verificar Configuración de VSCode para Claude
Crear/actualizar `.vscode/settings.json`:
```json
{
  "claude.mcpConfigPath": "${workspaceFolder}/.claude/mcp.json"
}
```

### Solución 3: Crear Configuración Global
Copiar `.claude/mcp.json` a `%APPDATA%\Claude\mcp.json`

### Solución 4: Verificar Logs de Claude Code
1. Abrir Command Palette (Ctrl+Shift+P)
2. Buscar "Claude: Show Logs"
3. Verificar errores de inicialización MCP

### Solución 5: Reinstalar @supabase/mcp-server-supabase
```bash
npm cache clean --force
npx -y @supabase/mcp-server-supabase@latest --version
```

## Estado Actual
- ✅ Archivo MCP configurado correctamente
- ✅ Rutas de npx corregidas (nvm4w)
- ✅ Servidor MCP inicia correctamente
- ❌ Claude Code no detecta el servidor
- ⏳ Esperando verificación de ubicación correcta del archivo

## Próximos Pasos
1. Verificar si existe `%APPDATA%\Claude\mcp.json`
2. Revisar logs de Claude Code
3. Probar con configuración en `.vscode/settings.json`
4. Verificar permisos de ejecución de npx

## Referencias
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Supabase MCP Server](https://github.com/supabase/mcp-server-supabase)
- [Claude Code Extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code)
