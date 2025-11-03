# Crear Usuario Supermanager: Paul Keough

**Email**: paulk@dealerdetailservice.com
**Nombre**: Paul Keough
**Rol**: supermanager
**Fecha**: 2025-11-03

---

## Método 1: Via Supabase Dashboard (RECOMENDADO - 2 minutos)

### Paso 1: Crear usuario en Auth (1 minuto)

1. Ve a: **Supabase Dashboard** → https://supabase.com/dashboard
2. Selecciona tu proyecto: **MyDetailArea**
3. Ir a: **Authentication** → **Users** (menú lateral izquierdo)
4. Click: **"Add user"** (botón verde arriba a la derecha)
5. Llenar el formulario:
   ```
   Email: paulk@dealerdetailservice.com
   Password: 21Autospa?
   Auto Confirm Email: ✅ YES (IMPORTANTE - debe estar marcado)
   Send Magic Link: ☐ NO (no es necesario)
   ```
6. Click: **"Create user"**
7. **IMPORTANTE**: Copia el **User ID (UUID)** que aparece después de crear
   (Ejemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

---

### Paso 2: Actualizar perfil a supermanager (1 minuto)

1. En Supabase Dashboard, ir a: **SQL Editor** (menú lateral izquierdo)
2. Click: **"New query"**
3. Pegar este SQL:

```sql
-- Actualizar perfil a supermanager
UPDATE profiles
SET
  role = 'supermanager',
  dealership_id = NULL,  -- Acceso global (sin concesionario específico)
  first_name = 'Paul',
  last_name = 'Keough',
  updated_at = NOW()
WHERE email = 'paulk@dealerdetailservice.com';

-- Verificar creación
SELECT
  id,
  email,
  role,
  dealership_id,
  first_name,
  last_name,
  created_at
FROM profiles
WHERE email = 'paulk@dealerdetailservice.com';
```

4. Click: **"Run"** (o presionar Ctrl+Enter)

---

### Paso 3: Verificar (30 segundos)

Deberías ver algo como:

| id | email | role | dealership_id | first_name | last_name | created_at |
|----|-------|------|---------------|------------|-----------|------------|
| uuid... | paulk@dealerdetailservice.com | **supermanager** | **NULL** | Paul | Keough | 2025-11-03... |

✅ **Si ves `role = 'supermanager'` y `dealership_id = NULL`, está correcto.**

---

## Método 2: Via SQL Editor (ALTERNATIVO - si prefieres todo en SQL)

Si prefieres hacer todo desde SQL Editor:

```sql
-- Nota: Esto requiere usar el Admin API de Supabase
-- Por eso es mejor usar el Dashboard (Método 1)

-- Verificar que constraint permite supermanager
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'profiles_role_check';
-- Debe incluir 'supermanager'

-- Después de crear el usuario via Dashboard Auth,
-- ejecutar el UPDATE del Paso 2 arriba
```

---

## ¿Qué hace este usuario?

### Permisos de Supermanager:
- ✅ Acceso a **TODOS los concesionarios** (dealership_id = NULL)
- ✅ Puede **crear usuarios** de concesionario
- ✅ Puede **gestionar concesionarios**
- ✅ Puede **ver auditorías** de concesionarios
- ❌ **NO puede** gestionar configuración de plataforma (solo system_admin)
- ❌ **NO puede** crear otros system_admin o supermanagers

### Diferencias con system_admin:
| Permiso | system_admin | supermanager |
|---------|--------------|--------------|
| Crear usuarios de concesionario | ✅ | ✅ |
| Gestionar concesionarios | ✅ | ✅ |
| Ver todos los datos | ✅ | ✅ |
| Configurar plataforma | ✅ | ❌ |
| Crear supermanagers | ✅ | ❌ |
| Branding global | ✅ | ❌ |

---

## Después de Crear

### Test rápido (2 minutos):

1. **Abrir app en incognito**: http://localhost:8080
2. **Login**:
   ```
   Email: paulk@dealerdetailservice.com
   Password: [la que configuraste]
   ```
3. **Verificar permisos**:
   - Deberías ver **todos los concesionarios** en el selector
   - Deberías poder acceder a **Admin Dashboard** (/admin)
   - Deberías poder crear usuarios
   - NO deberías ver "Platform Settings" (eso es solo system_admin)

---

## Troubleshooting

### "Login failed" o "Invalid credentials"
- Verifica que el email esté confirmado en Auth → Users
- Si usaste "Auto Confirm Email: NO", confirma el email manualmente

### "Access denied" o "Forbidden"
- Verifica que `role = 'supermanager'` en la tabla profiles
- Verifica que `dealership_id = NULL` (no debe tener un concesionario específico)

### "Role constraint violation"
- Ejecuta: `SELECT * FROM profiles WHERE email = 'paulk@dealerdetailservice.com'`
- Si el role no es 'supermanager', ejecuta el UPDATE del Paso 2 nuevamente

---

## Logs de Auditoría

Para registrar esta creación manual:

```sql
INSERT INTO security_audit_log (
  event_type,
  user_id,
  event_details,
  success,
  created_at
)
SELECT
  'supermanager_user_created_manually',
  id,
  jsonb_build_object(
    'email', 'paulk@dealerdetailservice.com',
    'role', 'supermanager',
    'created_by', 'system_admin',
    'method', 'manual_via_dashboard',
    'reason', 'First supermanager before Phase 2 Edge Functions deployed',
    'full_name', 'Paul Keough'
  ),
  true,
  NOW()
FROM profiles
WHERE email = 'paulk@dealerdetailservice.com';
```

---

## Nota Importante

Este usuario fue creado **ANTES** de completar Phase 2 (Edge Functions).

Cuando se complete Phase 2, futuros supermanagers se crearán via:
```
Edge Function: create-system-user
Por: system_admin únicamente
```

Este es el **primer supermanager** y fue necesario crearlo manualmente porque el sistema de creación automática aún no está deployado.

---

**Creado**: 2025-11-03
**Por**: System Admin
**Método**: Manual via Supabase Dashboard
**Estado**: ⚠️ Pre-Phase 2 (método temporal)
