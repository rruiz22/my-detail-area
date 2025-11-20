# 🔴 REPORTE DE DEBUGGING - Sistema de Reconocimiento Facial

**Fecha**: 2025-11-19 (Sesión Final - Actualizado)
**Estado**: ✅ FIX MEJORADO - LISTO PARA VALIDACIÓN

---

## 🎯 Cambios Implementados en Esta Sesión

### ✅ Cambio 1: Import de disableWebGL.ts en main.tsx

**Archivo modificado**: `src/main.tsx`

**Cambio**:
```typescript
// ANTES
import "./utils/networkErrorSuppressor";

import { createRoot } from "react-dom/client";

// DESPUÉS
import "./utils/networkErrorSuppressor";
// Import WebGL blocker SECOND to force CPU-only mode for face-api.js
import "./utils/disableWebGL";

import { createRoot } from "react-dom/client";
```

**Razón**: El bloqueador de WebGL debe ejecutarse ANTES de que cualquier librería (face-api.js, TensorFlow.js) intente crear contextos WebGL.

**Ubicación en main.tsx**: Líneas 1-4

### ✅ Cambio 2: Eliminación de WebGL Blocker Duplicado

**Archivo modificado**: `src/services/faceApiService.ts`

**Problema detectado**: Había DOS bloqueadores de WebGL en el código:
1. ✅ `disableWebGL.ts` (correcto, importado en main.tsx)
2. ❌ `faceApiService.ts` líneas 24-36 (redundante, podría causar conflictos)

**Solución**: Eliminado el código duplicado de faceApiService.ts

**ANTES** (líneas 24-36):
```typescript
// Disable WebGL globally to force CPU-only mode
if (typeof window !== 'undefined') {
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextType: string, ...args: any[]) {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      console.log('[FaceAPI Service] WebGL context blocked - using CPU backend');
      return null;
    }
    return getContext.apply(this, [contextType, ...args] as any);
  };
}
```

**DESPUÉS** (líneas 24-25):
```typescript
// NOTE: WebGL blocking is handled globally in src/utils/disableWebGL.ts
// (imported in main.tsx BEFORE this service loads)
```

**Beneficio**: Elimina race conditions y garantiza que solo hay UN punto de control para WebGL.

### 📁 Nuevos Archivos Creados

1. **FACIAL_RECOGNITION_TEST_PLAN.md** - Plan de testing estructurado con 4 test suites
2. **public/test-facial-recognition.js** - Script de diagnóstico automatizado para console

---

## 🔍 Qué Esperar en el Navegador

### Paso 1: Abrir la Aplicación

1. Ir a: http://localhost:8080
2. Abrir DevTools (F12)
3. Ir a la pestaña "Console"

### Paso 2: Verificar que WebGL Blocker se Cargó

**Deberías ver estos mensajes en la consola**:
```
[WebGL Blocker] Installing WebGL context blocker...
[WebGL Blocker] ✓ WebGL contexts will be blocked (CPU-only mode)
```

⚠️ **SI NO VES ESTOS MENSAJES**: El import no se está ejecutando correctamente.

### Paso 3: Testear Face Enrollment

1. Login como admin (rruiz@lima.llc)
2. Ir a: Detail Hub → Employee Portal
3. Click en el ícono Camera (azul) de cualquier empleado
4. FaceEnrollmentModal se abre
5. Permitir acceso a cámara cuando el navegador lo pida

**Deberías ver**:
```
[FaceAPI Service] Starting initialization (CPU-only mode)...
[FaceAPI Service] WebGL disabled, TensorFlow will use CPU backend
[FaceAPI Service] Loading models from: /models
[FaceAPI Service] ✓ Tiny face detector loaded
[FaceAPI Service] ✓ Face landmark detector loaded
[FaceAPI Service] ✓ Face recognition model loaded
[FaceAPI Service] All models loaded successfully
```

6. Posicionar cara frente a cámara
7. Click botón "Enrollar Rostro" (o equivalente en español)

---

## 🔴 Error 1: TensorFlow.js Backend Error

### Estado Antes de Este Cambio

**Error**:
```
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'backend')
    at t2.moveData (engine.ts:382:29)
    at t2.get (backend.ts:54:22)
    at backend_webgl.ts:2504:34
```

**Cuándo ocurría**: Al procesar frames de video para detección facial

### ¿Debería Estar Resuelto Ahora?

**Teoría**: SÍ ✅

**Razón**:
- `disableWebGL.ts` ahora se importa ANTES de React, face-api.js y TensorFlow.js
- El override de `HTMLCanvasElement.prototype.getContext` se instala antes de que cualquier librería intente crear contextos
- Cuando face-api.js/TensorFlow.js intenten crear un contexto WebGL, recibirán `null` y deberían usar CPU backend automáticamente

### Cómo Validar Si Está Resuelto

**Test**:
1. Abrir FaceEnrollmentModal
2. Click "Capture Face"
3. **SI EL ERROR DESAPARECE**: ✅ RESUELTO
4. **SI EL ERROR PERSISTE**: ❌ NECESITA INVESTIGACIÓN ADICIONAL

**Si el error persiste**, buscar en consola:
```javascript
// ¿Se bloqueó WebGL?
// Deberías ver:
[WebGL Blocker] Blocked webgl context creation - forcing CPU fallback

// Si NO ves este mensaje cuando se detecta la cara:
// → El bloqueo NO está funcionando
```

---

## 🔴 Error 2: Cámara No Se Libera

### Estado Actual

**Problema**: Indicador de cámara del navegador permanece activo después de cerrar FaceEnrollmentModal

**Código de cleanup actual** (FaceEnrollmentModal.tsx líneas 83-99):
```typescript
const stopCamera = () => {
  if (videoRef.current?.srcObject) {
    const stream = videoRef.current.srcObject as MediaStream;
    const tracks = stream.getTracks();

    console.log('[Enrollment] Stopping camera - tracks:', tracks.length);

    tracks.forEach(track => {
      track.stop();
      console.log('[Enrollment] Stopped track:', track.kind, track.label);
    });

    // CRITICAL: Clear the srcObject to release the camera
    videoRef.current.srcObject = null;
    console.log('[Enrollment] ✓ Camera released and srcObject cleared');
  }
};
```

**useEffect cleanup** (líneas 54-62):
```typescript
useEffect(() => {
  if (open && faceApiLoaded) {
    startCamera();
  }

  return () => {
    stopCamera();
  };
}, [open, faceApiLoaded]);
```

### Cómo Validar Si Está Resuelto

**Test**:
1. Abrir FaceEnrollmentModal
2. Permitir acceso a cámara
3. **Verificar en consola**:
   ```
   [Enrollment] Stopping camera - tracks: 1
   [Enrollment] Stopped track: video, label: "nombre de tu cámara"
   [Enrollment] ✓ Camera released and srcObject cleared
   ```
4. Cerrar el modal (X o botón Cancel)
5. **Mirar el indicador de cámara en el navegador**:
   - Chrome: Icono en la barra de direcciones
   - Edge: Icono en la barra de direcciones
   - **Debería DESAPARECER** después de cerrar modal

**SI LA CÁMARA SIGUE ACTIVA**:
- ✅ El código de cleanup SÍ se está ejecutando (ver console)
- ❌ Pero el navegador no está liberando la cámara

### Debugging Adicional Si El Problema Persiste

**Añadir este código en FaceEnrollmentModal.tsx** (después del último useEffect):

```typescript
// DEBUG: Track video elements in DOM
useEffect(() => {
  const interval = setInterval(() => {
    const videos = document.querySelectorAll('video');
    console.log('=== VIDEO ELEMENTS INSPECTION ===');
    console.log('Total videos in DOM:', videos.length);
    videos.forEach((video, i) => {
      const stream = (video as HTMLVideoElement).srcObject as MediaStream | null;
      console.log(`Video ${i}:`, {
        hasSrcObject: !!stream,
        trackCount: stream?.getTracks().length || 0,
        tracks: stream?.getTracks().map(t => ({
          kind: t.kind,
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState // "live" o "ended"
        }))
      });
    });
  }, 2000); // Check every 2 seconds

  return () => clearInterval(interval);
}, []);
```

**Qué buscar en la consola**:
- Después de cerrar modal, `trackCount` debe ser 0
- `readyState` debe ser "ended" (no "live")
- Si encuentras tracks con `readyState: "live"` → HAY UN LEAK DE MEDIASTREAM

---

## 🧪 Plan de Testing Completo

### Test Suite 1: WebGL Blocking

**Objetivo**: Verificar que WebGL está bloqueado correctamente

**Pasos**:
1. ✅ Abrir http://localhost:8080
2. ✅ Abrir DevTools → Console
3. ✅ Verificar: `[WebGL Blocker] ✓ WebGL contexts will be blocked`
4. ✅ Ir a Detail Hub → Employee Portal
5. ✅ Click Camera icon → FaceEnrollmentModal abre
6. ✅ Verificar: `[FaceAPI Service] WebGL disabled, TensorFlow will use CPU backend`
7. ✅ Verificar: Modelos cargan sin errores
8. ✅ Click "Capture Face"
9. ✅ **VALIDACIÓN**: NO debe aparecer error `Cannot read properties of undefined (reading 'backend')`

**Resultado Esperado**: ✅ SIN ERROR de backend

**Si falla**: Ir a [Debugging Avanzado](#debugging-avanzado-tensorflow-error)

---

### Test Suite 2: Camera Cleanup

**Objetivo**: Verificar que la cámara se libera al cerrar modal

**Pasos**:
1. ✅ Abrir FaceEnrollmentModal (ver Test Suite 1)
2. ✅ Permitir acceso a cámara
3. ✅ **Verificar indicador de cámara activa en navegador** (icono en barra de direcciones)
4. ✅ Cerrar modal (click X o Cancel)
5. ✅ Verificar en console:
   ```
   [Enrollment] Stopping camera - tracks: 1
   [Enrollment] Stopped track: video, label: "..."
   [Enrollment] ✓ Camera released and srcObject cleared
   ```
6. ✅ **Esperar 2-3 segundos**
7. ✅ **VALIDACIÓN**: Indicador de cámara debe DESAPARECER

**Resultado Esperado**: ✅ Indicador de cámara DESAPARECE

**Si falla**: Ir a [Debugging Avanzado](#debugging-avanzado-camera-cleanup)

---

### Test Suite 3: Face Enrollment End-to-End

**Objetivo**: Verificar flujo completo de enrollment

**Pasos**:
1. ✅ Login como rruiz@lima.llc
2. ✅ Detail Hub → Employee Portal
3. ✅ Buscar un empleado sin face enrollment (ícono Camera azul)
4. ✅ Click Camera icon
5. ✅ FaceEnrollmentModal abre
6. ✅ Permitir acceso a cámara
7. ✅ Posicionar cara frente a cámara (dentro del marco azul)
8. ✅ Click "Enrollar Rostro" / "Capture Face"
9. ✅ **VALIDACIÓN**: Debería detectar cara y mostrar preview de foto
10. ✅ Click "Guardar" / "Save"
11. ✅ **VALIDACIÓN**: Toast de éxito aparece
12. ✅ Modal se cierra
13. ✅ Refresh página (F5)
14. ✅ **VALIDACIÓN**: Ícono cambió a Scan (verde) - indica enrollment exitoso

**Resultado Esperado**: ✅ Face descriptor guardado en DB

**Verificar en DB**:
```sql
SELECT
  id,
  first_name,
  last_name,
  face_descriptor IS NOT NULL as has_descriptor,
  face_enrolled_at,
  face_enrollment_photo_url
FROM detail_hub_employees
WHERE id = 'employee-uuid';
```

---

### Test Suite 4: Face Recognition en Kiosk

**Objetivo**: Verificar reconocimiento automático en kiosk

**Pre-requisito**: Al menos 1 empleado con face enrollment completo

**Pasos**:
1. ✅ Detail Hub → Time Clock
2. ✅ Click "Open Kiosk"
3. ✅ PunchClockKioskModal abre
4. ✅ **VALIDACIÓN**: Face scan inicia automáticamente (sin botón)
5. ✅ Posicionar empleado enrollado frente a cámara
6. ✅ **VALIDACIÓN**: Detecta y matchea cara
7. ✅ **VALIDACIÓN**: Auto-transición a vista PIN
8. ✅ **VALIDACIÓN**: Datos del empleado se auto-rellenan
9. ✅ Ingresar PIN del empleado
10. ✅ Click "Clock In" / "Clock Out"
11. ✅ **VALIDACIÓN**: Punch se registra correctamente

**Resultado Esperado**: ✅ Reconocimiento y punch exitosos

---

### Test Suite 5: Timeout de 30 Segundos

**Objetivo**: Verificar que auto-detiene después de 30s sin match

**Pasos**:
1. ✅ Abrir PunchClockKioskModal
2. ✅ **NO posicionar ninguna cara** frente a cámara
3. ✅ Esperar 30 segundos
4. ✅ **VALIDACIÓN**: Toast aparece: "Face scan timed out after 30 seconds"
5. ✅ **VALIDACIÓN**: Cámara se detiene
6. ✅ **VALIDACIÓN**: Puede usar búsqueda manual normalmente

**Resultado Esperado**: ✅ Timeout funciona correctamente

---

## 🔧 Debugging Avanzado

### Debugging Avanzado: TensorFlow Error

**Si el error de backend persiste después del fix**:

#### Paso 1: Verificar Orden de Imports

**Inspeccionar en DevTools → Sources**:
1. Ir a Sources tab
2. Buscar `main.tsx` en el árbol de archivos
3. Ver en qué orden se ejecutan los imports

**Deberías ver en Network tab (orden de carga)**:
```
1. disableWebGL.ts  ← PRIMERO
2. React, ReactDOM
3. face-api.js
4. TensorFlow.js
```

**Si face-api.js se carga ANTES de disableWebGL.ts**: El fix NO funcionará.

#### Paso 2: Verificar que getContext se Override

**Ejecutar en Console del navegador**:
```javascript
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');
console.log('WebGL context:', gl); // Debería ser null
```

**Resultado esperado**: `null`
**Si recibes un objeto WebGLRenderingContext**: El override NO funcionó

#### Paso 3: Forzar CPU Backend Manualmente

**Si el override no funciona, modificar** `src/services/faceApiService.ts`:

```typescript
// LÍNEA 15 (después de imports)
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-core';
import * as tf from '@tensorflow/tfjs-core';

// LÍNEA 70 (antes de cargar modelos)
export async function initializeFaceApi(modelUrl: string = '/models'): Promise<void> {
  // ... código existente ...

  initializationPromise = (async () => {
    try {
      // AÑADIR ESTO ANTES DE CARGAR MODELOS:
      console.log('[FaceAPI Service] Setting backend to CPU...');
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('[FaceAPI Service] Backend:', tf.getBackend()); // Debe imprimir "cpu"

      console.log('[FaceAPI Service] Loading models from:', modelUrl);
      // ... resto del código ...
    }
  })();
}
```

#### Paso 4: Alternativa - Usar face-api.js con CPU-only Bundle

**Si nada funciona**, considerar usar el bundle CPU-only de face-api.js:

```bash
npm uninstall face-api.js
npm install @vladmandic/face-api
```

Este fork tiene mejor soporte para CPU backend.

---

### Debugging Avanzado: Camera Cleanup

**Si la cámara NO se libera después del fix**:

#### Paso 1: Verificar React Component Lifecycle

**Añadir en FaceEnrollmentModal.tsx**:
```typescript
// DESPUÉS de todos los hooks (antes del return)
useEffect(() => {
  console.log('[Enrollment] Component MOUNTED');

  return () => {
    console.log('[Enrollment] Component UNMOUNTED');
  };
}, []);
```

**Cerrar modal y verificar en console**:
- ✅ Deberías ver: `[Enrollment] Component UNMOUNTED`
- ❌ Si NO ves este mensaje: React no está desmontando el componente

**Solución si no desmonta**:
```typescript
// En EmployeePortal.tsx (líneas 1367-1381)
// CAMBIAR de:
{employeeForFaceEnrollment && (
  <FaceEnrollmentModal ... />
)}

// A:
{faceEnrollmentOpen && employeeForFaceEnrollment && (
  <FaceEnrollmentModal ... />
)}
```

#### Paso 2: Verificar Dialog forceMount

**El componente Dialog de Radix UI puede mantener el DOM montado**

**Modificar FaceEnrollmentModal.tsx**:
```typescript
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-2xl" forceMount={false}> {/* AÑADIR ESTO */}
    {/* ... contenido ... */}
  </DialogContent>
</Dialog>
```

#### Paso 3: Force Cleanup en onClose

**Si el useEffect cleanup no funciona, forzar en handler**:

```typescript
// MODIFICAR handleClose en FaceEnrollmentModal
const handleClose = useCallback(() => {
  console.log('[Enrollment] FORCE CLOSE - Stopping camera...');

  // Force stop ALL video elements
  const videos = document.querySelectorAll('video');
  videos.forEach((video) => {
    const stream = (video as HTMLVideoElement).srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('[Enrollment] Force stopping track:', track.kind);
        track.stop();
      });
      (video as HTMLVideoElement).srcObject = null;
    }
  });

  // Reset state
  setFaceDescriptor(null);
  setEnrollmentPhoto(null);
  setCaptureStatus("");

  // Call parent onClose
  onClose();
}, [onClose]);

// Usar handleClose en lugar de onClose directamente:
<Dialog open={open} onOpenChange={(isOpen) => {
  if (!isOpen) handleClose();
}}>
```

#### Paso 4: Testear en Otros Navegadores

**Si el problema es específico de Edge**:
1. Testear en Chrome
2. Testear en Firefox
3. Comparar comportamiento

**Bug conocido de Edge**: Algunos usuarios reportan que Edge tiene problemas liberando MediaStreams en ciertas versiones.

**Workaround**: Añadir un delay antes de limpiar:
```typescript
const stopCamera = () => {
  if (videoRef.current?.srcObject) {
    const stream = videoRef.current.srcObject as MediaStream;
    const tracks = stream.getTracks();

    tracks.forEach(track => {
      track.stop();
    });

    // AÑADIR DELAY PARA EDGE
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        console.log('[Enrollment] Camera released after delay (Edge workaround)');
      }
    }, 100);
  }
};
```

---

## 📊 Checklist de Validación Final

### ✅ Checklist Antes de Reportar Éxito

- [ ] **WebGL Blocker carga**: Mensaje en console visible
- [ ] **Error de backend NO aparece**: Al hacer capture face
- [ ] **Modelos cargan correctamente**: Todos los 3 modelos
- [ ] **Face detection funciona**: Detecta cara en enrollment
- [ ] **Face descriptor se guarda**: DB tiene descriptor después de save
- [ ] **Cámara se libera**: Indicador desaparece al cerrar modal
- [ ] **Face recognition funciona en kiosk**: Detecta empleados enrollados
- [ ] **Timeout funciona**: Detiene después de 30s sin match
- [ ] **Auto-selección funciona**: Transición a PIN después de match
- [ ] **End-to-end flow completo**: Enrollment → Kiosk → Punch exitosos

### ❌ Si Alguno de Estos Falla

**Reportar en GitHub Issue** o **Próxima Sesión**:

```markdown
## Bug Report: [Nombre del test que falló]

**Test**: [Nombre del Test Suite]
**Paso que falló**: [Número de paso específico]

**Comportamiento esperado**:
[Describir qué debería pasar]

**Comportamiento actual**:
[Describir qué está pasando]

**Console logs**:
```
[Copiar logs relevantes de la consola]
```

**Screenshots**:
[Añadir capturas si aplica]

**Navegador**: Edge/Chrome/Firefox [versión]
**Sistema Operativo**: Windows [versión]

**Debugging realizado**:
- [ ] Verificado orden de imports
- [ ] Verificado console logs
- [ ] Probado en otro navegador
- [ ] Revisado Network tab
- [ ] Inspeccionado MediaStreams
```

---

## 📝 Resumen Ejecutivo

### Cambios Implementados Hoy

1. ✅ **Creado disableWebGL.ts**: Bloqueador de WebGL independiente
2. ✅ **Importado en main.tsx**: Como segundo import (después de networkErrorSuppressor)
3. ✅ **Eliminado código duplicado**: Removido bloqueador redundante de faceApiService.ts
4. ✅ **Documentación completa**: FACIAL_RECOGNITION_IMPLEMENTATION.md
5. ✅ **Reporte de debugging**: DEBUG_REPORT_FACIAL_RECOGNITION.md (este archivo)
6. ✅ **Plan de testing**: FACIAL_RECOGNITION_TEST_PLAN.md (4 test suites estructurados)
7. ✅ **Script de diagnóstico**: public/test-facial-recognition.js (automatizado)
8. ✅ **Dev server corriendo**: Puerto 8080 (PID 44280)

### Estado de Errores

| Error | Estado Antes | Estado Después | Confianza |
|-------|-------------|----------------|-----------|
| TensorFlow Backend Error | 🔴 ERROR | 🟢 DEBERÍA ESTAR RESUELTO | 90% |
| Cámara No Se Libera | 🔴 ERROR | 🟡 POSIBLEMENTE RESUELTO | 70% |

**Mejora de confianza**: Eliminación de código duplicado aumenta probabilidad de éxito.

### Próximos Pasos CRÍTICOS

**OPCIÓN A: Testing Manual (Recomendado para primera vez)**
1. Abrir archivo: `FACIAL_RECOGNITION_TEST_PLAN.md`
2. Seguir instrucciones de Test Suite 1 y 2
3. Reportar resultados

**OPCIÓN B: Diagnóstico Automatizado (Rápido)**
1. Abrir http://localhost:8080
2. Hard reload: Ctrl + Shift + R
3. Abrir DevTools (F12) → Console
4. Cargar script:
   ```javascript
   // Copiar y pegar contenido de public/test-facial-recognition.js
   // Luego ejecutar:
   runFaceRecognitionDiagnostics()
   ```
5. Revisar resultados en console

**Si Test Suite 1 PASA**: ✅ Error de backend RESUELTO
**Si Test Suite 2 PASA**: ✅ Error de cámara RESUELTO

**Si alguno FALLA**: Ver `FACIAL_RECOGNITION_TEST_PLAN.md` sección "Debugging Avanzado"

---

## 🔗 Referencias Rápidas

**Archivos clave**:
- `src/main.tsx` (líneas 1-4) - Import de disableWebGL
- `src/utils/disableWebGL.ts` - Bloqueador de WebGL
- `src/components/detail-hub/FaceEnrollmentModal.tsx` - Modal de enrollment
- `src/services/faceApiService.ts` - Servicio singleton
- `FACIAL_RECOGNITION_IMPLEMENTATION.md` - Documentación completa

**Dev server**:
- URL: http://localhost:8080
- Comando: `npm run dev`
- Port: 8080 (STRICT)

**Login de prueba**:
- Email: rruiz@lima.llc
- Password: [Tu password]
- Rol: system_admin (acceso total)

---

**FIN DEL REPORTE**

**Última actualización**: 2025-11-19 18:15 EST
**Dev server**: ✅ CORRIENDO en puerto 8080 (PID 44280)
**Cambios aplicados**: ✅ TODOS (incluye fix de duplicación)
**Listo para testing**: ✅ SÍ
**Archivos de referencia**:
  - Plan de testing: `FACIAL_RECOGNITION_TEST_PLAN.md`
  - Script diagnóstico: `public/test-facial-recognition.js`
  - Implementación: `FACIAL_RECOGNITION_IMPLEMENTATION.md`
