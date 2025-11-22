-- =====================================================
-- VERIFICACIÓN DE TABLA detail_hub_kiosks
-- =====================================================
-- INSTRUCCIONES:
-- 1. Abre: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
-- 2. Copia y ejecuta CADA query por separado
-- 3. Verifica que los resultados sean correctos
-- =====================================================

-- QUERY 1: Verificar que la tabla existe y tiene 21 columnas
SELECT COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name = 'detail_hub_kiosks';
-- Resultado esperado: 21

-- QUERY 2: Verificar todas las columnas (debería mostrar 21 filas)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'detail_hub_kiosks'
ORDER BY ordinal_position;

-- QUERY 3: Verificar que camera_status existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'detail_hub_kiosks' AND column_name = 'camera_status';
-- Resultado esperado: camera_status | USER-DEFINED

-- QUERY 4: Verificar políticas RLS (debería mostrar 4 políticas)
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'detail_hub_kiosks';

-- QUERY 5: Verificar funciones de kiosk (debería mostrar 4 funciones)
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%kiosk%';

-- QUERY 6: Verificar ENUMs
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'detail_hub_kiosk_status');
-- Resultado esperado: online, offline, warning, maintenance

SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'detail_hub_camera_status');
-- Resultado esperado: active, inactive, error

-- QUERY 7: Verificar índices (debería mostrar 3 índices)
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'detail_hub_kiosks';

-- =====================================================
-- FIN DE VERIFICACIÓN
-- =====================================================
