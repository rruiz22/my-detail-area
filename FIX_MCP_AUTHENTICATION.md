# 🔧 Fix: MCP Autenticación - Token Incorrecto

**Fecha**: 2025-11-24 22:00
**Problema Identificado**: Usando Service Role Key en lugar de Personal Access Token

---

## ❌ El Problema

El servidor MCP de Supabase (`@supabase/mcp-server-supabase`) requiere un **Personal Access Token** de la Supabase Management API, NO el service role key del proyecto.

### Diferencia de Tokens

| Token Type | Uso | Ubicación |
|------------|-----|-----------|
| **Service Role Key** (JWT) | PostgREST API, Supabase Client | Dashboard → Settings → API |
| **Personal Access Token** | Management API, MCP Server | Dashboard → Account → Access Tokens |

**Actualmente tienes configurado**: Service Role Key ❌
**Necesitas**: Personal Access Token ✅

---

## ✅ Solución: Obtener Personal Access Token

### Paso 1: Ir a Supabase Account Settings

```
https://supabase.com/dashboard/account/tokens
```

### Paso 2: Crear Nuevo Token

1. Click en **"Generate new token"**
2. Nombre: `Claude MCP Token`
3. Scope: Seleccionar:
   - ✅ `all` (acceso completo)
   - O específicos: `projects.read`, `projects.write`, `database.read`, `database.write`
4. Expiration: 90 días (o según preferencia)
5. Click **"Generate token"**

### Paso 3: Copiar el Token

⚠️ **IMPORTANTE**: El token solo se muestra una vez. Cópialo inmediatamente.

```
Ejemplo: sbp_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

---

## 🔧 Actualizar Configuración

### Opción A: Actualizar `.claude/mcp.json` (Recomendado)

```json
{
  "$schema": "https://modelcontextprotocol.io/schemas/mcp.json",
  "mcpServers": {
    "supabase": {
      "command": "C:\\nvm4w\\nodejs\\npx.cmd",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=swfnnrpzpkdypbrzmgnr",
        "--access-token=TU_PERSONAL_ACCESS_TOKEN_AQUI"
      ],
      "disabled": false,
      "description": "Supabase MCP Server for MyDetailArea",
      "env": {
        "SUPABASE_URL": "https://swfnnrpzpkdypbrzmgnr.supabase.co",
        "SUPABASE_ACCESS_TOKEN": "TU_PERSONAL_ACCESS_TOKEN_AQUI"
      }
    }
  }
}
```

**Reemplazar**:
- `TU_PERSONAL_ACCESS_TOKEN_AQUI` con el token que generaste

### Opción B: Variable de Entorno (Alternativa)

```bash
# En .env
SUPABASE_ACCESS_TOKEN=sbp_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

Luego en `.claude/mcp.json`:
```json
{
  "args": [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--project-ref=swfnnrpzpkdypbrzmgnr"
  ],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
  }
}
```

---

## 🔄 Reiniciar Claude CLI

Una vez actualizado el token:

```bash
# Salir de sesión actual
Ctrl+C

# Reiniciar con configuración actualizada
cd C:\Users\rudyr\apps\mydetailarea
claude --mcp-config .claude/mcp.json
```

---

## 🧪 Verificar Que Funciona

Después de reiniciar, probar:

```
"Lista las tablas de la base de datos"
```

**Resultado esperado**: Claude usa `mcp__supabase__list_tables` y muestra la lista de tablas.

---

## 🛡️ Seguridad del Token

### ⚠️ Importante

El **Personal Access Token**:
- ✅ Da acceso completo a tu cuenta de Supabase
- ❌ NO debe ser committeado a git
- ❌ NO debe ser compartido
- ✅ Debe ser rotado cada 90 días

### Protección

Verificar que `.claude/mcp.json` está en `.gitignore`:

```bash
# .gitignore
.claude/mcp.json
.env
```

---

## 🔀 Alternativa: Usar Remote MCP Server (Oficial)

Si no quieres gestionar tokens manualmente, Supabase ofrece un **Remote MCP Server**:

### Configuración Remote MCP

```json
{
  "mcpServers": {
    "supabase-remote": {
      "url": "https://mcp.supabase.com/mcp",
      "transport": "sse"
    }
  }
}
```

**Ventajas**:
- ✅ OAuth automático (no necesitas tokens)
- ✅ Siempre actualizado
- ✅ Más seguro

**Desventajas**:
- ⚠️ Requiere conexión a internet constante
- ⚠️ Puede no funcionar en todos los clientes MCP

---

## 📊 Comparación de Soluciones

| Método | Ventajas | Desventajas |
|--------|----------|-------------|
| **NPM Package + Personal Token** | ✅ Funciona offline<br>✅ Control total | ❌ Requiere token manual<br>❌ Rotar cada 90 días |
| **Remote MCP Server** | ✅ OAuth automático<br>✅ Sin gestión de tokens | ❌ Requiere internet<br>❌ Menos control |
| **Scripts Node.js** | ✅ Funciona ahora<br>✅ No requiere MCP | ❌ Menos conveniente<br>❌ Más código |

---

## 🎯 Próximos Pasos

### Inmediatos

1. ✅ Ir a https://supabase.com/dashboard/account/tokens
2. ✅ Generar Personal Access Token
3. ✅ Actualizar `.claude/mcp.json` con el nuevo token
4. ✅ Reiniciar Claude CLI con `--mcp-config`
5. ✅ Probar `"Lista las tablas"`

### Largo Plazo

- 📅 Crear recordatorio para rotar token en 90 días
- 🔐 Considerar migrar a Remote MCP Server (cuando sea estable)
- 📝 Documentar el token usado (sin exponerlo)

---

## ❓ Troubleshooting

### Error: "Unauthorized" persiste

1. Verificar que el token es **Personal Access Token**, no Service Role Key
2. Verificar que el token tiene scope `all` o permisos necesarios
3. Verificar que el token no ha expirado
4. Intentar generar un nuevo token

### Token no funciona

- Asegurarse de copiar el token completo (empieza con `sbp_`)
- No debe tener espacios en blanco al inicio/final
- Verificar que está en la configuración correcta (args o env)

---

**Estado actual**: ❌ Autenticación falla (usando service role key)
**Próximo paso**: Generar Personal Access Token y actualizar configuración

---

**Última actualización**: 2025-11-24 22:00
