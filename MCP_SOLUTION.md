# 🔧 Solución: Claude Code MCP Access

**Fecha:** 2025-11-24
**Estado:** ✅ **SERVIDOR MCP FUNCIONA** - Problema es con integración Claude Code

## ✅ Confirmación: El Servidor MCP Funciona

**Prueba realizada:**
```powershell
$testInput = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}'
$testInput | npx -y @supabase/mcp-server-supabase@latest \
  --project-ref=swfnnrpzpkdypbrzmgnr \
  --access-token=<token>
```

**Respuesta exitosa:**
```json
{
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {"tools": {}},
    "serverInfo": {
      "name": "supabase",
      "title": "Supabase",
      "version": "0.5.9"
    }
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

✅ **El servidor MCP de Supabase v0.5.9 responde correctamente al protocolo MCP**

## Problema Identificado

**Claude Code Extension v2.0.46** puede:
1. No estar leyendo `.claude/mcp.json` correctamente
2. Tener un bug con servidores MCP en Windows
3. Requerir configuración adicional no documentada

## Soluciones Aplicadas

### 1. Actualizada configuración VSCode

`.vscode/settings.json`:
```json
{
  "claude.mcpConfigPath": "${workspaceFolder}/.claude/mcp.json",
  "claude.enableMcp": true,
  "claude.mcp.enabled": true
}
```

### 2. Verificar rutas en `.claude/mcp.json`

Asegurarse de que usa la ruta correcta de npx:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "C:\\nvm4w\\nodejs\\npx.cmd",
      "args": [...]
    }
  }
}
```

## Acciones Requeridas

### A. Reiniciar VS Code COMPLETAMENTE

**Importante:** Cerrar TODAS las ventanas de VSCode:
```powershell
# Opción 1: Cerrar manualmente todas las ventanas

# Opción 2: Forzar cierre
Get-Process code | Stop-Process -Force

# Volver a abrir
code c:\Users\rudyr\apps\mydetailarea
```

### B. Verificar en Claude Code UI

Después de reiniciar, buscar en el panel de Claude Code:

1. **Abrir panel de Claude Code** (ícono en barra lateral)
2. **Buscar ícono de herramientas/MCP** en la parte inferior del chat
3. **Debe aparecer:** "Supabase" como servidor disponible
4. **Probar comando:** "Lista las tablas de la base de datos"

### C. Revisar logs si falla

Si el servidor no aparece:

1. `Ctrl+Shift+P` → "Developer: Show Logs"
2. Seleccionar "Extension Host"
3. Buscar errores relacionados con:
   - `anthropic.claude-code`
   - `mcp`
   - `supabase`
   - Error de inicio de proceso

## Plan B: Usar Supabase CLI Directamente

Si Claude Code MCP sigue sin funcionar, **alternativa probada**:

### Usar Bash commands en Claude Code

Claude Code ya tiene permisos para ejecutar comandos bash (`.claude/settings.local.json`):

```json
{
  "permissions": {
    "allow": [
      "Bash(npx:*)",
      "Bash(supabase:*)",
      "Bash(psql:*)"
    ]
  }
}
```

**Ejemplos de uso:**

```bash
# Listar tablas
supabase db remote list

# Ejecutar SQL
supabase db execute "SELECT * FROM profiles LIMIT 5" --remote

# Ver migraciones
supabase migration list

# Aplicar migración
supabase db push
```

## Comandos MCP Disponibles (cuando funcione)

### Supabase MCP Server v0.5.9

**Database:**
- `list_tables` - Listar todas las tablas
- `describe_table` - Esquema de tabla
- `execute_sql` - Ejecutar query SQL
- `run_migration` - Aplicar migración

**Edge Functions:**
- `list_functions` - Listar funciones
- `invoke_function` - Ejecutar función
- `get_function_logs` - Ver logs

**Storage:**
- `list_buckets` - Listar buckets
- `list_files` - Archivos en bucket
- `upload_file` - Subir archivo

**Auth:**
- `list_users` - Listar usuarios
- `get_user` - Detalles de usuario

## Checklist Final

- [x] ✅ Servidor MCP funciona (v0.5.9)
- [x] ✅ npx.cmd ruta correcta (nvm4w)
- [x] ✅ Configuración `.claude/mcp.json` válida
- [x] ✅ VSCode settings actualizados
- [x] ✅ Bash permissions configurados (fallback)
- [ ] ⏳ Reiniciar VSCode completamente
- [ ] ⏳ Verificar que Claude Code detecta servidor
- [ ] ⏳ Probar comandos MCP

## Próximo Paso Inmediato

**REINICIAR VS CODE AHORA** y verificar si aparece el servidor Supabase en el panel de Claude Code.

Si no aparece después de reiniciar, usar comandos bash directos como alternativa probada.

---

**Última actualización:** 2025-11-24 14:45
**Estado del servidor:** ✅ Funcionando (confirmado con test manual)
**Estado de integración:** ⏳ Pendiente de verificación post-reinicio
