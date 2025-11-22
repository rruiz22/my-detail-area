-- =====================================================
-- VERIFICACIÓN FINAL - Optimización Completada
-- =====================================================

-- ✅ CHECK 1: Contar índices creados (debe ser 7)
SELECT
    '✅ ÍNDICES CREADOS' as verificacion,
    COUNT(*) as total,
    CASE
        WHEN COUNT(*) = 7 THEN '🎉 PERFECTO - 7/7 índices creados'
        WHEN COUNT(*) > 0 THEN '⚠️ PARCIAL - ' || COUNT(*) || '/7 índices'
        ELSE '❌ ERROR - No se encontraron índices'
    END as resultado
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

-- 💾 CHECK 2: Ver tamaños de cada índice
SELECT
    '💾 TAMAÑO DE ÍNDICES' as verificacion,
    indexname as nombre_indice,
    pg_size_pretty(pg_relation_size(indexrelid)) as tamaño,
    pg_size_pretty(pg_total_relation_size(indexrelid)) as tamaño_total
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
)
ORDER BY pg_relation_size(indexrelid) DESC;

-- 💿 CHECK 3: Espacio total usado
SELECT
    '💿 ESPACIO TOTAL' as verificacion,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) as espacio_usado,
    '✅ Esperado: 350-550 MB' as rango_esperado,
    CASE
        WHEN SUM(pg_relation_size(indexrelid)) > 0 THEN '🎉 Índices creados exitosamente'
        ELSE '⚠️ Verificar creación'
    END as estado
FROM pg_stat_user_indexes
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

-- 📈 CHECK 4: Uso de índices (puede estar en 0 inicialmente)
SELECT
    '📈 USO DE ÍNDICES' as verificacion,
    indexname as nombre_indice,
    idx_scan as veces_usado,
    idx_tup_read as tuplas_leidas,
    idx_tup_fetch as tuplas_obtenidas,
    CASE
        WHEN idx_scan > 0 THEN '✅ ACTIVO'
        ELSE '⏳ CALENTANDO (espera 5-10 min)'
    END as estado
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
)
ORDER BY idx_scan DESC;

-- 🎯 CHECK 5: Detalles de cada índice
SELECT
    '🔍 DETALLES' as verificacion,
    i.indexname as nombre,
    t.tablename as tabla,
    pg_size_pretty(pg_relation_size(i.indexrelid)) as tamaño,
    i.indexdef as definicion
FROM pg_indexes i
JOIN pg_stat_user_indexes s ON i.indexname = s.indexname AND i.schemaname = s.schemaname
JOIN pg_tables t ON t.tablename = i.tablename AND t.schemaname = i.schemaname
WHERE i.schemaname = 'public'
AND i.indexname IN (
    'idx_user_presence_user_dealer_update',
    'idx_user_presence_dealer_status_activity',
    'idx_orders_type_dealer_created_optimized',
    'idx_orders_dealer_type_covering',
    'idx_notification_log_user_dealer_created',
    'idx_notification_log_user_unread_priority',
    'idx_dealer_memberships_user_dealer_active_rls'
)
ORDER BY pg_relation_size(i.indexrelid) DESC;
