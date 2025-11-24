# Supabase CLI - Configuración Solo Remota

## 🎯 Regla de Oro

**Este proyecto usa EXCLUSIVAMENTE conexión remota a Supabase.**
**NO se usa Docker local (`supabase start`)**

---

## ✅ Configuración Actual

### Proyecto Vinculado
```toml
# supabase/config.toml
project_id = "swfnnrpzpkdypbrzmgnr"
```

### Estado
- ✅ CLI autenticado: `supabase login` completado
- ✅ Proyecto vinculado: `swfnnrpzpkdypbrzmgnr` (MyDetailArea)
- ✅ Conexión remota funcionando
- ❌ Docker local: NO usado (intencional)
- ❌ `.supabase/`: NO existe (ignorado en .gitignore)

---

## 📋 Comandos Esenciales

### Ver Migraciones
```bash
# Ver todas las migraciones (locales y remotas)
supabase migration list --linked
```

**Output esperado**:
```
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20250124141700 |                | 2025-01-24 14:17:00  # Solo local
                  | 20250124185818 | 2025-01-24 18:58:18  # Solo remoto
   20250124215234 | 20250124215234 | 2025-01-24 21:52:34  # Sincronizado
```

### Aplicar Migraciones
```bash
# Aplicar todas las migraciones locales pendientes al remoto
supabase db push
```

### Crear Nueva Migración
```bash
# Crear archivo de migración con timestamp automático
supabase migration new descripcion_del_cambio

# Ejemplo
supabase migration new add_notifications_table
# Crea: supabase/migrations/20251124171040_add_notifications_table.sql
```

### Ejecutar SQL Directamente
```bash
# Ejecutar archivo SQL en la base de datos remota
supabase db execute --linked -f archivo.sql

# Ejemplo
supabase db execute --linked -f supabase/migrations/20251124000000_fix_rls.sql
```

### Ver Diferencias de Esquema
```bash
# Comparar esquema local con remoto
supabase db diff --linked

# Guardar diferencias en una nueva migración
supabase db diff --linked -f nueva_migracion
```

---

## ⚠️ Comandos a EVITAR

### ❌ NO Usar (Intentan Docker Local)
```bash
supabase start        # Intenta iniciar contenedores Docker
supabase stop         # Para contenedores locales
supabase status       # Verifica contenedores locales
supabase db reset     # Sin --linked resetea local
```

### ✅ Alternativas Correctas
```bash
# En lugar de "supabase status"
supabase migration list --linked

# En lugar de "supabase db reset"
supabase db reset --linked  # Si realmente necesitas resetear remoto (¡CUIDADO!)
```

---

## 🔄 Workflow de Desarrollo

### 1. Crear Nueva Funcionalidad con Cambio de DB
```bash
# 1. Crear archivo de migración
supabase migration new add_feature_x

# 2. Editar el archivo generado
# supabase/migrations/YYYYMMDDHHMMSS_add_feature_x.sql

# 3. Aplicar al remoto
supabase db push

# 4. Verificar que se aplicó
supabase migration list --linked
```

### 2. Trabajar con SQL Existente
```bash
# Si tienes un archivo SQL ya creado (ej: FIX_PERMISSIONS.sql)

# Opción A: Renombrar a formato timestamp
mv FIX_PERMISSIONS.sql supabase/migrations/20251124171040_fix_permissions.sql
supabase db push

# Opción B: Ejecutar directamente (no queda en historial de migraciones)
supabase db execute --linked -f FIX_PERMISSIONS.sql
```

### 3. Sincronizar con Equipo
```bash
# Pull del repo
git pull

# Ver nuevas migraciones
supabase migration list --linked

# Si hay migraciones locales que no están en remoto
supabase db push
```

---

## 🗂️ Estructura de Migraciones

### Formato Obligatorio
```
YYYYMMDDHHMMSS_descripcion.sql
```

### Ejemplos Válidos
```
✅ 20251124171040_add_users_table.sql
✅ 20251125000000_fix_rls_policies.sql
✅ 20251125120000_create_notifications_system.sql
```

### Ejemplos Inválidos (Ignorados por CLI)
```
❌ fix_permissions.sql              # Falta timestamp
❌ URGENT_fix_rls.sql               # Prefijo no estándar
❌ 20251124_add_table.sql           # Timestamp incompleto (falta hora)
❌ README.md                         # No es SQL
❌ APPLY_MIGRATION.sql              # Prefijo APPLY_ ignorado
```

### Contenido de Migración
```sql
-- supabase/migrations/20251124171040_add_notifications_table.sql

-- Descripción del cambio
-- Agrega tabla de notificaciones con RLS

-- Crear tabla
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id INTEGER REFERENCES public.dealerships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política: usuarios ven sus propias notificaciones
CREATE POLICY "Users see own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND user_has_dealer_membership(auth.uid(), dealer_id)
  );

-- Índices para performance
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_dealer ON public.notifications(dealer_id);
```

---

## 🔍 Troubleshooting

### Error: "No project linked"
```bash
# Solución: Re-vincular proyecto
supabase link --project-ref swfnnrpzpkdypbrzmgnr
```

### Error: "Authentication required"
```bash
# Solución: Re-autenticar
supabase login
```

### Error: Docker no disponible
```bash
# Esto es NORMAL - no usamos Docker
# Usar comandos con --linked
supabase migration list --linked  # ✅
```

### Migraciones Desincronizadas
```bash
# Ver estado actual
supabase migration list --linked

# Si hay muchas migraciones solo locales que ya están aplicadas en remoto:
# OPCIÓN 1: Ignorarlas (recomendado)
# Solo trabaja con nuevas migraciones usando supabase migration new

# OPCIÓN 2: Limpiar locales (avanzado)
# Hacer backup primero
git add supabase/migrations/
git commit -m "backup migrations"

# Eliminar archivos locales desincronizados
# (solo si estás seguro que ya están en remoto)
rm supabase/migrations/20241016*.sql
```

---

## 📚 Recursos

- **CLI Docs**: https://supabase.com/docs/guides/cli
- **Migrations Guide**: https://supabase.com/docs/guides/cli/local-development
- **Config Reference**: https://supabase.com/docs/guides/cli/config

---

## 🎓 Ejemplos Prácticos

### Agregar Columna a Tabla Existente
```bash
# Crear migración
supabase migration new add_phone_to_profiles

# Editar archivo generado
# ALTER TABLE public.profiles ADD COLUMN phone TEXT;

# Aplicar
supabase db push
```

### Modificar RLS Policy
```bash
# Crear migración
supabase migration new update_orders_rls

# Editar archivo
# DROP POLICY "existing_policy" ON public.orders;
# CREATE POLICY "new_policy" ON public.orders...

# Aplicar
supabase db push
```

### Agregar Función Postgres
```bash
# Crear migración
supabase migration new add_search_function

# Editar archivo
# CREATE OR REPLACE FUNCTION search_vehicles(query TEXT)
# RETURNS TABLE(...) AS $$
# BEGIN
#   ...
# END;
# $$ LANGUAGE plpgsql;

# Aplicar
supabase db push
```

---

## ✅ Checklist de Setup (Una Sola Vez)

Para un nuevo desarrollador:

```bash
# 1. Clonar repo
git clone https://github.com/rruiz22/my-detail-area.git
cd my-detail-area

# 2. Instalar Supabase CLI
npm install -g supabase

# 3. Login
supabase login

# 4. Vincular proyecto
supabase link --project-ref swfnnrpzpkdypbrzmgnr

# 5. Verificar
supabase migration list --linked

# ✅ Listo para trabajar
```

---

**Última actualización**: 2025-11-24
**Proyecto**: MyDetailArea
**Supabase Project**: swfnnrpzpkdypbrzmgnr
