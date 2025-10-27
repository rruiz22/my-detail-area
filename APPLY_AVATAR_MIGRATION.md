# 🎨 Guía de Aplicación - Migración del Sistema de Avatares

## 📋 Resumen

Esta guía explica cómo aplicar las mejoras al sistema de avatares que unifican el uso de **Boring Avatars** en toda la aplicación.

---

## ✅ Cambios Implementados

### 1. **Componentes Migrados**

Se actualizaron los siguientes componentes para usar `AvatarSystem`:

- ✅ `src/components/productivity/UserAvatar.tsx`
- ✅ `src/components/followers/FollowersAvatarStack.tsx`
- ✅ `src/components/chat/ConversationList.tsx`
- ✅ `src/components/chat/MentionDropdown.tsx`
- ✅ `src/components/chat/MessageBubble.tsx`
- ✅ `src/components/chat/ChatHeader.tsx`
- ✅ `src/components/chat/FloatingChatBubble.tsx`

### 2. **Eliminaciones**

- ❌ Removed: DiceBear API externa (`https://api.dicebear.com/7.x/initials/svg`)
- ❌ Removed: Dependencia de `avatar_url` para mostrar avatares
- ❌ Removed: Uso inconsistente de sistemas de avatares

### 3. **Documentación**

- 📄 `AVATAR_SYSTEM_DOCUMENTATION.md` - Documentación completa del sistema
- 📄 `APPLY_AVATAR_MIGRATION.md` - Esta guía de aplicación

### 4. **Scripts de Migración**

- 🗄️ `supabase/migrations/20251025000001_populate_avatar_seeds.sql` - Migración SQL
- 📜 `scripts/migrate_avatar_seeds.js` - Script Node.js de migración

---

## 🚀 Pasos de Aplicación

### Paso 1: Verificar Dependencias

```bash
# Verificar que boring-avatars está instalado
npm list boring-avatars

# Si no está, instalarlo
npm install boring-avatars@2.0.1
```

### Paso 2: Revisar Cambios en Código

```bash
# Ver archivos modificados
git status

# Revisar los cambios
git diff
```

Los archivos modificados deberían ser:
- 7 componentes de avatar
- 2 archivos de documentación
- 1 migración SQL
- 1 script de migración

### Paso 3: Testing Local (Opcional pero Recomendado)

```bash
# Instalar dependencias
npm install

# Ejecutar la app localmente
npm run dev

# Verificar que los avatares se muestran correctamente en:
# - Página de perfil (/profile)
# - Chat interface
# - Listas de usuarios
# - Componentes de followers
```

### Paso 4: Aplicar Migración de Base de Datos

Tienes **DOS opciones** para poblar `avatar_seed` en usuarios existentes:

#### **Opción A: Migración SQL (Recomendado para Supabase)**

```bash
# Aplicar la migración directamente en Supabase
supabase db push

# O ejecutar el archivo SQL manualmente en el SQL Editor de Supabase
# Ubicación: supabase/migrations/20251025000001_populate_avatar_seeds.sql
```

#### **Opción B: Script Node.js**

```bash
# Dry run primero (no aplica cambios, solo muestra qué haría)
node scripts/migrate_avatar_seeds.js --dry-run

# Si el dry run se ve bien, ejecutar la migración real
node scripts/migrate_avatar_seeds.js

# Con batch size personalizado (útil para bases de datos grandes)
node scripts/migrate_avatar_seeds.js --batch-size=50
```

**Output esperado:**
```
🎨 Avatar Seeds Migration Script
═══════════════════════════════════════
Mode:       LIVE UPDATE
Batch Size: 100
═══════════════════════════════════════

📊 Fetching users without avatar seeds...

Found 150 users without avatar seeds

Sample users to update:
  1. user1@example.com → beam-12
  2. user2@example.com → beam-5
  3. user3@example.com → beam-18
  ... and 147 more

Processing batch 1/2...
  ✓ Updated 100 users
Processing batch 2/2...
  ✓ Updated 50 users

═══════════════════════════════════════
✅ Migration Complete!
═══════════════════════════════════════
Total users updated: 150
Time taken: 2.34s
Average: 64.10 users/second

📊 Distribution Statistics:
Seed         Count      Percentage
───────────────────────────────────────
beam-1       6          4.00%
beam-2       8          5.33%
...
```

### Paso 5: Verificación Post-Migración

```sql
-- Verificar que todos los usuarios tienen avatar_seed
SELECT
  COUNT(*) as total_users,
  COUNT(avatar_seed) as users_with_seed,
  COUNT(*) - COUNT(avatar_seed) as users_without_seed
FROM profiles;

-- Ver distribución de seeds
SELECT
  avatar_seed,
  COUNT(*) as count
FROM profiles
WHERE avatar_seed IS NOT NULL
GROUP BY avatar_seed
ORDER BY avatar_seed;
```

**Resultado esperado:**
- `users_without_seed` debería ser 0
- Distribución relativamente balanceada (cada seed con ~4% de usuarios)

### Paso 6: Limpiar Caches

```bash
# Limpiar cache de localStorage en el cliente
# Ejecutar en la consola del navegador (F12):
localStorage.removeItem('user_profile_cache');
location.reload();
```

### Paso 7: Testing en Producción

Después de aplicar los cambios:

1. **Verificar Página de Perfil**
   - Ir a `/profile`
   - Verificar que el avatar se muestra correctamente
   - Click en "Change Avatar"
   - Seleccionar un nuevo avatar
   - Guardar y verificar que persiste

2. **Verificar Chat**
   - Abrir cualquier conversación
   - Verificar avatares en:
     - Lista de conversaciones
     - Header del chat
     - Mensajes en la conversación
     - Menciones (@usuario)

3. **Verificar Componentes de Followers**
   - Ir a cualquier orden con followers
   - Verificar avatar stack
   - Verificar tooltips

4. **Verificar User Management**
   - Ir a página de gestión de usuarios
   - Verificar avatares en tabla
   - Verificar tooltips de usuario

---

## 🐛 Troubleshooting

### Problema: Avatares no se muestran (cuadrados blancos)

**Causa:** `boring-avatars` no instalado o error de import

**Solución:**
```bash
npm install boring-avatars@2.0.1
npm run build
```

### Problema: Algunos usuarios aún muestran iniciales en lugar de avatares

**Causa:** Migración de `avatar_seed` no completada

**Solución:**
```sql
-- Verificar cuántos usuarios faltan
SELECT COUNT(*) FROM profiles WHERE avatar_seed IS NULL;

-- Re-ejecutar migración
-- Usar el script o SQL de nuevo
```

### Problema: Avatar no cambia al seleccionar uno nuevo

**Causa:** Cache no se está actualizando

**Solución:**
```typescript
// Agregar invalidación de query en el componente
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries(['user_profile']);
```

### Problema: Performance lento al cargar listas de usuarios

**Causa:** Demasiados avatares renderizándose simultáneamente

**Solución:**
```bash
# Implementar virtualización
npm install react-window

# O usar lazy loading / pagination
```

---

## 📊 Métricas de Éxito

Después de aplicar la migración, verificar:

- ✅ **0 llamadas** a `api.dicebear.com` (verificar en Network tab)
- ✅ **100% usuarios** con `avatar_seed` poblado
- ✅ **Distribución balanceada** de seeds (~4% cada uno)
- ✅ **Avatares consistentes** en toda la app
- ✅ **Cache funcionando** (verificar localStorage)

---

## 🔄 Rollback (Si algo sale mal)

Si necesitas revertir los cambios:

```bash
# Rollback git
git revert HEAD

# Rollback de migración SQL (si es necesario)
UPDATE profiles SET avatar_seed = NULL, avatar_variant = NULL;
```

**Nota:** El sistema tiene fallbacks, así que incluso sin `avatar_seed` los avatares se generarán basados en el nombre/email.

---

## 📝 Notas Adicionales

### Nuevos Usuarios

Los nuevos usuarios creados después de esta migración deberían tener `avatar_seed` asignado automáticamente:

```typescript
// En el signup flow o user creation
const newUser = {
  // ... otros campos
  avatar_seed: 'beam-1',  // Default inicial
  avatar_variant: 'beam'
};
```

### Personalización de Dealerships

Si en el futuro quieres avatares personalizados por dealership:

1. Agregar campo `custom_avatar_colors` a tabla `dealerships`
2. Modificar `AvatarSystem` para aceptar colores custom
3. Pasar colores desde el contexto del dealership

---

## ✅ Checklist Final

- [ ] Dependencias instaladas (`boring-avatars`)
- [ ] Código revisado y sin errores de linting
- [ ] Migración SQL ejecutada
- [ ] Verificación de base de datos completa
- [ ] Testing local realizado
- [ ] Caches limpiados
- [ ] Testing en producción realizado
- [ ] Documentación revisada
- [ ] Equipo notificado de los cambios

---

## 📞 Soporte

Si tienes problemas durante la aplicación:

1. Consultar `AVATAR_SYSTEM_DOCUMENTATION.md` sección Troubleshooting
2. Verificar logs en la consola del navegador
3. Verificar logs del servidor/database
4. Crear issue en el repositorio con:
   - Descripción del problema
   - Screenshots
   - Logs relevantes
   - Pasos para reproducir

---

**Última actualización:** Octubre 25, 2025
**Versión:** 2.0
**Tiempo estimado de aplicación:** 15-30 minutos
