# ✅ Campo de Teléfono Mejorado - Formato USA Automático

## 🎯 Cambios Implementados

### **Lo que ahora hace el campo de teléfono:**

1. ✅ **Solo acepta 10 dígitos** (formato USA)
2. ✅ **Formatea automáticamente** mientras escribes: `(555) 123-4567`
3. ✅ **Agrega +1 automáticamente** al guardar (formato E.164 para SMS)
4. ✅ **Valida exactamente 10 dígitos** antes de guardar
5. ✅ **Muestra formato visual** al cargar desde BD

---

## 📝 Ejemplo de Uso

### **Usuario escribe:**
```
7 7 4 4 1 0 8 9 6 2
```

### **Se formatea automáticamente a:**
```
(774) 410-8962
```

### **Se guarda en BD como:**
```
+17744108962
```

### **Cuando se carga de BD:**
```
+17744108962 → se muestra como → (774) 410-8962
```

---

## 🚀 Cómo Probar AHORA

### **Paso 1: Ve a tu perfil**
1. Abre tu app: http://localhost:8080
2. Click en tu avatar (arriba derecha)
3. Click en **"Settings"** o **"Profile"**
4. Ve a la pestaña **"Personal Information"**

### **Paso 2: Prueba el campo de teléfono**

**Test 1 - Escritura básica:**
```
Escribe: 7744108962
Ve en tiempo real: (774) 410-8962
```

**Test 2 - Con caracteres extras (se filtran automáticamente):**
```
Escribe: (774) 410-8962
Ve: (774) 410-8962
```

**Test 3 - Más de 10 dígitos (se limita automáticamente):**
```
Escribe: 77441089621234
Ve: (774) 410-8962 (solo toma los primeros 10)
```

**Test 4 - Menos de 10 dígitos (error de validación):**
```
Escribe: 774410
Guarda: ❌ Error: "Phone number must be exactly 10 digits"
```

### **Paso 3: Guarda y verifica en BD**

1. Escribe un número completo: `7744108962`
2. Click en **"Save Changes"**
3. ✅ Deberías ver toast verde: "Profile updated successfully"

**Verifica en Supabase SQL Editor:**
```sql
SELECT
  id,
  first_name,
  last_name,
  email
FROM profiles
WHERE id = 'tu-user-id';

-- Luego verifica las preferencias:
SELECT
  user_id,
  phone,
  created_at,
  updated_at
FROM user_preferences
WHERE user_id = 'tu-user-id';
```

**Deberías ver:**
```
phone: +17744108962
```

---

## 🎨 UI Mejorada

### **Antes:**
```
Label: Phone
Placeholder: Enter your phone number
Hint: Format: (555) 123-4567 or +1 555 123 4567
```

### **Ahora:**
```
Label: Phone (SMS Notifications) ← Clarifica el uso
Placeholder: (555) 123-4567 ← Muestra el formato exacto
Hint: 📱 Enter 10 digits. System automatically adds +1 for SMS notifications.
maxLength: 14 ← Limita caracteres (incluye paréntesis y guiones)
```

---

## 📊 Archivos Modificados

### **1. `src/schemas/profileSchemas.ts`**

**Cambios:**
- ✅ Nueva función: `formatPhoneNumber()` - Solo acepta 10 dígitos USA
- ✅ Nueva función: `phoneToE164()` - Convierte a +1XXXXXXXXXX
- ✅ Nueva función: `phoneFromE164()` - Convierte de +1XX... a (XXX) XXX-XXXX
- ✅ Validación actualizada: Exactamente 10 dígitos

**Función clave:**
```typescript
// Formatear mientras escribes
formatPhoneNumber("7744108962") → "(774) 410-8962"

// Convertir para guardar
phoneToE164("(774) 410-8962") → "+17744108962"

// Convertir para mostrar
phoneFromE164("+17744108962") → "(774) 410-8962"
```

### **2. `src/components/profile/PersonalInformationTab.tsx`**

**Cambios:**
- ✅ Import de nuevas funciones de conversión
- ✅ `useEffect`: Convierte de E.164 a display al cargar
- ✅ `handleSave`: Convierte de display a E.164 al guardar
- ✅ Input: maxLength=14, placeholder mejorado
- ✅ Label y hint actualizados

---

## ✅ Validación y Reglas

| Escenario | Input | Resultado |
|-----------|-------|-----------|
| **10 dígitos** | `7744108962` | ✅ `(774) 410-8962` guardado como `+17744108962` |
| **Con formato** | `(774) 410-8962` | ✅ Se filtra y guarda correctamente |
| **9 dígitos** | `774410896` | ❌ Error: "must be exactly 10 digits" |
| **11 dígitos** | `17744108962` | ✅ Se limita a 10: `(774) 410-8962` |
| **Con letras** | `774ABC8962` | Se filtran las letras: `(774) 896-2` |
| **Vacío** | `` | ✅ Permitido (opcional) |

---

## 🔍 Verificación en la Base de Datos

### **Antes de estos cambios:**
```sql
SELECT phone FROM user_preferences;
-- Podía haber:
-- "7744108962"
-- "(774) 410-8962"
-- "+1 774 410 8962"
-- Inconsistente ❌
```

### **Después de estos cambios:**
```sql
SELECT phone FROM user_preferences;
-- Siempre será:
-- "+17744108962"
-- Formato E.164 consistente ✅
```

---

## 🧪 Test Completo - Paso a Paso

### **Test 1: Nuevo Usuario**
1. Ve a Settings → Personal Information
2. Escribe en Phone: `5551234567`
3. Verifica que se formatee: `(555) 123-4567`
4. Click "Save Changes"
5. Refresca la página
6. Verifica que sigue mostrando: `(555) 123-4567`

**Verifica en SQL:**
```sql
SELECT phone FROM user_preferences WHERE user_id = 'tu-id';
-- Debe ser: +15551234567
```

### **Test 2: Usuario con Teléfono Existente**
Si ya tenías un teléfono guardado en formato antiguo:

```sql
-- Simula un teléfono en formato antiguo
UPDATE user_preferences
SET phone = '7744108962'
WHERE user_id = 'tu-id';
```

1. Refresca la página de Settings
2. El campo debería mostrar: `(774) 410-8962` (convertido automáticamente)
3. Edita cualquier campo y guarda
4. Verifica en SQL que ahora es: `+17744108962`

### **Test 3: Validación de Errores**
1. Escribe solo 5 dígitos: `55512`
2. Intenta guardar
3. ❌ Deberías ver error: "Phone number must be exactly 10 digits"
4. Completa a 10 dígitos: `5551234567`
5. ✅ Ahora sí guarda

---

## 📱 Integración con SMS

### **Ahora que el formato es consistente:**

```typescript
// En orderSMSService.ts
const followers = await supabase
  .from('entity_followers')
  .select(`
    profiles!inner (
      phone  // ← Siempre será +1XXXXXXXXXX
    )
  `);

// Puedes usar directamente en Twilio:
await supabase.functions.invoke('send-sms', {
  body: {
    to: follower.profiles.phone, // +17744108962 ✅
    message: 'Order ready!',
    orderNumber: 'ORD-123'
  }
});
```

**Antes:** Podía fallar porque el formato era inconsistente
**Ahora:** Siempre funciona porque el formato es E.164 estándar ✅

---

## 🎯 Próximos Pasos

1. ✅ **Prueba tu perfil** con los pasos de arriba
2. ✅ **Verifica el formato en BD** con SQL
3. ✅ **Prueba SMS** siguiendo `PRUEBA_SMS_ORDEN_REAL_RAPIDO.md`
4. ✅ **Confirma que llega el SMS** a tu teléfono

---

## 🆘 Troubleshooting

### **Problema: El campo no formatea mientras escribo**
✅ **Solución:** Refresca la página (Ctrl+R)

### **Problema: Sigue guardando en formato antiguo**
✅ **Solución:**
```bash
# Limpia cache del navegador
# Refresca con Ctrl+Shift+R
```

### **Problema: Error al guardar**
✅ **Solución:** Asegúrate de escribir exactamente 10 dígitos

### **Problema: No muestra mi teléfono existente**
✅ **Solución:** Verifica en SQL:
```sql
SELECT phone FROM user_preferences WHERE user_id = 'tu-id';
```

Si está vacío, agrega uno:
```sql
UPDATE user_preferences
SET phone = '+17744108962'
WHERE user_id = 'tu-id';
```

---

## 📝 Resumen de Funciones

| Función | Input | Output | Uso |
|---------|-------|--------|-----|
| `formatPhoneNumber()` | `7744108962` | `(774) 410-8962` | Formateo en tiempo real |
| `phoneToE164()` | `(774) 410-8962` | `+17744108962` | Al guardar en BD |
| `phoneFromE164()` | `+17744108962` | `(774) 410-8962` | Al cargar de BD |

---

**¿Listo para probar?** 🚀

1. Ve a **Settings** → **Personal Information**
2. Escribe tu teléfono: `7744108962`
3. Verifica el formato: `(774) 410-8962`
4. Guarda y confirma en SQL: `+17744108962`

¡Ya está listo para recibir SMS! 📱✨
