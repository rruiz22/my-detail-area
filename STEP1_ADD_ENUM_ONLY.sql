-- =====================================================
-- PASO 1: AGREGAR AUTO_CLOSE AL ENUM (SIN TRANSACCIÓN)
-- =====================================================
-- Este comando NO puede estar dentro de BEGIN/COMMIT
-- =====================================================

ALTER TYPE detail_hub_punch_method ADD VALUE IF NOT EXISTS 'auto_close';

-- Verificar
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'detail_hub_punch_method'::regtype
ORDER BY enumsortorder;
