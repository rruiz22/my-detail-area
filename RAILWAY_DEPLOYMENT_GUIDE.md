# 🚂 Railway Deployment Guide - Face Recognition Fix

Este documento explica cómo configurar Railway/Render para servir correctamente los archivos de modelos de face-api.js.

---

## 🎯 Problema

Los archivos binarios `.bin` de face-api.js se **corrompen** cuando:
1. Se sirven con compresión gzip/brotli
2. Content-Type headers incorrectos
3. Archivos cacheados viejos

**Resultado**: Error "tensor should have 8192 values but has 2056" en producción

---

## ✅ Solución Implementada

### 1. **Archivos de Configuración Creados**

#### `railway.json` - Configuración de Railway
```json
{
  "deploy": {
    "startCommand": "npx serve dist -l $PORT --no-port-switching --no-clipboard"
  }
}
```

#### `serve.json` - Configuración de `serve` (Static Server)
```json
{
  "headers": [
    {
      "source": "**/*.bin",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/octet-stream"  // ← CRITICAL
        },
        {
          "key": "Content-Encoding",
          "value": "identity"  // ← NO COMPRESSION
        }
      ]
    }
  ]
}
```

**Key Features:**
- ✅ `.bin` files served as `application/octet-stream`
- ✅ NO compression (`Content-Encoding: identity`)
- ✅ Long-term caching (1 year) with `immutable`
- ✅ CORS enabled for `/models/` directory

---

### 2. **Cache-Busting en Código**

**Archivo**: `src/services/faceApiService.ts`

```typescript
// Automatically adds ?v=1.7.12 to model URLs in production
const finalModelUrl = enableCacheBusting
  ? `${modelUrl}?v=${MODEL_VERSION}`
  : modelUrl;
```

**Resultado**:
```
/models/face_recognition_model.bin?v=1.7.12  // ← Cache invalidated
```

---

## 🚀 Deployment Steps (Railway)

### **Opción A: Usando Railway CLI** (Recomendado)

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Link project
railway link

# 4. Deploy
railway up
```

### **Opción B: Usando Git Push**

```bash
# 1. Commit changes
git add .
git commit -m "fix: Configure Railway for face-api.js binary files"

# 2. Push to main branch
git push origin main

# Railway auto-deploys from GitHub
```

### **Opción C: Usando Railway Dashboard**

1. Go to https://railway.app/dashboard
2. Select project
3. Click "Deploy" → "Deploy Now"
4. Wait for build to complete (~3-5 min)

---

## 🔍 Verificación Post-Deploy

### **1. Check Model Files**

Open DevTools → Network tab:

```
GET /models/face_recognition_model.bin?v=1.7.12
Status: 200 OK
Content-Type: application/octet-stream  ← MUST be this
Content-Length: 6502400  ← Should be ~6.2MB
Content-Encoding: (should be absent or "identity")  ← NO gzip!
```

### **2. Check Console Logs**

```
[FaceAPI Service] Loading models from: /models?v=1.7.12
[FaceAPI Service] Cache-busting: enabled
[FaceAPI Service] Expected model format: .bin (Vladmandic fork)
[FaceAPI Service] Loading tiny_face_detector_model.bin...
[FaceAPI Service] ✓ Tiny face detector loaded
[FaceAPI Service] Loading face_landmark_68_model.bin...
[FaceAPI Service] ✓ Face landmark detector loaded
[FaceAPI Service] Loading face_recognition_model.bin (~6.2MB)...
[FaceAPI Service] ✓ Face recognition model loaded
[FaceAPI Service] ✓ All models loaded successfully
```

❌ **If you see this error**:
```
❌ MODEL INCOMPATIBILITY ERROR
Error: tensor should have 8192 values but has 2056
```

**Possible causes**:
1. Old cached files - clear browser cache (Ctrl+Shift+R)
2. Wrong Content-Type - check Network tab headers
3. Compressed files - verify Content-Encoding is NOT gzip
4. Old models - verify files are .bin format (not .shard)

---

## 🐛 Troubleshooting

### **Problem 1: Files still compressed**

Railway might be ignoring `serve.json`. Try:

```bash
# Add to package.json scripts:
"start": "serve dist -p $PORT -c serve.json --no-port-switching"
```

Then update `railway.json`:
```json
{
  "deploy": {
    "startCommand": "npm start"
  }
}
```

### **Problem 2: Content-Type still wrong**

Create custom Express server:

```bash
npm install express compression
```

Create `server.cjs`:
```javascript
const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Disable compression for .bin files
app.use(compression({
  filter: (req, res) => {
    if (req.url.endsWith('.bin')) {
      return false; // Don't compress
    }
    return compression.filter(req, res);
  }
}));

// Serve static files
app.use(express.static('dist', {
  setHeaders: (res, path) => {
    if (path.endsWith('.bin')) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Update `railway.json`:
```json
{
  "deploy": {
    "startCommand": "node server.cjs"
  }
}
```

### **Problem 3: Browser cache persists**

Force cache invalidation:

1. **Option A**: Increment `MODEL_VERSION` in `faceApiService.ts`:
   ```typescript
   const MODEL_VERSION = '1.7.13'; // Increment
   ```

2. **Option B**: Hard refresh in browser:
   - Chrome/Edge: `Ctrl + Shift + R`
   - Firefox: `Ctrl + F5`

3. **Option C**: Clear Railway cache:
   ```bash
   railway run --clean
   ```

---

## 📊 Monitoring

### **Check Railway Logs**

```bash
railway logs
```

Look for:
```
✓ Build completed successfully
✓ Deployment successful
✓ Health check passed
```

### **Check File Sizes on Server**

```bash
railway run ls -lh dist/models/
```

Should show:
```
face_recognition_model.bin    6.2M
face_landmark_68_model.bin    349K
tiny_face_detector_model.bin  189K
```

---

## 🎯 Success Criteria

✅ **Face recognition works in production**
✅ **Console shows "All models loaded successfully"**
✅ **No "tensor should have" errors**
✅ **Network tab shows correct Content-Type**
✅ **Face scan detects and recognizes faces**

---

## 📚 References

- Railway Docs: https://docs.railway.app/
- Serve CLI: https://github.com/vercel/serve
- Face-API.js: https://github.com/vladmandic/face-api

---

**Last Updated:** 2025-11-20
**Stack:** React + Vite + Railway + face-api.js@1.7.12
