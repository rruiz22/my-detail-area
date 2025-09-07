-- Script para verificar la configuración de permisos y roles
-- Ejecuta este script DESPUÉS del setup_admin_user.sql

-- 1. Verificar roles existentes
SELECT 
  'ROLES EXISTENTES:' as info,
  name, 
  display_name, 
  user_type, 
  is_system_role,
  created_at
FROM public.roles 
ORDER BY created_at;

-- 2. Verificar permisos del rol system_admin
SELECT 
  'PERMISOS DEL ROL SYSTEM_ADMIN:' as info,
  r.name as role_name,
  rp.module,
  rp.permission_level
FROM public.roles r
JOIN public.role_permissions rp ON r.id = rp.role_id
WHERE r.name = 'system_admin'
ORDER BY rp.module;

-- 3. Verificar dealerships existentes
SELECT 
  'DEALERSHIPS EXISTENTES:' as info,
  id,
  name,
  city,
  state,
  email,
  created_at
FROM public.dealerships
ORDER BY id;

-- 4. Verificar función handle_new_user (esto mostrará el código de la función)
SELECT 
  'FUNCIÓN HANDLE_NEW_USER:' as info,
  prosrc as function_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'handle_new_user';

-- 5. Verificar usuarios existentes en profiles
SELECT 
  'USUARIOS EXISTENTES EN PROFILES:' as info,
  email,
  first_name,
  last_name,
  role,
  user_type,
  dealership_id,
  created_at
FROM public.profiles
ORDER BY created_at;

-- 6. Verificar asignaciones de roles
SELECT 
  'ASIGNACIONES DE ROLES:' as info,
  p.email,
  r.name as role_name,
  r.display_name,
  ura.is_active,
  ura.created_at
FROM public.user_role_assignments ura
JOIN public.profiles p ON ura.user_id = p.id
JOIN public.roles r ON ura.role_id = r.id
ORDER BY ura.created_at;
