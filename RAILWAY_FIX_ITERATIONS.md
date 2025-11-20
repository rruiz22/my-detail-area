# 🔄 Railway Deployment - Iteraciones de Fix

**Fecha:** 2025-11-20
**Problema:** Face recognition models no se sirven correctamente en Railway
**Estado:** 🔄 En progreso (última iteración: Nixpacks + Express)

---

## 📊 Timeline de Iteraciones

### **Iteración 1: Nixpacks + serve CLI** ❌
**Commit:** Initial approach
**Config:**
```json
{
  "builder": "NIXPACKS",
  "startCommand": "npx serve dist"
}
```
**Resultado:** ❌ Healthcheck failure - serve no instalado
**Causa:** npx intenta descargar serve en runtime (timeout)

---

### **Iteración 2: serve como dependency** ❌
**Commit:** `abe015c`
**Cambios:**
- Install `serve` as dependency
- Add `npm start` script

**Config:**
```json
{
  "startCommand": "npm start"
}
```
**Resultado:** ❌ Models served as text/html
**Causa:** `serve.json` rewrite rules capturando /models/*.bin

---

### **Iteración 3: serve.json con ignore rules** ❌
**Commit:** `c33f8c2`
**Cambios:**
- Add `ignore: ["**/models/**"]` a serve.json

**Resultado:** ❌ Ignored por serve CLI
**Causa:** `serve` no respeta ignore rules correctamente

---

### **Iteración 4: Dockerfile multi-stage** ❌
**Commit:** `d91264a`
**Cambios:**
- Switch a DOCKERFILE builder
- Multi-stage build (builder + production)
- Install serve globally

**Resultado:** ❌ Build failure
**Causa:** package.json not found en /app/

---

### **Iteración 5: Dockerfile con npm ci fix** ❌
**Commit:** `073a250`
**Cambios:**
- Change `npm ci --only=production` → `npm ci`
- Fix devDependencies para build

**Resultado:** ❌ Build failure
**Causa:** Unknown (logs incompletos en Railway)

---

### **Iteración 6: Express server**  ❌
**Commit:** `2705a9b`
**Cambios:**
- Create `server.cjs` (Express custom server)
- Configure Content-Type headers manualmente
- Disable compression para .bin files

**Resultado:** ✅ Local: Works perfectly
**Resultado:** ❌ Railway: Build failure
**Causa:** Dockerfile CMD todavía usa `serve` (olvido)

---

### **Iteración 7: Fix CMD en Dockerfile** ❌
**Commit:** `6cc2e8b`
**Cambios:**
- Change CMD de `serve...` a `node server.cjs`

**Resultado:** ❌ Build failure
**Causa:** Scripts folder excluido en .dockerignore

---

### **Iteración 8: Fix .dockerignore** ❌
**Commit:** `47c7587`
**Cambios:**
- Remove `scripts/` from .dockerignore
- Keep scripts/generate-version.js para prebuild

**Resultado:** ❌ Build failure (todavía)
**Causa:** Unknown - Dockerfile approach demasiado complejo

---

### **Iteración 9: Nixpacks + Express (CURRENT)** 🔄
**Commit:** `9e29150`
**Cambios:**
- Switch back to NIXPACKS builder
- Create `nixpacks.toml` para config explícita
- Keep Express server (`server.cjs`)
- Healthcheck timeout: 100ms → 300ms

**Approach:**
```
Nixpacks (simple) + Express (control de headers) = Best of both worlds
```

**Expected Result:** ✅ Should work
**Status:** 🔄 Deploying... (monitoring en background)

---

## 🎯 Current Configuration

### **railway.json**
```json
{
  "builder": "NIXPACKS",
  "startCommand": "node server.cjs",
  "healthcheckTimeout": 300
}
```

### **nixpacks.toml**
```toml
[phases.setup]
nixPkgs = ['nodejs-20_x']

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'node server.cjs'
```

### **server.cjs (Express)**
```javascript
// Custom middleware for .bin files
app.use('/models', (req, res, next) => {
  if (req.url.endsWith('.bin')) {
    res.set({
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Encoding': 'identity'
    });
  }
  next();
});
```

---

## 🔍 Diagnóstico del Problema

### **Por qué Dockerfile Falló**

**Posibles causas:**
1. **Build timeout** - Railway free tier tiene límites
2. **Memory limits** - npm ci + vite build consume mucha memoria
3. **Large files** - Models 6.8MB + node_modules ~500MB
4. **Layer caching issues** - Railway no cachea layers correctamente

### **Por qué Nixpacks Debería Funcionar**

**Ventajas:**
1. ✅ Railway optimizado para Nixpacks
2. ✅ Mejor caching de dependencies
3. ✅ Builds más rápidos
4. ✅ Menos configuración = menos puntos de falla
5. ✅ Express server da control sobre headers

---

## ✅ Verificación

### **Script de Verificación**
```bash
./check-railway-status.sh
```

**Success output:**
```
✅ App is UP (HTTP 200)
✅ Content-Type is correct (application/octet-stream)
✅ File size is correct (~6.2MB)
✅ All models accessible
```

### **Monitoring en Background**
Script corriendo automáticamente, checking cada 30s por 10 minutos.

---

## 🐛 Si Esta Iteración También Falla

### **Plan B: Simplificar Más**

**Opción 1: Upload models to CDN**
```typescript
// src/services/faceApiService.ts
const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
```

**Beneficios:**
- ✅ No necesita servir models localmente
- ✅ CDN maneja caching + headers
- ✅ Build más rápido (no copia 6.8MB)

**Implementación:**
```bash
git add src/services/faceApiService.ts
git commit -m "fix: Use CDN for face-api.js models

Use jsdelivr CDN instead of local models:
- Faster deployments
- No file serving issues
- CDN handles compression + caching
- Models still cached locally via Service Worker

https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model"
```

**Opción 2: Supabase Storage**
- Upload models to Supabase Storage
- Serve from supabase.co/storage/
- Configure CORS
- Use cache-busting

**Opción 3: GitHub Pages/Cloudflare**
- Host models separately
- Point app to external URL
- Simpler deployment

---

## 📈 Lessons Learned

1. **Keep it simple** - Dockerfile puede ser overkill
2. **Use platform defaults** - Railway optimizado para Nixpacks
3. **CDN for large static assets** - Models son candidatos perfectos
4. **Test locally first** - Express server funciona perfectamente local
5. **Incremental changes** - Demasiados cambios a la vez = hard to debug

---

## 🎯 Next Steps

1. ⏳ **Esperar resultado de Nixpacks deployment** (monitoring en background)
2. ✅ **Si funciona:** Face recognition está fixed!
3. ❌ **Si falla:** Implementar Plan B (CDN approach)

---

**Monitoring:** Script corriendo automáticamente
**ETA:** 2-10 minutos
**Fallback:** CDN ready to implement
