# Logo Upload System - Mejoras Implementadas

## 📋 Resumen de Problemas Resueltos

### Problema Original
Cuando un dealership ya tenía un logo y el usuario intentaba subir uno nuevo:
- ❌ El reemplazo fallaba silenciosamente
- ❌ No había feedback visual (toasts/alerts)
- ❌ No había confirmación antes de reemplazar
- ❌ El usuario no sabía si debía eliminar el logo antiguo primero

## ✅ Mejoras Implementadas

### 1. Modal No Se Cierra al Seleccionar Logo
**Archivo**: `src/components/dealerships/LogoUploader.tsx`
**Cambio**: Agregado `type="button"` a botones Upload y Remove
**Líneas**: 169, 182

```typescript
<Button
  type="button"  // ⬅️ Previene submit del formulario padre
  variant="outline"
  onClick={() => fileInputRef.current?.click()}
>
```

**Resultado**: El modal del dealership permanece abierto durante todo el proceso de upload.

---

### 2. Confirmación Antes de Reemplazar
**Archivo**: `src/components/dealerships/LogoUploader.tsx`
**Líneas**: 97-112

**Comportamiento**:
- Si **NO hay logo**: Sube directamente
- Si **ya existe logo**: Muestra confirmación con `window.confirm()`
  - Usuario confirma → Muestra toast "Reemplazando logo..." y continúa
  - Usuario cancela → Cancela la operación y limpia el input

```typescript
if (currentLogoUrl) {
  const confirmed = window.confirm(t('dealerships.logo_replace_confirm'));
  if (!confirmed) {
    // Usuario canceló - limpiar input y salir
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    return;
  }

  // Usuario confirmó - mostrar feedback
  toast({
    title: t('dealerships.logo_replacing'),
    description: t('dealerships.logo_replacing_description'),
  });
}
```

---

### 3. Feedback Visual Mejorado

#### 3.1 Validación de Formato
**Toast con descripción detallada**:
```typescript
toast({
  title: t('dealerships.logo_invalid_format'),
  description: t('dealerships.logo_allowed_formats'), // "Please use JPG, PNG, WebP, or SVG"
  variant: 'destructive'
});
```

#### 3.2 Validación de Tamaño
```typescript
toast({
  title: t('dealerships.logo_too_large'),
  description: t('dealerships.logo_size_limit'), // "Please choose an image smaller than 2MB"
  variant: 'destructive'
});
```

#### 3.3 Éxito en Upload
**Diferencia entre primera subida y reemplazo**:
```typescript
toast({
  title: currentLogoUrl
    ? t('dealerships.logo_replaced_successfully')  // "Logo replaced successfully"
    : t('dealerships.logo_uploaded_successfully'), // "Logo uploaded successfully"
  description: t('dealerships.logo_upload_success_description'),
});
```

#### 3.4 Manejo de Errores
**Revierte preview y muestra error detallado**:
```typescript
catch (error: any) {
  // Revertir preview al logo original
  setPreviewUrl(currentLogoUrl || null);

  // Mostrar error con detalles
  toast({
    title: t('dealerships.logo_upload_failed'),
    description: error?.message || t('dealerships.logo_upload_error_description'),
    variant: 'destructive'
  });
}
```

---

### 4. Upsert Habilitado en Storage
**Archivo**: `src/hooks/useDealershipLogo.ts`
**Línea**: 99

**Cambio**:
```typescript
// ANTES:
upsert: false,  // ❌ No permitía sobrescribir archivos

// DESPUÉS:
upsert: true,  // ✅ Permite sobrescribir archivos automáticamente
```

**Resultado**: Supabase Storage ahora reemplaza automáticamente archivos con el mismo nombre.

---

### 5. Limpieza Automática de Logos Antiguos
**Archivo**: `src/hooks/useDealershipLogo.ts`
**Líneas**: 71-85

**Proceso**:
1. Lista todos los archivos en la carpeta del dealership (`{dealershipId}/`)
2. Elimina todos los logos antiguos antes de subir el nuevo
3. Registra en consola: `🗑️ Removed X old logo(s)`

```typescript
const { data: existingFiles } = await supabase.storage
  .from('dealership-logos')
  .list(`${dealershipId}`);

if (existingFiles && existingFiles.length > 0) {
  const filesToDelete = existingFiles.map(f => `${dealershipId}/${f.name}`);
  await supabase.storage
    .from('dealership-logos')
    .remove(filesToDelete);

  console.log('🗑️ Removed', existingFiles.length, 'old logo(s)');
}
```

**Resultado**: No quedan logos huérfanos en storage, ahorro de espacio.

---

### 6. Logs de Debug Mejorados
**Archivo**: `src/hooks/useDealershipLogo.ts`
**Líneas**: 119-140

**Nuevos logs**:
```typescript
console.log('💾 Updating database with logo_url:', urlData.publicUrl);
console.log('💾 Dealership ID:', dealershipId);

// Después del update:
if (!data) {
  console.warn('⚠️ DB update returned no data - possible RLS policy issue');
  console.warn('⚠️ Logo uploaded to storage but NOT saved to database');
  console.warn('⚠️ Check RLS policies on dealerships table for UPDATE permission');
} else {
  console.log('✅ DB update successful:', data);
}
```

**Beneficio**: Facilita debugging de problemas de RLS o permisos.

---

### 7. Toasts No Duplicados
**Cambio**: Removidos toasts del hook, solo en componente LogoUploader

**Antes**:
- Hook mostraba toast en `onSuccess` y `onError`
- LogoUploader **también** mostraba toast
- **Resultado**: Toasts duplicados

**Después**:
- Hook solo invalida queries y hace console.log
- LogoUploader tiene control total de toasts
- **Resultado**: Un solo toast por acción

---

## 📝 Traducciones Agregadas

### Inglés (en.json)
```json
{
  "logo_uploaded_successfully": "Logo uploaded successfully",
  "logo_replaced_successfully": "Logo replaced successfully",
  "logo_size_limit": "Please choose an image smaller than 2MB",
  "logo_allowed_formats": "Please use JPG, PNG, WebP, or SVG format",
  "logo_replace_confirm": "Are you sure you want to replace the existing logo?",
  "logo_replacing": "Replacing logo...",
  "logo_replacing_description": "Old logo will be removed and replaced with the new one",
  "logo_upload_success_description": "Your dealership logo has been updated",
  "logo_upload_error_description": "An error occurred while uploading the logo. Please try again"
}
```

### Español (es.json)
```json
{
  "logo_uploaded_successfully": "Logo subido exitosamente",
  "logo_replaced_successfully": "Logo reemplazado exitosamente",
  "logo_size_limit": "Por favor elige una imagen menor a 2MB",
  "logo_allowed_formats": "Por favor usa formato JPG, PNG, WebP o SVG",
  "logo_replace_confirm": "¿Estás seguro de que quieres reemplazar el logo existente?",
  "logo_replacing": "Reemplazando logo...",
  "logo_replacing_description": "El logo antiguo será eliminado y reemplazado por el nuevo",
  "logo_upload_success_description": "El logo de tu concesionario ha sido actualizado",
  "logo_upload_error_description": "Ocurrió un error al subir el logo. Por favor intenta de nuevo"
}
```

### Portugués (pt-BR.json)
```json
{
  "logo_uploaded_successfully": "Logo enviado com sucesso",
  "logo_replaced_successfully": "Logo substituído com sucesso",
  "logo_size_limit": "Por favor escolha uma imagem menor que 2MB",
  "logo_allowed_formats": "Por favor use formato JPG, PNG, WebP ou SVG",
  "logo_replace_confirm": "Tem certeza que deseja substituir o logo existente?",
  "logo_replacing": "Substituindo logo...",
  "logo_replacing_description": "O logo antigo será removido e substituído pelo novo",
  "logo_upload_success_description": "O logo da sua concessionária foi atualizado",
  "logo_upload_error_description": "Ocorreu um erro ao enviar o logo. Por favor tente novamente"
}
```

---

## 🔄 Flujo Completo del Nuevo Sistema

### Primer Upload (Sin logo previo)
```
1. Usuario selecciona archivo
2. ✅ Validación de formato
3. ✅ Validación de tamaño
4. ✅ Preview instantáneo
5. ✅ Compresión cliente (512x512 @ 90%)
6. ✅ Upload a storage
7. ✅ Actualización de database
8. ✅ Toast: "Logo uploaded successfully"
9. ✅ Thumbnail generation en background
```

### Reemplazo de Logo (Ya existe logo)
```
1. Usuario selecciona archivo
2. ✅ Validación de formato
3. ✅ Validación de tamaño
4. ⚠️ Confirmación: "¿Estás seguro de reemplazar el logo existente?"
   - Usuario cancela → FIN (sin cambios)
   - Usuario confirma → Continúa
5. ✅ Toast: "Replacing logo..."
6. ✅ Preview instantáneo del nuevo logo
7. ✅ Limpieza de logos antiguos (storage cleanup)
8. ✅ Compresión cliente
9. ✅ Upload con upsert=true
10. ✅ Actualización de database
11. ✅ Toast: "Logo replaced successfully"
12. ✅ Thumbnail generation en background
```

### Manejo de Errores
```
1. Usuario selecciona archivo
2. ❌ Formato inválido
   → Toast: "Invalid logo format. Please use JPG, PNG, WebP, or SVG"
   → FIN

3. ❌ Archivo muy grande
   → Toast: "Logo file size exceeds 2MB limit. Please choose smaller image"
   → FIN

4. ❌ Error en upload (network, permisos, etc)
   → Revierte preview al logo original
   → Toast: "Failed to upload logo: {error.message}"
   → FIN
```

---

## 🎯 Beneficios de las Mejoras

### Para el Usuario
✅ **Feedback claro** en cada paso del proceso
✅ **Confirmación antes de reemplazar** evita errores accidentales
✅ **Preview instantáneo** muestra el logo antes de subir
✅ **Mensajes de error detallados** ayudan a resolver problemas
✅ **Modal permanece abierto** durante todo el proceso

### Para el Sistema
✅ **Limpieza automática** de archivos antiguos (ahorro de storage)
✅ **Upsert habilitado** permite sobrescribir archivos
✅ **Logs detallados** facilitan debugging
✅ **Manejo robusto de errores** con rollback de preview
✅ **Internacionalización completa** (EN/ES/PT-BR)

### Para el Desarrollo
✅ **Código bien documentado** con comentarios claros
✅ **Separación de responsabilidades** (componente vs hook)
✅ **Type safety** con TypeScript
✅ **Traducciones organizadas** por feature

---

## 🧪 Pruebas Recomendadas

### Caso 1: Primer Upload
- [ ] Seleccionar logo válido
- [ ] Verificar preview instantáneo
- [ ] Verificar toast de éxito
- [ ] Verificar logo se muestra en lista de dealerships

### Caso 2: Reemplazo de Logo
- [ ] Dealership con logo existente
- [ ] Seleccionar nuevo logo
- [ ] Verificar confirmación aparece
- [ ] Cancelar → verificar no cambia
- [ ] Confirmar → verificar toast "Replacing..."
- [ ] Verificar nuevo logo se muestra

### Caso 3: Validaciones
- [ ] Subir archivo .txt → ver error de formato
- [ ] Subir imagen > 2MB → ver error de tamaño
- [ ] Verificar descripciones en toasts

### Caso 4: Manejo de Errores
- [ ] Desconectar internet durante upload
- [ ] Verificar preview revierte al logo original
- [ ] Verificar toast de error con detalles

---

## 📁 Archivos Modificados

1. **src/components/dealerships/LogoUploader.tsx**
   - Agregado `type="button"` a botones
   - Implementado confirmación de reemplazo
   - Mejorado feedback con toasts detallados
   - Manejo de errores con rollback

2. **src/hooks/useDealershipLogo.ts**
   - Cambiado `upsert: true` en storage upload
   - Agregados logs de debug para database update
   - Removidos toasts duplicados
   - Verificación de data nula

3. **public/translations/en.json**
   - 9 nuevas claves de traducción

4. **public/translations/es.json**
   - 9 nuevas claves de traducción

5. **public/translations/pt-BR.json**
   - 9 nuevas claves de traducción

---

## 🔒 Bucket y RLS Configuration

### Bucket: `dealership-logos`
- **Public**: ✅ Yes (para display rápido)
- **File size limit**: 2MB
- **Allowed MIME types**: JPG, PNG, WebP, SVG
- **Structure**: `{dealership_id}/logo_{timestamp}.{ext}`

### RLS Policies (4 políticas)
1. **Public read access** (SELECT) - Usuarios autenticados pueden leer
2. **Dealers can upload** (INSERT) - Solo miembros del dealership
3. **Dealers can update** (UPDATE) - Solo miembros del dealership
4. **Dealers can delete** (DELETE) - Solo miembros del dealership

---

## 🔧 Fix Adicional: CORS en Edge Function

### Problema Identificado
La Edge Function `generate-dealership-logo-thumbnail` falla con error CORS:
```
Access to fetch at 'https://...supabase.co/functions/v1/generate-dealership-logo-thumbnail'
from origin 'http://localhost:8080' has been blocked by CORS policy
```

### Causa
La función no maneja OPTIONS requests (CORS preflight).

### Solución Aplicada
**Archivo**: `supabase/functions/generate-dealership-logo-thumbnail/index.ts`

Agregado handler para OPTIONS:
```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}
```

### Deploy Requerido
⚠️ **Acción Manual Necesaria**: La Edge Function debe ser re-desplegada a Supabase.

Ver instrucciones en: **[deploy-edge-function-cors-fix.md](deploy-edge-function-cors-fix.md)**

---

## 🚀 Próximas Mejoras Potenciales

1. **Drag & Drop** para subir logos
2. **Crop tool** para ajustar imagen antes de subir
3. **Múltiples logos** (logo primario, logo secundario, favicon)
4. **Historial de logos** (guardar versiones anteriores)
5. **Batch upload** para múltiples dealerships

---

**Fecha de Implementación**: 2025-10-27
**Versión**: 1.1.0 (incluye CORS fix)
**Autor**: Claude Code Agent
**Status**: ⚠️ Funcional - Requiere Deploy de Edge Function para Thumbnails
