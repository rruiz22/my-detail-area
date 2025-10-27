# Checklist de Diagnóstico - Sistema de Anuncios

## 🔍 Problema Reportado
- ❌ No se ve el link "Announcements" en el sidebar
- ❌ No se ve ningún banner en el sistema

## 📋 Pasos de Diagnóstico

### 1. ¿Se aplicó la migración?

**Ejecuta en Supabase SQL Editor:**
```sql
-- Verificar si la tabla existe
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'announcements'
);

-- Si devuelve 'true', la tabla existe
-- Si devuelve 'false', necesitas aplicar la migración
```

**Si devuelve FALSE:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia TODO el contenido de `supabase/migrations/20251026000000_create_announcements_system.sql`
3. Pégalo y ejecuta
4. Deberías ver mensajes de éxito

---

### 2. ¿Eres system_admin?

**Ejecuta en Supabase SQL Editor:**
```sql
-- Verificar tu rol actual
SELECT
  id,
  email,
  role,
  user_type
FROM profiles
WHERE id = auth.uid();
```

**Si tu rol NO es 'system_admin':**
```sql
-- Actualizar tu usuario a system_admin
UPDATE profiles
SET role = 'system_admin'
WHERE email = 'TU_EMAIL_AQUI@example.com';
```

---

### 3. ¿Hay anuncios activos?

**Ejecuta en Supabase SQL Editor:**
```sql
-- Ver todos los anuncios
SELECT * FROM announcements;

-- Si está vacío, no hay anuncios
```

**Crear un anuncio de prueba:**
```sql
-- Insertar anuncio de prueba
INSERT INTO announcements (
  title,
  content,
  type,
  priority,
  is_active,
  start_date
) VALUES (
  '🎉 Bienvenido al Sistema',
  '<p>Este es un <b>anuncio de prueba</b>. Si lo ves, ¡el sistema funciona!</p>',
  'info',
  10,
  true,
  NOW()
);

-- Verificar que se creó
SELECT id, title, type, is_active FROM announcements;
```

---

### 4. ¿Hay errores en la consola del navegador?

1. Abre DevTools (F12)
2. Ve a la pestaña "Console"
3. Busca errores en rojo
4. Busca mensajes relacionados con "announcements"

**Errores comunes:**
- `relation "announcements" does not exist` → Migración no aplicada
- `Failed to fetch` → Problema de conexión con Supabase
- `RLS policy` → Problema de permisos

---

### 5. Verificación del Sidebar

**El link solo aparece si:**
- Eres `system_admin` en la tabla `profiles`
- La aplicación está corriendo sin errores

**Verificar en DevTools → Console:**
```javascript
// Pega esto en la consola del navegador
console.log('User role:', localStorage.getItem('user_role'));
```

---

### 6. Verificación del Banner

**El banner solo aparece si:**
- La migración está aplicada
- Hay al menos un anuncio activo
- Las fechas son válidas (start_date <= hoy, end_date >= hoy o NULL)
- El anuncio no tiene filtros de roles/dealers O coinciden con tu usuario

**Verificar en DevTools → Network:**
1. Recarga la página (F5)
2. Ve a la pestaña "Network"
3. Busca una petición a "get_active_announcements"
4. Revisa la respuesta

---

## 🚀 Solución Rápida (Todo en uno)

**Ejecuta este script en Supabase SQL Editor:**

```sql
-- PASO 1: Verificar/Aplicar migración
-- (Si falla, la tabla ya existe o debes aplicar la migración completa)
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'warning', 'alert', 'success')),
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  target_roles text[],
  target_dealer_ids integer[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PASO 2: Hacer tu usuario system_admin
UPDATE profiles
SET role = 'system_admin'
WHERE email = 'TU_EMAIL@example.com';  -- CAMBIA ESTO

-- PASO 3: Crear anuncio de prueba
INSERT INTO announcements (
  title,
  content,
  type,
  priority,
  is_active
) VALUES (
  '🎉 Sistema de Anuncios Activo',
  '<p><b>¡Funciona!</b> Este es un anuncio de prueba.</p><p>Puedes crear más desde <a href="/announcements">/announcements</a></p>',
  'success',
  100,
  true
) ON CONFLICT DO NOTHING;

-- PASO 4: Verificar
SELECT
  'Tabla existe' as check_1,
  EXISTS (SELECT FROM announcements) as tiene_anuncios,
  (SELECT role FROM profiles WHERE id = auth.uid()) as mi_rol;
```

---

## 🔄 Después de ejecutar el script:

1. **Recarga la página** (Ctrl+R o Cmd+R)
2. **Espera 5 segundos** (el caché de React Query)
3. Deberías ver:
   - ✅ Link "Announcements" en el sidebar (sección System Admin)
   - ✅ Banner azul en la parte superior con el anuncio de prueba

---

## ❓ ¿Aún no funciona?

Envíame capturas de:
1. La consola del navegador (F12 → Console)
2. El resultado de esta query:
```sql
SELECT
  (SELECT COUNT(*) FROM announcements) as total_anuncios,
  (SELECT role FROM profiles WHERE id = auth.uid()) as mi_rol,
  auth.uid() as mi_user_id;
```
