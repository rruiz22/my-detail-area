# 🚀 Aplicar RLS Optimization Phase 1 - Instrucciones Manuales

**⚠️ IMPORTANTE**: El MCP de Supabase no está disponible. Debes aplicar esta migración manualmente.

---

## 📋 Opción 1: Supabase Dashboard (RECOMENDADO)

### **Paso 1: Abrir SQL Editor**

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr)
2. Click en **SQL Editor** en la barra lateral izquierda
3. Click en **New Query**

### **Paso 2: Copiar SQL**

Abre el archivo:
```
c:\Users\rudyr\apps\mydetailarea\supabase\migrations\20251121000000_fix_critical_rls_auth_initplan_phase1.sql
```

Y copia TODO el contenido (327 líneas).

### **Paso 3: Pegar y Ejecutar**

1. Pega el SQL completo en el editor
2. Click en **Run** (botón verde inferior derecho)
3. Espera ~5-10 minutos (puede tomar hasta 30 min)
4. Deberías ver: ✅ Success message

---

## 📋 Opción 2: Aplicar en 3 Partes (Si Opción 1 falla)

Si el SQL completo falla por timeout, aplica en 3 partes separadas:

### **Parte 1: PROFILES Table**

```sql
-- Drop all existing profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_dealer_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_same_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_dealer_isolation" ON profiles;
DROP POLICY IF EXISTS "secure_view_dealership_profiles" ON profiles;
DROP POLICY IF EXISTS "secure_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "secure_manage_dealership_profiles" ON profiles;
DROP POLICY IF EXISTS "secure_delete_dealership_profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_view_own" ON profiles;
DROP POLICY IF EXISTS "profiles_view_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_managers" ON profiles;
DROP POLICY IF EXISTS "profiles_update_managers" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_managers" ON profiles;
DROP POLICY IF EXISTS "secure_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_system_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_dealership" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

-- Recreate optimized profiles policies

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_select_same_dealership" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm1
      INNER JOIN dealer_memberships dm2
        ON dm1.dealer_id = dm2.dealer_id
      WHERE dm1.user_id = profiles.id
        AND dm2.user_id = (SELECT auth.uid())
        AND dm1.is_active = true
        AND dm2.is_active = true
    )
  );

CREATE POLICY "profiles_select_system_admin" ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'system_admin'
    )
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    (id = (SELECT auth.uid()) AND role = (SELECT role FROM profiles WHERE id = (SELECT auth.uid())))
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'system_admin'
    )
  );

CREATE POLICY "profiles_update_system_admin" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'system_admin'
    )
  );

CREATE POLICY "profiles_delete_system_admin" ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'system_admin'
    )
  );

COMMENT ON TABLE profiles IS 'RLS policies optimized 2025-11-21 Phase 1: All auth.uid() calls wrapped in SELECT subquery';
```

✅ **Ejecuta y espera éxito** antes de continuar

---

### **Parte 2: DEALER_MEMBERSHIPS Table**

```sql
-- Drop all existing dealer_memberships policies
DROP POLICY IF EXISTS "secure_view_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "secure_manage_dealer_memberships" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_own" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_select_same_dealer" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_insert_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "dealer_memberships_update_system_admin" ON dealer_memberships;
DROP POLICY IF EXISTS "secure_update" ON dealer_memberships;

-- Recreate optimized dealer_memberships policies

CREATE POLICY "dealer_memberships_select_own" ON dealer_memberships
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "dealer_memberships_select_same_dealer" ON dealer_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = dealer_memberships.dealer_id
        AND dm.user_id = (SELECT auth.uid())
        AND dm.is_active = true
    )
  );

CREATE POLICY "dealer_memberships_select_system_admin" ON dealer_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "dealer_memberships_insert_system_admin" ON dealer_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "dealer_memberships_update_system_admin" ON dealer_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "dealer_memberships_delete_system_admin" ON dealer_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

COMMENT ON TABLE dealer_memberships IS 'RLS policies optimized 2025-11-21 Phase 1: All auth.uid() calls wrapped in SELECT subquery';
```

✅ **Ejecuta y espera éxito** antes de continuar

---

### **Parte 3: ORDERS Table**

```sql
-- Drop all existing orders policies
DROP POLICY IF EXISTS "Users can view orders in their dealer" ON orders;
DROP POLICY IF EXISTS "Temporary: Allow authenticated users to create orders" ON orders;
DROP POLICY IF EXISTS "Temporary: Allow authenticated users to view orders" ON orders;
DROP POLICY IF EXISTS "Temporary: Allow authenticated users to update orders" ON orders;
DROP POLICY IF EXISTS "Users can view accessible orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders in their dealer groups" ON orders;
DROP POLICY IF EXISTS "Users can update orders with proper permissions" ON orders;
DROP POLICY IF EXISTS "orders_dealer_isolation" ON orders;
DROP POLICY IF EXISTS "orders_module_access" ON orders;
DROP POLICY IF EXISTS "orders_edit_status_restriction" ON orders;
DROP POLICY IF EXISTS "orders_delete_admin_only" ON orders;
DROP POLICY IF EXISTS "secure_view_orders" ON orders;
DROP POLICY IF EXISTS "secure_insert_orders" ON orders;
DROP POLICY IF EXISTS "secure_update_orders" ON orders;
DROP POLICY IF EXISTS "secure_delete_orders" ON orders;
DROP POLICY IF EXISTS "enterprise_view_orders" ON orders;
DROP POLICY IF EXISTS "enterprise_insert_orders" ON orders;
DROP POLICY IF EXISTS "enterprise_update_orders" ON orders;
DROP POLICY IF EXISTS "enterprise_delete_orders" ON orders;
DROP POLICY IF EXISTS "sales_orders_supermanager_view_all" ON orders;
DROP POLICY IF EXISTS "sales_orders_supermanager_crud_all" ON orders;
DROP POLICY IF EXISTS "service_orders_supermanager_view_all" ON orders;
DROP POLICY IF EXISTS "service_orders_supermanager_crud_all" ON orders;
DROP POLICY IF EXISTS "recon_orders_supermanager_view_all" ON orders;
DROP POLICY IF EXISTS "recon_orders_supermanager_crud_all" ON orders;
DROP POLICY IF EXISTS "car_wash_orders_supermanager_view_all" ON orders;
DROP POLICY IF EXISTS "car_wash_orders_supermanager_crud_all" ON orders;

-- Recreate optimized orders policies

CREATE POLICY "enterprise_view_orders" ON orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = orders.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

CREATE POLICY "enterprise_insert_orders" ON orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = orders.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

CREATE POLICY "enterprise_update_orders" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = orders.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = orders.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

CREATE POLICY "enterprise_delete_orders" ON orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

COMMENT ON TABLE orders IS 'RLS policies optimized 2025-11-21 Phase 1: All auth.uid() calls wrapped in SELECT subquery';
```

✅ **Ejecuta y espera éxito**

---

## ✅ Verificación

Después de aplicar la migración (completa o en partes), ejecuta el archivo de verificación:

```
c:\Users\rudyr\apps\mydetailarea\supabase\VERIFY_RLS_PHASE1.sql
```

Copia el contenido completo, pégalo en SQL Editor, y ejecuta.

**Deberías ver:**
- ✅ Check 1: 0 rows (no bare auth.uid())
- ✅ Check 2: profiles=6, dealer_memberships=6, orders=4
- ✅ Check 3: All policies show "✅ OPTIMIZED"

---

## 🚨 Si Algo Sale Mal

### Error: "Permission denied"
**Causa**: No tienes permisos de admin
**Solución**: Contacta al admin de Supabase o usa service_role key

### Error: "Policy already exists"
**Causa**: DROP POLICY no eliminó la policy
**Solución**: Ejecuta cada DROP POLICY individualmente

### Error: "Timeout"
**Causa**: Query muy larga
**Solución**: Usa Opción 2 (aplicar en 3 partes)

---

## 📊 Resultados Esperados

Después de aplicar exitosamente:
- ✅ Login funciona normalmente
- ✅ Orders page carga correctamente
- ✅ Performance 5-10x más rápida en queries RLS
- ✅ 0 linter warnings en estas 3 tablas

---

**¿Algún problema? Déjame saber el error exacto y te ayudo a resolverlo.** 🚀
