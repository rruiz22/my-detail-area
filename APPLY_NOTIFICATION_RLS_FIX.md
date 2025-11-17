# 🔧 Aplicar Corrección de Políticas RLS para Notification Rules

## 📋 Problema
El sistema está rechazando la creación de reglas de notificación con error **403 Forbidden** debido a que las políticas RLS solo permitían a usuarios con rol `'admin'` en `dealer_memberships` crear reglas, pero los `system_admin` no cumplen ese criterio.

## ✅ Solución
Actualizar las políticas RLS para permitir que tanto **dealer admins** como **system admins** puedan gestionar las reglas de notificación.

---

## 🚀 Pasos para Aplicar la Corrección

### Paso 1: Abrir Supabase Dashboard
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **My Detail Area**
3. En el menú lateral, haz clic en **SQL Editor**

### Paso 2: Copiar el Script SQL
Copia todo el contenido del archivo:
```
supabase/migrations/20251103000007_fix_dealer_notification_rules_rls.sql
```

### Paso 3: Ejecutar el Script
1. En el SQL Editor, pega el contenido completo del script
2. Haz clic en el botón **"Run"** (o presiona `Ctrl + Enter` / `Cmd + Enter`)
3. Verifica que aparezca el mensaje:
   ```
   ✓ DEALER NOTIFICATION RULES RLS POLICIES UPDATED
   ✓ System admins can now create notification rules
   ✓ System admins can now update notification rules
   ✓ System admins can now delete notification rules
   ✓ Dealer admins retain all previous permissions
   ```

### Paso 4: Verificar la Aplicación
1. Recarga tu aplicación en el navegador
2. Ve a **Settings → Dealership → Roles Tab**
3. Haz clic en el botón 🔔 de cualquier custom role
4. Activa algunos módulos y canales de notificación
5. Haz clic en **"Save"**
6. ✅ Debería guardar sin errores

---

## 📝 Cambios Aplicados

### Políticas RLS Actualizadas:

#### **INSERT (Crear Reglas)**
- ✅ System admins pueden crear reglas para cualquier dealership
- ✅ Dealer admins pueden crear reglas para su dealership

#### **UPDATE (Actualizar Reglas)**
- ✅ System admins pueden actualizar cualquier regla
- ✅ Dealer admins pueden actualizar reglas de su dealership

#### **DELETE (Eliminar Reglas)**
- ✅ System admins pueden eliminar cualquier regla
- ✅ Dealer admins pueden eliminar reglas de su dealership

---

## 🎯 Qué Esperar Después

Una vez aplicada esta migración, podrás:

1. ✅ Configurar notificaciones por rol desde **Settings → Dealership → Roles**
2. ✅ Seleccionar qué roles reciben notificaciones para cada módulo:
   - 💰 Sales Orders
   - 🔧 Service Orders
   - 🚗 Recon Orders
   - 🧼 Car Wash
   - 🚀 Get Ready
3. ✅ Configurar canales de notificación:
   - 🔔 In-App
   - 💬 SMS
   - 📧 Email
   - 📱 Push
4. ✅ Guardar las configuraciones sin errores 403

---

## 🆘 Solución de Problemas

### Si el error 403 persiste:
1. Verifica que la migración se ejecutó correctamente
2. Cierra sesión y vuelve a iniciar sesión en la aplicación
3. Limpia la caché del navegador (`Ctrl + Shift + R` o `Cmd + Shift + R`)
4. Si el problema continúa, verifica en Supabase Dashboard → Authentication → Policies que las políticas se hayan actualizado

### Si aparecen otros errores:
1. Revisa la consola del navegador para más detalles
2. Verifica que tu usuario tenga `user_type = 'system_admin'` en la tabla `profiles`
3. Contacta con soporte técnico

---

## 📚 Documentación Técnica

Las políticas RLS actualizadas están en:
- `supabase/migrations/20251103000007_fix_dealer_notification_rules_rls.sql`

Para más información sobre el sistema de notificaciones:
- `supabase/migrations/NOTIFICATION_SYSTEM_README.md`
