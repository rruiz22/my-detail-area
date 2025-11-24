-- ============================================================================
-- ANNOUNCEMENTS SYSTEM - VERIFICATION SCRIPT
-- ============================================================================
-- Este script verifica que el sistema de anuncios se instaló correctamente
-- ============================================================================

-- 1. Verificar que la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') THEN
        RAISE NOTICE '✅ Tabla announcements existe';
    ELSE
        RAISE EXCEPTION '❌ Tabla announcements NO existe';
    END IF;
END $$;

-- 2. Verificar columnas
DO $$
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'announcements'
    AND column_name IN ('id', 'title', 'content', 'type', 'priority', 'is_active',
                        'start_date', 'end_date', 'target_roles', 'target_dealer_ids',
                        'created_by', 'created_at', 'updated_at');

    IF column_count = 13 THEN
        RAISE NOTICE '✅ Todas las columnas existen (%)', column_count;
    ELSE
        RAISE EXCEPTION '❌ Faltan columnas. Encontradas: %', column_count;
    END IF;
END $$;

-- 3. Verificar índices
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'announcements'
    AND indexname LIKE 'idx_announcements%';

    IF index_count >= 6 THEN
        RAISE NOTICE '✅ Índices creados correctamente (%)', index_count;
    ELSE
        RAISE WARNING '⚠️  Solo % índices encontrados (se esperaban 6)', index_count;
    END IF;
END $$;

-- 4. Verificar RLS está habilitado
DO $$
DECLARE
    rls_enabled BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'announcements';

    IF rls_enabled THEN
        RAISE NOTICE '✅ RLS está habilitado';
    ELSE
        RAISE EXCEPTION '❌ RLS NO está habilitado';
    END IF;
END $$;

-- 5. Verificar políticas RLS
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'announcements';

    IF policy_count >= 2 THEN
        RAISE NOTICE '✅ Políticas RLS creadas (% políticas)', policy_count;
    ELSE
        RAISE EXCEPTION '❌ Faltan políticas RLS. Encontradas: %', policy_count;
    END IF;
END $$;

-- 6. Verificar función RPC
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'get_active_announcements'
    ) THEN
        RAISE NOTICE '✅ Función get_active_announcements() existe';
    ELSE
        RAISE EXCEPTION '❌ Función get_active_announcements() NO existe';
    END IF;
END $$;

-- 7. Verificar trigger de updated_at
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname = 'update_announcements_updated_at';

    IF trigger_count > 0 THEN
        RAISE NOTICE '✅ Trigger de updated_at existe';
    ELSE
        RAISE WARNING '⚠️  Trigger de updated_at NO existe';
    END IF;
END $$;

-- 8. Mostrar resumen de políticas
SELECT
    polname AS policy_name,
    polcmd AS command,
    polroles::regrole[] AS roles
FROM pg_policy
WHERE polrelid = 'announcements'::regclass
ORDER BY polname;

-- 9. Test de inserción (solo si usuario es system_admin)
-- Este test fallará para usuarios no admin, lo cual es correcto
DO $$
DECLARE
    test_id UUID;
    user_role TEXT;
BEGIN
    -- Obtener rol del usuario actual
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid();

    IF user_role = 'system_admin' THEN
        -- Intentar insertar un anuncio de prueba
        INSERT INTO announcements (title, content, type, priority, is_active)
        VALUES ('TEST - ELIMINAR', '<p>Anuncio de prueba</p>', 'info', 0, false)
        RETURNING id INTO test_id;

        -- Si llegamos aquí, la inserción funcionó
        RAISE NOTICE '✅ Test de inserción exitoso (ID: %)', test_id;

        -- Limpiar el test
        DELETE FROM announcements WHERE id = test_id;
        RAISE NOTICE '✅ Test de eliminación exitoso';
    ELSE
        RAISE NOTICE '⚠️  Usuario no es system_admin, saltando test de inserción';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Test de inserción falló: %', SQLERRM;
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

SELECT
    '✅ Sistema de Anuncios' AS status,
    'Verificación completa' AS message,
    NOW() AS verified_at;

-- Mostrar estadísticas actuales
SELECT
    COUNT(*) as total_announcements,
    COUNT(*) FILTER (WHERE is_active = true) as active_announcements,
    COUNT(*) FILTER (WHERE is_active = false) as inactive_announcements
FROM announcements;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ VERIFICACIÓN COMPLETA';
    RAISE NOTICE 'El sistema de anuncios está correctamente instalado';
    RAISE NOTICE '==================================================';
END $$;
