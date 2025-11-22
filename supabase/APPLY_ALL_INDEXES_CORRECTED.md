# 🚀 Índices Corregidos - Sin columna deleted_at

## ⚠️ Problema Encontrado
La tabla `orders` NO tiene columna `deleted_at`. He corregido los índices 3 y 4.

---

## ✅ Ejecuta Estos en Orden (Corregidos)

### **Índice 1/7** ⏱️ 1-2 min
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_presence_user_dealer_update
ON public.user_presence(user_id, dealer_id, last_activity_at DESC);
```
✅ Status: Sin problemas

---

### **Índice 2/7** ⏱️ 30-60 seg
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_presence_dealer_status_activity
ON public.user_presence(dealer_id, status, last_activity_at DESC)
WHERE status != 'offline';
```
✅ Status: Sin problemas

---

### **Índice 3/7** ⏱️ 2-3 min 🚀 (CORREGIDO)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_type_dealer_created_optimized
ON public.orders(order_type, dealer_id, created_at DESC);
```
🔧 **CAMBIO:** Removido `WHERE deleted_at IS NULL`

---

### **Índice 4/7** ⏱️ 3-4 min 🚀 (CORREGIDO)
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_dealer_type_covering
ON public.orders(dealer_id, order_type, created_at DESC)
INCLUDE (id, order_number, customer_name, vehicle_vin, status, priority, total_amount);
```
🔧 **CAMBIO:** Removido `WHERE deleted_at IS NULL`

---

### **Índice 5/7** ⏱️ 1-2 min
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_user_dealer_created
ON public.notification_log(user_id, dealer_id, created_at DESC)
WHERE is_dismissed = false;
```
✅ Status: Sin problemas

---

### **Índice 6/7** ⏱️ 30-60 seg
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_user_unread_priority
ON public.notification_log(user_id, priority, created_at DESC)
WHERE is_read = false AND is_dismissed = false;
```
✅ Status: Sin problemas

---

### **Índice 7/7** ⏱️ 30-60 seg
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dealer_memberships_user_dealer_active_rls
ON public.dealer_memberships(user_id, dealer_id, is_active)
WHERE is_active = true;
```
✅ Status: Sin problemas

---

### **Paso Final: ANALYZE** ⏱️ 10-20 seg
```sql
ANALYZE public.user_presence;
ANALYZE public.orders;
ANALYZE public.notification_log;
ANALYZE public.dealer_memberships;
```

---

## 🎯 Resumen de Cambios

| Índice | Cambio |
|--------|--------|
| 1, 2 | ✅ Sin cambios |
| **3** | 🔧 Removido `WHERE deleted_at IS NULL` |
| **4** | 🔧 Removido `WHERE deleted_at IS NULL` |
| 5, 6, 7 | ✅ Sin cambios |

---

## 📋 Checklist de Progreso

- [ ] **Índice 1/7** - user_presence UPDATE
- [ ] **Índice 2/7** - user_presence SELECT
- [ ] **Índice 3/7** - orders WHERE+ORDER (CORREGIDO) 🚀
- [ ] **Índice 4/7** - orders covering (CORREGIDO) 🚀
- [ ] **Índice 5/7** - notification_log active
- [ ] **Índice 6/7** - notification_log unread
- [ ] **Índice 7/7** - dealer_memberships RLS
- [ ] **ANALYZE** - Update statistics

---

## ✅ Verificación Final

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

## 💡 Nota sobre deleted_at

Tu tabla `orders` no usa soft deletes con `deleted_at`. Los índices funcionarán igual sin esa cláusula `WHERE`, solo serán ligeramente más grandes pero seguirán siendo muy eficientes.

**Performance:** No hay diferencia significativa en tu caso.

---

**¿Listo para continuar con el Índice 3 corregido?** 🚀
