# MCP (Model Context Protocol) Configuration

## Overview

MyDetailArea utiliza el **Model Context Protocol (MCP)** para permitir que Claude Code interactúe directamente con servicios backend como Supabase. Esta configuración habilita operaciones avanzadas de base de datos, Edge Functions, y administración de recursos directamente desde Claude Code.

## Arquitectura

```
Claude Code → MCP Server (npx) → Supabase API
                ↓
        .claude/mcp.json
                ↓
        Credenciales desde .env
```

## Archivos de Configuración

### 1. `.claude/mcp.json` (Principal - NO COMMITEAR)

Este archivo contiene la configuración activa del MCP con credenciales reales:

```json
{
  "$schema": "https://modelcontextprotocol.io/schemas/mcp.json",
  "mcpServers": {
    "supabase": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "YOUR_PROJECT_REF",
        "YOUR_SERVICE_ROLE_KEY"
      ],
      "disabled": false,
      "description": "Supabase MCP Server for MyDetailArea"
    }
  }
}
```

**IMPORTANTE**: Este archivo está en `.gitignore` y NO debe ser committeado.

### 2. `.claude/mcp.json.example` (Template)

Plantilla sin credenciales para que otros desarrolladores puedan configurar su entorno.

### 3. `.env` (Variables de Entorno)

Contiene las credenciales de Supabase:

```bash
# Supabase Project Reference
SUPABASE_PROJECT_REF=swfnnrpzpkdypbrzmgnr

# Supabase Service Role Key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 4. `.clauderc` (Metadata del Proyecto)

Configuración adicional del proyecto con información de arquitectura y capacidades.

## Setup Inicial

### Paso 1: Copiar Template

```powershell
cd C:\Users\rudyr\apps\mydetailarea\.claude
cp mcp.json.example mcp.json
```

### Paso 2: Configurar Credenciales

Edita `.claude/mcp.json` y reemplaza:

1. `YOUR_SUPABASE_PROJECT_REF` → Obtén de Supabase Dashboard → Settings → General → Reference ID
2. `YOUR_SUPABASE_SERVICE_ROLE_KEY` → Obtén de Supabase Dashboard → Settings → API → service_role key

**Ejemplo**:
```json
"args": [
  "-y",
  "@supabase/mcp-server-supabase",
  "swfnnrpzpkdypbrzmgnr",  // ← Tu Project Ref
  "eyJhbGci..."             // ← Tu Service Role Key
]
```

### Paso 3: Actualizar .env

Agrega las mismas credenciales a `.env`:

```bash
SUPABASE_PROJECT_REF=swfnnrpzpkdypbrzmgnr
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### Paso 4: Verificar Instalación

Desde Claude Code, ejecuta:

```bash
# Verificar que el MCP está configurado
npx @supabase/mcp-server-supabase --help
```

## Capacidades del MCP de Supabase

El MCP de Supabase proporciona acceso a:

### 1. Database Operations
- **Queries**: SELECT, INSERT, UPDATE, DELETE
- **Schema Inspection**: Listar tablas, columnas, tipos
- **Migrations**: Aplicar y revertir migraciones
- **RLS Policies**: Gestión de Row Level Security

### 2. Edge Functions
- **Deployment**: Deploy funciones Deno/TypeScript
- **Logs**: Ver logs de ejecución
- **Invocation**: Ejecutar funciones directamente

### 3. Storage
- **Buckets**: Crear, listar, eliminar buckets
- **Files**: Subir, descargar, eliminar archivos
- **Policies**: Gestión de permisos de storage

### 4. Auth Management
- **Users**: Listar, crear, actualizar usuarios
- **Sessions**: Gestión de sesiones activas
- **Policies**: Configuración de autenticación

## Uso desde Claude Code

### Ejemplo 1: Consultar Base de Datos

```typescript
// Claude Code puede ejecutar:
mcp__supabase__execute_sql({
  query: "SELECT * FROM orders WHERE status = 'pending' LIMIT 10"
})
```

### Ejemplo 2: Listar Tablas

```typescript
mcp__supabase__list_tables()
// Retorna: profiles, dealerships, orders, contacts, etc.
```

### Ejemplo 3: Deploy Edge Function

```typescript
mcp__supabase__deploy_edge_function({
  name: "decode-vin",
  path: "./supabase/functions/decode-vin"
})
```

### Ejemplo 4: Aplicar Migración

```typescript
mcp__supabase__apply_migration({
  migration_file: "./supabase/migrations/20250115_add_notifications.sql"
})
```

## Seguridad

### ⚠️ Service Role Key

El **Service Role Key** otorga **acceso total** a la base de datos, **saltando RLS policies**.

**Mejores Prácticas**:

1. **NUNCA** commitear `.claude/mcp.json` con credenciales
2. **NUNCA** exponer el service role key en el frontend
3. **ROTAR** el service role key periódicamente (cada 90 días)
4. Usar `.gitignore` para proteger archivos sensibles
5. Restringir acceso al archivo `.env` en servidores

### Archivos Protegidos en .gitignore

```gitignore
# MCP Configuration (contains credentials)
.claude/mcp.json
.clauderc

# Environment files
.env
.env.local
```

## Troubleshooting

### Error: "MCP server not found"

```powershell
# Instalar manualmente
npm install -g @supabase/mcp-server-supabase
```

### Error: "Invalid credentials"

1. Verificar que `SUPABASE_PROJECT_REF` es correcto
2. Verificar que `SUPABASE_SERVICE_ROLE_KEY` es el **service_role** (no anon key)
3. Revisar que no hay espacios en blanco en las credenciales

### Error: "Timeout"

```json
// Aumentar timeout en .claude/mcp.json
"defaults": {
  "timeout": 60000,  // 60 segundos
  "retries": 3
}
```

## Configuración Avanzada

### Múltiples Proyectos Supabase

```json
{
  "mcpServers": {
    "supabase-production": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "prod_ref", "prod_key"],
      "disabled": false
    },
    "supabase-staging": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "staging_ref", "staging_key"],
      "disabled": false
    }
  }
}
```

### Variables de Entorno (Windows)

Para usar variables de entorno del sistema en Windows:

```powershell
# PowerShell
[System.Environment]::SetEnvironmentVariable('SUPABASE_PROJECT_REF', 'swfnnrpzpkdypbrzmgnr', 'User')
[System.Environment]::SetEnvironmentVariable('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGci...', 'User')

# Reiniciar terminal
```

Luego actualizar `mcp.json`:

```json
"env": {
  "SUPABASE_PROJECT_REF": "${SUPABASE_PROJECT_REF}",
  "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
}
```

## Recursos

- [MCP Protocol Documentation](https://modelcontextprotocol.io/)
- [Supabase MCP Server](https://github.com/supabase/mcp-server-supabase)
- [Claude Code MCP Guide](https://docs.anthropic.com/claude/docs/mcp)
- [Supabase API Reference](https://supabase.com/docs/reference)

## Changelog

### 2025-01-15
- Configuración inicial de MCP para MyDetailArea
- Soporte para Supabase database operations
- Protección de credenciales en .gitignore
- Documentación completa de setup y uso

---

**Mantenido por**: Development Team
**Última actualización**: 2025-01-15
