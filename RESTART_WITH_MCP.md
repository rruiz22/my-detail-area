# 🚀 Reiniciar Claude CLI con MCP Habilitado

**Fecha**: 2025-11-24 21:50
**Problema Resuelto**: Claude CLI necesita `--mcp-config` flag para cargar herramientas MCP

---

## ✅ Solución Confirmada

Las herramientas MCP de Supabase **están correctamente configuradas** en `.claude/mcp.json`.

El problema era que Claude CLI se inició **sin el flag `--mcp-config`**, por lo que las herramientas MCP no se cargaron en el contexto.

---

## 🔧 Pasos para Reiniciar

### 1. Salir de la sesión actual

En el terminal donde está corriendo Claude CLI:

```bash
# Presionar Ctrl+C
# O escribir:
/exit
```

### 2. Iniciar nueva sesión con MCP

```bash
# Asegurarte de estar en el directorio del proyecto
cd C:\Users\rudyr\apps\mydetailarea

# Iniciar Claude CLI con configuración MCP
claude --mcp-config .claude/mcp.json
```

### 3. Verificar que MCP está activo

Una vez que Claude inicie, preguntar:

```
"Lista las tablas de la base de datos usando MCP"
```

Si funciona, Claude responderá con la lista de tablas de Supabase usando `mcp__supabase__list_tables`.

---

## 🎯 Comando Completo Recomendado

```bash
cd C:\Users\rudyr\apps\mydetailarea && claude --mcp-config .claude/mcp.json
```

Este comando:
1. Navega al directorio del proyecto
2. Inicia Claude CLI
3. Carga las herramientas MCP desde `.claude/mcp.json`

---

## 📋 Herramientas MCP que Estarán Disponibles

Una vez reiniciado, Claude tendrá acceso a 20 herramientas de Supabase:

### Database
- ✅ `execute_sql` - Ejecutar queries SQL
- ✅ `apply_migration` - Aplicar migraciones DDL
- ✅ `list_tables` - Listar tablas
- ✅ `list_migrations` - Ver migraciones
- ✅ `list_extensions` - Ver extensiones PostgreSQL

### Edge Functions
- ✅ `list_edge_functions` - Listar funciones
- ✅ `get_edge_function` - Ver código de función
- ✅ `deploy_edge_function` - Deploy de funciones

### Development
- ✅ `create_branch` - Crear branch de desarrollo
- ✅ `list_branches` - Listar branches
- ✅ `merge_branch` - Merge a producción
- ✅ `delete_branch` - Eliminar branch
- ✅ `reset_branch` - Reset branch
- ✅ `rebase_branch` - Rebase branch

### Utilities
- ✅ `get_logs` - Ver logs del proyecto
- ✅ `get_advisors` - Alertas de seguridad/performance
- ✅ `get_project_url` - URL del proyecto
- ✅ `get_publishable_keys` - Keys públicas
- ✅ `generate_typescript_types` - Generar tipos
- ✅ `search_docs` - Buscar en documentación Supabase

---

## 🧪 Prueba Rápida Después de Reiniciar

```
"Ejecuta este SQL usando MCP: SELECT COUNT(*) as total FROM profiles"
```

Claude debería usar `mcp__supabase__execute_sql` y retornar el resultado directamente.

---

## 💡 Alias Recomendado (Opcional)

Para no tener que escribir el comando completo cada vez:

### PowerShell
```powershell
# Agregar a tu perfil de PowerShell (~\Documents\PowerShell\Microsoft.PowerShell_profile.ps1)
function Start-ClaudeMDA {
    Set-Location C:\Users\rudyr\apps\mydetailarea
    claude --mcp-config .claude/mcp.json
}

# Uso:
Start-ClaudeMDA
```

### Bash (Git Bash)
```bash
# Agregar a ~/.bashrc
alias claude-mda='cd /c/Users/rudyr/apps/mydetailarea && claude --mcp-config .claude/mcp.json'

# Uso:
claude-mda
```

---

## 📊 Antes vs Después

| Aspecto | Sin `--mcp-config` | Con `--mcp-config` |
|---------|-------------------|-------------------|
| **Herramientas MCP** | ❌ No disponibles | ✅ 20 herramientas activas |
| **Ejecutar SQL** | ⚠️ Via scripts Node.js | ✅ Directo con MCP |
| **Aplicar migraciones** | ⚠️ Manual | ✅ `apply_migration` |
| **Ver tablas** | ⚠️ Via Supabase CLI | ✅ `list_tables` |
| **Logs del proyecto** | ❌ No disponible | ✅ `get_logs` |

---

## ⚠️ Nota Importante

El archivo `.claude/mcp.json` contiene:
- ✅ Configuración correcta del servidor MCP
- ✅ Credenciales de Supabase (service role key)
- ✅ Ruta correcta a `npx.cmd`

**No es necesario modificar nada** - solo reiniciar Claude CLI con el flag correcto.

---

## 🎉 Resultado Esperado

Después de reiniciar con `--mcp-config .claude/mcp.json`:

1. ✅ Claude podrá ejecutar SQL directamente
2. ✅ Claude podrá aplicar migraciones sin scripts intermedios
3. ✅ Claude podrá listar tablas, ver logs, deploy Edge Functions
4. ✅ Todas las operaciones de base de datos serán más rápidas y directas

---

**Próximo paso**: Salir de esta sesión y ejecutar:
```bash
cd C:\Users\rudyr\apps\mydetailarea && claude --mcp-config .claude/mcp.json
```

¡Listo! 🚀
