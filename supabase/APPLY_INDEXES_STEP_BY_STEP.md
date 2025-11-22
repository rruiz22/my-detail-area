# 🚀 Aplicar Índices UNO POR UNO (Solución Definitiva)

## ❌ Problema
Supabase Dashboard **siempre** envuelve las queries en transacciones, y `CREATE INDEX CONCURRENTLY` no puede ejecutarse dentro de transacciones.

## ✅ Solución
Ejecutar **un índice a la vez** en queries separadas. Toma más tiempo pero **funciona 100%**.

---

## 📋 Método 1: En Supabase Dashboard (Más Fácil)

### Índice 1/7: user_presence UPDATE optimization
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_presence_user_dealer_update
ON public.user_presence(user_id, dealer_id, last_activity_at DESC);
```
⏱️ **Tiempo:** 1-2 minutos | ✅ **Ejecutar ahora**

---

### Índice 2/7: user_presence SELECT optimization
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_presence_dealer_status_activity
ON public.user_presence(dealer_id, status, last_activity_at DESC)
WHERE status != 'offline';
```
⏱️ **Tiempo:** 30-60 segundos | ✅ **Ejecutar después del anterior**

---

### Índice 3/7: orders WHERE + ORDER BY (🚀 MÁS IMPACTANTE)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_type_dealer_created_optimized
ON public.orders(order_type, dealer_id, created_at DESC)
WHERE deleted_at IS NULL;
```
⏱️ **Tiempo:** 2-3 minutos | ✅ **Ejecutar después del anterior**

---

### Índice 4/7: orders covering index (Index-Only Scans)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_dealer_type_covering
ON public.orders(dealer_id, order_type, created_at DESC)
INCLUDE (id, order_number, customer_name, vehicle_vin, status, priority, total_amount)
WHERE deleted_at IS NULL;
```
⏱️ **Tiempo:** 3-4 minutos (más grande) | ✅ **Ejecutar después del anterior**

---

### Índice 5/7: notification_log active notifications
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_user_dealer_created
ON public.notification_log(user_id, dealer_id, created_at DESC)
WHERE is_dismissed = false;
```
⏱️ **Tiempo:** 1-2 minutos | ✅ **Ejecutar después del anterior**

---

### Índice 6/7: notification_log unread badge
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_user_unread_priority
ON public.notification_log(user_id, priority, created_at DESC)
WHERE is_read = false AND is_dismissed = false;
```
⏱️ **Tiempo:** 30-60 segundos | ✅ **Ejecutar después del anterior**

---

### Índice 7/7: dealer_memberships RLS optimization
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dealer_memberships_user_dealer_active_rls
ON public.dealer_memberships(user_id, dealer_id, is_active)
WHERE is_active = true;
```
⏱️ **Tiempo:** 30-60 segundos | ✅ **Ejecutar después del anterior**

---

### Paso Final: Update statistics
```sql
ANALYZE public.user_presence;
ANALYZE public.orders;
ANALYZE public.notification_log;
ANALYZE public.dealer_memberships;
```
⏱️ **Tiempo:** 10-20 segundos | ✅ **Ejecutar al final**

---

## ⏱️ Tiempo Total Estimado
- **Optimista:** 10-12 minutos
- **Realista:** 15-20 minutos
- **Conservador:** 25-30 minutos

**Ventaja:** Zero downtime garantizado, funciona al 100%

---

## 📋 Método 2: Via psql (Más Rápido)

Si tienes acceso directo a PostgreSQL:

```bash
# Conecta a tu base de datos
psql "postgresql://postgres:[password]@db.swfnnrpzpkdypbrzmgnr.supabase.co:5432/postgres"

# Ejecuta los archivos uno por uno
\i supabase/APPLY_INDEX_1.sql
\i supabase/APPLY_INDEX_2.sql
\i supabase/APPLY_INDEX_3.sql
\i supabase/APPLY_INDEX_4.sql
\i supabase/APPLY_INDEX_5.sql
\i supabase/APPLY_INDEX_6.sql
\i supabase/APPLY_INDEX_7.sql

# Update statistics
ANALYZE public.user_presence;
ANALYZE public.orders;
ANALYZE public.notification_log;
ANALYZE public.dealer_memberships;
```

---

## 📋 Método 3: Script Automatizado (Node.js)

Puedo crear un script Node.js que ejecute todos los índices automáticamente uno por uno usando el SDK de Supabase.

**¿Quieres que cree este script?**

---

## ✅ Checklist de Progreso

Marca cada índice conforme lo ejecutes:

- [ ] **Índice 1/7** - user_presence UPDATE (1-2 min)
- [ ] **Índice 2/7** - user_presence SELECT (30-60 seg)
- [ ] **Índice 3/7** - orders WHERE+ORDER BY (2-3 min) 🚀
- [ ] **Índice 4/7** - orders covering (3-4 min) 🚀
- [ ] **Índice 5/7** - notification_log active (1-2 min)
- [ ] **Índice 6/7** - notification_log unread (30-60 seg)
- [ ] **Índice 7/7** - dealer_memberships RLS (30-60 seg)
- [ ] **ANALYZE** - Update statistics (10-20 seg)

**Total:** 7/7 índices creados ✅

---

## 🔍 Verificación Después de Cada Índice

Después de ejecutar cada índice, verifica que se creó:

```sql
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%user%' OR indexname LIKE 'idx_%orders%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 🎯 Pasos Prácticos en Supabase Dashboard

1. Abre: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql
2. Click: **New query**
3. Copia el **Índice 1/7** de arriba
4. Click: **Run**
5. Espera que termine (verás "Success")
6. Repite con **Índice 2/7**, **3/7**, etc.

**Tip:** Abre esta guía en una pantalla y Supabase en otra para ir copiando/pegando.

---

## ⚠️ Si Encuentras Errores

### Error: "relation does not exist"
**Causa:** La tabla no existe
**Solución:** Verifica el nombre de la tabla, salta ese índice

### Error: "index already exists"
**Causa:** El índice ya fue creado
**Solución:** ✅ Perfecto! Continúa con el siguiente

### Error: "insufficient privilege"
**Causa:** No tienes permisos
**Solución:** Verifica que estás usando usuario admin de Supabase

### Error: Timeout
**Causa:** Tabla muy grande
**Solución:** Es normal, espera más tiempo (hasta 10 min en índice 4)

---

## 🎉 Resultado Final

Cuando termines todos los índices, ejecuta la verificación:

```sql
SELECT COUNT(*) as indices_creados
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
);
```

**Esperado:** `indices_creados: 7` ✅

---

## 💡 Por Qué Este Método Funciona

**Problema técnico:**
- `CREATE INDEX CONCURRENTLY` requiere conexión **fuera de transacción**
- Supabase Dashboard **siempre** usa transacciones implícitas
- PostgreSQL rechaza `CONCURRENTLY` dentro de transacciones

**Solución:**
- Ejecutar **una query a la vez** permite a Supabase manejar cada comando como transacción separada
- Cada comando completa su ciclo antes del siguiente
- `CONCURRENTLY` funciona porque cada statement es independiente

---

**¿Listo para empezar?**

Copia el **Índice 1/7** y ejecútalo en Supabase SQL Editor ahora! 🚀
