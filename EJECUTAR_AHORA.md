# ⚡ EJECUTAR AHORA - Diagnóstico Automático

**Tiempo estimado**: 2 minutos
**Riesgo**: 🟢 NINGUNO (solo lectura)

---

## 🚀 Instrucciones Rápidas

### Paso 1: Abrir Supabase SQL Editor (30 segundos)

1. Ve a: https://supabase.com/dashboard
2. Selecciona proyecto: **MyDetailArea**
3. Click en **SQL Editor** (barra lateral izquierda)
4. Click en **"New Query"** (botón arriba a la derecha)

---

### Paso 2: Copiar y Ejecutar Script (60 segundos)

1. **Abre el archivo**: [RUN_THIS_DIAGNOSTIC.sql](RUN_THIS_DIAGNOSTIC.sql)
2. **Selecciona TODO** (Ctrl+A)
3. **Copia** (Ctrl+C)
4. **Pega** en el SQL Editor de Supabase (Ctrl+V)
5. **Click en "Run"** (botón verde arriba)

---

### Paso 3: Leer Resultados (30 segundos)

El script te mostrará automáticamente:

#### Resultado Esperado #1: TODO EXISTE ✅
```
📊 RESUMEN DEL DIAGNÓSTICO
- Funciones RPC: 5/5 ✅ Completo
- Tabla vehicle_step_history: Existe ✅ OK
- Registros en Historia: X ⚠️ Vacía (generar datos) o ✅ Tiene datos
- Trigger activo: Existe ✅ OK

📋 PRÓXIMOS PASOS
✅ TODO EXISTE - Ahora ejecuta el Paso 6 (Test Manual) con un dealer_id real
```

**Interpretación**: Las funciones existen, el problema está en otro lado.

---

#### Resultado Esperado #2: FALTA MIGRACIÓN ❌
```
📊 RESUMEN DEL DIAGNÓSTICO
- Funciones RPC: 0/5 ❌ Falta aplicar migración
- Tabla vehicle_step_history: No existe ❌ Falta aplicar migración
- Registros en Historia: 0 ⚠️ Vacía
- Trigger activo: No existe ❌ Falta aplicar migración

📋 PRÓXIMOS PASOS
❌ FALTA APLICAR MIGRACIÓN - Ejecutar: supabase/migrations/20251025000000_create_vehicle_step_history.sql
```

**Interpretación**: Necesitamos aplicar la migración completa.

---

### Paso 4: Reportar Resultados Aquí (10 segundos)

**Solo copia y pega la sección "📊 RESUMEN DEL DIAGNÓSTICO" aquí en el chat.**

Con eso sabré exactamente qué hacer.

---

## ⚠️ Si el Script Falla

**Error común**: "relation does not exist"

**Solución**:
- Significa que la tabla `vehicle_step_history` NO existe
- Es **esperado** si la migración no se aplicó
- **Continúa con el siguiente paso** que te diré

---

## 🎯 ¿Qué Hará Claude Después?

Basándome en el resumen del diagnóstico:

### Si todo existe:
1. ✅ Ejecutarás el Paso 6 (test manual con dealer_id real)
2. ✅ Si funciona en SQL pero no en browser → Problema de frontend
3. ✅ Si no funciona en SQL → Problema de permisos/RLS

### Si falta migración:
1. ⚠️ Te pediré confirmación para aplicar migración
2. ⚠️ Aplicaremos `20251025000000_create_vehicle_step_history.sql`
3. ✅ Re-ejecutaremos diagnóstico para verificar

### Si tabla vacía:
1. ℹ️ Es normal si no se han movido vehículos
2. ℹ️ Opcionalmente generaremos datos de prueba
3. ✅ Las funciones deberían funcionar (retornan array vacío)

---

## 📋 Checklist Rápido

- [ ] Abrir Supabase Dashboard
- [ ] SQL Editor → New Query
- [ ] Copiar contenido de `RUN_THIS_DIAGNOSTIC.sql`
- [ ] Pegar y ejecutar
- [ ] Copiar "📊 RESUMEN DEL DIAGNÓSTICO"
- [ ] Pegar aquí en el chat

**Tiempo total**: ~2 minutos ⏱️

---

**¿Listo? Ejecuta el script y pégame el resumen** 🚀
