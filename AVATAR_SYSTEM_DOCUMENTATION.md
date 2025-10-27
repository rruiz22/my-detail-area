# 🎨 Sistema de Avatares - Documentación Completa

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Guía de Uso](#guía-de-uso)
4. [Componentes](#componentes)
5. [Base de Datos](#base-de-datos)
6. [Personalización](#personalización)
7. [Migraciones](#migraciones)
8. [Mejores Prácticas](#mejores-prácticas)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Visión General

El sistema de avatares usa **Boring Avatars** para generar avatares SVG dinámicos y consistentes, eliminando la necesidad de subir y almacenar imágenes.

### Ventajas

- ✅ **Cero uploads**: No requiere almacenamiento de imágenes
- ⚡ **Performance**: SVG ligeros generados al vuelo
- 🎨 **Personalizable**: 25 variaciones únicas del estilo "beam"
- 💾 **Offline-first**: No depende de APIs externas
- 🔄 **Consistente**: Mismo avatar en toda la aplicación
- 📦 **Cache agresivo**: Múltiples capas de cache

### Tecnología

```json
{
  "boring-avatars": "2.0.1",
  "@radix-ui/react-avatar": "^1.1.10"
}
```

---

## 🏗️ Arquitectura

### Flujo de Datos

```
Usuario selecciona avatar (beam-1 a beam-25)
          ↓
useAvatarPreferences.saveSeed()
          ↓
1. Update UI inmediato
2. Update cache (userProfileCache)
3. Save DB (profiles.avatar_seed)
4. Backup localStorage
          ↓
Avatar se regenera en todos los componentes
```

### Capas de Cache

```
┌─────────────────────────────────────┐
│   React State (inmediato)           │
├─────────────────────────────────────┤
│   TanStack Query (30 min stale)     │
├─────────────────────────────────────┤
│   UserProfileCache (24h TTL)        │
├─────────────────────────────────────┤
│   localStorage (persistente)        │
├─────────────────────────────────────┤
│   Database (fuente de verdad)       │
└─────────────────────────────────────┘
```

---

## 📘 Guía de Uso

### Uso Básico

```tsx
import { AvatarSystem } from '@/components/ui/avatar-system';

function MyComponent() {
  return (
    <AvatarSystem
      name="John Doe"
      email="john@example.com"
      size={40}
    />
  );
}
```

### Con Personalización

```tsx
import { AvatarSystem } from '@/components/ui/avatar-system';

function UserProfile({ user }) {
  return (
    <AvatarSystem
      name={user.email}
      firstName={user.first_name}
      lastName={user.last_name}
      email={user.email}
      seed={user.avatar_seed}  // 'beam-1' a 'beam-25'
      size={96}
      className="border-2 border-primary"
    />
  );
}
```

### Modal de Selección

```tsx
import { AvatarSelectionModal } from '@/components/ui/avatar-selection-modal';
import { useAvatarPreferences } from '@/components/ui/avatar-system';

function ProfilePage() {
  const { seed, setSeed } = useAvatarPreferences();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Cambiar Avatar
      </button>

      <AvatarSelectionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        userName={user.email}
        firstName={user.first_name}
        lastName={user.last_name}
        email={user.email}
        currentSeed={seed}
        onSeedChange={setSeed}
      />
    </>
  );
}
```

---

## 🧩 Componentes

### 1. `AvatarSystem`

**Propósito:** Componente principal para renderizar avatares

**Props:**
```typescript
interface AvatarSystemProps {
  name: string;              // Requerido: nombre base para generación
  size?: number;             // Default: 40px
  className?: string;        // Clases CSS adicionales
  seed?: AvatarSeed;        // 'beam-1' a 'beam-25'
  firstName?: string;        // Opcional: nombre del usuario
  lastName?: string;         // Opcional: apellido del usuario
  email?: string;           // Opcional: email del usuario
}
```

**Ejemplo:**
```tsx
<AvatarSystem
  name="user@example.com"
  firstName="John"
  lastName="Doe"
  seed="beam-5"
  size={48}
/>
```

---

### 2. `AvatarSelectionModal`

**Propósito:** Modal para seleccionar entre 25 variaciones

**Props:**
```typescript
interface AvatarSelectionModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  currentSeed: AvatarSeed;
  onSeedChange: (seed: AvatarSeed) => void;
  firstName?: string;
  lastName?: string;
  email?: string;
}
```

**Características:**
- Grid 5x5 con preview de cada variación
- Preview en tiempo real del avatar seleccionado
- Indicadores visuales de selección actual y guardada
- Cancelación que restaura la selección original

---

### 3. `useAvatarPreferences`

**Propósito:** Hook para gestionar preferencias de avatar

**Retorno:**
```typescript
{
  seed: AvatarSeed;           // Seed actual del usuario
  setSeed: (seed) => void;    // Guardar nuevo seed
  loading: boolean;           // Estado de carga
}
```

**Ejemplo:**
```tsx
function MyComponent() {
  const { seed, setSeed, loading } = useAvatarPreferences();

  const handleChange = (newSeed) => {
    setSeed(newSeed);  // Automáticamente guarda en DB + cache
  };

  return <div>Current seed: {seed}</div>;
}
```

---

### 4. `AvatarSeedSelector`

**Propósito:** Selector inline de avatares (sin modal)

**Props:**
```typescript
interface AvatarSeedSelectorProps {
  userName: string;
  currentSeed?: AvatarSeed;
  onSeedChange: (seed: AvatarSeed) => void;
  className?: string;
}
```

**Ejemplo:**
```tsx
<AvatarSeedSelector
  userName={user.email}
  currentSeed={seed}
  onSeedChange={handleSeedChange}
/>
```

---

### 5. `UserAvatar`

**Propósito:** Avatar para productividad con tooltip

**Props:**
```typescript
interface UserAvatarProps {
  userId: string | null;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}
```

**Tamaños:**
- `sm`: 24px
- `md`: 32px
- `lg`: 40px

---

## 💾 Base de Datos

### Schema

```sql
-- Tabla profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_seed TEXT,           -- 'beam-1' a 'beam-25'
  avatar_variant TEXT,        -- Siempre 'beam'
  avatar_url TEXT,            -- LEGACY: No usado
  -- ... otros campos
);

-- Índices recomendados
CREATE INDEX idx_profiles_avatar_seed ON profiles(avatar_seed);
```

### Valores Válidos

**avatar_seed:**
```
'beam-1', 'beam-2', 'beam-3', ... 'beam-25'
```

**avatar_variant:**
```
'beam'
```

### Migración de Datos

Si tienes usuarios sin `avatar_seed`, ejecuta:

```sql
-- Asignar seeds aleatorios a usuarios sin avatar
UPDATE profiles
SET
  avatar_seed = 'beam-' || (floor(random() * 25 + 1)::int)::text,
  avatar_variant = 'beam',
  updated_at = NOW()
WHERE avatar_seed IS NULL OR avatar_seed = '';
```

O usa el script de migración incluido (ver sección Migraciones).

---

## 🎨 Personalización

### Colores del Sistema

Los avatares usan esta paleta por defecto:

```typescript
const colors = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b'  // Amber
];
```

### Personalizar Colores

Si necesitas colores custom por usuario o dealership:

```tsx
<AvatarSystem
  name={user.name}
  size={40}
  // Pasar colores custom directamente a Boring Avatars
  customColors={['#ff0000', '#00ff00', '#0000ff']}
/>
```

**Nota:** Esto requiere modificar el componente `AvatarSystem` para aceptar la prop `customColors`.

---

## 📦 Cache

### UserProfileCache Service

**Ubicación:** `src/services/userProfileCache.ts`

**Características:**
- TTL: 24 horas
- Sync interval: 5 minutos
- Versión: 2 (auto-invalida caches antiguos)
- Almacenamiento: localStorage

**Métodos:**
```typescript
// Obtener perfil en cache
const profile = userProfileCache.getCachedProfile(userId);

// Guardar en cache
userProfileCache.cacheProfile({
  userId,
  first_name,
  last_name,
  avatar_seed,
  // ...
});

// Actualizar campo específico
userProfileCache.updateCacheField(userId, 'avatar_seed', 'beam-10');

// Limpiar cache
userProfileCache.clearCache();

// Estadísticas
const stats = userProfileCache.getCacheStats(userId);
```

---

## 🔄 Migraciones

### Script de Migración SQL

**Archivo:** `supabase/migrations/YYYYMMDD_populate_avatar_seeds.sql`

```sql
-- Población de avatar_seed para usuarios existentes
-- Asigna seeds aleatorios de forma determinista basado en el user ID

UPDATE profiles
SET
  avatar_seed = 'beam-' || (
    (
      ('x' || substring(id::text, 1, 8))::bit(32)::bigint % 25
    ) + 1
  )::text,
  avatar_variant = 'beam',
  updated_at = NOW()
WHERE (avatar_seed IS NULL OR avatar_seed = '')
  AND id IS NOT NULL;

-- Verificar resultado
SELECT
  avatar_seed,
  count(*) as count
FROM profiles
WHERE avatar_seed IS NOT NULL
GROUP BY avatar_seed
ORDER BY avatar_seed;
```

### Script de Migración Node.js

Ver archivo: `scripts/migrate_avatar_seeds.js` (incluido al final de este documento)

---

## ✅ Mejores Prácticas

### 1. Siempre pasar datos completos

```tsx
// ✅ BIEN: Datos completos para mejor generación
<AvatarSystem
  name={user.email}
  firstName={user.first_name}
  lastName={user.last_name}
  email={user.email}
  seed={user.avatar_seed}
  size={40}
/>

// ❌ MAL: Solo nombre mínimo
<AvatarSystem name="User" size={40} />
```

### 2. Usar tamaños consistentes

```tsx
// ✅ BIEN: Tamaños estándar
const AVATAR_SIZES = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 64,
  xxl: 96
};

// ❌ MAL: Tamaños arbitrarios
<AvatarSystem size={37} />
```

### 3. No cargar desde URLs

```tsx
// ✅ BIEN: Usar AvatarSystem
<AvatarSystem seed={user.avatar_seed} />

// ❌ MAL: Intentar usar avatar_url legacy
<AvatarImage src={user.avatar_url} />
```

### 4. Siempre envolver en contenedor para forma circular

```tsx
// ✅ BIEN: Contenedor con overflow
<div className="h-10 w-10 rounded-full overflow-hidden">
  <AvatarSystem name={user.name} size={40} />
</div>

// ❌ MAL: Sin contenedor puede verse cuadrado
<AvatarSystem name={user.name} size={40} />
```

---

## 🔍 Troubleshooting

### Avatar no se actualiza después de cambiar

**Problema:** El avatar no refleja el cambio inmediatamente

**Solución:**
```typescript
// Invalidar caches de React Query
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
queryClient.invalidateQueries(['user_profile', userId]);
queryClient.invalidateQueries(['user_avatar', userId]);
```

### Avatar muestra iniciales en lugar de design

**Problema:** Se muestra fallback de iniciales

**Causa:** Boring Avatars falló al renderizar

**Solución:**
1. Verificar que `boring-avatars` esté instalado
2. Verificar console para errores
3. Asegurar que `seed` sea válido

### Avatares diferentes en distintos componentes

**Problema:** Mismo usuario muestra avatares diferentes

**Causa:** Seed no está siendo pasado correctamente

**Solución:**
```tsx
// Asegurar que todos los componentes usen el mismo seed
<AvatarSystem seed={user.avatar_seed} />

// NO mezclar con generación automática
<AvatarSystem name={user.name} />  // Genera diferente
```

### Performance issues con muchos avatares

**Problema:** Lag al renderizar listas con muchos avatares

**Solución:**
1. Usar virtualización (react-window)
2. Memoizar componentes de avatar
3. Reducir tamaño de avatares en listas

```tsx
import { memo } from 'react';

const MemoizedAvatar = memo(AvatarSystem);

// Usar en listas
{users.map(user => (
  <MemoizedAvatar key={user.id} seed={user.avatar_seed} />
))}
```

---

## 📊 Estadísticas y Monitoreo

### Verificar distribución de seeds

```sql
SELECT
  avatar_seed,
  count(*) as user_count,
  round(count(*) * 100.0 / sum(count(*)) over(), 2) as percentage
FROM profiles
WHERE avatar_seed IS NOT NULL
GROUP BY avatar_seed
ORDER BY avatar_seed;
```

### Usuarios sin avatar configurado

```sql
SELECT
  id,
  email,
  first_name,
  last_name,
  created_at
FROM profiles
WHERE avatar_seed IS NULL OR avatar_seed = ''
ORDER BY created_at DESC;
```

### Cache statistics

```typescript
import { userProfileCache } from '@/services/userProfileCache';

// En development console
const stats = userProfileCache.getCacheStats(userId);
console.log('Cache Stats:', stats);
/*
{
  exists: true,
  valid: true,
  age: 120000,  // 2 minutos
  ttl: 86400000,
  needsRefresh: false,
  version: 2
}
*/
```

---

## 🚀 Roadmap Futuro

### Características Planeadas

- [ ] **Colores personalizados por usuario**
  - Permitir que usuarios seleccionen su paleta

- [ ] **Más variantes de Boring Avatars**
  - Añadir 'pixel', 'bauhaus', 'ring' variants

- [ ] **Avatares por dealership**
  - Logo del dealership como opción de avatar

- [ ] **Animated avatars**
  - Soporte para GIF/Lottie animations

- [ ] **Avatar groups**
  - Stacking de avatares optimizado

---

## 📝 Changelog

### Versión 2.0 (Octubre 2025)

- ✅ Migración completa a Boring Avatars
- ✅ Eliminación de DiceBear API externa
- ✅ Sistema unificado en toda la app
- ✅ Cache multi-capa
- ✅ Modal de personalización
- ✅ 25 variaciones beam

### Versión 1.0 (Sistema Legacy)

- ❌ DiceBear API externa
- ❌ avatar_url con uploads
- ❌ Inconsistente entre componentes

---

## 🆘 Soporte

### Recursos

- **Boring Avatars Docs:** https://github.com/boringdesigners/boring-avatars
- **Radix UI Avatar:** https://www.radix-ui.com/docs/primitives/components/avatar
- **Código fuente:** `src/components/ui/avatar-system.tsx`

### Contacto

Para issues o preguntas sobre el sistema de avatares:
1. Crear issue en el repositorio
2. Tag con `avatar-system`
3. Incluir screenshots si aplica

---

## 📄 Licencia

Este sistema es parte de MyDetailArea y usa:
- **Boring Avatars:** MIT License
- **Radix UI:** MIT License

---

**Última actualización:** Octubre 2025
**Versión:** 2.0
**Mantenedor:** Equipo de Desarrollo MyDetailArea
