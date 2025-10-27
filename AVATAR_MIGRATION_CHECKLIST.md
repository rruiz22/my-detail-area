# ✅ Avatar System Migration - Quick Checklist

## 🚀 Aplicación Rápida (15-30 minutos)

### Pre-Deployment

- [ ] **1. Revisar cambios de código**
  ```bash
  git diff
  ```

- [ ] **2. Verificar dependencias**
  ```bash
  npm list boring-avatars
  # Debe mostrar: boring-avatars@2.0.1
  ```

- [ ] **3. Testing local**
  ```bash
  npm install
  npm run dev
  ```
  - [ ] Abrir `/profile` - verificar avatar
  - [ ] Abrir chat - verificar avatares en mensajes
  - [ ] Abrir lista de usuarios - verificar avatares

### Deployment

- [ ] **4. Deploy código a staging**
  ```bash
  git add .
  git commit -m "feat: unify avatar system with Boring Avatars"
  git push origin staging
  ```

- [ ] **5. Aplicar migración SQL**

  **Opción A - Supabase Dashboard:**
  ```sql
  -- Copiar contenido de:
  -- supabase/migrations/20251025000001_populate_avatar_seeds.sql
  -- Pegar en SQL Editor
  -- Ejecutar
  ```

  **Opción B - CLI:**
  ```bash
  supabase db push
  ```

  **Opción C - Node.js script:**
  ```bash
  # Dry run primero
  node scripts/migrate_avatar_seeds.js --dry-run

  # Si se ve bien, ejecutar
  node scripts/migrate_avatar_seeds.js
  ```

### Verification

- [ ] **6. Verificar migración de DB**
  ```sql
  SELECT
    COUNT(*) as total,
    COUNT(avatar_seed) as with_seed
  FROM profiles;
  -- with_seed debe ser igual a total
  ```

- [ ] **7. Testing en staging**
  - [ ] Login como usuario
  - [ ] Ir a `/profile` - cambiar avatar
  - [ ] Abrir chat - verificar avatares
  - [ ] Verificar Network tab - 0 llamadas a dicebear.com

- [ ] **8. Limpiar caches** (si es necesario)
  ```javascript
  // En consola del navegador (F12)
  localStorage.removeItem('user_profile_cache');
  location.reload();
  ```

### Production

- [ ] **9. Deploy a producción**
  ```bash
  git checkout main
  git merge staging
  git push origin main
  ```

- [ ] **10. Aplicar migración SQL en producción**
  - Usar mismo proceso que en staging

- [ ] **11. Smoke testing en producción**
  - [ ] 5 usuarios diferentes verifican sus avatares
  - [ ] Chat funcionando correctamente
  - [ ] Sin errores en consola

### Post-Deployment

- [ ] **12. Monitoreo (primeras 24h)**
  - [ ] Verificar logs de errores
  - [ ] Verificar performance metrics
  - [ ] Verificar reportes de usuarios

- [ ] **13. Notificar al equipo**
  - [ ] Documentación actualizada
  - [ ] Cambios comunicados
  - [ ] Training si es necesario

## 🐛 Quick Troubleshooting

### Avatar no aparece
```bash
# Verificar instalación
npm install boring-avatars@2.0.1
npm run build
```

### Usuarios sin avatar
```bash
# Re-ejecutar migración
node scripts/migrate_avatar_seeds.js
```

### Cache issues
```javascript
// Consola del navegador
localStorage.clear();
location.reload();
```

## 📞 Emergency Rollback

Si algo sale mal:

```bash
# 1. Rollback código
git revert HEAD
git push origin main

# 2. Rollback DB (opcional - el sistema funciona sin avatar_seed)
# Solo si causa problemas críticos
UPDATE profiles SET avatar_seed = NULL;
```

## ✅ Success Criteria

- [ ] 0 llamadas a `api.dicebear.com`
- [ ] 100% usuarios con `avatar_seed`
- [ ] Avatares consistentes en toda la app
- [ ] Sin errores en consola
- [ ] Performance mejorado

## 📚 Referencias

- **Documentación completa:** `AVATAR_SYSTEM_DOCUMENTATION.md`
- **Guía de aplicación:** `APPLY_AVATAR_MIGRATION.md`
- **Resumen de mejoras:** `AVATAR_SYSTEM_IMPROVEMENTS_COMPLETE.md`

---

**Tiempo estimado:** 15-30 minutos
**Dificultad:** ⭐⭐☆☆☆ (Baja)
**Reversible:** ✅ Sí
