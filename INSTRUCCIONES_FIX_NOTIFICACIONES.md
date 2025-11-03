# 🚨 CORRECCIÓN URGENTE - Permisos de Notificaciones

## ⚡ Error Actual
```
Error 403: new row violates row-level security policy for table "dealer_notification_rules"
```

## ✅ Solución Rápida (3 minutos)

### 1️⃣ Abre Supabase Dashboard
🔗 [https://supabase.com/dashboard](https://supabase.com/dashboard)

### 2️⃣ Ve a SQL Editor
- En el menú lateral: **SQL Editor**
- Haz clic en **"New query"**

### 3️⃣ Copia y Pega
Abre el archivo **`FIX_NOTIFICATION_RLS_NOW.sql`** (en la raíz del proyecto)
- Selecciona TODO el contenido
- Cópialo
- Pégalo en el SQL Editor de Supabase

### 4️⃣ Ejecuta
- Haz clic en **"Run"** (o presiona `Ctrl + Enter`)
- Espera 2-3 segundos
- Deberías ver: ✅ **"Policies Updated Successfully!"** con `policy_count = 3`

### 5️⃣ Recarga la App
- En tu navegador, presiona `Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac)
- Ve a **Settings → Dealership → Roles Tab**
- Haz clic en el botón 🔔 de cualquier rol
- Configura las notificaciones
- ¡Haz clic en **Save**!
- ✅ Debería funcionar sin errores

---

## 🎯 ¿Qué Hace Este Script?

Actualiza los permisos de la base de datos para permitir que:
- ✅ **System admins** (tú) puedan gestionar notificaciones
- ✅ **Dealer admins** también puedan gestionar notificaciones de su dealership

---

## 💡 Módulos Disponibles Después del Fix

Una vez aplicado, podrás configurar notificaciones para:

1. **💰 Sales Orders** - Ordenes de ventas
2. **🔧 Service Orders** - Ordenes de servicio
3. **🚗 Recon Orders** - Ordenes de recon
4. **🧼 Car Wash** - Car wash orders
5. **🚀 Get Ready** - Módulo Get Ready (NUEVO!)

Con canales:
- 🔔 In-App
- 💬 SMS
- 📧 Email
- 📱 Push

---

## 🆘 ¿Problemas?

Si después de aplicar el script sigues viendo el error:
1. Cierra sesión en la app
2. Vuelve a iniciar sesión
3. Intenta de nuevo

Si aún no funciona, avísame y revisaré los permisos de tu usuario.
