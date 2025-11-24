-- ============================================================================
-- ANNOUNCEMENTS SYSTEM - SAMPLE DATA
-- ============================================================================
-- Este script crea anuncios de ejemplo para probar el sistema
-- NOTA: Solo ejecutar en entornos de desarrollo/staging, NO en producción
-- ============================================================================

-- Anuncio 1: Información general (visible para todos)
INSERT INTO announcements (
    title,
    content,
    type,
    priority,
    is_active,
    start_date
) VALUES (
    '¡Bienvenido a MyDetailArea!',
    '<p>Estamos emocionados de tenerte aquí. Explora todas las funcionalidades del sistema.</p><p>Para soporte, contacta a <a href="mailto:support@mydetailarea.com">support@mydetailarea.com</a></p>',
    'info',
    10,
    true,
    NOW()
);

-- Anuncio 2: Mantenimiento programado (advertencia para todos)
INSERT INTO announcements (
    title,
    content,
    type,
    priority,
    is_active,
    start_date,
    end_date
) VALUES (
    'Mantenimiento Programado',
    '<p><b>Fecha:</b> Próximo sábado de 2:00 AM a 4:00 AM</p><p>El sistema estará temporalmente fuera de servicio para mejoras y actualizaciones.</p><ul><li>Mejoras de rendimiento</li><li>Nuevas funcionalidades</li><li>Corrección de bugs</li></ul>',
    'warning',
    20,
    true,
    NOW(),
    NOW() + INTERVAL '7 days'
);

-- Anuncio 3: Alerta crítica solo para system_admin
INSERT INTO announcements (
    title,
    content,
    type,
    priority,
    is_active,
    start_date,
    target_roles
) VALUES (
    'Acción Requerida: Actualizar Configuración',
    '<p><b>Solo Administradores:</b></p><p>Se requiere actualizar la configuración de seguridad en la próxima semana.</p><p>Ver documentación en <a href="#">este enlace</a>.</p>',
    'alert',
    30,
    true,
    NOW(),
    ARRAY['system_admin']
);

-- Anuncio 4: Nueva funcionalidad (success)
INSERT INTO announcements (
    title,
    content,
    type,
    priority,
    is_active,
    start_date,
    end_date
) VALUES (
    '🎉 Nueva Funcionalidad: Sistema de Anuncios',
    '<p>Ahora los administradores pueden crear anuncios globales para informar a los usuarios.</p><p><b>Características:</b></p><ul><li>Anuncios con HTML rico</li><li>Filtrado por roles y dealers</li><li>Fechas de vigencia</li><li>Diferentes tipos y prioridades</li></ul>',
    'success',
    15,
    true,
    NOW(),
    NOW() + INTERVAL '14 days'
);

-- Anuncio 5: Solo para dealer_admin
INSERT INTO announcements (
    title,
    content,
    type,
    priority,
    is_active,
    start_date,
    target_roles
) VALUES (
    'Recordatorio para Administradores de Dealer',
    '<p>No olvides revisar los reportes mensuales antes del final del mes.</p><p><i>Este anuncio es visible solo para administradores de dealership.</i></p>',
    'info',
    5,
    true,
    NOW(),
    ARRAY['dealer_admin', 'system_admin']
);

-- Anuncio 6: Ejemplo de anuncio inactivo (no se muestra)
INSERT INTO announcements (
    title,
    content,
    type,
    priority,
    is_active,
    start_date
) VALUES (
    'Anuncio de Prueba Inactivo',
    '<p>Este anuncio está inactivo y no debería mostrarse a los usuarios.</p>',
    'info',
    0,
    false,
    NOW()
);

-- Anuncio 7: Ejemplo con fecha de fin pasada (no se muestra)
INSERT INTO announcements (
    title,
    content,
    type,
    priority,
    is_active,
    start_date,
    end_date
) VALUES (
    'Anuncio Expirado',
    '<p>Este anuncio ya expiró y no debería mostrarse.</p>',
    'info',
    0,
    true,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day'
);

-- Anuncio 8: Ejemplo con fecha de inicio futura (no se muestra todavía)
INSERT INTO announcements (
    title,
    content,
    type,
    priority,
    is_active,
    start_date
) VALUES (
    'Anuncio Futuro',
    '<p>Este anuncio tiene fecha de inicio en el futuro y no debería mostrarse todavía.</p>',
    'info',
    0,
    true,
    NOW() + INTERVAL '7 days'
);

-- ============================================================================
-- VERIFICACIÓN DE DATOS INSERTADOS
-- ============================================================================

-- Mostrar todos los anuncios creados
SELECT
    id,
    title,
    type,
    priority,
    is_active,
    CASE
        WHEN start_date IS NULL OR start_date <= NOW() THEN '✅'
        ELSE '⏰'
    END as start_status,
    CASE
        WHEN end_date IS NULL OR end_date >= NOW() THEN '✅'
        ELSE '❌'
    END as end_status,
    target_roles,
    created_at
FROM announcements
ORDER BY priority DESC, created_at DESC;

-- Resumen
SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE is_active = false) as inactive,
    COUNT(*) FILTER (WHERE is_active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())) as currently_visible
FROM announcements;

-- Mensaje final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ DATOS DE EJEMPLO CREADOS';
    RAISE NOTICE 'Se han insertado 8 anuncios de ejemplo';
    RAISE NOTICE 'Algunos están activos, otros inactivos o con fechas especiales';
    RAISE NOTICE '==================================================';
END $$;
