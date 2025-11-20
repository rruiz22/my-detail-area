# 🧪 Plan de Testing - Sistema de Reconocimiento Facial

**Fecha**: 2025-11-19
**Estado**: ✅ LISTO PARA VALIDACIÓN
**Cambios Aplicados**: Fix de WebGL blocker duplicado

---

## ✅ Cambios Implementados

### 1. Eliminación de Código Redundante
- ❌ **ANTES**: WebGL blocker en DOS lugares (disableWebGL.ts + faceApiService.ts)
- ✅ **DESPUÉS**: WebGL blocker SOLO en disableWebGL.ts (centralizado)
- **Beneficio**: Elimina conflictos y garantiza orden de ejecución correcto

### 2. Arquitectura Final
```
main.tsx (línea 4)
  └── import "./utils/disableWebGL"
        └── Bloquea WebGL ANTES de que se cargue cualquier librería
              └── face-api.js / TensorFlow.js → Forzados a usar CPU backend
```

---

## 🎯 Test Suite 1: WebGL Blocking (CRÍTICO)

### Objetivo
Verificar que el error de TensorFlow backend está resuelto.

### Pasos

#### 1️⃣ Preparación
1. Abrir Edge/Chrome en modo incógnito (evitar cache)
2. Ir a: http://localhost:8080
3. Abrir DevTools (F12)
4. Ir a la pestaña **Console**

#### 2️⃣ Verificar Bloqueador Cargado
**Buscar en console al cargar la página**:
```
[WebGL Blocker] Installing WebGL context blocker...
[WebGL Blocker] ✓ WebGL contexts will be blocked (CPU-only mode)
```

✅ **SI VES ESTOS MENSAJES**: Bloqueador instalado correctamente
❌ **SI NO LOS VES**: El import no se está ejecutando (PROBLEMA GRAVE)

#### 3️⃣ Login y Navegación
1. Login como: `rruiz@lima.llc`
2. Ir a: **Detail Hub** → **Employee Portal**
3. Buscar cualquier empleado sin face enrollment
4. Click en el ícono **Camera** (azul) junto al nombre del empleado

#### 4️⃣ Validar Carga de Modelos
**FaceEnrollmentModal se abre**

**Buscar en console**:
```
[FaceAPI Service] Starting initialization (CPU-only mode)...
[FaceAPI Service] WebGL disabled, TensorFlow will use CPU backend
[FaceAPI Service] Loading models from: /models
[FaceAPI Service] ✓ Tiny face detector loaded
[FaceAPI Service] ✓ Face landmark detector loaded
[FaceAPI Service] ✓ Face recognition model loaded
[FaceAPI Service] All models loaded successfully
```

✅ **SI VES TODOS LOS CHECKMARKS**: Modelos cargados correctamente
❌ **SI HAY ERRORES**: Verificar que los archivos en `/public/models/` existen

#### 5️⃣ Test de Detección Facial (El Momento de la Verdad)
1. Permitir acceso a la cámara cuando el navegador lo pida
2. Posicionar tu cara frente a la cámara
3. Click en botón **"Enrollar Rostro"** / **"Capture Face"**

**VALIDACIÓN CRÍTICA**:
```
✅ ÉXITO: Face detected → Preview de foto aparece
❌ FALLA: Error en console: "Cannot read properties of undefined (reading 'backend')"
```

**Si aparece el error**:
- Buscar en console: `[WebGL Blocker] Blocked webgl context creation`
- Si NO aparece ese mensaje → El bloqueo NO funcionó
- Reportar en GitHub Issue con screenshots de console completo

#### 6️⃣ Guardar Descriptor (Opcional)
1. Si la detección funcionó, click **"Guardar"** / **"Save"**
2. Verificar toast de éxito
3. Modal se cierra
4. Refresh página (F5)
5. Verificar que ícono cambió de Camera (azul) a Scan (verde)

---

## 🎥 Test Suite 2: Camera Cleanup

### Objetivo
Verificar que la cámara se libera correctamente al cerrar el modal.

### Pasos

#### 1️⃣ Abrir Face Enrollment Modal
1. Seguir pasos de Test Suite 1 hasta abrir FaceEnrollmentModal
2. Permitir acceso a cámara
3. **Verificar indicador de cámara en navegador**:
   - **Edge**: Ícono de cámara en barra de direcciones (junto al candado)
   - **Chrome**: Ícono de cámara en barra de direcciones
   - Debería mostrar "Camera active" o similar

#### 2️⃣ Cerrar Modal
1. Click en **X** (esquina superior derecha) o botón **Cancel**
2. **Inmediatamente buscar en console**:
```
[Enrollment] Stopping camera - tracks: 1
[Enrollment] Stopped track: video, label: "nombre de tu cámara"
[Enrollment] ✓ Camera released and srcObject cleared
```

✅ **SI VES ESTOS MENSAJES**: Código de cleanup se ejecutó
❌ **SI NO LOS VES**: El useEffect cleanup no está funcionando

#### 3️⃣ Validar Liberación de Cámara
**Esperar 2-3 segundos después de cerrar modal**

**Mirar el indicador de cámara del navegador**:
- ✅ **ÉXITO**: Indicador desaparece (cámara liberada)
- ❌ **FALLA**: Indicador permanece (cámara NO liberada)

**Si la cámara NO se libera**:
1. Abrir console
2. Ejecutar:
   ```javascript
   document.querySelectorAll('video').forEach((v, i) => {
     console.log(`Video ${i}:`, {
       srcObject: v.srcObject,
       tracks: v.srcObject?.getTracks().length || 0
     });
   });
   ```
3. Si encuentras `tracks: 1` → Hay un leak de MediaStream
4. Reportar con screenshots

---

## 🚀 Test Suite 3: Face Recognition en Kiosk

### Pre-requisito
Al menos 1 empleado debe tener face enrollment completo (Test Suite 1 exitoso).

### Pasos

#### 1️⃣ Abrir Kiosk
1. **Detail Hub** → **Time Clock** (tab superior)
2. Click botón **"Open Kiosk"**
3. PunchClockKioskModal se abre

#### 2️⃣ Validar Auto-Scan
**Verificar en UI**:
- ✅ Cámara debe iniciar **AUTOMÁTICAMENTE** (sin botón)
- ✅ Debe mostrar mensaje: "Position your face in the frame"
- ✅ Video feed debe estar activo

**Verificar en console**:
```
[Kiosk] Face scan started
[Kiosk] Scanning for faces...
```

#### 3️⃣ Test de Reconocimiento
1. Posicionar empleado enrollado frente a cámara
2. **Esperar 1-3 segundos** (detección automática)

**VALIDACIÓN**:
```
✅ ÉXITO:
  - Console: [Kiosk] Face matched: {employee_name}
  - UI: Auto-transición a vista PIN
  - Datos del empleado auto-rellenados (nombre, foto)

❌ FALLA:
  - No detecta cara después de 10 segundos
  - Error en console
  - No hace match (revisa distancia euclidiana en console)
```

#### 4️⃣ Test de Punch
1. Ingresar PIN del empleado (4 dígitos)
2. Click **"Clock In"** o **"Clock Out"**
3. Verificar toast de éxito
4. Modal se cierra

---

## ⏱️ Test Suite 4: Timeout de 30 Segundos

### Objetivo
Verificar que el kiosk no queda en scanning infinito.

### Pasos

#### 1️⃣ Abrir Kiosk
1. **Detail Hub** → **Time Clock** → **Open Kiosk**
2. Cámara inicia automáticamente

#### 2️⃣ NO Posicionar Ninguna Cara
1. **Dejar la cámara vacía** (sin persona frente a ella)
2. Esperar 30 segundos completos
3. Observar comportamiento

**VALIDACIÓN**:
```
✅ ÉXITO (después de 30s):
  - Toast aparece: "Face scan timed out after 30 seconds"
  - Cámara se detiene automáticamente
  - Puede usar búsqueda manual normalmente

❌ FALLA:
  - Timeout no se activa
  - Queda en scanning infinito
  - Error en console
```

---

## 📊 Validación en Base de Datos

### Verificar Descriptor Guardado

**Después de enrollment exitoso, ejecutar en Supabase SQL Editor**:

```sql
SELECT
  id,
  first_name,
  last_name,
  face_descriptor IS NOT NULL as has_descriptor,
  face_enrolled_at,
  face_enrollment_photo_url,
  LENGTH(face_descriptor::text) as descriptor_length
FROM detail_hub_employees
WHERE first_name = 'TU_NOMBRE'
  AND last_name = 'TU_APELLIDO';
```

**Resultado esperado**:
```
has_descriptor: true
face_enrolled_at: 2025-11-19 XX:XX:XX
descriptor_length: ~600 caracteres (array de 128 floats)
```

---

## 🔧 Debugging Avanzado

### Si Test Suite 1 Falla (Backend Error Persiste)

#### Opción 1: Verificar Orden de Imports
```javascript
// En DevTools → Sources → main.tsx
// Deberías ver que disableWebGL.ts se carga ANTES de face-api.js
```

#### Opción 2: Forzar CPU Backend Manualmente
**Editar `src/services/faceApiService.ts`**:

```typescript
// Después de línea 25, AÑADIR:
import * as tf from '@tensorflow/tfjs-core';

// En initializeFaceApi(), ANTES de cargar modelos (línea ~73):
console.log('[FaceAPI Service] Setting backend to CPU...');
await tf.setBackend('cpu');
await tf.ready();
console.log('[FaceAPI Service] Backend:', tf.getBackend()); // Debe imprimir "cpu"
```

#### Opción 3: Usar Fork Mejorado de face-api.js
```bash
npm uninstall face-api.js
npm install @vladmandic/face-api
```

Este fork tiene mejor soporte para CPU backend y es más estable.

---

### Si Test Suite 2 Falla (Cámara No Se Libera)

#### Opción 1: Verificar Desmontado de Componente
**Añadir debug logs en FaceEnrollmentModal.tsx**:

```typescript
useEffect(() => {
  console.log('[Enrollment] Component MOUNTED');
  return () => {
    console.log('[Enrollment] Component UNMOUNTED');
  };
}, []);
```

Cerrar modal y verificar que aparece "UNMOUNTED".

#### Opción 2: Force Cleanup Global
**Crear función de emergencia**:

```typescript
// En FaceEnrollmentModal.tsx, handleClose:
const handleClose = () => {
  console.log('[Enrollment] FORCE CLEANUP');

  // Stop ALL video elements in DOM
  document.querySelectorAll('video').forEach((video) => {
    const stream = (video as HTMLVideoElement).srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      (video as HTMLVideoElement).srcObject = null;
    }
  });

  onClose();
};
```

#### Opción 3: Edge Browser Workaround
**Si el problema es específico de Edge**, añadir delay:

```typescript
const stopCamera = () => {
  if (videoRef.current?.srcObject) {
    const stream = videoRef.current.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());

    // Edge workaround - delay before clearing srcObject
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }, 100);
  }
};
```

---

## ✅ Checklist Final

### Antes de Reportar Éxito

- [ ] **WebGL Blocker carga**: Mensaje visible en console al abrir app
- [ ] **Modelos cargan sin error**: Todos los 3 checkmarks aparecen
- [ ] **NO hay error de backend**: Al hacer capture face (Test Suite 1)
- [ ] **Face detection funciona**: Detecta cara y muestra preview
- [ ] **Descriptor se guarda en DB**: Query SQL confirma
- [ ] **Cámara se libera**: Indicador desaparece (Test Suite 2)
- [ ] **Face recognition funciona**: Kiosk detecta empleados enrollados (Test Suite 3)
- [ ] **Auto-selección funciona**: Transición automática a PIN
- [ ] **Timeout funciona**: Detiene después de 30s (Test Suite 4)
- [ ] **Punch registra correctamente**: Toast de éxito + entrada en DB

---

## 🐛 Reporte de Bugs

### Si Algún Test Falla

**Template para reportar**:

```markdown
## 🔴 Bug: [Nombre del test que falló]

**Test Suite**: [1/2/3/4]
**Paso que falló**: [Número de paso]

### Comportamiento Esperado
[Qué debería pasar según el plan]

### Comportamiento Actual
[Qué está pasando realmente]

### Console Logs
```
[Copiar TODOS los logs relevantes de console]
```

### Screenshots
[Adjuntar capturas de pantalla]

### Entorno
- **Navegador**: Edge/Chrome [versión]
- **SO**: Windows 11
- **Hora**: [timestamp]

### Debugging Realizado
- [ ] Hard reload (Ctrl + Shift + R)
- [ ] Probado en modo incógnito
- [ ] Verificado console completo
- [ ] Revisado Network tab
- [ ] Probado en otro navegador
```

---

## 📞 Contacto

Si necesitas ayuda durante el testing:
1. Crear GitHub Issue con template de bug report
2. Incluir SIEMPRE screenshots de console completo
3. Indicar qué test suite falló específicamente

---

**FIN DEL PLAN DE TESTING**

**Última actualización**: 2025-11-19 18:00 EST
**Creado por**: Claude Code
**Estado**: ✅ LISTO PARA EJECUCIÓN
