# Pasos para Arreglar Widget en SiteGround

## 📋 Checklist Rápido

### **PASO 1: Backup del .htaccess Actual** ✅ CRÍTICO

**En SiteGround cPanel**:
1. File Manager → `public_html/.htaccess`
2. **Descargar** el archivo (backup)
3. Guardarlo en tu computadora

### **PASO 2: Reemplazar .htaccess**

**Opción A - Via cPanel** (Recomendado):
1. File Manager → `public_html/`
2. Click derecho en `.htaccess` → **Edit**
3. **Borrar todo el contenido actual**
4. **Copiar** contenido de `.htaccess.support-updated`
5. **Pegar** en el editor
6. **Save**

**Opción B - Via FTP**:
1. Conectar con FileZilla/FTP client
2. Subir `.htaccess.support-updated` como `.htaccess`
3. Sobrescribir el existente

### **PASO 3: Verificar Permisos**

**En File Manager**:
1. Click derecho en `.htaccess`
2. **Change Permissions**
3. Setear a: **644**
4. Click **Change Permissions**

### **PASO 4: Probar el Endpoint**

**Desde tu computadora**:
```bash
curl -I https://support.mydetailarea.com/lc/widget
```

**Esperado**:
```
HTTP/2 200 OK
content-type: text/html; charset=UTF-8
```

**Si aún retorna 500**:
- Ver logs de error (Paso 5)
- Verificar ModSecurity (Paso 6)

### **PASO 5: Revisar Error Logs**

**En cPanel**:
1. Ir a **Errors** o **Error Log**
2. Buscar última línea con `/lc/widget`
3. Identificar error específico

**Errores comunes**:
```
[500] PHP Fatal error: Allowed memory size...
[500] MySQL server has gone away
[500] Permission denied
[500] ModSecurity: Access denied
```

**Soluciones**:
- Memory: Aumentar en PHP Settings
- MySQL: Reiniciar en cPanel
- Permissions: chmod 755 para carpetas, 644 para archivos
- ModSecurity: Ya deshabilitado en .htaccess nuevo

### **PASO 6: Verificar ModSecurity** (Si error persiste)

**En cPanel**:
1. Buscar **ModSecurity** en cPanel
2. Si existe, ir a **ModSecurity Domains**
3. **Disable** para support.mydetailarea.com

**O contactar soporte de SiteGround**:
```
Subject: ModSecurity blocking /lc/widget - Error 500

Body:
Hello,

I'm getting 500 errors on https://support.mydetailarea.com/lc/widget
The error started after recent security updates.

Can you please:
1. Check if ModSecurity is blocking this route
2. Disable ModSecurity for /lc/* paths
3. Or whitelist this route

Error appears to be related to ModSecurity blocking the livechat widget.

Thank you!
```

### **PASO 7: Verificar PHP Version & Settings**

**En cPanel**:
1. **MultiPHP Manager** → Verificar PHP 7.4 o 8.0+
2. **PHP Settings** → Aumentar:
   - memory_limit: 256M
   - max_execution_time: 300

### **PASO 8: Testing Completo**

**Cuando endpoint retorne 200**:

1. Abrir https://support.mydetailarea.com/lc/widget en navegador
2. Debería cargar interfaz del widget (no error)

### **PASO 9: Re-activar en MyDetailArea**

**En tu computadora**:
```bash
cd C:\Users\rudyr\apps\mydetailarea

# Editar index.html (descomentar líneas 71-112)
# O decirme y yo lo hago

npm run build
git add index.html
git commit -m "feat(widget): Re-enable MDAChat widget after backend fix"
git push
```

### **PASO 10: Verificación Final**

**En producción** (https://dds.mydetailarea.com):
```
✅ Widget visible en esquina inferior derecha
✅ Click abre chat
✅ Console sin errores
```

---

## ⚡ Si NO Funciona Después de Todo

### **Alternativa**: Deshabilitar widget permanentemente

**Ya está hecho** - widget deshabilitado en commit `fbebe6f`

O podemos **implementar chat alternativo**:
1. **Tawk.to** (100% gratis, 5 min setup)
2. **Custom chat con Supabase** (tienes infraestructura)

---

## 📞 **Necesitas Ayuda?**

**Puedo ayudarte con**:
1. ✅ Descomentar widget cuando funcione
2. ✅ Implementar alternativa (Tawk.to o Supabase chat)
3. ✅ Debugging adicional si error persiste

**NO puedo ayudar con**:
- ❌ Acceso a SiteGround cPanel (requiere tus credenciales)
- ❌ Configuración del servidor (requiere acceso root/admin)

---

**Siguiente paso**: Acceder a SiteGround cPanel y aplicar los pasos 2-7. ¿Quieres que espere mientras lo haces, o prefieres una solución alternativa?** 🔧