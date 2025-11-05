# 🔧 Fix Order Number Generation Issue

## ❌ Problema
When trying to create a new order, you get this error:
```
duplicate key value violates unique constraint "orders_dealer_id_order_number_key"
```

The system tried to generate `SA-100` but it already exists in the database.

## 📋 Paso 1: Diagnosticar el Problema

1. Ve a **Supabase Dashboard**
2. Navega a **SQL Editor**
3. Abre el archivo `DIAGNOSE_ORDER_NUMBER_ISSUE.sql`
4. Copia y pega todo el contenido en el SQL Editor
5. Click en **Run** (o presiona `Ctrl+Enter`)
6. **Revisa los resultados** de cada query:
   - Query 1: ¿Existe SA-100 para dealer 5?
   - Query 2: ¿Cuáles son los últimos SA orders para dealer 5?
   - Query 3: ¿Cuál es el max sequence para SA orders?
   - Query 6: ¿Cuál debería ser el próximo sequence number?

## 📋 Paso 2: Aplicar el Fix

Después de revisar los resultados del diagnóstico, ejecuta este script para arreglar el problema:

### Opción A: Si SA-100 ya existe y está duplicado

```sql
-- Este script encuentra el max sequence y muestra qué debería ser el próximo
SELECT
    'Current max sequence: ' || MAX(SUBSTRING(order_number FROM '\d+')::INTEGER) as info
FROM orders
WHERE order_number ILIKE 'SA-%';

-- El problema es que el código frontend no está buscando correctamente
-- Vamos a verificar si hay algún problema con el filtro
```

### Opción B: Reiniciar secuencia (SOLO si es necesario)

⚠️ **ADVERTENCIA**: Esta opción renumera TODAS las órdenes. Úsala solo si es absolutamente necesario.

```sql
-- NO EJECUTES ESTO a menos que estés seguro
-- Esta query muestra qué órdenes serían afectadas
SELECT
    id,
    order_number,
    dealer_id,
    order_type,
    'Would become: ' ||
    CASE order_type
        WHEN 'sales' THEN 'SA-' || ROW_NUMBER() OVER (PARTITION BY order_type ORDER BY created_at)
        WHEN 'service' THEN 'SE-' || ROW_NUMBER() OVER (PARTITION BY order_type ORDER BY created_at)
        WHEN 'carwash' THEN 'CW-' || ROW_NUMBER() OVER (PARTITION BY order_type ORDER BY created_at)
        WHEN 'recon' THEN 'RC-' || ROW_NUMBER() OVER (PARTITION BY order_type ORDER BY created_at)
    END as new_order_number
FROM orders
WHERE order_type = 'sales'
ORDER BY created_at;
```

## 📋 Paso 3: Quick Fix - Delete the Duplicate (Si aplica)

Si `SA-100` existe pero fue un intento fallido (sin customer data completo), puedes eliminarlo:

```sql
-- PRIMERO: Ver qué contiene SA-100
SELECT * FROM orders
WHERE dealer_id = 5 AND order_number = 'SA-100';

-- SI es seguro eliminarlo (no tiene data importante):
-- DELETE FROM orders
-- WHERE dealer_id = 5 AND order_number = 'SA-100';
-- (Descomenta la línea de arriba para ejecutar)
```

## 🔍 Paso 4: Revisar el Código Frontend

El problema podría estar en cómo `orderNumberService.ts` está consultando el database.

La función `getLastSequenceNumber` hace esta query:
```typescript
await supabase
  .from('orders')
  .select('order_number')
  .ilike('order_number', prefixPattern);  // Busca 'SA-%'
```

⚠️ **PROBLEMA POTENCIAL**: Esta query NO está filtrando por `dealer_id`, lo que significa:
- Busca el max sequence **globalmente** (todos los dealers)
- Pero el constraint es `(dealer_id, order_number)`, que es **por dealer**

### Ejemplo del problema:
- Dealer 1 tiene: SA-100, SA-101, SA-102
- Dealer 5 tiene: SA-50, SA-51
- La query encuentra max = 102
- Intenta crear SA-103 para Dealer 5 ✅ (funcionaría)
- PERO si hay una condición de carrera o lógica incorrecta, podría generar SA-100

## 🎯 La Solución Real

El código en `orderNumberService.ts` debería:

**OPCIÓN 1**: Si quieres sequences GLOBALES (todos los dealers comparten el contador):
- El código actual está bien
- Pero necesitas asegurarte que no haya errores en la lógica

**OPCIÓN 2**: Si quieres sequences POR DEALER:
- Necesitas filtrar por `dealer_id` en `getLastSequenceNumber`
- Cambiar la query para buscar solo orders de ese dealer

## 📝 Reporte tus Hallazgos

Por favor copia y pega aquí los resultados de las queries en `DIAGNOSE_ORDER_NUMBER_ISSUE.sql`, especialmente:

1. ¿Existe SA-100 en dealer 5?
2. ¿Cuál es el max sequence que encontró?
3. ¿Hay duplicados en la tabla orders?

Con esa información podré crear el fix exacto para tu caso.




