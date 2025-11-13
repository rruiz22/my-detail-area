# 🔄 CLEAR BROWSER CACHE - INSTRUCCIONES URGENTES

## Problema Identificado

Hay una discrepancia entre los datos SQL reales y lo que se muestra en la UI:

- **SQL Real (Supabase)**: $8,253.00 total revenue
- **UI muestra**: $9,657.00 total revenue
- **Diferencia**: $1,404.00 (datos viejos en cache)

## Causa

Acabamos de modificar la configuración de cache en `useReportsData.tsx`:
- **ANTES**: `staleTime: 0, cacheTime: 0` (sin cache)
- **DESPUÉS**: `staleTime: CACHE_TIMES.SHORT, gcTime: GC_TIMES.MEDIUM`

El browser tiene datos en cache del ANTES que necesitan limpiarse.

## Solución INMEDIATA

### Opción 1: Hard Refresh (RECOMENDADO)
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Opción 2: Clear Site Data (Más completo)
1. Abrir DevTools (F12)
2. Ir a "Application" tab
3. En el menú izquierdo: "Storage"
4. Click en "Clear site data"
5. Refrescar la página

### Opción 3: Clear Browser Cache Completo
1. Abrir configuración del browser (Ctrl + Shift + Delete)
2. Seleccionar "Cached images and files"
3. Seleccionar "Last hour" o "Last 24 hours"
4. Click "Clear data"
5. Volver a http://localhost:8080

## Verificación

Después del clear cache, los números deberían ser:

**Con filtro excluyendo "New photos" y "Photos" (semana 6-12 Nov)**:

| Department | Orders | Revenue |
|------------|--------|---------|
| Sales | 52 | $1,385.00 |
| Service | 15 | $1,250.00 |
| Recon | 55 | $1,970.00 |
| CarWash | 456 | $3,648.00 |
| **TOTAL** | **578** | **$8,253.00** |

**Ambas cards (Total Revenue y Total by Departments) deberían mostrar $8,253.00**

## ¿Por qué pasó esto?

Los cambios que hicimos hoy modificaron cómo se cachean los datos. El browser tenía datos viejos de cuando `staleTime: 0` (sin cache) y ahora con cache habilitado necesita un refresh para actualizar.

## Próximos Pasos

1. **Haz Hard Refresh (Ctrl + Shift + R)**
2. Verifica que ambos totales sean **$8,253.00**
3. Si aún hay discrepancia, avísame para investigar más

---

**IMPORTANTE**: Después del hard refresh, si ambos totales coinciden en $8,253.00, entonces el problema está RESUELTO ✅

Si después del refresh sigues viendo discrepancia entre las dos cards, entonces hay un bug real en la lógica que investigaremos.
