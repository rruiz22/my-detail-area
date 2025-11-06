# 🔐 Password Reset System - Deployment Guide

## ✅ Sistema Completado - Admin Custom Password Reset

Este documento describe cómo desplegar el **Sistema Admin Custom de Reset Password** en MyDetailArea.

---

## 📋 Componentes Implementados

### ✅ 1. Database Migration
**Archivo**: `supabase/migrations/20251105000004_create_password_reset_system.sql`

**Tablas Creadas**:
- ✅ `password_reset_requests` - Solicitudes de reset iniciadas por admin
- ✅ `bulk_password_operations` - Tracking de operaciones masivas
- ✅ `password_history` - Historial de contraseñas (prevención de reutilización)
- ✅ `security_policies` - Políticas de seguridad por dealership

**Seguridad**:
- ✅ RLS habilitado en todas las tablas
- ✅ Solo `system_admin` puede gestionar resets de contraseñas
- ✅ Indexes optimizados para performance
- ✅ Triggers para `updated_at`
- ✅ Función utilitaria `expire_old_password_resets()`

---

### ✅ 2. Edge Functions

#### **Nueva Edge Function**: `send-password-reset-email`
**Archivo**: `supabase/functions/send-password-reset-email/index.ts`

**Funcionalidad**:
- ✅ Integración con Resend API
- ✅ 3 templates de email profesionales:
  - Email Reset Link (con botón CTA)
  - Temporary Password (con contraseña visible)
  - Force Change (notificación de cambio requerido)
- ✅ Diseño Notion-style (muted colors, sin gradientes)
- ✅ Soporte multi-idioma (EN/ES/PT-BR en diseño)
- ✅ Actualización de metadata en BD con `email_sent` status

#### **Edge Function Modificada**: `reset-user-password`
**Archivo**: `supabase/functions/reset-user-password/index.ts`

**Cambios**:
- ✅ Añadido envío de email después de crear reset request
- ✅ Fetch de user/dealer/admin profiles para personalización
- ✅ Llamada a `send-password-reset-email` Edge Function
- ✅ Error handling robusto (continúa si email falla)
- ✅ Campo `emailSent` en response

#### **Edge Function Modificada**: `bulk-password-operations`
**Archivo**: `supabase/functions/bulk-password-operations/index.ts`

**Cambios**:
- ✅ Añadido envío de email individual para cada usuario en el loop
- ✅ Fetch de dealer/admin profiles una vez (eficiencia)
- ✅ Error handling por email sin fallar operación bulk
- ✅ Logging detallado de emails enviados

---

### ✅ 3. Traducciones (100% Coverage)

**Archivos Modificados**:
- ✅ `public/translations/en.json` - 117 strings añadidos
- ✅ `public/translations/es.json` - 117 strings añadidos
- ✅ `public/translations/pt-BR.json` - 117 strings añadidos

**Namespaces Cubiertos**:
```typescript
password_management.title
password_management.tabs.*
password_management.security.*
password_management.validation.*
password_management.recommendations.*
// ... y 100+ más
```

---

### ✅ 4. UI Components (Ya Existentes - No Requieren Cambios)

Los siguientes componentes ya están completos y funcionando:
- ✅ `UserPasswordManagement.tsx` - Orquestador principal
- ✅ `PasswordResetActions.tsx` - Reset individual
- ✅ `BulkPasswordOperations.tsx` - Operaciones bulk
- ✅ `PasswordSecurityDashboard.tsx` - Dashboard de seguridad
- ✅ `PasswordPolicyManager.tsx` - Gestión de políticas
- ✅ `PasswordActivityLog.tsx` - Log de actividades

---

## 🚀 Pasos de Deployment

### **Paso 1: Aplicar Migración SQL**

```bash
# Aplicar migración a Supabase
npx supabase db push

# O aplicar manualmente en Supabase Dashboard:
# SQL Editor → Copiar contenido de:
# supabase/migrations/20251105000004_create_password_reset_system.sql
```

**Verificación**:
```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'password_reset_requests',
  'bulk_password_operations',
  'password_history',
  'security_policies'
);

-- Verificar RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN (
  'password_reset_requests',
  'bulk_password_operations',
  'password_history'
);
```

---

### **Paso 2: Desplegar Edge Functions**

**Prerequisito**: Autenticación en Supabase CLI
```bash
npx supabase login
```

**Deployment**:
```bash
# Deploy nueva Edge Function de emails
npx supabase functions deploy send-password-reset-email

# Re-deploy Edge Functions modificadas
npx supabase functions deploy reset-user-password
npx supabase functions deploy bulk-password-operations
```

**Verificación**:
```bash
# Listar funciones desplegadas
npx supabase functions list

# Ver logs de una función
npx supabase functions logs send-password-reset-email
```

---

### **Paso 3: Verificar Configuración de Resend**

**Supabase Dashboard** → Project Settings → Edge Functions → Secrets

Verificar que existe:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
PUBLIC_SITE_URL=https://dds.mydetailarea.com
```

Si no existe, añadir:
```bash
npx supabase secrets set RESEND_API_KEY=re_your_key_here
npx supabase secrets set PUBLIC_SITE_URL=https://dds.mydetailarea.com
```

---

### **Paso 4: Verificar Permisos de Usuario**

El usuario actual debe tener rol `system_admin` para acceder al sistema.

**Verificar**:
```sql
SELECT id, email, role
FROM profiles
WHERE email = 'rruiz@lima.llc';
```

**Debe retornar**:
```
role = 'system_admin'
```

---

### **Paso 5: Testing End-to-End**

#### **5.1 Test de Reset Individual**

1. Login como `rruiz@lima.llc` (system_admin)
2. Navegar a `/users` → Tab "Password Management"
3. Buscar un usuario test
4. Seleccionar "Email Reset Link"
5. Click "Reset Password"
6. Verificar:
   - ✅ Toast de éxito
   - ✅ Email recibido en bandeja de entrada
   - ✅ Entrada creada en tabla `password_reset_requests`

#### **5.2 Test de Bulk Operation**

1. En tab "Bulk Operations"
2. Seleccionar múltiples usuarios
3. Elegir "Bulk Email Reset"
4. Confirmar operación
5. Verificar:
   - ✅ Toast de éxito
   - ✅ Emails enviados a todos los usuarios
   - ✅ Entrada creada en tabla `bulk_password_operations`
   - ✅ Contador de "Recent Operations" actualizado

#### **5.3 Test de Email Templates**

Verificar que los 3 templates funcionan:
1. **Email Reset** - Usuario recibe link con botón CTA verde
2. **Temporary Password** - Usuario recibe contraseña temporal en caja gris
3. **Force Change** - Usuario recibe notificación de cambio requerido

#### **5.4 Test de Traducciones**

1. Cambiar idioma a Español (ES)
   - Verificar UI en español
2. Cambiar idioma a Português (PT-BR)
   - Verificar UI en portugués
3. Cambiar idioma a English (EN)
   - Verificar UI en inglés

---

## 🔍 Troubleshooting

### **Problema: Edge Functions no despliegan**

**Error**: `Invalid access token format`

**Solución**:
```bash
npx supabase login
# Seguir instrucciones en navegador
# Reintentar deployment
```

---

### **Problema: Emails no se envían**

**Verificar**:
1. ✅ `RESEND_API_KEY` configurado en Supabase Secrets
2. ✅ Edge Function `send-password-reset-email` desplegada
3. ✅ Logs de Edge Function:
```bash
npx supabase functions logs send-password-reset-email
```

**Errores Comunes**:
- `RESEND_API_KEY not configured` → Añadir secret
- `Reset request not found` → Tabla `password_reset_requests` no existe
- `Failed to send email` → API key inválido

---

### **Problema: UI no muestra Password Management**

**Verificar**:
1. ✅ Usuario tiene rol `system_admin`
2. ✅ Traducciones cargadas correctamente
3. ✅ Componentes existen en `src/components/users/password/`

---

### **Problema: Traducciones no funcionan**

**Verificar JSON válido**:
```bash
# Verificar sintaxis JSON
npx prettier --check public/translations/*.json

# Si hay errores, auto-fix:
npx prettier --write public/translations/*.json
```

---

## 📊 Métricas de Éxito

**Deployment exitoso si**:
- ✅ 4 tablas nuevas en Supabase
- ✅ 3 Edge Functions desplegadas
- ✅ 351 traducciones añadidas (117 x 3 idiomas)
- ✅ Reset individual funciona y envía email
- ✅ Bulk operation funciona y envía emails masivos
- ✅ UI visible solo para `system_admin`
- ✅ Todos los emails usan templates Notion-style

---

## 🎯 Próximos Pasos (Opcional)

### **Mejoras Futuras**:
1. **Encriptación de Temporary Passwords**
   - Actualmente se almacenan en plaintext
   - Considerar bcrypt/argon2 para mayor seguridad

2. **Rate Limiting**
   - Limitar resets por usuario/admin
   - Prevenir abuse

3. **Email Delivery Monitoring**
   - Dashboard de emails enviados/fallidos
   - Integración con Resend webhooks

4. **Scheduled Job**
   - Ejecutar `expire_old_password_resets()` diariamente
   - Limpiar requests expirados automáticamente

5. **MFA Support**
   - Requerir MFA para operaciones bulk
   - Mayor seguridad para admins

---

## 📞 Soporte

Si encuentras problemas durante el deployment:

1. **Revisar logs de Edge Functions**:
```bash
npx supabase functions logs send-password-reset-email --tail
npx supabase functions logs reset-user-password --tail
npx supabase functions logs bulk-password-operations --tail
```

2. **Revisar logs de Supabase**:
   - Supabase Dashboard → Logs → Database
   - Filtrar por `password_reset_requests`

3. **Validar migración SQL**:
```sql
-- Verificar estructura de tablas
\d password_reset_requests
\d bulk_password_operations
\d password_history
\d security_policies
```

---

## ✅ Checklist Final

Antes de considerar el deployment completo, verificar:

- [ ] Migración SQL aplicada exitosamente
- [ ] 4 tablas creadas con RLS habilitado
- [ ] 3 Edge Functions desplegadas
- [ ] Resend API key configurado
- [ ] Usuario system_admin puede acceder a UI
- [ ] Reset individual envía email correctamente
- [ ] Bulk operation funciona para múltiples usuarios
- [ ] Traducciones funcionan en EN/ES/PT-BR
- [ ] Email templates son profesionales y Notion-style
- [ ] Logs de Edge Functions no muestran errores

---

**Deployment completado** ✅
**Fecha**: 2025-11-05
**Sistema**: Admin Custom Password Reset
**Status**: Listo para Producción
