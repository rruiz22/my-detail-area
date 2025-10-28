# Deploy Edge Function CORS Fix

## Problema
La Edge Function `generate-dealership-logo-thumbnail` no maneja requests OPTIONS (CORS preflight), causando errores de CORS cuando se llama desde `http://localhost:8080`.

## Solución Aplicada
Agregado handler para OPTIONS requests en la Edge Function (líneas 26-38).

## Cómo Desplegar

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/functions
   ```

2. **Encuentra la función** `generate-dealership-logo-thumbnail`

3. **Edita la función** y reemplaza el contenido con el código actualizado de:
   ```
   supabase/functions/generate-dealership-logo-thumbnail/index.ts
   ```

4. **Deploy** la función actualizada

### Opción 2: Usando Supabase CLI

Si tienes el CLI configurado:

```bash
cd C:\Users\rudyr\apps\mydetailarea
npx supabase functions deploy generate-dealership-logo-thumbnail
```

## Verificación

Después del deploy, prueba subir un logo nuevamente. Deberías ver en los logs:

```
✅ [Step 2] Thumbnail generated: {success: true, thumbnailPath: "...", ...}
```

En lugar de:

```
❌ Thumbnail generation failed (non-critical): FunctionsFetchError: Failed to send a request
```

## Nota

Si la Edge Function no existe en tu proyecto de Supabase, puede que necesites crearla primero. El código completo está en:

```
supabase/functions/generate-dealership-logo-thumbnail/index.ts
```

**Dependencias** (deno.json):
```json
{
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "imagescript": "https://deno.land/x/imagescript@1.2.15/mod.ts"
  }
}
```
