# Plan de Corrección de Traducciones - Tab Users y Modales

## Diagnóstico del Problema

Las traducciones NO se muestran porque el código está buscando claves que **no existen en la estructura actual** de los archivos de traducción.

## Claves Faltantes Identificadas

### 1. **common** (claves directas que faltan)
El código busca claves directamente en `common`, pero están en `common.action_buttons`:

```typescript
// FALTANTES (necesitan agregarse en 'common'):
- common.close → existe solo como common.action_buttons.close
- common.cancel → existe solo como common.action_buttons.cancel
```

### 2. **dealerships** (claves faltantes)
```typescript
// FALTANTES EN dealerships:
- dealerships.dealership → ✅ YA EXISTE
- dealerships.select_dealership → ✅ YA EXISTE
```

### 3. **fields** (claves que deberían estar en common.fields)
```typescript
// El código usa common.fields.status, y esta estructura SÍ existe
```

## Solución

### Opción A: Agregar claves directas en `common` (RECOMENDADO)
Agregar las siguientes claves directamente en `common` para simplificar su uso:

```json
{
  "common": {
    "close": "Close",
    "cancel": "Cancel",
    // ... resto de claves
  }
}
```

### Opción B: Cambiar el código para usar las claves existentes
Cambiar todas las referencias de `t('common.close')` a `t('common.action_buttons.close')`

**Decisión: Opción A** (más simple y evita cambios en múltiples componentes)

## Plan de Implementación

### Paso 1: Agregar claves faltantes en `common`
- [x] `common.close`
- [x] `common.cancel`

### Paso 2: Verificar estructura de `common.fields`
- [x] `common.fields.status` (ya existe)

### Paso 3: Aplicar cambios en los 3 idiomas
- [ ] `public/translations/en.json`
- [ ] `public/translations/es.json`
- [ ] `public/translations/pt-BR.json`

### Paso 4: Verificar que no haya errores de linter

### Paso 5: Prueba manual
- Verificar que todos los textos se muestren traducidos
- Probar cambio de idioma

## Claves por Archivo

### `en.json`
```json
{
  "common": {
    // ... existentes ...
    "close": "Close",
    "cancel": "Cancel"
  }
}
```

### `es.json`
```json
{
  "common": {
    // ... existentes ...
    "close": "Cerrar",
    "cancel": "Cancelar"
  }
}
```

### `pt-BR.json`
```json
{
  "common": {
    // ... existentes ...
    "close": "Fechar",
    "cancel": "Cancelar"
  }
}
```

## Verificación Final

- [ ] Todos los textos del tab Users se muestran traducidos
- [ ] Modal "Manage Custom Roles" muestra traducciones
- [ ] Modal "Send Invitation" muestra traducciones
- [ ] No hay errores en consola
- [ ] Los 3 idiomas funcionan correctamente
