# 🚀 Vercel Deployment Guide - MyDetailArea

**Fecha:** 2025-11-20
**Propósito:** Migrar de Railway a Vercel para resolver deployment issues
**Tiempo estimado:** 10-15 minutos

---

## ✅ **Por Qué Vercel**

Vercel tiene soporte nativo excepcional para Vite + React SPAs:

✅ **Zero-config** - Detecta Vite automáticamente
✅ **Deployments rápidos** - 1-2 minutos vs 5-10 en Railway
✅ **Mejor manejo de static assets** - Headers correctos por default
✅ **Edge Network global** - CDN integrado
✅ **Preview deployments** - Para cada commit/PR
✅ **Auto HTTPS** - SSL certificates automáticos
✅ **Mejor logging** - Errores claros y detallados

---

## 📋 **Pre-requisitos**

- ✅ Cuenta en Vercel (vercel.com)
- ✅ Repo en GitHub (rruiz22/my-detail-area)
- ✅ Variables de entorno documentadas

---

## 🚀 **Deployment Steps**

### **Método 1: Vercel Dashboard (Recomendado - 10 min)**

#### **Step 1: Import Project (2 min)**
1. Ir a https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Buscar "my-detail-area" o conectar GitHub
5. Click "Import" en tu repo

#### **Step 2: Configure Project (3 min)**
Vercel auto-detecta configuración, pero verifica:

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

Todo debería estar pre-filled correctamente.

#### **Step 3: Environment Variables (3 min)**
Click "Environment Variables" y agrega:

**Required:**
```
VITE_SUPABASE_URL=https://swfnnrpzpkdypbrzmgnr.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**Todas las VITE_* variables que tengas en Railway:**
- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID
- VITE_FIREBASE_VAPID_KEY
- (Y cualquier otra que uses)

**IMPORTANTE:** Copia exactamente las mismas variables que tienes en Railway.

#### **Step 4: Deploy (1 min)**
1. Click "Deploy"
2. Vercel empieza el build automáticamente
3. Espera 1-2 minutos

**Expected output:**
```
✓ Building...
✓ Compiled successfully
✓ Uploading...
✓ Deployment ready
```

#### **Step 5: Verificación (1 min)**
1. Vercel te da URL: `https://mydetailarea-xyz.vercel.app`
2. Click "Visit" para abrir la app
3. DevTools → Console
4. Detail Hub → Time Clock
5. Buscar:
   ```
   [FaceAPI Service] Loading models from: https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model
   [FaceAPI Service] ✓ All models loaded successfully
   ```

---

### **Método 2: Vercel CLI (Alternativo - 15 min)**

```bash
# Step 1: Install Vercel CLI
npm i -g vercel

# Step 2: Login
vercel login

# Step 3: Link project
vercel link

# Step 4: Add environment variables
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
# ... (todas las VITE_* variables)

# Step 5: Deploy to production
vercel --prod

# Step 6: Vercel te da la URL
# Open in browser and test
```

---

## 🔧 **Configuration Files**

### **vercel.json**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [...]
}
```

**Features configurados:**
- ✅ SPA routing (todas las rutas → index.html)
- ✅ Headers correctos para .bin files
- ✅ Cache control optimizado
- ✅ CORS enabled para models

### **.vercelignore**
Excluye archivos innecesarios:
- node_modules, dist, .git
- Backups, docs, scripts
- Railway specific files
- Reduce deployment size ~50%

---

## ✅ **Verificación Post-Deployment**

### **Test 1: Homepage**
```bash
curl https://your-app.vercel.app/
# Should return: HTTP 200 with HTML
```

### **Test 2: Face Recognition**
1. Open app en browser
2. Detail Hub → Time Clock
3. DevTools → Console
4. Expected logs:
   ```
   [FaceAPI Service] Loading models from: https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model
   [FaceAPI Service] ✓ Tiny face detector loaded
   [FaceAPI Service] ✓ Face landmark detector loaded
   [FaceAPI Service] ✓ Face recognition model loaded
   [FaceAPI Service] ✓ All models loaded successfully
   ```

### **Test 3: All Features**
- [ ] Login works
- [ ] Navigation works
- [ ] Supabase queries work
- [ ] Real-time subscriptions work
- [ ] Face recognition works
- [ ] Image uploads work
- [ ] Reports export works

---

## 🌐 **Custom Domain (Opcional)**

### **Agregar dds.mydetailarea.com a Vercel:**

#### **Step 1: Vercel Dashboard**
1. Project Settings → Domains
2. Add Domain: `dds.mydetailarea.com`
3. Vercel te da DNS records

#### **Step 2: Update DNS**
En tu proveedor de DNS (GoDaddy, Cloudflare, etc.):

**Type:** A Record
**Name:** dds
**Value:** 76.76.21.21 (Vercel's IP - check dashboard)

O:

**Type:** CNAME
**Name:** dds
**Value:** cname.vercel-dns.com

#### **Step 3: Wait for Propagation**
- DNS propaga en 5-60 minutos
- Vercel auto-provision SSL certificate
- App accessible en https://dds.mydetailarea.com

---

## 🐛 **Troubleshooting**

### **Build fails in Vercel:**

**Check:**
- Vercel → Deployment → Build Logs
- Common issues:
  - `npm ci failed` → Check package-lock.json committed
  - `npm run build failed` → TypeScript errors
  - Environment variables missing

**Fix:**
```bash
# Verify package-lock.json
git add package-lock.json
git commit -m "chore: Add package-lock.json"
git push
```

### **App loads but Supabase queries fail:**

**Cause:** Environment variables not configured

**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Add all VITE_* variables
3. Redeploy: Deployments → Latest → "Redeploy"

### **Face recognition doesn't load:**

**Check Console for:**
```
❌ Failed to fetch from CDN
❌ CORS error
❌ Network timeout
```

**If CORS error:**
- CDN should have CORS by default
- Check Network tab for blocked requests
- Verify URL is exact: `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model`

**If still fails:**
- Try hard refresh: Ctrl+Shift+R
- Clear Service Worker cache
- Check browser console for specific errors

---

## 📊 **Comparison: Railway vs Vercel**

| Feature | Railway | Vercel |
|---------|---------|--------|
| **Build Time** | 5-10 min | 1-2 min |
| **Vite Support** | Generic | Native |
| **Deployment** | Complex | Zero-config |
| **Success Rate** | 0% (failing) | ~99% |
| **Debugging** | Hard (incomplete logs) | Easy (detailed logs) |
| **Edge Network** | US only | Global |
| **Preview Deploys** | No | Yes (automatic) |
| **Cost** | $5/mo | Free tier generous |

---

## 🎯 **Expected Timeline**

```
[0:00] Start deployment
[0:02] Project imported to Vercel
[0:05] Environment variables configured
[0:06] Deployment started
[0:08] Build completed (npm run build)
[0:09] Files uploaded to edge network
[0:10] Deployment live
[0:12] Face recognition tested
[0:15] ✅ COMPLETE
```

---

## 🔐 **Security Notes**

### **Environment Variables:**
- ✅ Never commit .env files
- ✅ Use Vercel's encrypted env vars
- ✅ Different vars for production/preview/development

### **Supabase Keys:**
- ✅ Anon key is safe to expose (public)
- ❌ Service role key NEVER in frontend
- ✅ RLS policies protect data

---

## 📚 **Post-Deployment**

### **Update DNS (if using custom domain):**
Point `dds.mydetailarea.com` to Vercel

### **Update Repository:**
- Add Vercel badge to README
- Document new deployment process
- Archive Railway config files

### **Monitor Performance:**
- Vercel Analytics (built-in)
- Core Web Vitals
- Error tracking

---

## 🎉 **Success Criteria**

- [ ] Vercel deployment successful
- [ ] App loads on Vercel URL
- [ ] All pages navigate correctly
- [ ] Supabase integration works
- [ ] Face recognition loads from CDN
- [ ] Console shows "All models loaded successfully"
- [ ] NO "tensor should have" error
- [ ] Face scanning works for enrolled employees

---

## 📝 **Quick Reference Commands**

```bash
# Build locally
npm run build

# Test build locally
npx serve dist -l 8080

# Deploy to Vercel (CLI)
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs your-deployment-url

# Redeploy
vercel --prod --force
```

---

## 🆘 **Need Help?**

**Vercel Documentation:**
- https://vercel.com/docs
- https://vercel.com/docs/frameworks/vite

**Vercel Support:**
- Dashboard → Help → Contact Support
- Community: https://github.com/vercel/vercel/discussions

---

**Guide Created:** 2025-11-20
**Status:** ✅ Ready for deployment
**Confidence:** Very High - Vercel is optimal for Vite/React
