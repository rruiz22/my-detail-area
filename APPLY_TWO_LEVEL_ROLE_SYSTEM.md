# 🚀 Apply Two-Level Role System - Quick Instructions

**IMPORTANTE**: Ejecutar estos scripts EN ORDEN

---

## 📋 Pre-requisitos

- Acceso a la base de datos de Supabase
- SQL Editor abierto en Supabase Dashboard

---

## ⚡ Instrucciones Rápidas

### Paso 1: Crear System Roles
```sql
-- Ejecutar: CREATE_SYSTEM_ROLES.sql
-- Esto crea: user, manager, system_admin
```

✅ **Verificación**: Deberías ver 3 roles con `dealer_id = NULL`

---

### Paso 2: Configurar Permisos
```sql
-- Ejecutar: CONFIGURE_SYSTEM_ROLE_PERMISSIONS.sql
-- Esto configura permisos para user y manager roles
```

✅ **Verificación**: El script mostrará mensajes de éxito para cada paso

---

### Paso 3: Migrar Usuario Actual
```sql
-- Ejecutar: UPDATE_USER_SYSTEM_ROLE.sql
-- Esto actualiza de "sales_manager" a "user"
```

✅ **Verificación**: El script mostrará estado antes y después de la migración

---

## 🧪 Testing

### 1. Recargar Aplicación
Refrescar el navegador en `http://localhost:8080`

### 2. Abrir Console DevTools
Presionar `F12` → Tab "Console"

### 3. Buscar Logs
Deberías ver:
```
📋 Found 2 total role(s) for user
   - Dealer custom roles: 1
   - System role: 1
📋 Roles breakdown: [
  {
    type: "dealer_custom_role",
    role_name: "used_car_manager",
    dealer_id: 5
  },
  {
    type: "system_role",
    role_name: "user",
    dealer_id: null
  }
]
```

---

## ✅ Checklist

- [ ] Script 1: `CREATE_SYSTEM_ROLES.sql` ejecutado
- [ ] Script 2: `CONFIGURE_SYSTEM_ROLE_PERMISSIONS.sql` ejecutado
- [ ] Script 3: `UPDATE_USER_SYSTEM_ROLE.sql` ejecutado
- [ ] Aplicación recargada
- [ ] Logs verificados en consola
- [ ] Usuario tiene 2 roles (1 system + 1 dealer custom)

---

## 🆘 Troubleshooting

### Problema: "role_name user already exists"
**Solución**: Los roles ya fueron creados. Continuar con Paso 2.

### Problema: "System role 'user' not found"
**Solución**: Ejecutar Paso 1 primero (CREATE_SYSTEM_ROLES.sql)

### Problema: Usuario solo tiene 1 role
**Verificar**:
```sql
SELECT
  dm.user_id,
  p.email,
  dcr.role_name,
  dcr.dealer_id,
  CASE WHEN dcr.dealer_id IS NULL THEN 'System Role' ELSE 'Dealer Role' END
FROM dealer_memberships dm
JOIN profiles p ON p.id = dm.user_id
LEFT JOIN dealer_custom_roles dcr ON dcr.id = dm.custom_role_id
WHERE p.email = '[TU_EMAIL]';
```

### Problema: Warning "Invalid system role assignment"
**Causa**: Role en `dealer_memberships` tiene `dealer_id != NULL`
**Solución**: Ejecutar `UPDATE_USER_SYSTEM_ROLE.sql` para corregir

---

## 📚 Documentación Completa

Ver: `TWO_LEVEL_ROLE_SYSTEM_IMPLEMENTATION_COMPLETE.md`

---

**¿Listo?** Ejecuta los scripts y recarga la app! 🎉
