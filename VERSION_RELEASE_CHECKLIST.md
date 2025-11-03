# 📦 Version Release Checklist

## 🎯 Cuándo Incrementar la Versión

Usa **Semantic Versioning** (semver):

### **PATCH (1.2.X)** - Para Bug Fixes
- ✅ Correcciones de bugs
- ✅ Mejoras menores
- ✅ Fixes de seguridad
- ✅ Optimizaciones de performance
- ✅ Correcciones de UI/UX

**Ejemplos:**
- Fix password reset token verification
- Fix notification badge count
- Fix responsive layout issue

### **MINOR (1.X.0)** - Para Nuevas Features
- ✅ Nuevas funcionalidades
- ✅ Nuevos componentes
- ✅ Nuevas páginas
- ✅ Cambios significativos en UI

**Ejemplos:**
- Added password reset functionality
- Added notification system
- Added dark mode support

### **MAJOR (X.0.0)** - Para Breaking Changes
- ✅ Cambios que rompen compatibilidad
- ✅ Rediseños completos
- ✅ Cambios en base de datos que requieren migración
- ✅ Cambios en API

**Ejemplos:**
- Complete authentication system overhaul
- New database schema
- API v2 implementation

---

## ✅ Checklist para Crear una Nueva Versión

### **Opción 1: Comandos Manuales (Lo que acabamos de hacer)**

```bash
# 1. Incrementar versión en package.json
npm version patch      # Para 1.2.X (bug fixes)
# O
npm version minor      # Para 1.X.0 (nuevas features)
# O
npm version major      # Para X.0.0 (breaking changes)

# 2. Regenerar version.json
node scripts/generate-version.js

# 3. Commit y tag
git add package.json package-lock.json public/version.json
git commit -m "chore: Bump version to X.X.X" -m "Descripción breve de cambios"
git tag vX.X.X

# 4. Push
git push origin main
git push origin vX.X.X
```

### **Opción 2: Script Automatizado (Recomendado)**

He creado un script para ti en `scripts/release.sh`:

```bash
# Para bug fix (1.2.X)
npm run release:patch

# Para nueva feature (1.X.0)
npm run release:minor

# Para breaking change (X.0.0)
npm run release:major
```

---

## 📝 Formato de Commit Messages para Releases

```
chore: Bump version to X.X.X

- Feature/Fix 1
- Feature/Fix 2
- Feature/Fix 3
```

**Ejemplos:**

```bash
git commit -m "chore: Bump version to 1.2.4" -m "- Fixed password reset token verification
- Prevented multiple OTP verification attempts
- Added comprehensive debugging logs"
```

---

## 🔄 Workflow Completo

### **Ejemplo: Después de Arreglar un Bug**

```bash
# 1. Hacer commits normales de tus fixes
git add src/pages/ResetPassword.tsx
git commit -m "fix: Prevent multiple token verification attempts"
git push origin main

# 2. Crear release (incrementa versión)
npm run release:patch
# Esto hace automáticamente:
# - npm version patch
# - node scripts/generate-version.js
# - git add + commit + tag
# - git push (main + tag)
```

### **Ejemplo: Después de Agregar una Feature**

```bash
# 1. Hacer commits normales de tu feature
git add src/pages/ForgotPassword.tsx src/pages/ResetPassword.tsx
git commit -m "feat: Implement password reset functionality"
git push origin main

# 2. Crear release (incrementa versión)
npm run release:minor
```

---

## 📊 Historial de Versiones Recientes

### v1.2.4 (2025-11-03)
- Fixed password reset token verification
- Prevented multiple OTP verification attempts
- Added comprehensive debugging logs

### v1.2.3 (2025-11-03)
- Fixed notification badge duplication in Team Chat
- Made NotificationBell component fully responsive
- Fixed Railway deployment issues with Node version

### v1.2.2 (2025-11-03)
- Fixed version display in footer
- Updated package.json and regenerated version file

### v1.2.1 (2025-11-03)
- Fixed SMS notifications for order creation
- Added short link, services, and due date to SMS messages

### v1.2.0 (2025-11-03)
- Implemented complete password reset functionality
- Added ForgotPassword and ResetPassword pages
- Added email templates documentation

---

## 🛠️ Scripts Disponibles

Agrega estos scripts a tu `package.json`:

```json
{
  "scripts": {
    "release:patch": "npm version patch && node scripts/generate-version.js && git add package.json package-lock.json public/version.json && git commit --amend --no-edit && git tag -f v$(node -p \"require('./package.json').version\") && git push origin main && git push origin v$(node -p \"require('./package.json').version\") --force",
    "release:minor": "npm version minor && node scripts/generate-version.js && git add package.json package-lock.json public/version.json && git commit --amend --no-edit && git tag -f v$(node -p \"require('./package.json').version\") && git push origin main && git push origin v$(node -p \"require('./package.json').version\") --force",
    "release:major": "npm version major && node scripts/generate-version.js && git add package.json package-lock.json public/version.json && git commit --amend --no-edit && git tag -f v$(node -p \"require('./package.json').version\") && git push origin main && git push origin v$(node -p \"require('./package.json').version\") --force"
  }
}
```

---

## 💡 Tips

1. **Haz commits pequeños y frecuentes** durante el desarrollo
2. **Crea una release** cuando completes una feature o bug fix importante
3. **No incrementes versión** para cada commit individual
4. **Agrupa cambios relacionados** en un solo release
5. **Usa mensajes descriptivos** en los commits de release
6. **Mantén actualizado** este documento con el historial de versiones

---

## 🚨 Recordatorio

**ANTES de hacer push de cualquier feature importante:**
```bash
npm run release:patch  # O minor/major según corresponda
```

Esto asegura que:
- ✅ La versión se incrementa correctamente
- ✅ El version.json se regenera
- ✅ Se crea un tag de git
- ✅ Todo se pushea correctamente

---

## 📚 Recursos

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

**Última actualización:** 2025-11-03
**Versión actual:** v1.2.4
