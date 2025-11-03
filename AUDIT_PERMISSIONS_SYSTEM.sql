-- 🔍 AUDITORÍA COMPLETA DEL SISTEMA DE PERMISOS GRANULARES
-- Este script verifica la estructura y el funcionamiento del sistema

-- ========================================
-- 1. VERIFICAR ESTRUCTURA DE TABLAS
-- ========================================

-- 1.1 Verificar tabla dealer_custom_roles
SELECT 'dealer_custom_roles' AS table_name,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns
WHERE table_name = 'dealer_custom_roles'
ORDER BY ordinal_position;

-- 1.2 Verificar tabla user_custom_role_assignments
SELECT 'user_custom_role_assignments' AS table_name,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns
WHERE table_name = 'user_custom_role_assignments'
ORDER BY ordinal_position;

-- ========================================
-- 2. VERIFICAR ROLES EXISTENTES
-- ========================================

-- 2.1 Roles activos por dealership
SELECT
    d.name AS dealership_name,
    dcr.id,
    dcr.role_name,
    dcr.display_name,
    dcr.description,
    dcr.is_active,
    dcr.created_at,
    -- Verificar si tiene permisos definidos
    CASE
        WHEN dcr.permissions IS NOT NULL THEN 'Yes'
        ELSE 'No'
    END AS has_permissions,
    -- Contar cuántos permisos tiene
    jsonb_object_keys(COALESCE(dcr.permissions, '{}'::jsonb)) AS module_count
FROM dealer_custom_roles dcr
JOIN dealerships d ON dcr.dealer_id = d.id
WHERE dcr.is_active = true
ORDER BY d.name, dcr.display_name;

-- 2.2 Estructura de permisos de un role específico (ejemplo: Sales Manager)
SELECT
    role_name,
    display_name,
    permissions
FROM dealer_custom_roles
WHERE role_name = 'sales_manager'
  AND is_active = true
LIMIT 1;

-- ========================================
-- 3. VERIFICAR ASIGNACIONES DE ROLES
-- ========================================

-- 3.1 Usuarios con roles asignados
SELECT
    p.email,
    p.first_name || ' ' || p.last_name AS full_name,
    p.role AS system_role,
    d.name AS dealership,
    dcr.display_name AS custom_role,
    ucra.is_active AS assignment_active,
    ucra.assigned_at
FROM user_custom_role_assignments ucra
JOIN profiles p ON ucra.user_id = p.id
JOIN dealerships d ON ucra.dealer_id = d.id
JOIN dealer_custom_roles dcr ON ucra.custom_role_id = dcr.id
WHERE ucra.is_active = true
ORDER BY p.email, d.name;

-- 3.2 Usuarios SIN roles asignados (potencialmente sin acceso)
SELECT
    p.id,
    p.email,
    p.first_name || ' ' || p.last_name AS full_name,
    p.role AS system_role,
    p.dealership_id,
    d.name AS dealership
FROM profiles p
LEFT JOIN dealerships d ON p.dealership_id = d.id
WHERE p.role = 'user'  -- Solo usuarios regulares
  AND p.dealership_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM user_custom_role_assignments ucra
      WHERE ucra.user_id = p.id
        AND ucra.is_active = true
  )
ORDER BY p.email;

-- ========================================
-- 4. VERIFICAR PERMISOS ESPECÍFICOS
-- ========================================

-- 4.1 Permisos del usuario rudyruizlima@gmail.com
SELECT
    p.email,
    p.role AS system_role,
    dcr.role_name,
    dcr.display_name,
    dcr.permissions
FROM profiles p
LEFT JOIN user_custom_role_assignments ucra ON p.id = ucra.user_id AND ucra.is_active = true
LEFT JOIN dealer_custom_roles dcr ON ucra.custom_role_id = dcr.id AND dcr.is_active = true
WHERE p.email = 'rudyruizlima@gmail.com';

-- 4.2 Ejemplo: Verificar qué usuarios pueden crear órdenes de Sales
SELECT DISTINCT
    p.email,
    p.first_name || ' ' || p.last_name AS full_name,
    dcr.display_name AS role,
    dcr.permissions->'sales_orders'->'create_orders' AS can_create_sales_orders
FROM profiles p
JOIN user_custom_role_assignments ucra ON p.id = ucra.user_id AND ucra.is_active = true
JOIN dealer_custom_roles dcr ON ucra.custom_role_id = dcr.id AND dcr.is_active = true
WHERE dcr.permissions->'sales_orders'->'create_orders' = 'true'
ORDER BY p.email;

-- 4.3 Ejemplo: Verificar qué usuarios pueden editar órdenes de Service
SELECT DISTINCT
    p.email,
    p.first_name || ' ' || p.last_name AS full_name,
    dcr.display_name AS role,
    dcr.permissions->'service_orders'->'edit_orders' AS can_edit_service_orders
FROM profiles p
JOIN user_custom_role_assignments ucra ON p.id = ucra.user_id AND ucra.is_active = true
JOIN dealer_custom_roles dcr ON ucra.custom_role_id = dcr.id AND dcr.is_active = true
WHERE dcr.permissions->'service_orders'->'edit_orders' = 'true'
ORDER BY p.email;

-- 4.4 Ejemplo: Verificar qué usuarios pueden borrar órdenes
SELECT DISTINCT
    p.email,
    p.first_name || ' ' || p.last_name AS full_name,
    dcr.display_name AS role,
    CASE
        WHEN dcr.permissions->'sales_orders'->'delete_orders' = 'true' THEN 'Yes'
        ELSE 'No'
    END AS can_delete_sales,
    CASE
        WHEN dcr.permissions->'service_orders'->'delete_orders' = 'true' THEN 'Yes'
        ELSE 'No'
    END AS can_delete_service
FROM profiles p
JOIN user_custom_role_assignments ucra ON p.id = ucra.user_id AND ucra.is_active = true
JOIN dealer_custom_roles dcr ON ucra.custom_role_id = dcr.id AND dcr.is_active = true
WHERE dcr.permissions->'sales_orders'->'delete_orders' = 'true'
   OR dcr.permissions->'service_orders'->'delete_orders' = 'true'
ORDER BY p.email;

-- ========================================
-- 5. VERIFICAR RLS POLICIES
-- ========================================

-- 5.1 Policies en dealer_custom_roles
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'dealer_custom_roles'
ORDER BY policyname;

-- 5.2 Policies en user_custom_role_assignments
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'user_custom_role_assignments'
ORDER BY policyname;

-- ========================================
-- 6. VERIFICAR ÍNDICES DE PERFORMANCE
-- ========================================

-- 6.1 Índices en dealer_custom_roles
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'dealer_custom_roles'
ORDER BY indexname;

-- 6.2 Índices en user_custom_role_assignments
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'user_custom_role_assignments'
ORDER BY indexname;

-- ========================================
-- 7. ESTADÍSTICAS DEL SISTEMA
-- ========================================

-- 7.1 Total de roles por dealership
SELECT
    d.name AS dealership,
    COUNT(*) AS total_roles,
    COUNT(*) FILTER (WHERE dcr.is_active = true) AS active_roles
FROM dealer_custom_roles dcr
JOIN dealerships d ON dcr.dealer_id = d.id
GROUP BY d.name
ORDER BY d.name;

-- 7.2 Total de asignaciones por dealership
SELECT
    d.name AS dealership,
    COUNT(*) AS total_assignments,
    COUNT(DISTINCT ucra.user_id) AS unique_users
FROM user_custom_role_assignments ucra
JOIN dealerships d ON ucra.dealer_id = d.id
WHERE ucra.is_active = true
GROUP BY d.name
ORDER BY d.name;

-- 7.3 Distribución de roles
SELECT
    dcr.display_name AS role,
    COUNT(*) AS users_with_this_role
FROM user_custom_role_assignments ucra
JOIN dealer_custom_roles dcr ON ucra.custom_role_id = dcr.id
WHERE ucra.is_active = true
  AND dcr.is_active = true
GROUP BY dcr.display_name
ORDER BY users_with_this_role DESC;

-- ========================================
-- 8. VERIFICAR INTEGRIDAD DE DATOS
-- ========================================

-- 8.1 Asignaciones huérfanas (sin usuario)
SELECT 'Orphaned Assignments' AS issue_type,
       COUNT(*) AS count
FROM user_custom_role_assignments ucra
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = ucra.user_id
);

-- 8.2 Asignaciones con roles inexistentes
SELECT 'Invalid Role References' AS issue_type,
       COUNT(*) AS count
FROM user_custom_role_assignments ucra
WHERE NOT EXISTS (
    SELECT 1 FROM dealer_custom_roles dcr WHERE dcr.id = ucra.custom_role_id
);

-- 8.3 Roles con permisos NULL o vacíos
SELECT
    id,
    role_name,
    display_name,
    CASE
        WHEN permissions IS NULL THEN 'NULL'
        WHEN permissions = '{}'::jsonb THEN 'Empty Object'
        ELSE 'Has Permissions'
    END AS permission_status
FROM dealer_custom_roles
WHERE is_active = true
  AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- ========================================
-- 9. TEST DE PERMISOS EN TIEMPO REAL
-- ========================================

-- 9.1 Simular el proceso de carga de permisos para un usuario
-- (Ejemplo: rudyruizlima@gmail.com)
WITH user_info AS (
    SELECT id, email, role, dealership_id
    FROM profiles
    WHERE email = 'rudyruizlima@gmail.com'
)
SELECT
    ui.email,
    ui.role AS system_role,
    ui.dealership_id,
    dcr.role_name AS custom_role,
    dcr.display_name AS custom_role_display,
    dcr.permissions
FROM user_info ui
LEFT JOIN user_custom_role_assignments ucra
    ON ui.id = ucra.user_id
    AND ucra.dealer_id = ui.dealership_id
    AND ucra.is_active = true
LEFT JOIN dealer_custom_roles dcr
    ON ucra.custom_role_id = dcr.id
    AND dcr.is_active = true;

-- ========================================
-- 10. RESUMEN EJECUTIVO
-- ========================================

SELECT
    '====== SYSTEM SUMMARY ======' AS section,
    NULL AS metric,
    NULL AS value
UNION ALL
SELECT
    'Dealerships',
    'Total Dealerships with Custom Roles',
    COUNT(DISTINCT dealer_id)::text
FROM dealer_custom_roles
WHERE is_active = true
UNION ALL
SELECT
    'Roles',
    'Total Active Custom Roles',
    COUNT(*)::text
FROM dealer_custom_roles
WHERE is_active = true
UNION ALL
SELECT
    'Users',
    'Users with Custom Roles Assigned',
    COUNT(DISTINCT user_id)::text
FROM user_custom_role_assignments
WHERE is_active = true
UNION ALL
SELECT
    'Users',
    'Users WITHOUT Custom Roles (role=user)',
    COUNT(*)::text
FROM profiles p
WHERE p.role = 'user'
  AND p.dealership_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM user_custom_role_assignments ucra
      WHERE ucra.user_id = p.id AND ucra.is_active = true
  )
UNION ALL
SELECT
    'Security',
    'RLS Policies on dealer_custom_roles',
    COUNT(*)::text
FROM pg_policies
WHERE tablename = 'dealer_custom_roles'
UNION ALL
SELECT
    'Security',
    'RLS Policies on user_custom_role_assignments',
    COUNT(*)::text
FROM pg_policies
WHERE tablename = 'user_custom_role_assignments'
UNION ALL
SELECT
    'Data Quality',
    'Roles with NULL/Empty Permissions',
    COUNT(*)::text
FROM dealer_custom_roles
WHERE is_active = true
  AND (permissions IS NULL OR permissions = '{}'::jsonb);
