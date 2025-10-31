# 🚀 Quick Start - Sistema de Versionado

## Instalación Rápida (5 minutos)

### Paso 1: Integrar UpdateBanner en tu App

Edita tu archivo principal (probablemente `src/App.tsx`):

```tsx
import { UpdateBanner } from '@/components/version/UpdateBanner';

function App() {
  return (
    <>
      {/* Tu código existente */}
      <YourExistingComponents />

      {/* Agregar al final, antes del cierre */}
      <UpdateBanner />
    </>
  );
}
```

### Paso 2: Probar en Desarrollo

```bash
# Generar versión inicial
npm run version:generate

# Verificar que se creó
cat public/version.json
```

### Paso 3: Build y Deploy

```bash
# Build (genera versión automáticamente)
npm run build

# Verificar archivos tienen hash
ls dist/assets/
# Deberías ver: main-abc123.js, vendor-def456.js, etc.

# Deploy como siempre
# (el sistema funciona automáticamente)
```

## ✅ Verificación Post-Deploy

1. **Abrir tu app en producción**
2. **Abrir DevTools → Network**
3. **Buscar:** `version.json`
4. **Verificar:** Debe mostrar buildNumber actual

## 🎯 Cómo Funciona

1. Usuario carga la app → Carga `version.json` inicial
2. Cada 5 minutos → Verifica si hay nuevo `buildNumber`
3. Si hay nuevo → Muestra banner "Nueva versión disponible"
4. Usuario hace click → Limpia cache y recarga

## 🐛 Troubleshooting

**Banner no aparece?**
```tsx
// Forzar verificación inmediata
import { useAppVersion } from '@/hooks/useAppVersion';

const { checkForUpdate } = useAppVersion();
checkForUpdate(); // Verificar ahora
```

**Archivos sin hash?**
- Verificar `vite.config.ts` tiene la configuración de build
- Re-ejecutar: `npm run build`

**version.json no existe?**
```bash
npm run version:generate
```

## 📖 Documentación Completa

Ver: `VERSIONING_SYSTEM_REPORT.md` para detalles completos.
