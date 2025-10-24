# 📦 Sistema de Gestión de Versiones - My Detail Area

## Introducción

Este proyecto utiliza un sistema de versionamiento centralizado basado en **Semantic Versioning** ([semver.org](https://semver.org/)).

La versión de la aplicación se gestiona desde `package.json` y se propaga automáticamente a todos los componentes de la UI.

---

## 🎯 Estructura del Sistema

```
📁 mydetailarea/
├── package.json                    # ← Fuente de verdad de la versión
├── src/
│   ├── config/
│   │   └── version.ts             # ← Configuración centralizada
│   └── components/
│       ├── ProtectedLayout.tsx    # ← Usa APP_VERSION
│       └── DashboardLayout.tsx    # ← Usa APP_VERSION
```

### **Archivo: `src/config/version.ts`**

```typescript
import packageJson from '../../package.json';

export const APP_VERSION = packageJson.version;
export const getFormattedVersion = (showPrefix: boolean = true): string => {
  return showPrefix ? `v${APP_VERSION}` : APP_VERSION;
};
```

---

## 🔧 Cómo Actualizar la Versión

### **Opción 1: Usando npm (Recomendado)**

```bash
# Para bug fixes (1.0.0 → 1.0.1)
npm version patch

# Para nuevas funcionalidades (1.0.0 → 1.1.0)
npm version minor

# Para cambios que rompen compatibilidad (1.0.0 → 2.0.0)
npm version major
```

**Estos comandos automáticamente:**
- ✅ Actualizan `package.json`
- ✅ Crean un commit de git
- ✅ Crean un tag de git

### **Opción 2: Manual**

Edita directamente `package.json`:

```json
{
  "version": "1.0.0-beta"
}
```

---

## 📋 Guía de Semantic Versioning

```
MAJOR.MINOR.PATCH-PRERELEASE

Ejemplo: 1.2.3-beta
         │ │ │  └─── Identificador de pre-release (opcional)
         │ │ └────── PATCH: Bug fixes
         │ └──────── MINOR: Nuevas funcionalidades (compatible)
         └────────── MAJOR: Breaking changes
```

### **Cuándo incrementar cada número:**

| Tipo | Cuándo usarlo | Ejemplo |
|------|---------------|---------|
| **MAJOR** | Cambios que rompen compatibilidad | API redesign, eliminación de features |
| **MINOR** | Nuevas funcionalidades compatibles | Nuevo módulo, nueva feature |
| **PATCH** | Corrección de bugs | Hotfix, security patch |

### **Pre-releases:**

```bash
1.0.0-alpha   # Alpha testing
1.0.0-beta    # Beta testing
1.0.0-rc.1    # Release candidate
1.0.0         # Production release
```

---

## 🚀 Flujo de Trabajo Recomendado

### **1. Durante Desarrollo**

```bash
# Mantener versión beta durante desarrollo
npm version 1.0.0-beta
```

### **2. Preparar Release**

```bash
# Crear release candidate
npm version 1.0.0-rc.1

# Testear exhaustivamente
npm run test
npm run build

# Si todo está bien, release a producción
npm version 1.0.0
```

### **3. Después del Release**

```bash
# Primer bug fix después del release
npm version patch    # 1.0.0 → 1.0.1

# Nueva feature compatible
npm version minor    # 1.0.1 → 1.1.0

# Breaking change
npm version major    # 1.1.0 → 2.0.0
```

---

## 🔄 Integración con CI/CD

### **GitHub Actions (Ejemplo)**

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Get version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
      - name: Build and deploy
        run: |
          npm install
          npm run build
          # Deploy commands here
```

---

## 📍 Dónde se Muestra la Versión

### **1. Footer de la Aplicación**

```tsx
// ProtectedLayout.tsx y DashboardLayout.tsx
<span>{t('layout.footer.version', { version: APP_VERSION })}</span>
```

**Resultado:** `v1.0.0-beta`

### **2. Expandir a Otros Lugares (Futuro)**

```tsx
// Página "Acerca de"
import { APP_VERSION, BUILD_INFO } from '@/config/version';

<div>
  <p>Versión: {APP_VERSION}</p>
  <p>Entorno: {BUILD_INFO.environment}</p>
  <p>Build: {BUILD_INFO.buildDate}</p>
</div>
```

---

## 🎨 Personalización del Formato

### **Mostrar sin prefijo "v":**

```tsx
import { getFormattedVersion } from '@/config/version';

// Con prefijo (default)
<span>{getFormattedVersion()}</span>  // → "v1.0.0-beta"

// Sin prefijo
<span>{getFormattedVersion(false)}</span>  // → "1.0.0-beta"
```

---

## 🛠️ Comandos Útiles

```bash
# Ver versión actual
npm version

# Ver versión específica de package.json
node -p "require('./package.json').version"

# Crear tag sin cambiar versión
git tag v1.0.0

# Ver todos los tags
git tag -l

# Subir tags a GitHub
git push --tags
```

---

## 📚 Recursos Adicionales

- [Semantic Versioning Specification](https://semver.org/)
- [npm version documentation](https://docs.npmjs.com/cli/v9/commands/npm-version)
- [Git Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)

---

## ✅ Checklist de Release

Antes de crear un release a producción:

- [ ] Todas las features están completadas
- [ ] Todos los tests pasan (`npm run test`)
- [ ] Build de producción funciona (`npm run build`)
- [ ] Traducciones actualizadas (EN/ES/PT-BR)
- [ ] Changelog actualizado
- [ ] Versión incrementada según semver
- [ ] Tag de git creado
- [ ] Deploy a staging testeado
- [ ] Aprobación de stakeholders

---

**Última actualización:** 2025-10-24
**Versión del documento:** 1.0.0
