# 🚀 Instrucciones de Deployment Manual - Fase 2

**Fecha**: 2025-11-03
**Razón**: CLI requiere autenticación interactiva no disponible

---

## ⚠️ Situación

El CLI de Supabase requiere un token de acceso para desplegar Edge Functions. Hay dos formas de proceder:

---

## 🎯 OPCIÓN A: Deployment via Supabase Dashboard (RECOMENDADO)

### Paso 1: Acceder al Dashboard

1. Abrir: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Login si es necesario
3. Seleccionar proyecto "MyDetailArea"

### Paso 2: Desplegar create-dealer-user

1. **Navegar**: Edge Functions (menú lateral izquierdo)
2. **Buscar**: "create-dealer-user" en la lista
3. **Click**: En el nombre de la función
4. **Click**: "Deploy new version" (botón superior derecho)
5. **Opciones**:
   - **Opción A**: Usar GitHub (si está conectado)
   - **Opción B**: Copiar/pegar el código manualmente

#### Para Copiar/Pegar Manual:

```typescript
// Copiar todo el contenido de:
// C:\Users\rudyr\apps\mydetailarea\supabase\functions\create-dealer-user\index.ts

// Pegar en el editor del Dashboard
// Click "Deploy"
```

### Paso 3: Verificar Deployment

1. Esperar mensaje: "✅ Function deployed successfully"
2. Ver logs: Click en "Logs" para verificar que no hay errores
3. Verificar versión: Debería mostrar la fecha/hora actual

---

## 🎯 OPCIÓN B: Configurar Token de Acceso (CLI)

### Paso 1: Obtener Access Token

1. Ir a: https://supabase.com/dashboard/account/tokens
2. Click: "Generate new token"
3. Nombre: "CLI Deployment - MyDetailArea"
4. Copiar el token (empieza con `sbp_...`)

### Paso 2: Configurar Variable de Entorno

**PowerShell**:
```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_tu_token_aqui"
```

**O crear archivo `.env.local`**:
```bash
SUPABASE_ACCESS_TOKEN=sbp_tu_token_aqui
```

### Paso 3: Desplegar via CLI

```bash
npx supabase functions deploy create-dealer-user
npx supabase functions deploy create-system-user
```

---

## 🧪 Testing Después de Deployment

### Test 1: Via Navegador

1. Login como system_admin (rruiz@lima.llc)
2. Ir a: Admin → Users → Create User
3. Crear usuario de prueba
4. **Verificar**: Usuario creado con `role = 'user'`

### Test 2: Via SQL Editor

```sql
-- En Supabase Dashboard → SQL Editor
SELECT id, email, role, dealership_id, created_at
FROM profiles
WHERE email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Esperado:
-- role = 'user'
-- dealership_id = [tu dealer]
```

### Test 3: Ver Logs

1. Dashboard → Edge Functions → create-dealer-user
2. Click "Logs"
3. Buscar: "✅ Auth user created successfully"
4. Verificar: No hay errores 403 o 500

---

## 📋 Checklist Post-Deployment

- [ ] Edge Function `create-dealer-user` desplegada
- [ ] Edge Function `create-system-user` verificada
- [ ] Usuario de prueba creado exitosamente
- [ ] Usuario de prueba tiene `role = 'user'`
- [ ] Logs muestran ejecución sin errores
- [ ] Security audit log registra evento correctamente

---

## ⏭️ SIGUIENTE PASO: Aplicar Migration 04

**Solo después de verificar que las Edge Functions funcionan**:

1. Ir a: Supabase Dashboard → SQL Editor
2. Click: "New query"
3. Copiar contenido de: `supabase/migrations/20251103000004_update_accept_dealer_invitation.sql`
4. Pegar y ejecutar
5. Verificar mensaje: "✅ FUNCTION UPDATE COMPLETED"

---

## 🆘 Si Algo Sale Mal

### Problema: Function no despliega

**Solución**: Verificar que el código no tiene errores de sintaxis

```bash
# En tu proyecto local
cd supabase/functions/create-dealer-user
deno check index.ts
```

### Problema: 403 Forbidden al crear usuario

**Causa**: La función se desplegó correctamente pero el usuario actual no tiene rol correcto

**Solución Temporal**:
```sql
-- Verificar rol del usuario actual
SELECT id, email, role FROM profiles WHERE email = 'tu@email.com';

-- Si no es system_admin, actualizar temporalmente
UPDATE profiles SET role = 'system_admin' WHERE email = 'tu@email.com';
```

### Problema: Usuario creado con rol incorrecto

**Causa**: La versión antigua de la función aún está activa

**Solución**:
1. Esperar 1-2 minutos (caché de Edge Functions)
2. Verificar que la nueva versión esté activa en Dashboard
3. Intentar crear usuario nuevamente

---

## 📞 Recursos

- **Supabase Dashboard**: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
- **Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **Access Tokens**: https://supabase.com/dashboard/account/tokens

---

**Última Actualización**: 2025-11-03
**Siguiente Acción**: Deployment manual via Dashboard
