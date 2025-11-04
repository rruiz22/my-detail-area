# Limpiar Cache de Tab "Security" en Settings

## Problema:
Warning en consola: `⚠️ Invalid tab security, ignoring`

## Causa:
localStorage tiene guardado `settings_tab = "security"` pero ese tab ya no existe o no tienes permiso.

## Solución:

### Opción 1: Limpiar desde Consola del Navegador
```javascript
// Ejecutar en Chrome DevTools > Console
localStorage.removeItem('mda_tab_settings');
localStorage.removeItem('tab_persistence_settings');
location.reload();
```

### Opción 2: Limpiar Todo el localStorage de MDA
```javascript
// CUIDADO: Esto borra TODA la configuración guardada
Object.keys(localStorage)
  .filter(key => key.startsWith('mda_'))
  .forEach(key => localStorage.removeItem(key));
location.reload();
```

### Opción 3: Solo Cambiar a Tab Válido
```javascript
// Cambiar tab guardado a "profile"
localStorage.setItem('mda_tab_settings', 'profile');
location.reload();
```

## Verificar:
Después de limpiar, el warning **NO** debería aparecer.

---

**Recomendado**: Opción 1 (más específico)