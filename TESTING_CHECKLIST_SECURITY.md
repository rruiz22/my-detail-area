# ✅ TESTING CHECKLIST - Post Security Fix

**Objetivo**: Verificar que las migraciones de seguridad NO rompieron funcionalidad
**Duración estimada**: 30 minutos
**Servidor**: http://localhost:8080 (YA CORRIENDO ✅)

---

## 🧪 TESTING MANUAL REQUERIDO

### **FASE 1: Login & Authentication** (5 min)

#### **Test 1.1: Login como System Admin**
- [ ] Abrir http://localhost:8080/auth
- [ ] Email: `rruiz@lima.llc`
- [ ] Password: [tu password]
- [ ] Click "Sign In"
- [ ] **Esperado**: Login exitoso, redirect a Dashboard
- [ ] **Verificar**: No errores en consola

#### **Test 1.2: Verificar Rol System Admin**
- [ ] Abrir DevTools → Console
- [ ] Ejecutar: `localStorage.getItem('auth-storage')`
- [ ] **Esperado**: Ver `"role":"system_admin"` en el JSON
- [ ] **Verificar**: `is_system_admin: true` (si existe)

---

### **FASE 2: Dashboard & Core Features** (10 min)

#### **Test 2.1: Dashboard Carga**
- [ ] URL: http://localhost:8080/
- [ ] **Esperado**: Dashboard carga sin errores
- [ ] **Verificar**: Métricas muestran datos
- [ ] **Verificar**: No errores 403/RLS en consola

#### **Test 2.2: Sales Orders**
- [ ] Click "Sales Orders" en sidebar
- [ ] **Esperado**: Lista de órdenes carga
- [ ] Click en una orden para abrir modal
- [ ] **Esperado**: Modal abre con todos los datos
- [ ] **Verificar**: No errores de permisos

#### **Test 2.3: Get Ready Module**
- [ ] Click "Get Ready" en sidebar
- [ ] **Esperado**: Lista de vehículos carga
- [ ] Click en un vehículo
- [ ] **Esperado**: Vehicle Detail Panel abre
- [ ] **Verificar**: Work items, notas, actividades cargan

#### **Test 2.4: Contacts**
- [ ] Click "Contacts" en sidebar
- [ ] **Esperado**: Lista de contactos carga
- [ ] Click "Add Contact"
- [ ] **Esperado**: Modal abre sin errores

#### **Test 2.5: Reports**
- [ ] Click "Reports" en sidebar
- [ ] **Esperado**: Dashboard de reportes carga
- [ ] **Verificar**: Analytics queries funcionan

---

### **FASE 3: Management & Admin Features** (10 min)

#### **Test 3.1: Management Page**
- [ ] Click "Management" en sidebar
- [ ] **Esperado**: Página carga (system_admin only)
- [ ] **Verificar**: Tabs de Dealerships, Users, Roles visibles
- [ ] Click tab "System Settings"
- [ ] **Esperado**: Settings cargan

#### **Test 3.2: Settings Page**
- [ ] Click "Settings" en sidebar (o perfil → Settings)
- [ ] **Esperado**: Página Settings carga
- [ ] **Verificar**: Tab "Platform" visible
- [ ] Click tab "Platform"
- [ ] **Esperado**: PlatformBrandingSettings carga
- [ ] **Verificar**: Logo upload funciona

#### **Test 3.3: User Management**
- [ ] En Management → Users tab
- [ ] Click "Invite User"
- [ ] **Esperado**: Modal de invitación abre
- [ ] **Verificar**: Puede seleccionar dealership y rol

---

### **FASE 4: Security Verification** (5 min)

#### **Test 4.1: Verificar RLS Policies**
```bash
# En Supabase Dashboard → SQL Editor, ejecutar:

-- 1. Verificar is_system_admin() funciona
SELECT is_system_admin();
-- Esperado: true (si estás autenticado como system_admin)

-- 2. Verificar tablas tienen RLS
SELECT COUNT(*) FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%';
-- Esperado: 0

-- 3. Verificar policies activas
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
    'dealer_custom_roles',
    'security_audit_log',
    'nfc_tags',
    'recon_vehicles'
)
GROUP BY tablename;
-- Esperado: Cada tabla debe tener 1-4 policies
```

#### **Test 4.2: Verificar Dealership Isolation**
```bash
# En Supabase Dashboard → SQL Editor:

-- Ver qué dealership ID tiene el system admin
SELECT dealer_id FROM dealer_memberships
WHERE user_id = auth.uid();

-- Intentar ver dealerships (system admin ve todos)
SELECT id, dealer_name FROM dealerships LIMIT 5;
-- Esperado: Múltiples dealerships visibles
```

---

## ✅ CRITERIOS DE ÉXITO

**Testing PASA si**:
- ✅ Login exitoso
- ✅ Dashboard carga
- ✅ Todas las páginas principales cargan
- ✅ No errores 403/RLS en consola
- ✅ System admin puede ver todo
- ✅ Queries SQL de verificación retornan valores correctos

**Testing FALLA si**:
- 🔴 No puede hacer login
- 🔴 Errores RLS en consola
- 🔴 Páginas no cargan
- 🔴 Datos no aparecen
- 🔴 Errores 403 Forbidden

---

## 🐛 TROUBLESHOOTING

### **Si hay errores RLS**:
```sql
-- Verificar que el usuario tiene membresía activa
SELECT * FROM dealer_memberships
WHERE user_id = auth.uid();

-- Verificar rol del usuario
SELECT id, email, role FROM profiles
WHERE id = auth.uid();
```

### **Si is_system_admin() retorna false**:
```sql
-- Verificar implementación
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'is_system_admin'
AND pronargs = 0;

-- Verificar rol en profiles
SELECT role FROM profiles WHERE email = 'rruiz@lima.llc';
```

### **Si hay errores en console**:
- Abrir DevTools → Console
- Filtrar por "RLS" o "403" o "permission"
- Copiar error completo
- Buscar tabla/policy afectada

---

## 📝 REPORTE POST-TESTING

Después de completar testing, documenta:

**✅ Tests Pasados**:
- Login: ✅/❌
- Dashboard: ✅/❌
- Orders: ✅/❌
- Get Ready: ✅/❌
- Management: ✅/❌
- Settings: ✅/❌

**🔴 Issues Encontrados**:
- Descripción del error
- Pasos para reproducir
- Error en consola

**📊 Tiempo Total**: XX minutos

---

## 🚀 DESPUÉS DEL TESTING

Si todo pasa (esperado):
→ **Continuar con Settings Hub** según `NEXT_SESSION_PLAN.md`

Si hay issues:
→ **Fix inmediato** antes de continuar

---

**TESTING INICIADO: Servidor corriendo en http://localhost:8080**

**Procede con testing manual ahora. Cuando termines, dime los resultados y continuamos con Settings Hub.**
