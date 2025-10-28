# 🛠️ Guía de Uso: Permissions Debugger

## 🎯 ¿Qué es?

El **Permissions Debugger** es una herramienta de desarrollo que te permite ver en tiempo real el estado de los permisos de un usuario, incluyendo:

- Módulos habilitados a nivel dealer
- Módulos habilitados a nivel rol
- Permisos granulares del usuario
- Estado de carga de permisos

## 📍 ¿Dónde lo encuentro?

El debugger aparece automáticamente en **modo desarrollo** como un botón flotante en la esquina inferior derecha:

```
┌─────────────────────────────────┐
│                                 │
│        Tu aplicación            │
│                                 │
│                                 │
│                   ┌───────────┐ │
│                   │ 🛡️ Debugger│ │
│                   └───────────┘ │
└─────────────────────────────────┘
```

**Ubicación:** Esquina inferior derecha de la pantalla

## 🚀 Cómo usar

### 1. **Abrir el Debugger**

Haz clic en el botón "Permissions Debugger" en la esquina inferior derecha.

### 2. **Pestañas disponibles**

El debugger tiene 4 pestañas:

#### 📊 **Overview** (Vista general)
Muestra información resumida:
- ID del usuario
- Email
- Dealership ID
- Si es System Admin
- Estado de carga
- Estadísticas rápidas:
  - Cuántos módulos tiene el dealer
  - Cuántos módulos tiene el rol
  - Cuántos permisos tiene el usuario

#### 📦 **Modules** (Módulos)
Lista todos los módulos del sistema con su estado:

| Icono | Significado |
|-------|-------------|
| ✅ Verde | Módulo activo y con permisos |
| ⚠️ Amarillo | Módulo activo pero sin permisos |
| ❌ Rojo | Módulo bloqueado (dealer o rol) |

**Razones de bloqueo:**
- "Dealer module disabled" → El dealer no tiene el módulo habilitado
- "Role module disabled" → El rol no tiene acceso al módulo
- "No permissions" → El usuario no tiene permisos en ese módulo

#### 🔐 **Permissions** (Permisos)
Muestra todos los permisos del usuario, divididos en:

**System Permissions:**
```
✅ manage_all_users
✅ manage_dealer_settings
✅ view_analytics
```

**Module Permissions:**
```
sales_orders
  ✅ view_orders
  ✅ create_orders
  ✅ edit_orders
  
service_orders
  ✅ view_orders
  ✅ approve_orders
```

#### 📄 **Raw** (Datos crudos)
Muestra el JSON completo del estado de permisos. Útil para:
- Copiar y pegar en reportes de bugs
- Análisis detallado
- Compartir con el equipo

### 3. **Acciones disponibles**

| Botón | Acción | Descripción |
|-------|--------|-------------|
| 🔄 | Refrescar | Recarga los datos de permisos |
| 📋 | Copiar | Copia el estado completo al portapapeles |

## 🔍 Casos de uso

### Caso 1: Usuario reporta "Access Denied"

1. Abre el debugger
2. Ve a la pestaña **Modules**
3. Busca el módulo que está dando error
4. Verifica el estado:
   - Si está rojo: revisa por qué (dealer o rol)
   - Si está amarillo: el usuario necesita permisos

### Caso 2: Verificar si un permiso está asignado

1. Abre el debugger
2. Ve a la pestaña **Permissions**
3. Busca el módulo
4. Verifica si el permiso aparece en la lista

### Caso 3: Debugging de race conditions

1. Abre el debugger inmediatamente al cargar la página
2. Ve a **Overview**
3. Observa el "Loading State":
   - Si está en "Loading..." pero pasa mucho tiempo → Hay un problema
   - Si cambia rápidamente a "Ready" → Todo OK

### Caso 4: Reportar un bug

1. Reproduce el error
2. Abre el debugger
3. Haz clic en el botón **📋 Copiar**
4. Pega el JSON en tu reporte de bug

## 🎨 Interfaz Visual

### Estado de Módulos

```
✅ dashboard          → "8 permissions"
⚠️ dealerships       → "No permissions"
❌ management        → "Dealer module disabled"
```

### Colores y Badges

| Color | Badge | Significado |
|-------|-------|-------------|
| 🟢 Verde | YES | System Admin activo |
| 🔴 Rojo | NO | No es System Admin |
| 🟢 Verde | Ready | Permisos cargados |
| 🔴 Rojo | Loading... | Aún cargando |

## 💡 Tips y Trucos

### Tip 1: Modo Sticky
El debugger permanece abierto mientras navegas entre páginas. Ciérralo cuando no lo necesites para liberar espacio.

### Tip 2: Comparar estados
1. Copia el estado con **📋**
2. Haz cambios en permisos (ej: asignar un nuevo rol)
3. Refresca con **🔄**
4. Copia nuevamente
5. Compara ambos JSON para ver qué cambió

### Tip 3: Verificar antes de guardar
Antes de guardar permisos de un rol:
1. Asigna temporalmente el rol a tu usuario de prueba
2. Abre el debugger
3. Verifica que los permisos aparezcan correctamente
4. Si todo está bien, asigna el rol al usuario final

### Tip 4: Screenshot para soporte
Si necesitas ayuda del equipo:
1. Abre el debugger
2. Expande la información relevante
3. Toma un screenshot
4. Adjúntalo a tu ticket

## 🚨 Señales de Alerta

### ⚠️ "No modules configured"
**Qué significa:** El dealer no tiene módulos configurados en la base de datos.

**Cómo resolver:**
1. Ve a `/admin/:dealerId`
2. Tab "Modules"
3. Activa los módulos necesarios

### ⚠️ "Loading State: Loading..." por más de 5 segundos
**Qué significa:** Los permisos no están cargando correctamente.

**Posibles causas:**
- Error en la query de permisos
- Usuario sin rol asignado
- Problema de conexión con Supabase

**Cómo resolver:**
1. Refresca la página
2. Verifica la consola del navegador para errores
3. Verifica que el usuario tenga un rol asignado

### ⚠️ Muchos módulos en rojo
**Qué significa:** El dealer tiene muchos módulos deshabilitados O el rol tiene acceso limitado.

**Verificar:**
1. Ve a `/admin/:dealerId` → Tab "Modules"
2. Verifica qué módulos están habilitados
3. Si están habilitados pero siguen rojos, verifica el rol

### ⚠️ Permisos vacíos pero rol asignado
**Qué significa:** El rol existe pero no tiene permisos configurados.

**Cómo resolver:**
1. Ve a `/admin/:dealerId` → Tab "Roles"
2. Edita el rol
3. Tab "Permissions"
4. Asigna los permisos necesarios

## 📊 Interpretando los datos

### Ejemplo: Acceso denegado al módulo "dealerships"

**Debugger muestra:**
```
Modules Tab:
  ❌ dealerships → "Dealer module disabled"
```

**Diagnóstico:**
- El dealer no tiene el módulo "dealerships" habilitado
- Aunque el rol tenga permisos, no importa

**Solución:**
1. System admin accede a `/admin/:dealerId`
2. Tab "Modules"
3. Activa el módulo "dealerships"

---

### Ejemplo: Usuario puede ver pero no editar

**Debugger muestra:**
```
Permissions Tab:
  sales_orders
    ✅ view_orders
```

**Diagnóstico:**
- El usuario solo tiene permiso de view
- Falta el permiso `edit_orders`

**Solución:**
1. Identifica el rol del usuario
2. Edita el rol
3. Agrega el permiso `edit_orders` al módulo `sales_orders`

---

### Ejemplo: System Admin no puede acceder

**Debugger muestra:**
```
Overview:
  System Admin: NO
  Loading State: Ready
```

**Diagnóstico:**
- El usuario NO es system admin
- O hay un error en la carga del perfil

**Verificar en base de datos:**
```sql
SELECT 
  id, 
  email, 
  role, 
  is_system_admin 
FROM auth.users 
WHERE email = 'tu@email.com';
```

**Si `is_system_admin = false` pero debería ser admin:**
```sql
UPDATE auth.users 
SET is_system_admin = true 
WHERE email = 'tu@email.com';
```

## 🔧 Troubleshooting

| Problema | Solución |
|----------|----------|
| El debugger no aparece | Verifica que estés en modo desarrollo (`npm run dev`) |
| Los datos no se actualizan | Haz clic en el botón 🔄 Refrescar |
| No puedo copiar el JSON | Haz clic en 📋 y luego Ctrl+V en un editor |
| El debugger tapa contenido | Ciérralo temporalmente con el botón de arriba |

## 🎓 Mejores Prácticas

1. **Usa el debugger ANTES de cambiar permisos** para ver el estado inicial
2. **Usa el debugger DESPUÉS de cambiar permisos** para verificar que se aplicaron
3. **Copia el estado** antes de hacer cambios importantes (backup)
4. **Toma screenshots** cuando reportes problemas
5. **Comparte el JSON Raw** con el equipo de desarrollo para debugging

## 📞 ¿Necesitas ayuda?

Si el debugger muestra datos que no entiendes:

1. Toma un screenshot del debugger completo
2. Copia el JSON de la pestaña "Raw"
3. Describe qué estabas intentando hacer
4. Envía toda esta información al equipo de desarrollo

---

**Última actualización:** 2025-10-27
**Versión del debugger:** 1.0.0


